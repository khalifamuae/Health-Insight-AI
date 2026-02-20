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
  knowledgeBase,
  knowledgeLearningLog,
  referrals,
  affiliateCommissions,
  withdrawalRequests,
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
  type KnowledgeEntry,
  type InsertKnowledgeEntry,
  type KnowledgeDomain,
  type KnowledgeLearningLogEntry,
  type Referral,
  type AffiliateCommission,
  type WithdrawalRequest,
  type WithdrawalStatus,
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

  updateSubscription(userId: string, data: {
    subscription: string;
    subscriptionExpiresAt: string | null;
    subscriptionProductId: string | null;
    subscriptionPlatform: string | null;
  }): Promise<void>;
  
  addKnowledgeEntry(entry: InsertKnowledgeEntry): Promise<KnowledgeEntry>;
  addKnowledgeEntries(entries: InsertKnowledgeEntry[]): Promise<KnowledgeEntry[]>;
  searchKnowledge(domain: KnowledgeDomain, searchTerms: string[]): Promise<KnowledgeEntry[]>;
  getAllKnowledge(domain?: KnowledgeDomain): Promise<KnowledgeEntry[]>;
  getKnowledgeCount(): Promise<Record<string, number>>;
  deleteKnowledgeEntry(id: string): Promise<void>;
  getLastLearningLog(domain: KnowledgeDomain): Promise<KnowledgeLearningLogEntry | null>;
  addLearningLog(domain: KnowledgeDomain, topicsSearched: string[], entriesAdded: number): Promise<void>;

  // Affiliate
  generateReferralCode(userId: string): Promise<string>;
  getUserByReferralCode(code: string): Promise<UserProfile | undefined>;
  createReferral(referrerId: string, referredUserId: string, code: string): Promise<Referral>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  getReferralCount(userId: string): Promise<number>;
  hasExistingCommission(referredUserId: string): Promise<boolean>;
  createCommission(referrerId: string, referredUserId: string, subscriptionAmount: number, productId?: string): Promise<AffiliateCommission | null>;
  getCommissionsByUser(userId: string): Promise<AffiliateCommission[]>;
  getTotalEarnings(userId: string): Promise<number>;
  getAvailableBalance(userId: string): Promise<number>;
  createWithdrawalRequest(userId: string, amount: number, paymentMethod: string, paymentDetails: string): Promise<WithdrawalRequest>;
  getWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(): Promise<(WithdrawalRequest & { userName?: string })[]>;
  updateWithdrawalStatus(id: string, status: WithdrawalStatus, adminNote?: string): Promise<WithdrawalRequest | null>;
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

  async updateSubscription(userId: string, data: {
    subscription: string;
    subscriptionExpiresAt: string | null;
    subscriptionProductId: string | null;
    subscriptionPlatform: string | null;
  }): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        subscriptionPlan: data.subscription as any,
        subscriptionExpiresAt: data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null,
        subscriptionProductId: data.subscriptionProductId,
        subscriptionPlatform: data.subscriptionPlatform,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleJobs = await db
      .update(dietPlanJobs)
      .set({ status: "failed", error: "Server restarted during generation", completedAt: new Date() })
      .where(and(
        sql`${dietPlanJobs.status} IN ('pending', 'processing')`,
        sql`${dietPlanJobs.createdAt} < ${fiveMinutesAgo}`
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

  async addKnowledgeEntry(entry: InsertKnowledgeEntry): Promise<KnowledgeEntry> {
    const [created] = await db.insert(knowledgeBase).values(entry).returning();
    return created;
  }

  async addKnowledgeEntries(entries: InsertKnowledgeEntry[]): Promise<KnowledgeEntry[]> {
    if (entries.length === 0) return [];
    const created = await db.insert(knowledgeBase).values(entries).returning();
    return created;
  }

  async searchKnowledge(domain: KnowledgeDomain, searchTerms: string[]): Promise<KnowledgeEntry[]> {
    if (searchTerms.length === 0) {
      return db.select().from(knowledgeBase)
        .where(eq(knowledgeBase.domain, domain))
        .orderBy(desc(knowledgeBase.createdAt))
        .limit(20);
    }
    const searchPattern = searchTerms.map(t => t.toLowerCase()).join("|");
    return db.select().from(knowledgeBase)
      .where(and(
        eq(knowledgeBase.domain, domain),
        sql`(LOWER(${knowledgeBase.topic}) ~* ${searchPattern} OR LOWER(${knowledgeBase.content}) ~* ${searchPattern} OR EXISTS (SELECT 1 FROM unnest(${knowledgeBase.tags}) tag WHERE LOWER(tag) ~* ${searchPattern}))`
      ))
      .orderBy(desc(knowledgeBase.createdAt))
      .limit(30);
  }

  async getAllKnowledge(domain?: KnowledgeDomain): Promise<KnowledgeEntry[]> {
    if (domain) {
      return db.select().from(knowledgeBase)
        .where(eq(knowledgeBase.domain, domain))
        .orderBy(desc(knowledgeBase.createdAt));
    }
    return db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeCount(): Promise<Record<string, number>> {
    const results = await db
      .select({ domain: knowledgeBase.domain, count: sql<number>`count(*)::int` })
      .from(knowledgeBase)
      .groupBy(knowledgeBase.domain);
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.domain] = r.count;
    }
    return counts;
  }

  async deleteKnowledgeEntry(id: string): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  async getLastLearningLog(domain: KnowledgeDomain): Promise<KnowledgeLearningLogEntry | null> {
    const [log] = await db.select().from(knowledgeLearningLog)
      .where(eq(knowledgeLearningLog.domain, domain))
      .orderBy(desc(knowledgeLearningLog.createdAt))
      .limit(1);
    return log || null;
  }

  async addLearningLog(domain: KnowledgeDomain, topicsSearched: string[], entriesAdded: number): Promise<void> {
    await db.insert(knowledgeLearningLog).values({
      domain,
      topicsSearched,
      entriesAdded,
      status: "completed",
    });
  }

  // Affiliate methods
  async generateReferralCode(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId);
    if (profile?.referralCode) return profile.referralCode;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await db.update(userProfiles)
      .set({ referralCode: code, updatedAt: new Date() })
      .where(eq(userProfiles.id, userId));

    return code;
  }

  async getUserByReferralCode(code: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.referralCode, code.toUpperCase()));
    return profile;
  }

  async createReferral(referrerId: string, referredUserId: string, code: string): Promise<Referral> {
    const existing = await db.select().from(referrals)
      .where(eq(referrals.referredUserId, referredUserId));
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(referrals)
      .values({ referrerId, referredUserId, referralCode: code })
      .returning();
    await db.update(userProfiles)
      .set({ referredBy: referrerId, updatedAt: new Date() })
      .where(eq(userProfiles.id, referredUserId));
    return created;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return db.select().from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    return result?.count || 0;
  }

  async hasExistingCommission(referredUserId: string): Promise<boolean> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.referredUserId, referredUserId));
    return (result?.count || 0) > 0;
  }

  async createCommission(referrerId: string, referredUserId: string, subscriptionAmount: number, productId?: string): Promise<AffiliateCommission | null> {
    const exists = await this.hasExistingCommission(referredUserId);
    if (exists) return null;

    const commissionRate = 0.10;
    const commissionAmount = subscriptionAmount * commissionRate;
    const [created] = await db.insert(affiliateCommissions)
      .values({
        referrerId,
        referredUserId,
        subscriptionAmount,
        commissionRate,
        commissionAmount,
        productId: productId || null,
        status: "earned",
      })
      .returning();
    return created;
  }

  async getCommissionsByUser(userId: string): Promise<AffiliateCommission[]> {
    return db.select().from(affiliateCommissions)
      .where(eq(affiliateCommissions.referrerId, userId))
      .orderBy(desc(affiliateCommissions.createdAt));
  }

  async getTotalEarnings(userId: string): Promise<number> {
    const [result] = await db.select({
      total: sql<number>`COALESCE(SUM(${affiliateCommissions.commissionAmount}), 0)::real`
    }).from(affiliateCommissions)
      .where(eq(affiliateCommissions.referrerId, userId));
    return result?.total || 0;
  }

  async getAvailableBalance(userId: string): Promise<number> {
    const totalEarnings = await this.getTotalEarnings(userId);
    const [withdrawnResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${withdrawalRequests.amount}), 0)::real`
    }).from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.userId, userId),
        sql`${withdrawalRequests.status} IN ('pending', 'approved', 'paid')`
      ));
    const withdrawn = withdrawnResult?.total || 0;
    return Math.max(0, totalEarnings - withdrawn);
  }

  async createWithdrawalRequest(userId: string, amount: number, paymentMethod: string, paymentDetails: string): Promise<WithdrawalRequest> {
    const [created] = await db.insert(withdrawalRequests)
      .values({ userId, amount, paymentMethod, paymentDetails, status: "pending" })
      .returning();
    return created;
  }

  async getWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    return db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests(): Promise<(WithdrawalRequest & { userName?: string })[]> {
    const results = await db.select().from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
    return results as (WithdrawalRequest & { userName?: string })[];
  }

  async updateWithdrawalStatus(id: string, status: WithdrawalStatus, adminNote?: string): Promise<WithdrawalRequest | null> {
    const updateData: Record<string, unknown> = { status };
    if (adminNote) updateData.adminNote = adminNote;
    if (status === 'approved' || status === 'paid' || status === 'rejected') {
      updateData.processedAt = new Date();
    }
    const [updated] = await db.update(withdrawalRequests)
      .set(updateData)
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return updated || null;
  }
}

export const storage = new DatabaseStorage();
