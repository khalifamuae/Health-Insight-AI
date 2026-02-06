import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";
export * from "./models/chat";

// Enums
export const testStatusEnum = pgEnum("test_status", ["normal", "low", "high"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "basic", "premium"]);
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
export const pdfStatusEnum = pgEnum("pdf_status", ["pending", "processing", "success", "failed"]);

// User profiles - extends auth users with health data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey(),
  phone: varchar("phone"),
  age: integer("age"),
  weight: real("weight"),
  height: real("height"),
  gender: genderEnum("gender"),
  fitnessGoal: fitnessGoalEnum("fitness_goal").default("maintain"),
  profileImagePath: text("profile_image_path"),
  language: varchar("language", { length: 5 }).default("ar"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").default("free"),
  filesUploaded: integer("files_uploaded").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  testResults: many(testResults),
  reminders: many(reminders),
  uploadedPdfs: many(uploadedPdfs),
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
export type SubscriptionPlan = "free" | "basic" | "premium";
export type Gender = "male" | "female";
export type FitnessGoal = "weight_loss" | "maintain" | "muscle_gain";
