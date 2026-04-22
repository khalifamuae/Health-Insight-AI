
import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes, createApiToken } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { analyzeLabPdf, analyzeLabImage } from "./pdfAnalyzer";
import { analyzeInBodyPdf, analyzeInBodyImage } from "./inbodyAnalyzer";
import { generateDietPlan, translateDietPlan } from "./dietPlanGenerator";
import { getPrivacyPolicyHTML, getPrivacyPolicyArabicHTML, getTermsOfServiceHTML, getTermsOfServiceArabicHTML, getSupportPageHTML, getAccountDeletionHTML } from "./legalPages";
import { desc, eq, and, gte, sql, or } from "drizzle-orm";
import { db } from "./db";
import { userProfiles, testDefinitions, type TestDefinition, sharedWorkouts, sharedDietPlans, subscriberConnections, inbodyResults, savedWorkouts, savedDietPlans, trainerReviews, standaloneChatMessages, subscriberChatMessages } from "@shared/schema";
import crypto from "crypto";
import { emailVerificationCodes } from "@shared/schema";
import { getResendClient } from "./resendClient";
import adminRouter from "./routes/admin";
import { registerFoodSearchRoutes } from "./foodSearchRoutes";
import subscriberManagementRouter from "./routes/subscriberManagement";

// Strip sensitive fields before sending profile to client
function sanitizeProfile(profile: any) {
  if (!profile) return profile;
  const { passwordHash, ...safe } = profile;
  return safe;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfName = file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdfMime && isPdfName) return cb(null, true);
    cb(new Error("Only PDF files are allowed"));
  }
});

const uploadReport = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfName = file.originalname.toLowerCase().endsWith(".pdf");
    const isImageMime = file.mimetype.toLowerCase().startsWith("image/");
    if ((isPdfMime && isPdfName) || isImageMime) return cb(null, true);
    cb(new Error("Only PDF or image files are allowed"));
  }
});

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isSupportedImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const INBODY_TEST_DEFINITIONS: Pick<TestDefinition, "id" | "nameEn" | "nameAr" | "category" | "level" | "unit" | "normalRangeMin" | "normalRangeMax" | "normalRangeText" | "recheckMonths" | "descriptionEn" | "descriptionAr" | "shortName">[] = [
  {
    id: "inbody-weight",
    nameEn: "InBody Weight",
    nameAr: "وزن الجسم (InBody)",
    shortName: "Weight",
    category: "special",
    level: 3,
    unit: "kg",
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Body weight measured by InBody scan.",
    descriptionAr: "وزن الجسم كما يظهر في تقرير الإن بودي.",
  },
  {
    id: "inbody-total-body-water",
    nameEn: "InBody Total Body Water",
    nameAr: "ماء الجسم الكلي (InBody)",
    shortName: "TBW",
    category: "special",
    level: 4,
    unit: "%",
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Total body water percentage from InBody report.",
    descriptionAr: "نسبة الماء في الجسم من تقرير الإن بودي.",
  },
  {
    id: "inbody-body-fat-percentage",
    nameEn: "InBody Body Fat Percentage",
    nameAr: "نسبة دهون الجسم (InBody)",
    shortName: "PBF",
    category: "special",
    level: 5,
    unit: "%",
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Body fat percentage (PBF) from InBody report.",
    descriptionAr: "نسبة الدهون في الجسم من تقرير الإن بودي.",
  },
  {
    id: "inbody-skeletal-muscle-mass",
    nameEn: "InBody Skeletal Muscle Mass",
    nameAr: "كتلة العضلات الهيكلية (InBody)",
    shortName: "SMM",
    category: "special",
    level: 5,
    unit: "kg",
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Skeletal muscle mass from InBody report.",
    descriptionAr: "كتلة العضلات من تقرير الإن بودي.",
  },
  {
    id: "inbody-bmi",
    nameEn: "InBody BMI",
    nameAr: "مؤشر كتلة الجسم (InBody)",
    shortName: "BMI",
    category: "special",
    level: 4,
    unit: "kg/m²",
    normalRangeMin: 18.5,
    normalRangeMax: 24.9,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Body Mass Index from InBody report.",
    descriptionAr: "مؤشر كتلة الجسم كما يظهر في تقرير الإن بودي.",
  },
  {
    id: "inbody-visceral-fat-level",
    nameEn: "InBody Visceral Fat Level",
    nameAr: "مستوى الدهون الحشوية (InBody)",
    shortName: "VFL",
    category: "special",
    level: 6,
    unit: "level",
    normalRangeMin: 1,
    normalRangeMax: 9,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Visceral fat level from InBody report.",
    descriptionAr: "مستوى الدهون الحشوية من تقرير الإن بودي.",
  },
  {
    id: "inbody-bmr",
    nameEn: "InBody Basal Metabolic Rate",
    nameAr: "معدل الأيض الأساسي (InBody)",
    shortName: "BMR",
    category: "special",
    level: 4,
    unit: "kcal",
    normalRangeMin: null,
    normalRangeMax: null,
    normalRangeText: null,
    recheckMonths: 1,
    descriptionEn: "Basal metabolic rate from InBody report.",
    descriptionAr: "معدل الحرق الأساسي كما يظهر في تقرير الإن بودي.",
  },
];

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(windowMs: number, maxRequests: number) {
  return (req: any, res: Response, next: Function) => {
    const key = `${req.ip}:${req.path} `;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    entry.count++;
    return next();
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  });
}, 60 * 1000);

// Rate limiters
const authRateLimit = rateLimit(15 * 60 * 1000, 10); // 10 attempts per 15 min
const emailRateLimit = rateLimit(60 * 1000, 3); // 3 emails per minute

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Register Admin Routes
  app.use("/api/admin", adminRouter);

  // ========== DEMO / SEED ACCOUNT FOR GOOGLE PLAY REVIEW ==========
  // POST /api/seed-demo-trainer
  // Creates a demo trainer account for Google Play testers
  app.post("/api/seed-demo-trainer", async (req: any, res: Response) => {
    try {
      const demoEmail = "trainer@demo.healthinsight.app";
      const demoPassword = "Trainer@2026";

      // Check if already exists
      const existing = await db.select().from(userProfiles).where(eq(userProfiles.email, demoEmail)).limit(1);
      if (existing.length > 0) {
        // Update subscription to ensure it's active
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        await db.update(userProfiles).set({
          subscriptionPlan: "pro",
          subscriptionExpiresAt: futureDate,
          subscriberManagementActive: true,
          subscriberManagementLimit: 50,
        }).where(eq(userProfiles.email, demoEmail));
        return res.json({
          message: "Demo trainer account already exists — subscription renewed",
          email: demoEmail,
          password: demoPassword,
        });
      }

      // Create new demo trainer
      const userId = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(demoPassword, 10);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await authStorage.upsertUser({
        id: userId,
        email: demoEmail,
        firstName: "Demo",
        lastName: "Trainer",
      });

      await storage.upsertUserProfile({
        id: userId,
        email: demoEmail,
        passwordHash: hashedPassword,
        firstName: "Demo",
        lastName: "Trainer",
        phone: "+971500000000",
        subscriptionPlan: "pro",
        subscriptionExpiresAt: futureDate,
        subscriberManagementActive: true,
        subscriberManagementLimit: 50,
        bio: "Professional fitness trainer with 8+ years of experience in bodybuilding, weight loss, and sports nutrition.",
        specialty: "Bodybuilding & Weight Loss",
        yearsOfExperience: 8,
      });

      res.json({
        message: "Demo trainer account created successfully",
        email: demoEmail,
        password: demoPassword,
      });
    } catch (error) {
      console.error("Error creating demo trainer:", error);
      res.status(500).json({ error: "Failed to create demo trainer account" });
    }
  });

  // Register Subscriber Management Routes
  app.use("/api/subscriber-management", subscriberManagementRouter);

  // Advanced Proxy Middleware for Native Mobile Client Management
  // This cleverly swaps req.user with the target client's profile if targetClientId is present and authorized.
  app.use("/api", async (req: any, res: Response, next: any) => {
    const targetClientId = req.query.targetClientId as string;
    if (targetClientId && req.user) {
      if (req.user.subscriberManagementActive !== true && req.user.role !== 'admin') {
         return res.status(403).json({ error: "Subscriber management feature not active" });
      }
      const conn = await db.query.subscriberConnections.findFirst({
        where: and(
          eq(subscriberConnections.ownerId, req.user.id),
          eq(subscriberConnections.clientId, targetClientId),
          eq(subscriberConnections.status, 'active')
        ),
        with: { client: true }
      });

      if (!conn) {
        return res.status(403).json({ error: "Not authorized to manage this client or connection is inactive" });
      }

      req.originalUser = req.user;
      req.user = conn.client;
      // Also intercept any potential re-saves of user fields
      req.userOverrideActive = true; 
    }
    next();
  });

  // Register Food Search Routes
  registerFoodSearchRoutes(app);

  // Auto-seed test definitions if table is empty
  try {
    const existingDefs = await storage.getTestDefinitions();
    if (existingDefs.length === 0) {
      console.log("Test definitions table is empty, auto-seeding...");
      const { seedTestDefinitions } = await import("./seedTests");
      await seedTestDefinitions();
      console.log("Auto-seed complete");
    }
  } catch (err) {
    console.error("Auto-seed error:", err);
  }

  // Dev-only screenshot login - strictly disabled in production
  if (process.env.NODE_ENV !== 'production') {
    app.get("/api/dev-screenshot-login", async (req: any, res: Response) => {
      const devSecret = process.env.DEV_SCREENSHOT_SECRET;
      if (!devSecret || req.query.secret !== devSecret) {
        return res.status(404).send('Not found');
      }
      const userId = process.env.DEV_USER_ID;
      if (!userId) return res.status(404).send('Not found');
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.status(404).json({ error: 'User not found' });
      const user = {
        claims: { sub: userId, email: profile.email || "demo@biotrack.ai", first_name: profile.firstName || "", last_name: profile.lastName || "", exp: Math.floor(Date.now() / 1000) + 86400 },
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        access_token: "dev_token",
        refresh_token: "dev_refresh"
      };
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ error: 'Login failed' });
        res.json({ success: true });
      });
    });
  }

  app.post("/api/auth/send-verification", emailRateLimit, async (req: any, res: Response) => {
    try {
      const email = (req.body?.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "Email is required" });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email format" });

      const existingUsers = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
      if (existingUsers.length > 0) return res.status(409).json({ error: "Email already registered" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
      await db.insert(emailVerificationCodes).values({ email, code, expiresAt });

      try {
        const { client, fromEmail } = await getResendClient();
        await client.emails.send({
          from: fromEmail || "BioTrack AI <noreply@biotrack-ai.com>",
          to: email,
          subject: "BioTrack AI - Verification Code / رمز التحقق",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;"><h2 style="color: #10b981;">BioTrack AI</h2><p style="font-size: 16px; color: #374151;">Your verification code is:</p><p style="font-size: 16px; color: #374151; direction: rtl;">رمز التحقق الخاص بك:</p><div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;"><span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${code}</span></div><p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes.</p><p style="font-size: 14px; color: #6b7280; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق.</p></div></body></html>`,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`\n\n[DEV MODE] EMAIL BYPASS: The verification code for ${email} is: ${code} \n\n`);
          return res.json({ success: true, message: "Dev mode bypass: Check server console for code" });
        }
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Send verification error:", error);
      res.status(500).json({ error: "Server error during verification setup" });
    }
  });

  app.post("/api/auth/forgot-password", emailRateLimit, async (req: any, res: Response) => {
    try {
      const email = (req.body?.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "Email is required" });

      const existingUsers = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
      if (existingUsers.length === 0) {
        // Don't reveal whether account exists - return success anyway
        return res.json({ success: true });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
      await db.insert(emailVerificationCodes).values({ email, code, expiresAt });

      try {
        const { client, fromEmail } = await getResendClient();
        await client.emails.send({
          from: fromEmail || "BioTrack AI <noreply@biotrack-ai.com>",
          to: email,
          subject: "BioTrack AI - Password Reset Code / رمز استعادة كلمة المرور",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;"><h2 style="color: #3b82f6;">BioTrack AI</h2><p style="font-size: 16px; color: #374151;">Your password reset code is:</p><p style="font-size: 16px; color: #374151; direction: rtl;">رمز استعادة كلمة المرور الخاص بك:</p><div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;"><span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${code}</span></div><p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p><p style="font-size: 14px; color: #6b7280; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق. إذا لم تطلب ذلك، تجاهل هذا البريد.</p></div></body></html>`,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`\n\n[DEV MODE] EMAIL BYPASS: The reset code for ${email} is: ${code} \n\n`);
          return res.json({ success: true, message: "Dev mode bypass: Check server console for code" });
        }
        return res.status(500).json({ error: "Failed to send reset email" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Server error during password reset setup" });
    }
  });

  app.post("/api/auth/reset-password", authRateLimit, async (req: any, res: Response) => {
    try {
      const email = (req.body?.email || '').trim().toLowerCase();
      const code = (req.body?.code || '').trim();
      const newPassword = req.body?.newPassword;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code, and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must contain at least one letter and one number" });
      }

      const verificationRecord = await db.select()
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.email, email),
            eq(emailVerificationCodes.code, code)
          )
        ).limit(1);

      if (verificationRecord.length === 0) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      if (new Date() > verificationRecord[0].expiresAt) {
        return res.status(400).json({ error: "Verification code expired" });
      }

      const existingUsers = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
      if (existingUsers.length === 0) return res.status(404).json({ error: "No account found with this email" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(userProfiles)
        .set({ passwordHash: hashedPassword })
        .where(eq(userProfiles.id, existingUsers[0].id));

      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Server error during password reset" });
    }
  });

  app.post("/api/auth/verify-code", authRateLimit, async (req: any, res: Response) => {
    try {
      const email = (req.body?.email || '').trim().toLowerCase();
      const code = (req.body?.code || '').trim();
      if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

      const records = await db.select().from(emailVerificationCodes)
        .where(and(eq(emailVerificationCodes.email, email), eq(emailVerificationCodes.code, code)))
        .limit(1);

      if (records.length === 0) return res.status(400).json({ error: "Invalid verification code" });

      const record = records[0];
      if (new Date() > record.expiresAt) return res.status(400).json({ error: "Verification code expired" });

      await db.update(emailVerificationCodes)
        .set({ verified: true })
        .where(eq(emailVerificationCodes.id, record.id));

      res.json({ success: true, verified: true });
    } catch (err) {
      console.error("Verify code error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/register", authRateLimit, async (req: any, res: Response) => {
    try {
      const { password, firstName, lastName, phone } = req.body || {};
      const email = (req.body?.email || '').trim().toLowerCase();
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ error: "Password must contain at least one letter and one number" });
      }
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const verified = await db.select().from(emailVerificationCodes)
        .where(and(eq(emailVerificationCodes.email, email), eq(emailVerificationCodes.verified, true)))
        .limit(1);
      if (verified.length === 0) {
        return res.status(400).json({ error: "Email not verified" });
      }

      const existingUsers = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
      if (existingUsers.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);

      await authStorage.upsertUser({
        id: userId,
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const profile = await storage.upsertUserProfile({
        id: userId,
        email,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        subscriptionPlan: "free",
        trialStartedAt: new Date(),
        trialEndsAt: trialEnd,
      });

      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));

      const user = {
        claims: { sub: userId, email, first_name: firstName.trim(), last_name: lastName.trim(), exp: Math.floor(Date.now() / 1000) + 86400 * 30 },
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        access_token: crypto.randomUUID(),
        refresh_token: crypto.randomUUID()
      };

      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ error: "Registration failed" });
        const apiToken = createApiToken(userId);
        res.json({
          success: true,
          token: apiToken,
          user: { id: userId, email, firstName: firstName.trim(), lastName: lastName.trim(), subscription: profile.subscriptionPlan }
        });
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req: any, res: Response) => {
    try {
      const { password } = req.body || {};
      const email = (req.body?.email || '').trim().toLowerCase();
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const users = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
      if (users.length === 0 || !users[0].passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const profile = users[0];
      const validPassword = await bcrypt.compare(password, profile.passwordHash!);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = {
        claims: { sub: profile.id, email: profile.email, first_name: profile.firstName || "", last_name: profile.lastName || "", exp: Math.floor(Date.now() / 1000) + 86400 * 30 },
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        access_token: crypto.randomUUID(),
        refresh_token: crypto.randomUUID()
      };

      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        const apiToken = createApiToken(profile.id);
        res.json({
          success: true,
          token: apiToken,
          user: { id: profile.id, email: profile.email, firstName: profile.firstName || "", lastName: profile.lastName || "", subscription: profile.subscriptionPlan }
        });
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res: Response) => {
    req.logout && req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
    if (!req.logout) {
       res.clearCookie('connect.sid');
       res.json({ success: true });
    }
  });

  app.get("/privacy", (req: Request, res: Response) => {
    const lang = req.query.lang as string;
    res.type("html").send(lang === "ar" ? getPrivacyPolicyArabicHTML() : getPrivacyPolicyHTML());
  });

  app.get("/terms", (req: Request, res: Response) => {
    const lang = req.query.lang as string;
    res.type("html").send(lang === "ar" ? getTermsOfServiceArabicHTML() : getTermsOfServiceHTML());
  });

  app.get("/support", (_req: Request, res: Response) => {
    res.type("html").send(getSupportPageHTML());
  });

  app.get("/account-deletion", (_req: Request, res: Response) => {
    res.type("html").send(getAccountDeletionHTML());
  });

  // Clean up stale diet plan jobs from previous server instances
  try {
    const staleCount = await storage.failStaleJobs();
    if (staleCount > 0) {
      console.log(`Cleaned up ${staleCount} stale diet plan job(s)`);
    }
  } catch (e) {
    console.error("Failed to clean up stale jobs:", e);
  }

  // Profile routes
  app.get("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;

      // Handle fetching a client's profile if requested by an authorized trainer
      if (targetClientId && targetClientId !== currentUserId) {
        const [conn] = await db.select().from(subscriberConnections)
          .where(and(eq(subscriberConnections.ownerId, currentUserId), eq(subscriberConnections.clientId, targetClientId), eq(subscriberConnections.status, "active")))
          .limit(1);

        if (!conn) {
          return res.status(403).json({ error: "Access denied to this client's profile" });
        }
        
        const clientProfile = await storage.getUserProfile(targetClientId);
        if (!clientProfile) return res.status(404).json({ error: "Client profile not found" });

        return res.json({
          ...sanitizeProfile(clientProfile),
          linkedAt: conn.createdAt
        });
      }

      // Default: fetch own profile
      let profile = await storage.getUserProfile(currentUserId);

      if (!profile) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 3);
        profile = await storage.upsertUserProfile({
          id: currentUserId,
          subscriptionPlan: "free",
          filesUploaded: 0,
          dietPlansGenerated: 0,
          language: "ar",
          trialStartedAt: new Date(),
          trialEndsAt: trialEnd,
        });
      }

      res.json(sanitizeProfile(profile));
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { phone, age: providedAge, dateOfBirth, weight, height, gender, fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies, proteinPreference, proteinPreferences, carbPreferences, bloodType, firstName, lastName, profileImagePath, bio, specialty, yearsOfExperience, certifications, galleryImages, transformationPhotos } = req.body;

      let computedAge = providedAge;
      let parsedDateOfBirth: Date | undefined = undefined;

      if (dateOfBirth) {
        parsedDateOfBirth = new Date(dateOfBirth);
        if (!isNaN(parsedDateOfBirth.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - parsedDateOfBirth.getFullYear();
          const m = today.getMonth() - parsedDateOfBirth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < parsedDateOfBirth.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge > 0 && calculatedAge < 150) {
            computedAge = calculatedAge;
          }
        }
      }

      // Input validation
      if (computedAge !== undefined && computedAge !== null && (typeof computedAge !== 'number' || isNaN(computedAge) || computedAge < 1 || computedAge > 150)) {
        return res.status(400).json({ error: "Invalid age" });
      }
      if (weight !== undefined && weight !== null && (typeof weight !== 'number' || isNaN(weight) || weight < 1 || weight > 500)) {
        return res.status(400).json({ error: "Invalid weight" });
      }
      if (height !== undefined && height !== null && (typeof height !== 'number' || isNaN(height) || height < 30 || height > 300)) {
        return res.status(400).json({ error: "Invalid height" });
      }
      if (gender !== undefined && gender !== null && !['male', 'female'].includes(gender)) {
        return res.status(400).json({ error: "Invalid gender" });
      }

      const profile = await storage.upsertUserProfile({
        id: userId,
        firstName,
        lastName,
        profileImagePath,
        phone,
        dateOfBirth: parsedDateOfBirth,
        age: computedAge,
        weight,
        height,
        gender,
        fitnessGoal,
        activityLevel,
        mealPreference,
        hasAllergies,
        allergies,
        proteinPreference,
        proteinPreferences,
        carbPreferences,
        bloodType,
        bio,
        specialty,
        yearsOfExperience,
        certifications,
        galleryImages,
        transformationPhotos,
      });

      res.json(sanitizeProfile(profile));
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 3);
        profile = await storage.upsertUserProfile({
          id: userId,
          subscriptionPlan: "free",
          filesUploaded: 0,
          dietPlansGenerated: 0,
          language: "ar",
          trialStartedAt: new Date(),
          trialEndsAt: trialEnd,
        });
      }
      res.json(sanitizeProfile(profile));
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { phone, age, weight, height, gender, fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies, proteinPreference, proteinPreferences, carbPreferences, bloodType, firstName, lastName, profileImagePath } = req.body;
      if (age !== undefined && age !== null && (typeof age !== 'number' || isNaN(age) || age < 1 || age > 150)) {
        return res.status(400).json({ error: "Invalid age" });
      }
      if (weight !== undefined && weight !== null && (typeof weight !== 'number' || isNaN(weight) || weight < 1 || weight > 500)) {
        return res.status(400).json({ error: "Invalid weight" });
      }
      if (height !== undefined && height !== null && (typeof height !== 'number' || isNaN(height) || height < 30 || height > 300)) {
        return res.status(400).json({ error: "Invalid height" });
      }
      if (gender !== undefined && gender !== null && !['male', 'female'].includes(gender)) {
        return res.status(400).json({ error: "Invalid gender" });
      }
      const profile = await storage.upsertUserProfile({
        id: userId,
        firstName, lastName, profileImagePath, phone, age, weight, height, gender,
        fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies,
        proteinPreference, proteinPreferences, carbPreferences, bloodType,
      });
      res.json(sanitizeProfile(profile));
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Helper: check if user has active subscription or trial
  async function checkSubscriptionAccess(userId: string): Promise<{ hasAccess: boolean; reason?: string; reasonAr?: string }> {
    const profile = await storage.getUserProfile(userId);
    const rawPlan = profile?.subscriptionPlan || 'free';
    const plan = (rawPlan === 'basic' || rawPlan === 'premium') ? 'pro' : rawPlan;

    if (plan !== 'free') {
      const expiresAt = profile?.subscriptionExpiresAt;
      if (!expiresAt || new Date(expiresAt) > new Date()) {
        return { hasAccess: true };
      }
    }

    const trialEndsAt = profile?.trialEndsAt;
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: "Please subscribe to access this feature. Free accounts can create manual workout and diet plans.",
      reasonAr: "يرجى الاشتراك للوصول إلى هذه الميزة. الحسابات المجانية يمكنها تصميم جداول تدريبية وغذائية يدوية فقط."
    };
  }

  // Test results routes - returns only user's actual test results
  app.get("/api/tests", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(currentUserId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }

      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const tests = await storage.getLatestTestResultsByUser(targetId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  // Full history (used for result comparison over time)
  app.get("/api/tests/history", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(currentUserId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }

      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const tests = await storage.getTestResultsByUser(targetId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching test history:", error);
      res.status(500).json({ error: "Failed to fetch test history" });
    }
  });

  // Get ALL 50 tests merged with user values (0 if missing)
  // Ordered by importance level and category as defined in app
  app.get("/api/tests/all", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(currentUserId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }

      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get all test definitions (ordered by importance and category)
      const definitions = await storage.getTestDefinitions();

      // Get user's test results
      const userTests = await storage.getTestResultsByUser(targetId);

      // Create map of latest user test results by testId
      const userTestMap = new Map<string, any>();
      for (const test of userTests) {
        const existing = userTestMap.get(test.testId);
        if (!existing || (test.testDate && existing.testDate && new Date(test.testDate) > new Date(existing.testDate))) {
          userTestMap.set(test.testId, test);
        }
      }

      // Merge all definitions with user values
      const allTests = definitions.map((def, index) => {
        const userTest = userTestMap.get(def.id);
        return {
          id: userTest?.id || `empty - ${def.id} `,
          testId: def.id,
          nameEn: def.nameEn,
          nameAr: def.nameAr,
          shortName: def.shortName,
          category: def.category,
          importance: def.level,
          unit: def.unit,
          normalRangeMin: def.normalRangeMin,
          normalRangeMax: def.normalRangeMax,
          recheckMonths: def.recheckMonths,
          descriptionEn: def.descriptionEn,
          descriptionAr: def.descriptionAr,
          value: userTest?.value ?? 0,
          valueText: userTest?.valueText || null,
          status: userTest?.status || "pending",
          testDate: userTest?.testDate || null,
          pdfFileName: userTest?.pdfFileName || null,
          hasResult: !!userTest,
          order: index,
        };
      });

      res.json(allTests);
    } catch (error) {
      console.error("Error fetching all tests:", error);
      res.status(500).json({ error: "Failed to fetch all tests" });
    }
  });

  // Test definitions
  app.get("/api/test-definitions", async (req: Request, res: Response) => {
    try {
      const definitions = await storage.getTestDefinitions();
      res.json(definitions);
    } catch (error) {
      console.error("Error fetching test definitions:", error);
      res.status(500).json({ error: "Failed to fetch test definitions" });
    }
  });

  // Reminders routes
  app.get("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const userReminders = await storage.getRemindersByUser(userId);
      res.json(userReminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // Stats route
  app.get("/api/stats", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const tests = await storage.getLatestTestResultsByUser(userId);
      const userReminders = await storage.getRemindersByUser(userId);
      const pdfs = await storage.getUploadedPdfsByUser(userId);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUploads = pdfs.filter(p =>
        p.createdAt && new Date(p.createdAt) > thirtyDaysAgo
      ).length;

      const normalTests = tests.filter(t => t.status === "normal").length;
      const abnormalTests = tests.filter(t => t.status === "low" || t.status === "high").length;
      const pendingReminders = userReminders.filter(r => !r.sent && new Date(r.dueDate) > new Date()).length;

      res.json({
        totalTests: tests.length,
        normalTests,
        abnormalTests,
        pendingReminders,
        recentUploads,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Create test result manually
  app.post("/api/tests", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, value, valueText, testDate } = req.body;

      const def = await storage.getTestDefinitionById(testId);
      if (!def) {
        return res.status(400).json({ error: "Invalid test ID" });
      }

      let status: "normal" | "low" | "high" = "normal";
      if (def.normalRangeMin !== null && def.normalRangeMax !== null && value !== null) {
        if (value < def.normalRangeMin) status = "low";
        else if (value > def.normalRangeMax) status = "high";
      }

      const result = await storage.createTestResult({
        userId,
        testId,
        value,
        valueText,
        status,
        testDate: new Date(testDate),
      });

      res.json(result);
    } catch (error) {
      console.error("Error creating test result:", error);
      res.status(500).json({ error: "Failed to create test result" });
    }
  });

  // Delete test result
  app.delete("/api/tests/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const testResultId = req.params.id;

      await storage.deleteTestResult(testResultId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting test result:", error);
      res.status(500).json({ error: "Failed to delete test result" });
    }
  });

  // Mark reminder as sent/acknowledged
  app.patch("/api/reminders/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reminderId = req.params.id;
      const { sent } = req.body;

      await storage.updateReminder(reminderId, userId, { sent, sentAt: sent ? new Date() : null });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  // Create or update reminder for a test
  app.post("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, dueDate } = req.body;

      if (!testId || !dueDate) {
        return res.status(400).json({ error: "testId and dueDate are required" });
      }

      // Delete existing reminder for this test if any
      await storage.deleteReminderByTest(userId, testId);

      // Create new reminder
      const reminder = await storage.createReminder({
        userId,
        testId,
        dueDate: new Date(dueDate),
      });

      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // Delete reminder
  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reminderId = req.params.id;

      await storage.deleteReminder(reminderId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // Get uploaded PDFs list
  app.get("/api/uploaded-pdfs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const pdfs = await storage.getUploadedPdfsByUser(userId);
      res.json(pdfs);
    } catch (error) {
      console.error("Error fetching uploaded PDFs:", error);
      res.status(500).json({ error: "Failed to fetch uploaded PDFs" });
    }
  });

  // Delete uploaded PDF
  app.delete("/api/uploaded-pdfs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteUploadedPdf(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "PDF not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting PDF:", error);
      res.status(500).json({ error: "Failed to delete PDF" });
    }
  });

  // Helper function to process PDF with a given record
  async function processPdfFromRecord(pdfId: string, userId: string, fileBuffer: Buffer, fileName: string) {
    // Update status to processing
    await storage.updateUploadedPdfStatus(pdfId, "processing");

    try {
      // Analyze PDF using AI
      console.log("[PDF DEBUG] Starting PDF analysis, buffer size:", fileBuffer.length);
      const extractedTests = await analyzeLabPdf(fileBuffer);
      console.log("[PDF DEBUG] Analysis success, tests found:", extractedTests.length);

      // Get test definitions for matching
      const definitions = await storage.getTestDefinitions();
      const defMap = new Map(definitions.map(d => [d.id, d]));

      const defaultTestDate = new Date();
      let testsCreated = 0;

      // Create test results and reminders
      testsCreated = await saveExtractedLabTests(userId, fileName, extractedTests);

      // Update status to success
      await storage.updateUploadedPdfStatus(pdfId, "success", testsCreated);

      return { success: true, testsExtracted: testsCreated };
    } catch (error) {
      // Update status to failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[PDF DEBUG] Analysis FAILED:", errorMessage, error);
      await storage.updateUploadedPdfStatus(pdfId, "failed", undefined, errorMessage);
      throw error;
    }
  }

  async function saveExtractedLabTests(userId: string, fileName: string, extractedTests: any[]): Promise<number> {
    const definitions = await storage.getTestDefinitions();
    const defMap = new Map(definitions.map(d => [d.id, d]));
    const defaultTestDate = new Date();
    let testsCreated = 0;

    for (const extracted of extractedTests) {
      const def = defMap.get(extracted.testId);
      if (!def) continue;

      let status: "normal" | "low" | "high" = "normal";
      if (def.normalRangeMin !== null && def.normalRangeMax !== null && extracted.value !== null) {
        if (extracted.value < def.normalRangeMin) status = "low";
        else if (extracted.value > def.normalRangeMax) status = "high";
      }

      const testDate = extracted.testDate ? new Date(extracted.testDate) : defaultTestDate;

      await storage.createTestResult({
        userId,
        testId: extracted.testId,
        value: extracted.value,
        valueText: extracted.valueText,
        status,
        testDate,
        pdfFileName: fileName,
      });
      testsCreated++;

      if (def.recheckMonths) {
        const dueDate = new Date(testDate);
        dueDate.setMonth(dueDate.getMonth() + def.recheckMonths);
        await storage.createReminder({
          userId,
          testId: extracted.testId,
          dueDate,
        });
      }
    }
    return testsCreated;
  }

  async function ensureInBodyDefinitions() {
    await db.insert(testDefinitions)
      .values(INBODY_TEST_DEFINITIONS)
      .onConflictDoNothing({ target: testDefinitions.id });
  }

  async function saveInBodyMetricsFromExtraction(
    userId: string,
    fileName: string,
    extractedMetrics: Array<{ testId: string; value: number | null; valueText: string | null; testDate: string | null; }>
  ) {
    await ensureInBodyDefinitions();
    const definitions = await storage.getTestDefinitions();
    const defMap = new Map(definitions.map(d => [d.id, d]));
    const defaultTestDate = new Date();
    let metricsCreated = 0;

    for (const metric of extractedMetrics) {
      const def = defMap.get(metric.testId);
      if (!def) continue;

      let status: "normal" | "low" | "high" = "normal";
      if (def.normalRangeMin !== null && def.normalRangeMax !== null && metric.value !== null) {
        if (metric.value < def.normalRangeMin) status = "low";
        else if (metric.value > def.normalRangeMax) status = "high";
      }

      const testDate = metric.testDate ? new Date(metric.testDate) : defaultTestDate;

      await storage.createTestResult({
        userId,
        testId: metric.testId,
        value: metric.value,
        valueText: metric.valueText,
        status,
        testDate,
        pdfFileName: fileName,
      });
      metricsCreated++;

      if (def.recheckMonths) {
        const dueDate = new Date(testDate);
        dueDate.setMonth(dueDate.getMonth() + def.recheckMonths);
        await storage.createReminder({ userId, testId: metric.testId, dueDate });
      }
    }

    return metricsCreated;
  }

  // PDF upload and analysis
  app.post("/api/analyze-pdf", isAuthenticated, upload.single("pdf"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }
      if (!isPdfBuffer(file.buffer)) {
        return res.status(400).json({ error: "Invalid PDF file format" });
      }

      // Check subscription limits — free accounts cannot upload
      const profile = await storage.getUserProfile(userId);
      const plan = profile?.subscriptionPlan || "free";
      const filesUploaded = profile?.filesUploaded || 0;

      // Check if trial is active for free users
      const trialEndsAt = profile?.trialEndsAt;
      const isTrialActive = plan === 'free' && trialEndsAt && new Date(trialEndsAt) > new Date();

      // Free users without trial cannot upload at all
      if (plan === 'free' && !isTrialActive) {
        return res.status(403).json({
          error: "SUBSCRIPTION_REQUIRED",
          message: "Please subscribe to upload lab reports. Free accounts can create manual plans only.",
          messageAr: "\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0631\u0641\u0639 \u0627\u0644\u062a\u062d\u0627\u0644\u064a\u0644. \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629 \u064a\u0645\u0643\u0646\u0647\u0627 \u062a\u0635\u0645\u064a\u0645 \u062c\u062f\u0627\u0648\u0644 \u064a\u062f\u0648\u064a\u0629 \u0641\u0642\u0637."
        });
      }

      const limits: Record<string, number> = { free: 3, basic: 20, premium: Infinity, pro: Infinity };
      if (filesUploaded >= (limits[plan] || 0)) {
        return res.status(403).json({
          error: "Upload limit reached",
          message: "Please upgrade your subscription to upload more files"
        });
      }

      // Create PDF record with processing status (analysis starts immediately)
      const pdfRecord = await storage.createUploadedPdf({
        userId,
        fileName: file.originalname,
        filePath: "",
        status: "processing",
      });

      // Increment files uploaded
      await storage.incrementFilesUploaded(userId);

      try {
        // Process the PDF
        const result = await processPdfFromRecord(pdfRecord.id, userId, file.buffer, file.originalname);

        res.json({
          success: true,
          testsExtracted: result.testsExtracted,
          pdfId: pdfRecord.id,
          message: `Successfully extracted ${result.testsExtracted} test results`
        });
      } catch (error) {
        console.error("Error analyzing PDF:", error);
        res.status(500).json({
          error: "Failed to analyze PDF",
          pdfId: pdfRecord.id,
          message: "The file was saved but could not be processed. You can retry later."
        });
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ error: "Failed to upload PDF" });
    }
  });

  // InBody PDF upload and analysis
  app.post("/api/analyze-inbody", isAuthenticated, upload.single("pdf"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }
      if (!isPdfBuffer(file.buffer)) {
        return res.status(400).json({ error: "Invalid PDF file format" });
      }

      const profile = await storage.getUserProfile(userId);
      const plan = profile?.subscriptionPlan || "free";
      const filesUploaded = profile?.filesUploaded || 0;

      // Check trial for free users
      const trialEndsAt = profile?.trialEndsAt;
      const isTrialActive = plan === 'free' && trialEndsAt && new Date(trialEndsAt) > new Date();

      if (plan === 'free' && !isTrialActive) {
        return res.status(403).json({
          error: "SUBSCRIPTION_REQUIRED",
          message: "Please subscribe to upload InBody scans. Free accounts can create manual plans only.",
          messageAr: "\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0631\u0641\u0639 \u0641\u062d\u0648\u0635\u0627\u062a InBody. \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629 \u064a\u0645\u0643\u0646\u0647\u0627 \u062a\u0635\u0645\u064a\u0645 \u062c\u062f\u0627\u0648\u0644 \u064a\u062f\u0648\u064a\u0629 \u0641\u0642\u0637."
        });
      }

      const limits: Record<string, number> = { free: 3, basic: 20, premium: Infinity, pro: Infinity };
      if (filesUploaded >= (limits[plan] || 0)) {
        return res.status(403).json({
          error: "Upload limit reached",
          message: "Please upgrade your subscription to upload more files"
        });
      }

      const normalizedFileName = file.originalname.toLowerCase().includes("inbody")
        ? file.originalname
        : `InBody - ${file.originalname} `;

      const pdfRecord = await storage.createUploadedPdf({
        userId,
        fileName: normalizedFileName,
        filePath: "",
        status: "processing",
      });

      await storage.incrementFilesUploaded(userId);

      try {
        const extractedMetrics = await analyzeInBodyPdf(file.buffer);
        await storage.updateUploadedPdfStatus(pdfRecord.id, "processing");
        const metricsCreated = await saveInBodyMetricsFromExtraction(userId, normalizedFileName, extractedMetrics);

        await storage.updateUploadedPdfStatus(pdfRecord.id, "success", metricsCreated);

        res.json({
          success: true,
          testsExtracted: metricsCreated,
          pdfId: pdfRecord.id,
          message: `Successfully extracted ${metricsCreated} InBody metrics`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await storage.updateUploadedPdfStatus(pdfRecord.id, "failed", undefined, errorMessage);
        res.status(500).json({
          error: "Failed to analyze InBody PDF",
          pdfId: pdfRecord.id,
          message: "The file was saved but could not be processed. You can retry later."
        });
      }
    } catch (error) {
      console.error("Error uploading InBody PDF:", error);
      res.status(500).json({ error: "Failed to upload InBody PDF" });
    }
  });

  // Generic Media Upload endpoint for Chat and profile images without invoking OCR
  app.post("/api/upload", isAuthenticated, uploadReport.single("file"), async (req: any, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Unified upload endpoint: PDF => Lab analysis, Image => InBody analysis
  app.post("/api/analyze-upload", isAuthenticated, uploadReport.single("file"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
      const isImage = isSupportedImageMime(file.mimetype);
      if (!isPdf && !isImage) {
        return res.status(400).json({ error: "Only PDF or image files are allowed" });
      }
      if (isPdf && !isPdfBuffer(file.buffer)) {
        return res.status(400).json({ error: "Invalid PDF file format" });
      }

      const profile = await storage.getUserProfile(userId);
      const plan = profile?.subscriptionPlan || "free";
      const filesUploaded = profile?.filesUploaded || 0;
      const limits: Record<string, number> = { free: 3, basic: 20, premium: Infinity, pro: Infinity };
      if (filesUploaded >= limits[plan]) {
        return res.status(403).json({
          error: "Upload limit reached",
          message: "Please upgrade your subscription to upload more files"
        });
      }

      const mode: "lab" | "inbody" = isImage ? "inbody" : "lab";
      const normalizedFileName = mode === "inbody" && !file.originalname.toLowerCase().includes("inbody")
        ? `InBody - ${file.originalname} `
        : file.originalname;

      const fileRecord = await storage.createUploadedPdf({
        userId,
        fileName: normalizedFileName,
        filePath: "",
        status: "processing",
      });
      await storage.incrementFilesUploaded(userId);

      try {
        await storage.updateUploadedPdfStatus(fileRecord.id, "processing");
        let testsExtracted = 0;

        if (mode === "lab") {
          if (isImage) {
            const extractedTests = await analyzeLabImage(file.buffer, file.mimetype || "image/jpeg");
            testsExtracted = await saveExtractedLabTests(userId, normalizedFileName, extractedTests);
          } else {
            const result = await processPdfFromRecord(fileRecord.id, userId, file.buffer, normalizedFileName);
            testsExtracted = result.testsExtracted;
          }
        } else {
          const extractedMetrics = await analyzeInBodyImage(file.buffer, file.mimetype || "image/jpeg");
          testsExtracted = await saveInBodyMetricsFromExtraction(userId, normalizedFileName, extractedMetrics);
          await storage.updateUploadedPdfStatus(fileRecord.id, "success", testsExtracted);
        }

        res.json({
          success: true,
          mode,
          testsExtracted,
          pdfId: fileRecord.id,
          message: mode === "inbody"
            ? `Successfully extracted ${testsExtracted} InBody metrics`
            : `Successfully extracted ${testsExtracted} test results`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await storage.updateUploadedPdfStatus(fileRecord.id, "failed", undefined, errorMessage);
        res.status(500).json({
          error: "Failed to analyze uploaded file",
          mode,
          pdfId: fileRecord.id,
          message: "The file was saved but could not be processed. You can retry later."
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Retry processing a failed PDF (requires file to be re-uploaded)
  app.post("/api/uploaded-pdfs/:id/retry", isAuthenticated, upload.single("pdf"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded for retry" });
      }
      if (!isPdfBuffer(file.buffer)) {
        return res.status(400).json({ error: "Invalid PDF file format" });
      }

      // Get the existing PDF record
      const pdfRecord = await storage.getUploadedPdfById(id, userId);
      if (!pdfRecord) {
        return res.status(404).json({ error: "PDF record not found" });
      }

      // Reset the record and retry
      await storage.updateUploadedPdfStatus(id, "pending", undefined, undefined);

      try {
        const result = await processPdfFromRecord(id, userId, file.buffer, pdfRecord.fileName);

        res.json({
          success: true,
          testsExtracted: result.testsExtracted,
          message: `Successfully extracted ${result.testsExtracted} test results`
        });
      } catch (error) {
        console.error("Error retrying PDF analysis:", error);
        res.status(500).json({
          error: "Failed to analyze PDF",
          message: "Retry failed. Please try again later."
        });
      }
    } catch (error) {
      console.error("Error in retry:", error);
      res.status(500).json({ error: "Failed to retry PDF processing" });
    }
  });

  app.post("/api/diet-plan", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const language = req.body.language || "ar";
      const rawCustomTargetCalories = req.body.customTargetCalories;
      const parsedCustomTargetCalories = Number.parseInt(String(rawCustomTargetCalories ?? ""), 10);
      const customTargetCalories = Number.isFinite(parsedCustomTargetCalories) && parsedCustomTargetCalories >= 800 && parsedCustomTargetCalories <= 6000
        ? parsedCustomTargetCalories
        : null;

      const profile = await storage.getUserProfile(userId);

      // Check subscription / trial access
      const rawPlan = profile?.subscriptionPlan || 'free';
      const plan = (rawPlan === 'basic' || rawPlan === 'premium') ? 'pro' : rawPlan;
      const trialEndsAt = profile?.trialEndsAt;
      const isTrialActive = plan === 'free' && trialEndsAt && new Date(trialEndsAt) > new Date();

      if (plan === 'free' && !isTrialActive) {
        return res.status(403).json({
          error: "SUBSCRIPTION_REQUIRED",
          message: language === "ar"
            ? "انتهت الفترة التجريبية. يرجى الاشتراك للاستمرار."
            : "Your free trial has expired. Please subscribe to continue."
        });
      }

      // Check for existing pending/processing job to prevent abuse
      const existingJob = await storage.getLatestPendingJob(userId);
      if (existingJob) {
        return res.json({ jobId: existingJob.id, status: existingJob.status });
      }

      const job = await storage.createDietPlanJob(userId, language);
      if (!profile?.weight || !profile?.height || !profile?.age || !profile?.gender) {
        await storage.updateDietPlanJob(job.id, { status: "failed", error: "MISSING_PROFILE_DATA" });
        return res.status(400).json({ error: "MISSING_PROFILE_DATA", message: language === "ar" ? "يرجى إكمال بيانات الملف الشخصي (الوزن، الطول، العمر، الجنس) قبل إنشاء خطة غذائية" : "Please complete your profile data (weight, height, age, gender) before generating a diet plan" });
      }

      const tests = await storage.getTestResultsByUser(userId);
      const definitions = await storage.getTestDefinitions();
      const defMap = new Map(definitions.map(d => [d.id, d]));

      const latestByTest = new Map<string, any>();
      for (const test of tests) {
        const existing = latestByTest.get(test.testId);
        if (!existing || (test.testDate && existing.testDate && new Date(test.testDate) > new Date(existing.testDate))) {
          latestByTest.set(test.testId, test);
        }
      }

      const testResultsData = Array.from(latestByTest.values()).map(t => {
        const def = defMap.get(t.testId);
        return {
          testId: t.testId,
          testName: language === "ar" ? (def?.nameAr || t.testId) : (def?.nameEn || t.testId),
          value: t.value,
          status: t.status || "normal",
          normalRangeMin: def?.normalRangeMin ?? null,
          normalRangeMax: def?.normalRangeMax ?? null,
          unit: def?.unit ?? null,
          category: def?.category || "special",
        };
      });

      (async () => {
        const startTime = Date.now();
        const maxRetries = 2;
        const planParams = {
          weight: profile?.weight ?? null,
          height: profile?.height ?? null,
          age: profile?.age ?? null,
          gender: profile?.gender ?? null,
          fitnessGoal: profile?.fitnessGoal ?? "maintain",
          activityLevel: profile?.activityLevel ?? "sedentary",
          mealPreference: profile?.mealPreference ?? "balanced",
          hasAllergies: profile?.hasAllergies ?? false,
          allergies: profile?.allergies ?? [],
          proteinPreference: profile?.proteinPreference ?? "mixed",
          proteinPreferences: profile?.proteinPreferences ?? [],
          carbPreferences: profile?.carbPreferences ?? [],
          mealDistribution: profile?.mealDistribution ?? "auto",
          customTargetCalories,
          language,
          testResults: testResultsData,
        };

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await storage.updateDietPlanJob(job.id, { status: "processing" });
            console.log(`Diet plan job ${job.id} attempt ${attempt}/${maxRetries}...`);

            const dietPlan = await generateDietPlan(planParams, async (completedSections, partialMeals) => {
              await storage.updateDietPlanJob(job.id, {
                status: "partial",
                planData: JSON.stringify({ completedSections, mealPlan: partialMeals }),
              });
            });

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            // Mark plan as AI-generated
            const planWithFlag = { ...dietPlan, isAIGenerated: true, generatedAt: new Date().toISOString() };
            await storage.updateDietPlanJob(job.id, {
              status: "completed",
              planData: JSON.stringify(planWithFlag),
            });

            console.log(`Diet plan job ${job.id} completed in ${elapsed}s (attempt ${attempt})`);
            return;
          } catch (error) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            console.error(`Diet plan job ${job.id} attempt ${attempt} failed after ${elapsed}s: ${errMsg}`);

            if (attempt >= maxRetries) {
              await storage.updateDietPlanJob(job.id, {
                status: "failed",
                error: errMsg,
              });
            } else {
              console.log(`Retrying diet plan job ${job.id}...`);
            }
          }
        }
      })();

      res.json({ jobId: job.id, status: "pending" });
    } catch (error) {
      console.error("Error starting diet plan job:", error);
      res.status(500).json({ error: "Failed to start diet plan generation" });
    }
  });

  app.get("/api/diet-plan/pending", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const job = await storage.getLatestPendingJob(userId);
      if (!job) {
        return res.json({ hasPending: false });
      }
      res.json({ hasPending: true, jobId: job.id, status: job.status });
    } catch (error) {
      res.json({ hasPending: false });
    }
  });

  app.post("/api/diet-plan/translate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { planId, targetLanguage } = req.body;

      if (!planId || !targetLanguage || (targetLanguage !== 'ar' && targetLanguage !== 'en')) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      const plan = await storage.getSavedDietPlan(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ error: "Diet plan not found" });
      }

      let parsedPlan;
      try {
        parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData) : plan.planData;
      } catch (e) {
        return res.status(400).json({ error: "Invalid plan data format" });
      }

      const translatedPlan = await translateDietPlan(parsedPlan, targetLanguage);

      // Update the DB record so it stays translated
      await storage.updateSavedDietPlan(planId, userId, JSON.stringify(translatedPlan));

      res.json(translatedPlan);
    } catch (error: any) {
      console.error("Translation route error:", error);
      res.status(500).json({ error: error.message || "Translation failed" });
    }
  });

  app.get("/api/diet-plan/job/:jobId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;
      const job = await storage.getDietPlanJob(jobId, userId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.status === "completed" && job.planData) {
        res.json({ status: "completed", planData: JSON.parse(job.planData) });
      } else if (job.status === "partial" && job.planData) {
        res.json({ status: "partial", planData: JSON.parse(job.planData) });
      } else if (job.status === "failed") {
        res.json({ status: "failed", error: job.error });
      } else if (job.status === "processing") {
        const elapsed = job.createdAt ? Math.round((Date.now() - new Date(job.createdAt).getTime()) / 1000) : 0;
        if (elapsed > 300) {
          await storage.updateDietPlanJob(jobId, {
            status: "failed",
            error: "Generation timed out after 5 minutes",
          });
          res.json({ status: "failed", error: "Generation timed out" });
        } else {
          res.json({ status: "processing", elapsed });
        }
      } else {
        res.json({ status: "pending" });
      }
    } catch (error) {
      console.error("Error checking diet plan job:", error);
      res.status(500).json({ error: "Failed to check job status" });
    }
  });

  // Helper string to check trainer access
  const verifyTrainerAccess = async (trainerId: string, clientId: string) => {
    // Assuming 'db', 'subscriberConnections', 'eq', 'and' are imported from your ORM/DB client
    // Example: import { db } from './db'; import { subscriberConnections } from './schema'; import { eq, and } from 'drizzle-orm';
    if (trainerId === clientId) return true; // A user can always access their own data
    const [conn] = await db.select().from(subscriberConnections)
      .where(and(eq(subscriberConnections.ownerId, trainerId), eq(subscriberConnections.clientId, clientId), eq(subscriberConnections.status, "active")))
      .limit(1);
    return !!conn;
  };

  app.get("/api/saved-diet-plans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const plans = await storage.getSavedDietPlans(targetId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching saved diet plans:", error);
      res.status(500).json({ error: "Failed to fetch saved diet plans" });
    }
  });

  app.post("/api/saved-diet-plans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      const { planData } = req.body;
      if (!planData) {
        return res.status(400).json({ error: "Plan data is required" });
      }

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const saved = await storage.saveDietPlan(targetId, typeof planData === "string" ? planData : JSON.stringify(planData));
      
      // If trainer authored it, try to update author id directly (since storage might not support authorId yet)
      // Assuming 'db' and 'savedDietPlans' are imported
      // Example: import { db } from './db'; import { savedDietPlans } from './schema'; import { eq } from 'drizzle-orm';
      if (targetClientId && targetClientId !== currentUserId) {
         await db.update(savedDietPlans).set({ authorId: currentUserId }).where(eq(savedDietPlans.id, saved.id));
      }

      res.json(saved);
    } catch (error) {
      console.error("Error saving diet plan:", error);
      res.status(500).json({ error: "Failed to save diet plan" });
    }
  });

  app.put("/api/saved-diet-plans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { id } = req.params;
      const { planData } = req.body;
      if (!planData) {
        return res.status(400).json({ error: "Plan data is required" });
      }

      const updated = await storage.updateSavedDietPlan(id, targetId, typeof planData === "string" ? planData : JSON.stringify(planData));

      if (!updated) {
        return res.status(404).json({ error: "Diet plan not found or not owned by user" });
      }

      if (targetClientId && targetClientId !== currentUserId) {
         await db.update(savedDietPlans).set({ authorId: currentUserId }).where(eq(savedDietPlans.id, updated.id));
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating saved diet plan:", error);
      res.status(500).json({ error: "Failed to update saved diet plan" });
    }
  });

  app.delete("/api/saved-diet-plans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { id } = req.params;
      await storage.deleteSavedDietPlan(id, targetId); // Assuming storage.deleteSavedDietPlan now accepts userId for verification
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved diet plan:", error);
      res.status(500).json({ error: "Failed to delete saved diet plan" });
    }
  });

  // ===== Workouts Endpoints =====
  app.get("/api/saved-workouts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const plans = await storage.getSavedWorkouts(targetId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching saved workouts:", error);
      res.status(500).json({ error: "Failed to fetch saved workouts" });
    }
  });

  app.post("/api/saved-workouts/sync", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      const { planData } = req.body;
      if (!planData) {
        return res.status(400).json({ error: "Plan data is required" });
      }

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Find if user already has a saved workout document
      const existing = await storage.getSavedWorkouts(targetId);
      const stringifiedPlanData = typeof planData === "string" ? planData : JSON.stringify(planData);

      if (existing && existing.length > 0) {
        // Update the first one
        const updated = await storage.updateSavedWorkout(existing[0].id, targetId, stringifiedPlanData);
        if (targetClientId && targetClientId !== currentUserId) {
           await db.update(savedWorkouts).set({ authorId: currentUserId }).where(eq(savedWorkouts.id, existing[0].id));
        }
        res.json(updated);
      } else {
        // Create new
        const saved = await storage.saveWorkout(targetId, stringifiedPlanData);
        if (targetClientId && targetClientId !== currentUserId) {
           await db.update(savedWorkouts).set({ authorId: currentUserId }).where(eq(savedWorkouts.id, saved.id));
        }
        res.json(saved);
      }
    } catch (error) {
      console.error("Error syncing workout:", error);
      res.status(500).json({ error: "Failed to sync workout" });
    }
  });

  app.post("/api/saved-workouts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      const { planData } = req.body;
      if (!planData) {
        return res.status(400).json({ error: "Plan data is required" });
      }

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const saved = await storage.saveWorkout(targetId, typeof planData === "string" ? planData : JSON.stringify(planData));

      if (targetClientId && targetClientId !== currentUserId) {
         await db.update(savedWorkouts).set({ authorId: currentUserId }).where(eq(savedWorkouts.id, saved.id));
      }

      res.json(saved);
    } catch (error) {
      console.error("Error saving workout:", error);
      res.status(500).json({ error: "Failed to save workout" });
    }
  });
  app.delete("/api/saved-workouts/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { id } = req.params;
      await storage.deleteSavedWorkout(id, targetId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved workout:", error);
      res.status(500).json({ error: "Failed to delete saved workout" });
    }
  });

  // ===== InBody Endpoints =====
  app.get("/api/inbody-results", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const results = await storage.getInbodyResults(targetId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching inbody results:", error);
      res.status(500).json({ error: "Failed to fetch inbody results" });
    }
  });

  app.post("/api/inbody-results", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const created = await storage.createInbodyResult(targetId, req.body);
      res.json(created);
    } catch (error) {
      console.error("Error saving inbody result:", error);
      res.status(500).json({ error: "Failed to save inbody result" });
    }
  });

  app.delete("/api/inbody-results/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetClientId = (req.query.clientId || req.query.targetClientId) as string | undefined;
      const targetId = targetClientId || currentUserId;

      if (targetClientId && targetClientId !== currentUserId) {
        if (!(await verifyTrainerAccess(currentUserId, targetClientId))) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { id } = req.params;
      await storage.deleteInbodyResult(id, targetId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inbody result:", error);
      res.status(500).json({ error: "Failed to delete inbody result" });
    }
  });


  // ===== Subscription / In-App Purchase Endpoints =====

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const userProfile = await storage.getUserProfile(userId);
      const rawPlan = userProfile?.subscriptionPlan || 'free';
      const plan = (rawPlan === 'basic' || rawPlan === 'premium') ? 'pro' : rawPlan;
      const expiresAt = userProfile?.subscriptionExpiresAt || null;
      const isActive = plan !== 'free' && (!expiresAt || new Date(expiresAt) > new Date());

      const trialEndsAt = userProfile?.trialEndsAt || null;
      const isTrialActive = plan === 'free' && trialEndsAt && new Date(trialEndsAt) > new Date();

      res.json({
        plan: userProfile?.subscriberManagementActive ? 'trainer' : plan,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive: isActive || !!isTrialActive,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        isTrialActive: !!isTrialActive,
        subscriberManagementActive: userProfile?.subscriberManagementActive || false,
        subscriberManagementLimit: userProfile?.subscriberManagementLimit || 0,
        dietPlansGenerated: userProfile?.dietPlansGenerated || 0,
        dietPlansResetAt: userProfile?.dietPlansResetAt ? new Date(userProfile.dietPlansResetAt).toISOString() : null,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/purchase", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { productId, plan, platform, receiptData, traineeLimit } = req.body;

      if (!productId || !plan || !platform) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (platform !== "ios" && platform !== "android") {
        return res.status(400).json({ error: "Invalid platform" });
      }

      if (plan !== 'trainee' && plan !== 'trainer' && plan !== 'pro') {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const period = req.body.period || 'monthly';
      if (period !== "monthly" && period !== "yearly") {
        return res.status(400).json({ error: "Invalid billing period" });
      }
      if (!receiptData || typeof receiptData !== "string" || !receiptData.trim()) {
        return res.status(400).json({ error: "Receipt data is required" });
      }

      console.log(`[IAP] Purchase request: user=${userId}, product=${productId}, plan=${plan}, period=${period}, platform=${platform}, traineeLimit=${traineeLimit || 0}`);
      if (process.env.NODE_ENV === "production") {
        return res.status(503).json({
          error: "RECEIPT_VALIDATION_REQUIRED",
          message: "Purchase receipt validation is required and not configured on this server.",
        });
      }
      if (process.env.ALLOW_UNVERIFIED_IAP !== "true") {
        return res.status(503).json({
          error: "RECEIPT_VALIDATION_REQUIRED",
          message: "Set ALLOW_UNVERIFIED_IAP=true only in local development to test purchases.",
        });
      }

      const expiresAt = new Date();
      if (period === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Map plan to DB value: trainee/pro → 'pro', trainer → 'pro' + management flags
      const dbPlan = 'pro';
      const isTrainerPlan = plan === 'trainer';

      await storage.updateSubscription(userId, {
        subscription: dbPlan,
        subscriptionExpiresAt: expiresAt.toISOString(),
        subscriptionProductId: productId,
        subscriptionPlatform: platform,
      });

      // If trainer plan, also activate subscriber management
      if (isTrainerPlan && traineeLimit) {
        await db.update(userProfiles)
          .set({
            subscriberManagementActive: true,
            subscriberManagementLimit: traineeLimit,
          })
          .where(eq(userProfiles.id, userId));
      }

      res.json({ success: true, plan, expiresAt: expiresAt.toISOString(), traineeLimit: isTrainerPlan ? traineeLimit : 0 });
    } catch (error) {
      console.error("Error processing purchase:", error);
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  app.post("/api/subscription/restore", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { platform } = req.body;

      // TODO: In production, query Apple/Google for active subscriptions
      // For now, check if user has an existing active subscription in the database
      const userProfile = await storage.getUserProfile(userId);
      if (userProfile?.subscriptionPlan && userProfile.subscriptionPlan !== 'free') {
        const expiresAt = userProfile.subscriptionExpiresAt;
        if (expiresAt && new Date(expiresAt) > new Date()) {
          res.json({ success: true, plan: userProfile.subscriptionPlan, expiresAt: new Date(expiresAt).toISOString() });
          return;
        }
      }

      res.json({ success: false, message: "No active subscription found" });
    } catch (error) {
      console.error("Error restoring purchases:", error);
      res.status(500).json({ error: "Failed to restore purchases" });
    }
  });

  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    try {
      // SECURITY: Verify webhook signature before processing
      // Apple: Verify JWS signature from App Store Server Notifications V2
      // Google: Verify RTDN (Real-Time Developer Notifications) via Cloud Pub/Sub
      const webhookSecret = process.env.IAP_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('[IAP Webhook] IAP_WEBHOOK_SECRET not configured - rejecting all webhooks');
        return res.status(503).json({ error: "Webhook not configured" });
      }
      const providedSecret = req.headers['x-webhook-secret'];
      if (typeof providedSecret !== "string" || !constantTimeEquals(providedSecret, webhookSecret)) {
        console.warn('[IAP Webhook] Unauthorized webhook attempt');
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { event, platform, userId, productId, plan } = req.body;

      if (!event || !platform || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log(`[IAP Webhook] ${platform} event: ${event} for user ${userId}`);

      switch (event) {
        case 'SUBSCRIPTION_RENEWED':
        case 'SUBSCRIPTION_PURCHASED': {
          const webhookExpiresAt = new Date();
          const webhookPeriod = productId?.includes('yearly') ? 'yearly' : 'monthly';
          if (webhookPeriod === 'yearly') {
            webhookExpiresAt.setFullYear(webhookExpiresAt.getFullYear() + 1);
          } else {
            webhookExpiresAt.setMonth(webhookExpiresAt.getMonth() + 1);
          }
          await storage.updateSubscription(userId, {
            subscription: plan || 'pro',
            subscriptionExpiresAt: webhookExpiresAt.toISOString(),
            subscriptionProductId: productId,
            subscriptionPlatform: platform,
          });
          break;
        }
        case 'SUBSCRIPTION_CANCELLED':
        case 'SUBSCRIPTION_EXPIRED': {
          await storage.updateSubscription(userId, {
            subscription: 'free',
            subscriptionExpiresAt: null,
            subscriptionProductId: null,
            subscriptionPlatform: null,
          });
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ===== Affiliate System Endpoints =====
  // [DISABLED] All affiliate endpoints are temporarily disabled until automatic payouts are implemented.
  // Files preserved: mobile/src/screens/AffiliateScreen.tsx, storage methods, schema tables.
  // To re-enable: uncomment the routes below and the commission tracking in /api/subscription/purchase.

  /*
  app.get("/api/affiliate/referral-code", isAuthenticated, async (req: any, res: Response) => { ... });
  app.post("/api/affiliate/register-referral", isAuthenticated, async (req: any, res: Response) => { ... });
  app.get("/api/affiliate/dashboard", isAuthenticated, async (req: any, res: Response) => { ... });
  app.post("/api/affiliate/withdraw", isAuthenticated, async (req: any, res: Response) => { ... });
  app.get("/api/admin/withdrawals", isAuthenticated, async (req: any, res: Response) => { ... });
  app.patch("/api/admin/withdrawals/:id", isAuthenticated, async (req: any, res: Response) => { ... });
  */

  // ===== Shared Workouts Endpoints =====
  app.post("/api/workouts/share", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { groupName, exercises } = req.body;
      const userId = req.user.claims?.sub || req.user.id;

      if (!groupName || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
        return res.status(400).json({ error: "Invalid workout data provided." });
      }

      // Generate a unique 6-character uppercase alphanumeric code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let shareCode = '';
      for (let i = 0; i < 6; i++) {
        shareCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      await db.insert(sharedWorkouts).values({
        shareCode,
        authorId: userId,
        groupName,
        exercises: JSON.stringify(exercises),
      });

      res.status(201).json({ shareCode });
    } catch (error) {
      console.error("Error sharing workout:", error);
      res.status(500).json({ error: "Failed to share workout." });
    }
  });

  app.get("/api/workouts/shared/:code", isAuthenticated, async (req: any, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();
      const sharedWorkout = await db.query.sharedWorkouts.findFirst({
        where: eq(sharedWorkouts.shareCode, code),
      });

      if (!sharedWorkout) {
        return res.status(404).json({ error: "Workout code not found." });
      }

      // Increment download counter
      await db.update(sharedWorkouts)
        .set({ downloads: sql`${sharedWorkouts.downloads} + 1` })
        .where(eq(sharedWorkouts.shareCode, code));

      res.json({
        groupName: sharedWorkout.groupName,
        exercises: typeof sharedWorkout.exercises === 'string' ? JSON.parse(sharedWorkout.exercises) : sharedWorkout.exercises,
        downloads: (sharedWorkout.downloads || 0) + 1,
      });
    } catch (error) {
      console.error("Error fetching shared workout:", error);
      res.status(500).json({ error: "Failed to fetch shared workout." });
    }
  });
  app.post("/api/diet-plans/share", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { planData } = req.body;
      const userId = req.user.claims?.sub || req.user.id;

      if (!planData || typeof planData !== 'object') {
        return res.status(400).json({ error: "Invalid diet plan data provided." });
      }

      // Generate a unique 6-character uppercase alphanumeric code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let shareCode = 'D-';
      for (let i = 0; i < 5; i++) {
        shareCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      await db.insert(sharedDietPlans).values({
        shareCode,
        authorId: userId,
        planData: planData,
      });

      res.status(201).json({ shareCode });
    } catch (error) {
      console.error("Error sharing diet plan:", error);
      res.status(500).json({ error: "Failed to share diet plan." });
    }
  });

  app.get("/api/diet-plans/shared/:code", isAuthenticated, async (req: any, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();
      const sharedPlan = await db.query.sharedDietPlans.findFirst({
        where: eq(sharedDietPlans.shareCode, code),
      });

      if (!sharedPlan) {
        return res.status(404).json({ error: "Diet Plan code not found." });
      }

      // Increment download counter
      await db.update(sharedDietPlans)
        .set({ downloads: sql`${sharedDietPlans.downloads} + 1` })
        .where(eq(sharedDietPlans.shareCode, code));

      res.json({
        planData: sharedPlan.planData,
        downloads: (sharedPlan.downloads || 0) + 1,
      });
    } catch (error) {
      console.error("Error fetching shared diet plan:", error);
      res.status(500).json({ error: "Failed to fetch shared diet plan." });
    }
  });

  // Get trainee uploaded files (trainer read-only access)
  app.get("/api/client-files/:clientId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const trainerId = req.user.claims.sub;
      const { clientId } = req.params;

      if (!(await verifyTrainerAccess(trainerId, clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const pdfs = await storage.getUploadedPdfsByUser(clientId);
      res.json(pdfs);
    } catch (error) {
      console.error("Error fetching client files:", error);
      res.status(500).json({ error: "Failed to fetch client files" });
    }
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const dbCheck = await db.execute(sql`SELECT 1`);
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: dbCheck ? "connected" : "error",
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============================================================
  // Trainer Reviews & Ratings
  // ============================================================

  // GET /api/trainers/public — List all trainers with subscription + avg rating
  app.get("/api/trainers/public", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      // Get all users who have a trainer subscription (plan contains 'trainer')
      const trainers = await db.select().from(userProfiles).where(
        sql`${userProfiles.subscriptionPlan}::text LIKE '%trainer%' OR ${userProfiles.subscriptionPlan}::text = 'premium' OR ${userProfiles.subscriptionPlan}::text = 'pro'`
      );

      const result = await Promise.all(
        trainers.map(async (trainer) => {
          const reviews = await db.select().from(trainerReviews).where(eq(trainerReviews.trainerId, trainer.id));
          const totalRatings = reviews.length;
          const avgRating = totalRatings > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
            : 0;
          return {
            id: trainer.id,
            name: [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') || 'Unknown',
            avatarUrl: trainer.profileImagePath || null,
            avgRating: Math.round(avgRating * 10) / 10,
            totalReviews: totalRatings,
            bio: trainer.bio || null,
            specialty: trainer.specialty || null,
            yearsOfExperience: trainer.yearsOfExperience || null,
            certifications: trainer.certifications || [],
            galleryImages: trainer.galleryImages || [],
            transformationPhotos: trainer.transformationPhotos || [],
          };
        })
      );

      res.json(result);
    } catch (error: any) {
      console.error("[trainers/public] Error:", error);
      res.status(500).json({ error: "Failed to fetch trainers" });
    }
  });

  // GET /api/trainers/:trainerId/reviews — Get reviews for a trainer
  app.get("/api/trainers/:trainerId/reviews", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.params;
      const tId = String(trainerId);
      const reviews = await db.select().from(trainerReviews)
        .where(eq(trainerReviews.trainerId, tId))
        .orderBy(desc(trainerReviews.createdAt));

      // Attach reviewer names
      const enriched = await Promise.all(
        reviews.map(async (review) => {
          const [reviewer] = await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName, profileImagePath: userProfiles.profileImagePath })
            .from(userProfiles)
            .where(eq(userProfiles.id, review.reviewerId))
            .limit(1);
          return {
            ...review,
            reviewerName: reviewer ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || 'Anonymous' : 'Anonymous',
            reviewerAvatar: reviewer?.profileImagePath || null,
          };
        })
      );

      res.json(enriched);
    } catch (error: any) {
      console.error("[trainers/reviews] Error:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // POST /api/trainers/:trainerId/reviews — Submit a review (only current/past trainees)
  app.post("/api/trainers/:trainerId/reviews", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const trainerId = String(req.params.trainerId);
      const { rating, reviewText } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if reviewer has a connection (current or past) with this trainer
      const connections = await db.select().from(subscriberConnections).where(
        and(
          eq(subscriberConnections.ownerId, trainerId),
          eq(subscriberConnections.clientId, user.id)
        )
      );

      if (connections.length === 0) {
        return res.status(403).json({
          error: "MUST_BE_TRAINEE",
          message: "You can only review trainers you are or were subscribed to"
        });
      }

      // Check if user already reviewed this trainer
      const existingReview = await db.select().from(trainerReviews).where(
        and(
          eq(trainerReviews.trainerId, trainerId),
          eq(trainerReviews.reviewerId, user.id)
        )
      );

      if (existingReview.length > 0) {
        return res.status(409).json({ error: "ALREADY_REVIEWED", message: "You have already reviewed this trainer" });
      }

      const [review] = await db.insert(trainerReviews).values({
        trainerId,
        reviewerId: user.id,
        rating: Math.round(rating),
        reviewText: reviewText?.trim() || null,
      }).returning();

      res.json(review);
    } catch (error: any) {
      console.error("[trainers/reviews/post] Error:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // GET /api/chats — List all chat conversations for the current user (standalone + subscriber)
  app.get("/api/chats", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user.id;
      const conversations: any[] = [];

      // 1. Standalone chats — find all unique users this person has chatted with
      const allStandaloneMessages = await db.select().from(standaloneChatMessages).where(
        or(
          eq(standaloneChatMessages.senderId, userId),
          eq(standaloneChatMessages.receiverId, userId)
        )
      ).orderBy(desc(standaloneChatMessages.createdAt));

      // Group by other user
      const standaloneMap = new Map<string, { lastMessage: any; unreadCount: number }>();
      for (const msg of allStandaloneMessages) {
        const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        if (!standaloneMap.has(otherUserId)) {
          standaloneMap.set(otherUserId, { lastMessage: msg, unreadCount: 0 });
        }
        // Count unread messages sent TO me
        if (msg.receiverId === userId && !msg.isRead) {
          const entry = standaloneMap.get(otherUserId)!;
          entry.unreadCount++;
        }
      }

      // Fetch user names for standalone chats
      for (const [otherUserId, data] of Array.from(standaloneMap.entries())) {
        const [otherUser] = await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName })
          .from(userProfiles).where(eq(userProfiles.id, otherUserId)).limit(1);
        const otherUserName = otherUser ? [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ') || 'Unknown' : 'Unknown';
        conversations.push({
          id: `standalone-${otherUserId}`,
          chatType: 'standalone',
          otherUserId,
          otherUserName,
          lastMessage: data.lastMessage.content || '',
          lastMessageTime: data.lastMessage.createdAt,
          unreadCount: data.unreadCount,
        });
      }

      // 2. Subscriber chats — find all connections where the user is owner or client
      const connections = await db.select().from(subscriberConnections).where(
        or(
          eq(subscriberConnections.ownerId, userId),
          eq(subscriberConnections.clientId, userId)
        )
      );

      for (const conn of connections) {
        const otherUserId = conn.ownerId === userId ? conn.clientId : conn.ownerId;

        // Get the latest message for this connection
        const msgs = await db.select().from(subscriberChatMessages)
          .where(eq(subscriberChatMessages.connectionId, conn.id))
          .orderBy(desc(subscriberChatMessages.createdAt))
          .limit(1);

        // Count unread messages sent TO me
        const unreadResult = await db.select({ count: sql<number>`count(*)::int` })
          .from(subscriberChatMessages)
          .where(
            and(
              eq(subscriberChatMessages.connectionId, conn.id),
              sql`${subscriberChatMessages.senderId} != ${userId}`,
              eq(subscriberChatMessages.isRead, false)
            )
          );

        const [otherUser] = await db.select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName })
          .from(userProfiles).where(eq(userProfiles.id, otherUserId)).limit(1);
        const otherUserName = otherUser ? [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ') || 'Unknown' : 'Unknown';

        const lastMsg = msgs[0];
        conversations.push({
          id: `subscriber-${conn.id}`,
          chatType: 'subscriber',
          otherUserId,
          otherUserName,
          connectionId: conn.id,
          lastMessage: lastMsg?.content || lastMsg?.attachmentUrl ? (lastMsg?.content || '📷 صورة') : '',
          lastMessageTime: lastMsg?.createdAt || conn.createdAt,
          unreadCount: unreadResult[0]?.count || 0,
        });
      }

      // Sort by last message time (newest first)
      conversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

      res.json(conversations);
    } catch (error: any) {
      console.error("[chats/list] Error:", error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  // GET /api/standalone-chat/:otherUserId — Get chat messages between current user and another user
  app.get("/api/standalone-chat/:otherUserId", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const otherUserId = String(req.params.otherUserId);

      const messages = await db.select().from(standaloneChatMessages).where(
        or(
          and(
            eq(standaloneChatMessages.senderId, user.id),
            eq(standaloneChatMessages.receiverId, otherUserId)
          ),
          and(
            eq(standaloneChatMessages.senderId, otherUserId),
            eq(standaloneChatMessages.receiverId, user.id)
          )
        )
      ).orderBy(standaloneChatMessages.createdAt);

      // Mark messages as read
      await db.update(standaloneChatMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(standaloneChatMessages.senderId, otherUserId),
            eq(standaloneChatMessages.receiverId, user.id),
            eq(standaloneChatMessages.isRead, false)
          )
        );

      res.json(messages);
    } catch (error: any) {
      console.error("[standalone-chat/get] Error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST /api/standalone-chat/:otherUserId — Send a message to another user
  app.post("/api/standalone-chat/:otherUserId", isAuthenticated as RequestHandler, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const otherUserId = String(req.params.otherUserId);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const [message] = await db.insert(standaloneChatMessages).values({
        senderId: user.id,
        receiverId: otherUserId,
        content: content.trim(),
      }).returning();

      res.json(message);
    } catch (error: any) {
      console.error("[standalone-chat/post] Error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  return httpServer;
}
