import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";
export * from "./models/chat";

// Enums
export const testStatusEnum = pgEnum("test_status", ["normal", "low", "high"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "basic", "premium", "pro"]);
export const testCategoryEnum = pgEnum("test_category", [
  "vitamins",
  "minerals",
  "hormones",
  "organ_functions",
  "lipids",
  "immunity",
  "blood",
  "coagulation",
  "special"
]);
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const fitnessGoalEnum = pgEnum("fitness_goal", ["weight_loss", "maintain", "muscle_gain"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "lightly_active", "very_active", "extremely_active"]);
export const mealPreferenceEnum = pgEnum("meal_preference", ["high_protein", "balanced", "low_carb", "vegetarian", "custom_macros"]);
export const proteinPreferenceEnum = pgEnum("protein_preference", ["fish", "chicken", "meat", "mixed"]); // kept for DB compatibility
export const pdfStatusEnum = pgEnum("pdf_status", ["pending", "processing", "success", "failed"]);

// User profiles - extends auth users with health data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey(),
  email: varchar("email"),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  age: integer("age"),
  weight: real("weight"),
  height: real("height"),
  gender: genderEnum("gender"),
  fitnessGoal: fitnessGoalEnum("fitness_goal").default("maintain"),
  activityLevel: activityLevelEnum("activity_level").default("sedentary"),
  mealPreference: mealPreferenceEnum("meal_preference").default("balanced"),
  hasAllergies: boolean("has_allergies").default(false),
  allergies: text("allergies").array(),
  proteinPreference: proteinPreferenceEnum("protein_preference").default("mixed"),
  proteinPreferences: text("protein_preferences").array(),
  carbPreferences: text("carb_preferences").array(),
  bloodType: varchar("blood_type", { length: 10 }),
  referralCode: varchar("referral_code", { length: 10 }),
  referredBy: varchar("referred_by"),
  profileImagePath: text("profile_image_path"),
  language: varchar("language", { length: 5 }).default("ar"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  subscriptionProductId: varchar("subscription_product_id"),
  subscriptionPlatform: varchar("subscription_platform", { length: 10 }),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  filesUploaded: integer("files_uploaded").default(0),
  dietPlansGenerated: integer("diet_plans_generated").default(0),
  dietPlansResetAt: timestamp("diet_plans_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Test definitions - the 50 tests with their metadata
export const testDefinitions = pgTable("test_definitions", {
  id: varchar("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  shortName: varchar("short_name", { length: 20 }), // Short English abbreviation
  category: testCategoryEnum("category").notNull(),
  level: integer("level").notNull(), // 1-7 importance level
  unit: varchar("unit", { length: 50 }),
  normalRangeMin: real("normal_range_min"),
  normalRangeMax: real("normal_range_max"),
  normalRangeText: text("normal_range_text"),
  recheckMonths: integer("recheck_months").default(6), // How often to recheck
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
});

// User test results
export const testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  testId: varchar("test_id").notNull(),
  value: real("value"),
  valueText: text("value_text"),
  status: testStatusEnum("status").default("normal"),
  testDate: timestamp("test_date").notNull(),
  pdfFileName: text("pdf_file_name"),
  pdfFilePath: text("pdf_file_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reminders for re-testing
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  testId: varchar("test_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Uploaded PDFs tracking
export const uploadedPdfs = pgTable("uploaded_pdfs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  status: pdfStatusEnum("status").default("pending"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  testsExtracted: integer("tests_extracted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Diet plan background jobs
export const dietPlanJobs = pgTable("diet_plan_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, completed, failed
  planData: text("plan_data"),
  error: text("error"),
  language: varchar("language").default("ar"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Saved diet plans
export const savedDietPlans = pgTable("saved_diet_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planData: text("plan_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shared workout routines
export const sharedWorkouts = pgTable("shared_workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareCode: varchar("share_code", { length: 6 }).notNull().unique(),
  authorId: varchar("author_id").notNull(),
  groupName: text("group_name").notNull(),
  exercises: jsonb("exercises").notNull(),
  downloads: integer("downloads").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge domains
export const knowledgeDomainEnum = pgEnum("knowledge_domain", [
  "nutrition",
  "aerobic_training",
  "resistance_training",
  "vitamins_minerals",
  "hormones"
]);

// Knowledge base - stores scientific knowledge from trusted sources
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: knowledgeDomainEnum("domain").notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  contentAr: text("content_ar"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge learning log - tracks when the system last learned
export const knowledgeLearningLog = pgTable("knowledge_learning_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: knowledgeDomainEnum("domain").notNull(),
  topicsSearched: text("topics_searched").array(),
  entriesAdded: integer("entries_added").default(0),
  status: varchar("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate system enums
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected", "paid"]);

// Referrals - tracks who referred whom
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredUserId: varchar("referred_user_id").notNull(),
  referralCode: varchar("referral_code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate commissions - tracks earned commissions
export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredUserId: varchar("referred_user_id").notNull(),
  subscriptionAmount: real("subscription_amount").notNull(),
  commissionRate: real("commission_rate").notNull().default(0.10),
  commissionAmount: real("commission_amount").notNull(),
  productId: varchar("product_id"),
  status: varchar("status").notNull().default("earned"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawal requests
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: real("amount").notNull(),
  paymentMethod: varchar("payment_method").notNull(),
  paymentDetails: text("payment_details").notNull(),
  status: withdrawalStatusEnum("status").default("pending"),
  adminNote: text("admin_note"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  testResults: many(testResults),
  reminders: many(reminders),
  uploadedPdfs: many(uploadedPdfs),
  savedDietPlans: many(savedDietPlans),
  sharedWorkouts: many(sharedWorkouts),
}));

export const testDefinitionsRelations = relations(testDefinitions, ({ many }) => ({
  testResults: many(testResults),
  reminders: many(reminders),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(userProfiles, {
    fields: [testResults.userId],
    references: [userProfiles.id],
  }),
  testDefinition: one(testDefinitions, {
    fields: [testResults.testId],
    references: [testDefinitions.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(userProfiles, {
    fields: [reminders.userId],
    references: [userProfiles.id],
  }),
  testDefinition: one(testDefinitions, {
    fields: [reminders.testId],
    references: [testDefinitions.id],
  }),
}));

export const uploadedPdfsRelations = relations(uploadedPdfs, ({ one }) => ({
  user: one(userProfiles, {
    fields: [uploadedPdfs.userId],
    references: [userProfiles.id],
  }),
}));

export const savedDietPlansRelations = relations(savedDietPlans, ({ one }) => ({
  user: one(userProfiles, {
    fields: [savedDietPlans.userId],
    references: [userProfiles.id],
  }),
}));

export const sharedWorkoutsRelations = relations(sharedWorkouts, ({ one }) => ({
  author: one(userProfiles, {
    fields: [sharedWorkouts.authorId],
    references: [userProfiles.id],
  }),
}));

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
});

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  sent: true,
  sentAt: true,
  createdAt: true,
});

export const insertUploadedPdfSchema = createInsertSchema(uploadedPdfs).omit({
  id: true,
  createdAt: true,
});

export const insertSavedDietPlanSchema = createInsertSchema(savedDietPlans).omit({
  id: true,
  createdAt: true,
});

export const insertSharedWorkoutSchema = createInsertSchema(sharedWorkouts).omit({
  id: true,
  downloads: true,
  createdAt: true,
});

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type TestDefinition = typeof testDefinitions.$inferSelect;

export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

export type UploadedPdf = typeof uploadedPdfs.$inferSelect;
export type InsertUploadedPdf = z.infer<typeof insertUploadedPdfSchema>;

export type SavedDietPlan = typeof savedDietPlans.$inferSelect;
export type InsertSavedDietPlan = z.infer<typeof insertSavedDietPlanSchema>;

export type DietPlanJob = typeof dietPlanJobs.$inferSelect;

// Extended types for frontend
export type TestResultWithDefinition = TestResult & {
  testDefinition: TestDefinition;
};

// All 50 tests merged with user values (0 if missing)
export interface AllTestsData {
  id: string;
  testId: string;
  nameEn: string;
  nameAr: string;
  shortName: string | null;
  category: TestCategory;
  importance: number;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  recheckMonths: number | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  value: number;
  valueText: string | null;
  status: TestStatus | "pending";
  testDate: string | null;
  pdfFileName: string | null;
  hasResult: boolean;
  order: number;
}

export type TestCategory = "vitamins" | "minerals" | "hormones" | "organ_functions" | "lipids" | "immunity" | "blood" | "coagulation" | "special";
export type TestStatus = "normal" | "low" | "high";
export type SubscriptionPlan = "free" | "basic" | "premium" | "pro";
export type Gender = "male" | "female";
export type FitnessGoal = "weight_loss" | "maintain" | "muscle_gain";
export type ActivityLevel = "sedentary" | "lightly_active" | "very_active" | "extremely_active";
export type MealPreference = "high_protein" | "balanced" | "low_carb" | "vegetarian" | "custom_macros";
export type ProteinPreference = "fish" | "chicken" | "meat" | "mixed";
export type KnowledgeDomain = "nutrition" | "aerobic_training" | "resistance_training" | "vitamins_minerals" | "hormones";

export type KnowledgeEntry = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeEntry = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeLearningLogEntry = typeof knowledgeLearningLog.$inferSelect;

// Affiliate types
export type Referral = typeof referrals.$inferSelect;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export type SharedWorkout = typeof sharedWorkouts.$inferSelect;
export type InsertSharedWorkout = z.infer<typeof insertSharedWorkoutSchema>;
