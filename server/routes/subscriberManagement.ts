import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth";
import { userProfiles, subscriberConnections, subscriberLinkCodes, subscriberChatMessages, subscriberActivityLogs, uploadedPdfs } from "@shared/schema";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();

// Helper to check if user has feature active
async function checkSubscriberManagementAccess(userId: string) {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  return profile?.subscriberManagementActive === true;
}

// Ensure feature access (for PRO trainer routes only)
router.use(isAuthenticated);

const requireTrainerAccess = async (req: any, res: Response, next: any) => {
  const userId = (req.user?.id || req.user?.claims?.sub);
  const hasAccess = await checkSubscriberManagementAccess(userId);
  if (!hasAccess) {
    return res.status(403).json({ error: "SUBSCRIBER_MANAGEMENT_REQUIRED", message: "This feature requires an active premium subscription with subscriber management enabled." });
  }
  next();
};

// GET status and limits
router.get("/status", requireTrainerAccess, async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
    
    // Count active connections
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(subscriberConnections)
      .where(and(eq(subscriberConnections.ownerId, userId), eq(subscriberConnections.status, "active")));

    res.json({
      active: profile.subscriberManagementActive,
      limit: profile.subscriberManagementLimit || 0,
      used: countResult.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// GET clients
router.get("/clients", requireTrainerAccess, async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    
    const connections = await db.select({
      connection: subscriberConnections,
      clientProfile: userProfiles
    })
    .from(subscriberConnections)
    .leftJoin(userProfiles, eq(subscriberConnections.clientId, userProfiles.id))
    .where(eq(subscriberConnections.ownerId, userId))
    .orderBy(desc(subscriberConnections.createdAt));

    res.json(connections.map(c => ({
      ...c.connection,
      client: {
        id: c.clientProfile?.id,
        firstName: c.clientProfile?.firstName,
        lastName: c.clientProfile?.lastName,
        profileImagePath: c.clientProfile?.profileImagePath,
        isShadowAccount: c.clientProfile?.isShadowAccount,
        lastActive: c.clientProfile?.updatedAt
      }
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// PATCH subscription dates
router.patch("/subscription-dates/:connectionId", requireTrainerAccess, async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;
    const { subscriptionStartDate, subscriptionEndDate, traineeGoal } = req.body;

    const [conn] = await db.select().from(subscriberConnections)
      .where(and(eq(subscriberConnections.id, connectionId), eq(subscriberConnections.ownerId, userId)))
      .limit(1);

    if (!conn) {
      return res.status(404).json({ error: "Connection not found or unauthorized." });
    }

    const updates: Partial<typeof subscriberConnections.$inferInsert> = {};
    if (subscriptionStartDate !== undefined) {
      updates.subscriptionStartDate = subscriptionStartDate === null ? null : new Date(subscriptionStartDate);
    }
    if (subscriptionEndDate !== undefined) {
      updates.subscriptionEndDate = subscriptionEndDate === null ? null : new Date(subscriptionEndDate);
    }
    if (traineeGoal !== undefined) {
      updates.traineeGoal = traineeGoal === null ? null : traineeGoal;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(subscriberConnections).set(updates).where(eq(subscriberConnections.id, connectionId));
    }

    res.json({ success: true, message: "Subscription dates updated successfully" });
  } catch (error) {
    console.error("Error updating subscription dates:", error);
    res.status(500).json({ error: "Failed to update subscription dates" });
  }
});

// POST unlinked client (Shadow Profile)
router.post("/unlinked-client", requireTrainerAccess, async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { firstName, lastName, phone, gender, weight, height } = req.body;

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(subscriberConnections)
      .where(and(eq(subscriberConnections.ownerId, userId), eq(subscriberConnections.status, "active")));

    if ((countResult.count || 0) >= (profile.subscriberManagementLimit || 0)) {
      return res.status(403).json({ error: "LIMIT_REACHED", message: "Maximum subscriber limit reached." });
    }

    const shadowUserId = crypto.randomUUID();
    
    // Create shadow profile
    await db.insert(userProfiles).values({
      id: shadowUserId,
      firstName: firstName || "Client",
      lastName: lastName || "",
      phone,
      gender,
      weight,
      height,
      isShadowAccount: true,
      shadowOwnerId: userId,
      subscriptionPlan: "free",
    });

    // Create connection
    const [connection] = await db.insert(subscriberConnections).values({
      ownerId: userId,
      clientId: shadowUserId,
      status: "active",
      permissions: {
        view_basic_profile: true,
        view_body_metrics: true,
        view_progress_photos: true,
        view_lab_reports: true,
        view_inbody_results: true,
        view_progress_history: true,
        view_previous_plans: true,
        view_source_documents: true,
        edit_nutrition_plan: true,
        edit_workout_plan: true,
        allow_chat: true
      }
    }).returning();

    // Log action
    await db.insert(subscriberActivityLogs).values({
      connectionId: connection.id,
      userId,
      action: "CREATED_UNLINKED_CLIENT",
      details: { shadowUserId }
    });

    res.json({ success: true, connection });
  } catch (error) {
    res.status(500).json({ error: "Failed to create unlinked client" });
  }
});

// GET fetch or generate permanent link code
router.get("/my-link-id", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);

    let [existingLinkCode] = await db.select().from(subscriberLinkCodes)
      .where(and(eq(subscriberLinkCodes.creatorId, userId), eq(subscriberLinkCodes.role, "client")))
      .limit(1);

    if (!existingLinkCode) {
      let code = "";
      let isUnique = false;
      
      // Ensure the generated 6-digit code is absolutely unique
      while (!isUnique) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const [collision] = await db.select().from(subscriberLinkCodes).where(eq(subscriberLinkCodes.code, code)).limit(1);
        if (!collision) {
          isUnique = true;
        }
      }
      
      const expiresAt = new Date("2099-12-31"); // Permanent

      const [newLinkCode] = await db.insert(subscriberLinkCodes).values({
        code,
        creatorId: userId,
        role: "client",
        expiresAt
      }).returning();
      existingLinkCode = newLinkCode;
    }

    res.json({ success: true, code: existingLinkCode.code });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate permanent link code" });
  }
});

// POST verify and link
router.post("/verify-link", async (req: any, res: Response) => {
  try {
    const currentUserId = (req.user?.id || req.user?.claims?.sub);
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: "Code is required" });

    // Find valid code (ignore isUsed since codes are permanent)
    const [linkCode] = await db.select().from(subscriberLinkCodes)
      .where(eq(subscriberLinkCodes.code, code))
      .limit(1);

    if (!linkCode) return res.status(400).json({ error: "Invalid or used code" });
    if (new Date() > linkCode.expiresAt) return res.status(400).json({ error: "Code expired" });
    if (linkCode.creatorId === currentUserId) return res.status(400).json({ error: "Cannot use your own code" });

    let ownerId: string;
    let clientId: string;

    if (linkCode.role === "owner") {
      // The creator is the professional (owner). The user entering it is the client.
      ownerId = linkCode.creatorId;
      clientId = currentUserId;
    } else {
      // The creator is the client. The user entering it is the professional (owner).
      ownerId = currentUserId;
      clientId = linkCode.creatorId;

      // Ensure professional has limits
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, ownerId)).limit(1);
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(subscriberConnections)
        .where(and(eq(subscriberConnections.ownerId, ownerId), eq(subscriberConnections.status, "active")));

      if ((countResult.count || 0) >= (profile.subscriberManagementLimit || 0)) {
        return res.status(403).json({ error: "LIMIT_REACHED", message: "Maximum subscriber limit reached." });
      }
    }

    // Check if already linked
    const existing = await db.select().from(subscriberConnections)
      .where(and(eq(subscriberConnections.ownerId, ownerId), eq(subscriberConnections.clientId, clientId)))
      .limit(1);

    let connectionId: string;

    if (existing.length > 0) {
      if (existing[0].status === "active") {
        return res.status(400).json({ error: "Already linked" });
      } else {
        // Re-activate but if client code, set to pending
        const [updated] = await db.update(subscriberConnections)
          .set({ status: linkCode.role === "client" ? "pending" : "active", updatedAt: new Date() })
          .where(eq(subscriberConnections.id, existing[0].id))
          .returning();
        connectionId = updated.id;
      }
    } else {
      // If code targets an existing unlinked profile, swap it
      if (linkCode.targetConnectionId && linkCode.role === "owner") {
         const [targetConn] = await db.select().from(subscriberConnections).where(eq(subscriberConnections.id, linkCode.targetConnectionId)).limit(1);
         if (targetConn && targetConn.ownerId === ownerId) {
            // Update connection to point to real user
            const [updated] = await db.update(subscriberConnections)
              .set({ clientId: clientId, updatedAt: new Date() })
              .where(eq(subscriberConnections.id, targetConn.id))
              .returning();
            connectionId = updated.id;
         } else {
           // Fallback if target lost
           const [newConn] = await db.insert(subscriberConnections).values({
            ownerId,
            clientId,
            status: "active",
            permissions: { view_basic_profile: true, edit_nutrition_plan: true, edit_workout_plan: true, allow_chat: true } // defaults
           }).returning();
           connectionId = newConn.id;
         }
      } else {
        // Create new (status pending for client codes since they must approve)
        const [newConn] = await db.insert(subscriberConnections).values({
          ownerId,
          clientId,
          status: linkCode.role === "client" ? "pending" : "active",
          permissions: { view_basic_profile: true, edit_nutrition_plan: true, edit_workout_plan: true, allow_chat: true } // defaults
        }).returning();
        connectionId = newConn.id;
      }
    }

    // Do NOT mark client permanent code as used
    if (linkCode.role !== "client") {
      await db.update(subscriberLinkCodes).set({ isUsed: true }).where(eq(subscriberLinkCodes.id, linkCode.id));
    }

    // Log action
    await db.insert(subscriberActivityLogs).values({
      connectionId,
      userId: currentUserId,
      action: "LINK_ESTABLISHED",
      details: { role: linkCode.role }
    });

    res.json({ success: true, connectionId, status: existing.length > 0 ? existing[0].status : (linkCode.role === "client" ? "pending" : "active") });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify link" });
  }
});

// GET pending link requests
router.get("/pending-requests", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);

    const requests = await db.select({
      connection: subscriberConnections,
      ownerProfile: userProfiles
    })
    .from(subscriberConnections)
    .leftJoin(userProfiles, eq(subscriberConnections.ownerId, userProfiles.id))
    .where(and(eq(subscriberConnections.clientId, userId), eq(subscriberConnections.status, "pending")))
    .orderBy(desc(subscriberConnections.createdAt));

    res.json(requests.map(r => ({
      ...r.connection,
      owner: {
        id: r.ownerProfile?.id,
        firstName: r.ownerProfile?.firstName,
        lastName: r.ownerProfile?.lastName,
        profileImagePath: r.ownerProfile?.profileImagePath
      }
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
});

// GET active connected trainers for a client
router.get("/active-trainers", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);

    const connections = await db.select({
      connection: subscriberConnections,
      ownerProfile: userProfiles
    })
    .from(subscriberConnections)
    .leftJoin(userProfiles, eq(subscriberConnections.ownerId, userProfiles.id))
    .where(and(eq(subscriberConnections.clientId, userId), eq(subscriberConnections.status, "active")))
    .orderBy(desc(subscriberConnections.createdAt));

    res.json(connections.map(r => ({
      ...r.connection,
      owner: {
        id: r.ownerProfile?.id,
        firstName: r.ownerProfile?.firstName,
        lastName: r.ownerProfile?.lastName,
        profileImagePath: r.ownerProfile?.profileImagePath
      }
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active trainers" });
  }
});

// DELETE disconnect from a trainer
router.delete("/disconnect/:connectionId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;

    const [conn] = await db.select().from(subscriberConnections)
      .where(and(eq(subscriberConnections.id, connectionId), eq(subscriberConnections.clientId, userId)))
      .limit(1);

    if (!conn) return res.status(404).json({ error: "Connection not found" });

    // Mark as unlinked instead of full delete to preserve historical context if needed,
    // OR just delete it fully to wipe all rights cleanly. Deletion cleanly revokes all trainer access.
    await db.delete(subscriberConnections).where(eq(subscriberConnections.id, connectionId));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// POST approve or reject pending link request
router.post("/approve-link/:connectionId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    
    const [conn] = await db.select().from(subscriberConnections)
      .where(and(eq(subscriberConnections.id, connectionId), eq(subscriberConnections.clientId, userId), eq(subscriberConnections.status, "pending")))
      .limit(1);
      
    if (!conn) return res.status(404).json({ error: "Pending request not found" });

    if (action === "approve") {
      await db.update(subscriberConnections).set({ status: "active", updatedAt: new Date() }).where(eq(subscriberConnections.id, connectionId));
    } else {
      await db.delete(subscriberConnections).where(eq(subscriberConnections.id, connectionId));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

// GET chat messages
router.get("/chat/:connectionId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;

    // Verify access to connection
    const [conn] = await db.select().from(subscriberConnections).where(eq(subscriberConnections.id, connectionId)).limit(1);
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (conn.ownerId !== userId && conn.clientId !== userId) return res.status(403).json({ error: "Unauthorized" });

    const chats = await db.select().from(subscriberChatMessages).where(eq(subscriberChatMessages.connectionId, connectionId)).orderBy(subscriberChatMessages.createdAt);

    // Mark as read if user is not sender
    const unreadIds = chats.filter(c => c.senderId !== userId && !c.isRead).map(c => c.id);
    if (unreadIds.length > 0) {
      await db.update(subscriberChatMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(subscriberChatMessages.connectionId, connectionId),
            sql`${subscriberChatMessages.senderId} != ${userId}`,
            eq(subscriberChatMessages.isRead, false)
          )
        );
    }

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: "Failed to load chat" });
  }
});

// POST chat message
router.post("/chat/:connectionId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;
    const { content, attachmentUrl, attachmentType } = req.body;

    const [conn] = await db.select().from(subscriberConnections).where(eq(subscriberConnections.id, connectionId)).limit(1);
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (conn.ownerId !== userId && conn.clientId !== userId) return res.status(403).json({ error: "Unauthorized" });

    // Check perm
    const perms: any = conn.permissions || {};
    if (perms.allow_chat === false) {
      return res.status(403).json({ error: "CHAT_DISABLED", message: "Chat is disabled for this connection." });
    }

    const [msg] = await db.insert(subscriberChatMessages).values({
      connectionId,
      senderId: userId,
      content,
      attachmentUrl,
      attachmentType
    }).returning();

    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET secure document
router.get("/documents/:fileId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { fileId } = req.params;

    const [fileRecord] = await db.select().from(uploadedPdfs).where(eq(uploadedPdfs.id, fileId)).limit(1);
    if (!fileRecord) return res.status(404).json({ error: "File not found" });

    // Check permissions if not owner of file
    if (fileRecord.userId !== userId) {
      const [conn] = await db.select().from(subscriberConnections)
        .where(and(eq(subscriberConnections.ownerId, userId), eq(subscriberConnections.clientId, fileRecord.userId)))
        .limit(1);
      
      const perms: any = conn?.permissions || {};
      if (!conn || !perms.view_source_documents) {
        return res.status(403).json({ error: "Access denied to source documents" });
      }
    }

    if (!fileRecord.filePath) {
      return res.status(404).json({ error: "Original file was not saved (old upload)" });
    }

    const absPath = path.resolve(fileRecord.filePath);
    if (!fs.existsSync(absPath)) {
       return res.status(404).json({ error: "File no longer exists on disk" });
    }

    // Set secure headers
    res.setHeader("Cache-Control", "no-store");
    // Use an unguessable filename to obscure extension and data
    res.setHeader("Content-Disposition", `inline; filename="secure_document_${fileId}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
    res.sendFile(absPath);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// PUT update permissions
router.put("/permissions/:connectionId", async (req: any, res: Response) => {
  try {
    const userId = (req.user?.id || req.user?.claims?.sub);
    const { connectionId } = req.params;
    const { permissions } = req.body;

    const [conn] = await db.select().from(subscriberConnections).where(eq(subscriberConnections.id, connectionId)).limit(1);
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const [clientProfile] = await db.select().from(userProfiles).where(eq(userProfiles.id, conn.clientId)).limit(1);
    
    if (clientProfile?.isShadowAccount && conn.ownerId === userId) {
      // Owner can update
    } else if (conn.clientId !== userId) {
      return res.status(403).json({ error: "Only the client can update their permissions" });
    }

    const [updated] = await db.update(subscriberConnections)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(subscriberConnections.id, connectionId))
      .returning();

    await db.insert(subscriberActivityLogs).values({
      connectionId,
      userId,
      action: "UPDATED_PERMISSIONS",
      details: { permissions }
    });

    res.json({ success: true, connection: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update permissions" });
  }
});

export default router;
