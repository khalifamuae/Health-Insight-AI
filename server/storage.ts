import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  userProfiles,
  testDefinitions,
  testResults,
  reminders,
  uploadedPdfs,
  savedDietPlans,
  dietPlanJobs,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type TestDefinition,
  type TestResult,
  type InsertTestResult,
  type Reminder,
  type InsertReminder,
  type UploadedPdf,
  type InsertUploadedPdf,
  type TestResultWithDefinition,
  type SavedDietPlan,
  type DietPlanJob,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  getTestDefinitions(): Promise<TestDefinition[]>;
  getTestDefinitionById(id: string): Promise<TestDefinition | undefined>;
  
  getTestResultsByUser(userId: string): Promise<TestResultWithDefinition[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  deleteTestResult(id: string, userId: string): Promise<void>;
  
  getRemindersByUser(userId: string): Promise<(Reminder & { testDefinition: TestDefinition })[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, userId: string, updates: { sent?: boolean; sentAt?: Date | null }): Promise<void>;
  deleteReminder(id: string, userId: string): Promise<void>;
  deleteReminderByTest(userId: string, testId: string): Promise<void>;
  
  getUploadedPdfsByUser(userId: string): Promise<UploadedPdf[]>;
  createUploadedPdf(pdf: InsertUploadedPdf): Promise<UploadedPdf>;
  incrementFilesUploaded(userId: string): Promise<void>;
  
  getSavedDietPlans(userId: string): Promise<SavedDietPlan[]>;
  saveDietPlan(userId: string, planData: string): Promise<SavedDietPlan>;
  deleteSavedDietPlan(id: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: {
          ...profile,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getTestDefinitions(): Promise<TestDefinition[]> {
    return db.select().from(testDefinitions).orderBy(testDefinitions.level);
  }

  async getTestDefinitionById(id: string): Promise<TestDefinition | undefined> {
    const [def] = await db
      .select()
      .from(testDefinitions)
      .where(eq(testDefinitions.id, id));
    return def;
  }

  async getTestResultsByUser(userId: string): Promise<TestResultWithDefinition[]> {
    const results = await db
      .select({
        id: testResults.id,
        userId: testResults.userId,
        testId: testResults.testId,
        value: testResults.value,
        valueText: testResults.valueText,
        status: testResults.status,
        testDate: testResults.testDate,
        pdfFileName: testResults.pdfFileName,
        pdfFilePath: testResults.pdfFilePath,
        createdAt: testResults.createdAt,
        testDefinition: testDefinitions,
      })
      .from(testResults)
      .innerJoin(testDefinitions, eq(testResults.testId, testDefinitions.id))
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.testDate));

    return results as TestResultWithDefinition[];
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }

  async deleteTestResult(id: string, userId: string): Promise<void> {
    await db
      .delete(testResults)
      .where(and(eq(testResults.id, id), eq(testResults.userId, userId)));
  }

  async getRemindersByUser(userId: string): Promise<(Reminder & { testDefinition: TestDefinition })[]> {
    const results = await db
      .select({
        id: reminders.id,
        userId: reminders.userId,
        testId: reminders.testId,
        dueDate: reminders.dueDate,
        sent: reminders.sent,
        sentAt: reminders.sentAt,
        createdAt: reminders.createdAt,
        testDefinition: testDefinitions,
      })
      .from(reminders)
      .innerJoin(testDefinitions, eq(reminders.testId, testDefinitions.id))
      .where(eq(reminders.userId, userId))
      .orderBy(reminders.dueDate);

    return results as (Reminder & { testDefinition: TestDefinition })[];
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: string, userId: string, updates: { sent?: boolean; sentAt?: Date | null }): Promise<void> {
    await db
      .update(reminders)
      .set(updates)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  }

  async deleteReminder(id: string, userId: string): Promise<void> {
    await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  }

  async deleteReminderByTest(userId: string, testId: string): Promise<void> {
    await db.delete(reminders).where(and(eq(reminders.userId, userId), eq(reminders.testId, testId)));
  }

  async getUploadedPdfsByUser(userId: string): Promise<UploadedPdf[]> {
    return db
      .select()
      .from(uploadedPdfs)
      .where(eq(uploadedPdfs.userId, userId))
      .orderBy(desc(uploadedPdfs.createdAt));
  }

  async createUploadedPdf(pdf: InsertUploadedPdf): Promise<UploadedPdf> {
    const [created] = await db.insert(uploadedPdfs).values(pdf).returning();
    return created;
  }

  async incrementFilesUploaded(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        filesUploaded: sql`COALESCE(${userProfiles.filesUploaded}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  async getUploadedPdfById(id: string, userId: string): Promise<UploadedPdf | null> {
    const results = await db
      .select()
      .from(uploadedPdfs)
      .where(and(eq(uploadedPdfs.id, id), eq(uploadedPdfs.userId, userId)));
    return results[0] || null;
  }

  async updateUploadedPdfStatus(
    id: string, 
    status: "pending" | "processing" | "success" | "failed",
    testsExtracted?: number,
    errorMessage?: string
  ): Promise<UploadedPdf | null> {
    const updateData: Record<string, unknown> = { status };
    if (testsExtracted !== undefined) {
      updateData.testsExtracted = testsExtracted;
      updateData.processedAt = new Date();
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    const [updated] = await db
      .update(uploadedPdfs)
      .set(updateData)
      .where(eq(uploadedPdfs.id, id))
      .returning();
    return updated || null;
  }

  async deleteUploadedPdf(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(uploadedPdfs)
      .where(and(eq(uploadedPdfs.id, id), eq(uploadedPdfs.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getSavedDietPlans(userId: string): Promise<SavedDietPlan[]> {
    return db
      .select()
      .from(savedDietPlans)
      .where(eq(savedDietPlans.userId, userId))
      .orderBy(desc(savedDietPlans.createdAt));
  }

  async saveDietPlan(userId: string, planData: string): Promise<SavedDietPlan> {
    const [created] = await db
      .insert(savedDietPlans)
      .values({ userId, planData })
      .returning();
    return created;
  }

  async deleteSavedDietPlan(id: string, userId: string): Promise<void> {
    await db
      .delete(savedDietPlans)
      .where(and(eq(savedDietPlans.id, id), eq(savedDietPlans.userId, userId)));
  }

  async createDietPlanJob(userId: string, language: string): Promise<DietPlanJob> {
    const [job] = await db
      .insert(dietPlanJobs)
      .values({ userId, language, status: "pending" })
      .returning();
    return job;
  }

  async getDietPlanJob(id: string, userId: string): Promise<DietPlanJob | null> {
    const [job] = await db
      .select()
      .from(dietPlanJobs)
      .where(and(eq(dietPlanJobs.id, id), eq(dietPlanJobs.userId, userId)));
    return job || null;
  }

  async getLatestPendingJob(userId: string): Promise<DietPlanJob | null> {
    const [job] = await db
      .select()
      .from(dietPlanJobs)
      .where(and(
        eq(dietPlanJobs.userId, userId),
        sql`${dietPlanJobs.status} IN ('pending', 'processing')`
      ))
      .orderBy(desc(dietPlanJobs.createdAt))
      .limit(1);
    return job || null;
  }

  async failStaleJobs(): Promise<number> {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const staleJobs = await db
      .update(dietPlanJobs)
      .set({ status: "failed", error: "Server restarted during generation", completedAt: new Date() })
      .where(and(
        sql`${dietPlanJobs.status} IN ('pending', 'processing')`,
        sql`${dietPlanJobs.createdAt} < ${threeMinutesAgo}`
      ))
      .returning();
    return staleJobs.length;
  }

  async updateDietPlanJob(id: string, updates: { status?: string; planData?: string; error?: string }): Promise<DietPlanJob | null> {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.status === "completed" || updates.status === "failed") {
      updateData.completedAt = new Date();
    }
    const [updated] = await db
      .update(dietPlanJobs)
      .set(updateData)
      .where(eq(dietPlanJobs.id, id))
      .returning();
    return updated || null;
  }
}

export const storage = new DatabaseStorage();
