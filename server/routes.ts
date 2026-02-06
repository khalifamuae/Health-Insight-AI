import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { analyzeLabPdf } from "./pdfAnalyzer";
import { generateDietPlan } from "./dietPlanGenerator";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { db } from "./db";

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

  // Profile routes
  app.get("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        profile = await storage.upsertUserProfile({
          id: userId,
          subscriptionPlan: "free",
          filesUploaded: 0,
          language: "ar",
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
      const { phone, age, weight, height, gender, fitnessGoal, activityLevel, mealPreference, hasAllergies, allergies, proteinPreference } = req.body;
      
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
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Test results routes - returns only user's actual test results
  app.get("/api/tests", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
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

      const testResults = Array.from(latestByTest.values()).map(t => {
        const def = defMap.get(t.testId);
        return {
          testName: language === "ar" ? (def?.nameAr || t.testId) : (def?.nameEn || t.testId),
          value: t.value,
          status: t.status || "normal",
          normalRangeMin: def?.normalRangeMin ?? null,
          normalRangeMax: def?.normalRangeMax ?? null,
          unit: def?.unit ?? null,
          category: def?.category || "special",
        };
      });

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
        language,
        testResults,
      });

      res.json(dietPlan);
    } catch (error) {
      console.error("Error generating diet plan:", error);
      res.status(500).json({ error: "Failed to generate diet plan" });
    }
  });

  return httpServer;
}
