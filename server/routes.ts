import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes, createApiToken } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { analyzeLabPdf, analyzeLabImage } from "./pdfAnalyzer";
import { analyzeInBodyPdf, analyzeInBodyImage } from "./inbodyAnalyzer";
import { generateDietPlan } from "./dietPlanGenerator";
import { getPrivacyPolicyHTML, getPrivacyPolicyArabicHTML, getTermsOfServiceHTML, getTermsOfServiceArabicHTML, getSupportPageHTML, getAccountDeletionHTML } from "./legalPages";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { userProfiles, testDefinitions, type TestDefinition } from "@shared/schema";
import crypto from "crypto";
import { emailVerificationCodes } from "@shared/schema";
import { getResendClient } from "./resendClient";

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
  limits: { fileSize: 20 * 1024 * 1024 }, // Allowed 20MB for images
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
    const key = `${req.ip}:${req.path}`;
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
          from: fromEmail || "BioTrack AI <noreply@resend.dev>",
          to: email,
          subject: "BioTrack AI - Verification Code / رمز التحقق",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;">
              <h2 style="color: #10b981;">BioTrack AI</h2>
              <p style="font-size: 16px; color: #374151;">Your verification code is:</p>
              <p style="font-size: 16px; color: #374151; direction: rtl;">رمز التحقق الخاص بك:</p>
              <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes.</p>
              <p style="font-size: 14px; color: #6b7280; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Send verification error:", err);
      res.status(500).json({ error: "Failed to send verification code" });
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
      trialEnd.setDate(trialEnd.getDate() + 15);

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
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);

      if (!profile) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);
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

      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { phone, age, weight, height, gender, fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies, proteinPreference, proteinPreferences, carbPreferences, bloodType, firstName, lastName, profileImagePath } = req.body;

      // Input validation
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
        firstName,
        lastName,
        profileImagePath,
        phone,
        age,
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
      });

      res.json(profile);
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
      reason: "Your free trial has expired. Please subscribe to view your data.",
      reasonAr: "انتهت الفترة التجريبية المجانية. يرجى الاشتراك لعرض بياناتك."
    };
  }

  // Test results routes - returns only user's actual test results
  app.get("/api/tests", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const tests = await storage.getLatestTestResultsByUser(userId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  // Full history (used for result comparison over time)
  app.get("/api/tests/history", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const tests = await storage.getTestResultsByUser(userId);
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
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }

      // Get all test definitions (ordered by importance and category)
      const definitions = await storage.getTestDefinitions();

      // Get user's test results
      const userTests = await storage.getTestResultsByUser(userId);

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
          id: userTest?.id || `empty-${def.id}`,
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

      // Check subscription limits
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
      const limits: Record<string, number> = { free: 3, basic: 20, premium: Infinity, pro: Infinity };
      if (filesUploaded >= limits[plan]) {
        return res.status(403).json({
          error: "Upload limit reached",
          message: "Please upgrade your subscription to upload more files"
        });
      }

      const normalizedFileName = file.originalname.toLowerCase().includes("inbody")
        ? file.originalname
        : `InBody-${file.originalname}`;

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
        ? `InBody-${file.originalname}`
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
        try {
          await storage.updateDietPlanJob(job.id, { status: "processing" });
          console.log(`Diet plan job ${job.id} started processing...`);

          const dietPlan = await generateDietPlan({
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
            customTargetCalories,
            language,
            testResults: testResultsData,
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          await storage.updateDietPlanJob(job.id, {
            status: "completed",
            planData: JSON.stringify(dietPlan),
          });

          console.log(`Diet plan job ${job.id} completed in ${elapsed}s`);
        } catch (error) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error(`Diet plan job ${job.id} failed after ${elapsed}s:`, error);
          await storage.updateDietPlanJob(job.id, {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();

      res.json({ jobId: job.id, status: "pending" });
    } catch (error) {
      console.error("Error starting diet plan job:", error);
      res.status(500).json({ error: "Failed to start diet plan generation" });
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
        res.json({ status: "completed", plan: JSON.parse(job.planData) });
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

  app.get("/api/saved-diet-plans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkSubscriptionAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: access.reason, messageAr: access.reasonAr });
      }
      const plans = await storage.getSavedDietPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching saved diet plans:", error);
      res.status(500).json({ error: "Failed to fetch saved diet plans" });
    }
  });

  app.post("/api/saved-diet-plans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { planData } = req.body;
      if (!planData) {
        return res.status(400).json({ error: "Plan data is required" });
      }
      const saved = await storage.saveDietPlan(userId, typeof planData === "string" ? planData : JSON.stringify(planData));
      res.json(saved);
    } catch (error) {
      console.error("Error saving diet plan:", error);
      res.status(500).json({ error: "Failed to save diet plan" });
    }
  });

  app.delete("/api/saved-diet-plans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteSavedDietPlan(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved diet plan:", error);
      res.status(500).json({ error: "Failed to delete saved diet plan" });
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
        plan,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        isTrialActive: !!isTrialActive,
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

      const { productId, plan, platform, receiptData } = req.body;

      if (!productId || !plan || !platform) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (platform !== "ios" && platform !== "android") {
        return res.status(400).json({ error: "Invalid platform" });
      }

      if (plan !== 'pro') {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const period = req.body.period || 'monthly';
      if (period !== "monthly" && period !== "yearly") {
        return res.status(400).json({ error: "Invalid billing period" });
      }
      if (!receiptData || typeof receiptData !== "string" || !receiptData.trim()) {
        return res.status(400).json({ error: "Receipt data is required" });
      }

      console.log(`[IAP] Purchase request: user=${userId}, product=${productId}, plan=${plan}, period=${period}, platform=${platform}`);
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

      await storage.updateSubscription(userId, {
        subscription: plan,
        subscriptionExpiresAt: expiresAt.toISOString(),
        subscriptionProductId: productId,
        subscriptionPlatform: platform,
      });

      // [DISABLED] Affiliate commission tracking - will be re-enabled with automatic payouts
      // try {
      //   const profile = await storage.getUserProfile(userId);
      //   if (profile?.referredBy) {
      //     const subscriptionAmount = period === 'yearly' ? 139.00 : 14.99;
      //     await storage.createCommission(profile.referredBy, userId, subscriptionAmount, productId);
      //   }
      // } catch (affErr) {
      //   console.error("[Affiliate] Error creating commission:", affErr);
      // }

      res.json({ success: true, plan, expiresAt: expiresAt.toISOString() });
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

  return httpServer;
}
