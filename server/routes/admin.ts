import { Router } from "express";
import { db } from "../db";
import {
    userProfiles,
    testDefinitions,
    knowledgeBase,
    knowledgeLearningLog,
    uploadedPdfs,
    dietPlanJobs,
    sharedWorkouts,
    withdrawalRequests,
    affiliateCommissions,
    referrals,
    reminders
} from "@shared/schema";
import { eq, desc, sql, count, ilike, or, and } from "drizzle-orm";

const router = Router();

// Middleware to verify admin status
router.use(async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const [user] = await db
            .select({ isAdmin: userProfiles.isAdmin })
            .from(userProfiles)
            .where(eq(userProfiles.id, (req.user as any).claims.sub))
            .limit(1);

        const adminEmail = process.env.ADMIN_EMAIL || "";
        if (!user || (!user.isAdmin && (req.user as any).claims.email !== adminEmail)) {
            return res.status(403).json({ message: "Forbidden: Admin access only" });
        }

        // Safety net: Auto-promote developer email to admin if it's not set
        if ((req.user as any).claims.email === adminEmail && !user.isAdmin) {
            await db.update(userProfiles)
                .set({ isAdmin: true })
                .where(eq(userProfiles.id, (req.user as any).claims.sub));
        }

        next();
    } catch (error) {
        console.error("Admin verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/admin/stats
// High-level dashboard statistics
router.get("/stats", async (req, res) => {
    try {
        const [totalUsers] = await db.select({ count: count() }).from(userProfiles);
        const [premiumUsers] = await db
            .select({ count: count() })
            .from(userProfiles)
            .where(
                sql`${userProfiles.subscriptionPlan} IN ('premium', 'pro') AND ${userProfiles.subscriptionExpiresAt} > NOW()`
            );

        const [totalPdfs] = await db.select({ count: count() }).from(uploadedPdfs);
        const [pendingWithdrawals] = await db
            .select({ count: count() })
            .from(withdrawalRequests)
            .where(eq(withdrawalRequests.status, "pending"));

        const [failedPdfs] = await db
            .select({ count: count() })
            .from(uploadedPdfs)
            .where(eq(uploadedPdfs.status, "failed"));

        const [totalKnowledgeBase] = await db.select({ count: count() }).from(knowledgeBase);

        res.json({
            totalUsers: totalUsers.count,
            premiumUsers: premiumUsers.count,
            totalPdfs: totalPdfs.count,
            failedPdfs: failedPdfs.count,
            pendingWithdrawals: pendingWithdrawals.count,
            totalKnowledgeBase: totalKnowledgeBase.count
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Failed to fetch top-level statistics" });
    }
});

// GET /api/admin/users
// Fetch users with pagination and text search
router.get("/users", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;

        let conditions = undefined;
        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            conditions = or(
                ilike(userProfiles.email, searchTerm),
                ilike(userProfiles.firstName, searchTerm),
                ilike(userProfiles.lastName, searchTerm),
                ilike(userProfiles.phone, searchTerm)
            );
        }

        const query = db
            .select()
            .from(userProfiles)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(userProfiles.createdAt));

        if (conditions) {
            query.where(conditions);
        }

        const users = await query;

        // Get total count for pagination
        const countQuery = db.select({ count: count() }).from(userProfiles);
        if (conditions) {
            countQuery.where(conditions);
        }
        const [totalObj] = await countQuery;

        res.json({
            users,
            total: totalObj.count,
            page,
            totalPages: Math.ceil(totalObj.count / limit)
        });

    } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// GET /api/admin/tests
// Fetch all tests (ordered by category and level)
router.get("/tests", async (req, res) => {
    try {
        const tests = await db.select().from(testDefinitions).orderBy(testDefinitions.category, testDefinitions.level);
        res.json(tests);
    } catch (error) {
        console.error("Error fetching admin tests:", error);
        res.status(500).json({ message: "Failed to fetch tests" });
    }
});

// PUT /api/admin/tests/:id
// Update a test definition
router.put("/tests/:id", async (req, res) => {
    try {
        // Remove id to prevent changing the primary key
        const { id, ...updateData } = req.body;

        const [updatedTest] = await db.update(testDefinitions)
            .set(updateData)
            .where(eq(testDefinitions.id, req.params.id))
            .returning();

        if (!updatedTest) return res.status(404).json({ message: "Test not found" });

        res.json(updatedTest);
    } catch (error) {
        console.error("Error updating test definition:", error);
        res.status(500).json({ message: "Failed to update test definition" });
    }
});

// GET /api/admin/pdfs
// Fetch PDF upload logs
router.get("/pdfs", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const pdfs = await db.select({
            id: uploadedPdfs.id,
            fileName: uploadedPdfs.fileName,
            status: uploadedPdfs.status,
            errorMessage: uploadedPdfs.errorMessage,
            testsExtracted: uploadedPdfs.testsExtracted,
            createdAt: uploadedPdfs.createdAt,
            userEmail: userProfiles.email
        })
            .from(uploadedPdfs)
            .leftJoin(userProfiles, eq(uploadedPdfs.userId, userProfiles.id))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(uploadedPdfs.createdAt));

        const [totalObj] = await db.select({ count: count() }).from(uploadedPdfs);

        res.json({
            pdfs,
            total: totalObj.count,
            page,
            totalPages: Math.ceil(totalObj.count / limit)
        });
    } catch (error) {
        console.error("Error fetching admin pdfs:", error);
        res.status(500).json({ message: "Failed to fetch PDF logs" });
    }
});

// GET /api/admin/knowledge
// Fetch knowledge base articles
router.get("/knowledge", async (req, res) => {
    try {
        const entries = await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
        res.json(entries);
    } catch (error) {
        console.error("Error fetching knowledge base:", error);
        res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
});

// POST /api/admin/knowledge
// Add to knowledge base
router.post("/knowledge", async (req, res) => {
    try {
        const [entry] = await db.insert(knowledgeBase).values(req.body).returning();
        res.json(entry);
    } catch (error) {
        console.error("Error creating knowledge base entry:", error);
        res.status(500).json({ message: "Failed to create knowledge entry" });
    }
});

// PUT /api/admin/knowledge/:id
// Update knowledge base article
router.put("/knowledge/:id", async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const [updated] = await db.update(knowledgeBase)
            .set(updateData)
            .where(eq(knowledgeBase.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ message: "Knowledge entry not found" });
        res.json(updated);
    } catch (error) {
        console.error("Error updating knowledge entry:", error);
        res.status(500).json({ message: "Failed to update knowledge entry" });
    }
});

// DELETE /api/admin/knowledge/:id
router.delete("/knowledge/:id", async (req, res) => {
    try {
        await db.delete(knowledgeBase).where(eq(knowledgeBase.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting knowledge entry:", error);
        res.status(500).json({ message: "Failed to delete knowledge entry" });
    }
});

// GET /api/admin/affiliates/referrals
// Fetch all referrals matching referrers with referees
router.get("/affiliates/referrals", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const data = await db.select()
            .from(referrals)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(referrals.createdAt));

        const [totalObj] = await db.select({ count: count() }).from(referrals);

        res.json({ data, total: totalObj.count, page, totalPages: Math.ceil(totalObj.count / limit) });
    } catch (error) {
        console.error("Error fetching admin referrals:", error);
        res.status(500).json({ message: "Failed to fetch referrals" });
    }
});

// GET /api/admin/affiliates/withdrawals
// Fetch all withdrawal requests
router.get("/affiliates/withdrawals", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const data = await db.select({
            id: withdrawalRequests.id,
            userId: withdrawalRequests.userId,
            amount: withdrawalRequests.amount,
            status: withdrawalRequests.status,
            paymentMethod: withdrawalRequests.paymentMethod,
            paymentDetails: withdrawalRequests.paymentDetails,
            processedAt: withdrawalRequests.processedAt,
            createdAt: withdrawalRequests.createdAt,
            userEmail: userProfiles.email,
        })
            .from(withdrawalRequests)
            .leftJoin(userProfiles, eq(withdrawalRequests.userId, userProfiles.id))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(withdrawalRequests.createdAt));

        const [totalObj] = await db.select({ count: count() }).from(withdrawalRequests);

        res.json({ data, total: totalObj.count, page, totalPages: Math.ceil(totalObj.count / limit) });
    } catch (error) {
        console.error("Error fetching admin withdrawals:", error);
        res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
});

// PUT /api/admin/affiliates/withdrawals/:id
// Update status of a withdrawal request
router.put("/affiliates/withdrawals/:id", async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updateData: any = { status };
        if (status === 'completed' || status === 'rejected') {
            updateData.processedAt = new Date();
        }

        const [updated] = await db.update(withdrawalRequests)
            .set(updateData)
            .where(eq(withdrawalRequests.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ message: "Withdrawal request not found" });
        res.json(updated);
    } catch (error) {
        console.error("Error updating admin withdrawal:", error);
        res.status(500).json({ message: "Failed to update withdrawal" });
    }
});

// PATCH /api/admin/users/:id/subscription
// Admin: Update user subscription plan and trainer features
router.patch("/users/:id/subscription", async (req, res) => {
    try {
        const { subscriptionPlan, subscriberManagementActive, subscriberManagementLimit, subscriptionExpiresAt } = req.body;

        const updateData: any = {};
        if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;
        if (typeof subscriberManagementActive === 'boolean') updateData.subscriberManagementActive = subscriberManagementActive;
        if (typeof subscriberManagementLimit === 'number') updateData.subscriberManagementLimit = subscriberManagementLimit;
        if (subscriptionExpiresAt) updateData.subscriptionExpiresAt = new Date(subscriptionExpiresAt);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const [updated] = await db.update(userProfiles)
            .set(updateData)
            .where(eq(userProfiles.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ message: "User not found" });
        res.json(updated);
    } catch (error) {
        console.error("Error updating user subscription:", error);
        res.status(500).json({ message: "Failed to update user subscription" });
    }
});

export default router;
