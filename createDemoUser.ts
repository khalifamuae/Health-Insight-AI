import { storage } from "./server/storage";
import { authStorage } from "./server/replit_integrations/auth/storage";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { db } from "./server/db";
import { userProfiles } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const email = "demo@biotrack.ai";
    const password = "BioTrack2025!Review";

    // Check if exists
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing.length > 0) {
        await storage.upsertUserProfile({
            ...existing[0],
            passwordHash,
            subscriptionPlan: "pro",
            isAdmin: true
        });
        console.log("Demo user updated");
    } else {
        const userId = crypto.randomUUID();
        await authStorage.upsertUser({
            id: userId,
            email,
            firstName: "Review",
            lastName: "Team",
        });
        await storage.upsertUserProfile({
            id: userId,
            email,
            passwordHash,
            firstName: "Review",
            lastName: "Team",
            phone: "+1234567890",
            subscriptionPlan: "pro",
            trialStartedAt: new Date(),
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isAdmin: true
        });
        console.log("Demo user created");
    }
    process.exit(0);
}

main().catch(console.error);
