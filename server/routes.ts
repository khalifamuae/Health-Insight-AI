import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { analyzeLabPdf } from "./pdfAnalyzer";
import { generateDietPlan } from "./dietPlanGenerator";
import { getPrivacyPolicyHTML, getPrivacyPolicyArabicHTML, getTermsOfServiceHTML, getTermsOfServiceArabicHTML, getSupportPageHTML, getAccountDeletionHTML } from "./legalPages";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { userProfiles } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

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
        trialEnd.setDate(trialEnd.getDate() + 7);
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
      const { phone, age, weight, height, gender, fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies, proteinPreference, proteinPreferences, carbPreferences } = req.body;
      
      const profile = await storage.upsertUserProfile({
        id: userId,
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
      const tests = await storage.getTestResultsByUser(userId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
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
      const tests = await storage.getTestResultsByUser(userId);
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
      const extractedTests = await analyzeLabPdf(fileBuffer);

      // Get test definitions for matching
      const definitions = await storage.getTestDefinitions();
      const defMap = new Map(definitions.map(d => [d.id, d]));

      const defaultTestDate = new Date();
      let testsCreated = 0;

      // Create test results and reminders
      for (const extracted of extractedTests) {
        const def = defMap.get(extracted.testId);
        if (!def) continue;

        // Determine status
        let status: "normal" | "low" | "high" = "normal";
        if (def.normalRangeMin !== null && def.normalRangeMax !== null && extracted.value !== null) {
          if (extracted.value < def.normalRangeMin) status = "low";
          else if (extracted.value > def.normalRangeMax) status = "high";
        }

        // Use extracted date if available, otherwise use current date
        const testDate = extracted.testDate ? new Date(extracted.testDate) : defaultTestDate;

        // Create test result
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

        // Create reminder based on recheck interval
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

      // Update status to success
      await storage.updateUploadedPdfStatus(pdfId, "success", testsCreated);

      return { success: true, testsExtracted: testsCreated };
    } catch (error) {
      // Update status to failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await storage.updateUploadedPdfStatus(pdfId, "failed", undefined, errorMessage);
      throw error;
    }
  }

  // PDF upload and analysis
  app.post("/api/analyze-pdf", isAuthenticated, upload.single("pdf"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Check subscription limits
      const profile = await storage.getUserProfile(userId);
      const plan = profile?.subscriptionPlan || "free";
      const filesUploaded = profile?.filesUploaded || 0;
      
      const limits: Record<string, number> = { free: 3, basic: 20, premium: Infinity };
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

  // Retry processing a failed PDF (requires file to be re-uploaded)
  app.post("/api/uploaded-pdfs/:id/retry", isAuthenticated, upload.single("pdf"), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No PDF file uploaded for retry" });
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

      if (plan !== 'pro') {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const period = req.body.period || 'monthly';

      console.log(`[IAP] Purchase request: user=${userId}, product=${productId}, plan=${plan}, period=${period}, platform=${platform}`);

      // TODO: In production, validate receipt with Apple/Google servers
      // Apple: https://buy.itunes.apple.com/verifyReceipt
      // Google: Google Play Developer API - purchases.subscriptions.get

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
      // TODO: PRODUCTION SECURITY - Verify webhook signature before processing
      // Apple: Verify JWS signature from App Store Server Notifications V2
      // Google: Verify RTDN (Real-Time Developer Notifications) via Cloud Pub/Sub
      const webhookSecret = process.env.IAP_WEBHOOK_SECRET;
      const providedSecret = req.headers['x-webhook-secret'];
      if (webhookSecret && providedSecret !== webhookSecret) {
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

  return httpServer;
}
