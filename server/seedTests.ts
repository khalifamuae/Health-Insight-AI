import { db } from "./db";
import { testDefinitions } from "@shared/schema";

// 50 test definitions organized by category and importance level
const tests = [
  // Level 1: Essential Tests
  { id: "vitamin-d", nameEn: "Vitamin D", nameAr: "فيتامين د", category: "vitamins" as const, level: 1, unit: "ng/mL", normalRangeMin: 30, normalRangeMax: 100, recheckMonths: 3, descriptionEn: "Essential for bone health and immunity", descriptionAr: "ضروري لصحة العظام والمناعة" },
  { id: "hemoglobin", nameEn: "Hemoglobin", nameAr: "الهيموجلوبين", category: "blood" as const, level: 1, unit: "g/dL", normalRangeMin: 12, normalRangeMax: 17, recheckMonths: 3, descriptionEn: "Oxygen-carrying protein in red blood cells", descriptionAr: "البروتين الناقل للأكسجين في خلايا الدم الحمراء" },
  { id: "glucose", nameEn: "Fasting Glucose", nameAr: "السكر الصائم", category: "organ_functions" as const, level: 1, unit: "mg/dL", normalRangeMin: 70, normalRangeMax: 100, recheckMonths: 3, descriptionEn: "Blood sugar level after fasting", descriptionAr: "مستوى السكر في الدم بعد الصيام" },
  { id: "total-cholesterol", nameEn: "Total Cholesterol", nameAr: "الكولسترول الكلي", category: "lipids" as const, level: 1, unit: "mg/dL", normalRangeMin: 0, normalRangeMax: 200, recheckMonths: 6, descriptionEn: "Total amount of cholesterol in blood", descriptionAr: "إجمالي الكولسترول في الدم" },
  { id: "tsh", nameEn: "TSH", nameAr: "هرمون الغدة الدرقية", category: "hormones" as const, level: 1, unit: "mIU/L", normalRangeMin: 0.4, normalRangeMax: 4.0, recheckMonths: 6, descriptionEn: "Thyroid stimulating hormone", descriptionAr: "الهرمون المحفز للغدة الدرقية" },
  
  // Level 2: General Health
  { id: "vitamin-b12", nameEn: "Vitamin B12", nameAr: "فيتامين ب12", category: "vitamins" as const, level: 2, unit: "pg/mL", normalRangeMin: 200, normalRangeMax: 900, recheckMonths: 6, descriptionEn: "Essential for nerve function and DNA synthesis", descriptionAr: "ضروري لوظائف الأعصاب وتصنيع الحمض النووي" },
  { id: "iron", nameEn: "Serum Iron", nameAr: "الحديد", category: "minerals" as const, level: 2, unit: "mcg/dL", normalRangeMin: 60, normalRangeMax: 170, recheckMonths: 6, descriptionEn: "Essential mineral for blood production", descriptionAr: "معدن ضروري لإنتاج الدم" },
  { id: "ferritin", nameEn: "Ferritin", nameAr: "الفيريتين", category: "minerals" as const, level: 2, unit: "ng/mL", normalRangeMin: 12, normalRangeMax: 300, recheckMonths: 6, descriptionEn: "Iron storage protein", descriptionAr: "بروتين تخزين الحديد" },
  { id: "hba1c", nameEn: "HbA1c", nameAr: "السكر التراكمي", category: "organ_functions" as const, level: 2, unit: "%", normalRangeMin: 4, normalRangeMax: 5.7, recheckMonths: 3, descriptionEn: "3-month average blood sugar", descriptionAr: "متوسط السكر لثلاثة أشهر" },
  { id: "creatinine", nameEn: "Creatinine", nameAr: "الكرياتينين", category: "organ_functions" as const, level: 2, unit: "mg/dL", normalRangeMin: 0.7, normalRangeMax: 1.3, recheckMonths: 12, descriptionEn: "Kidney function marker", descriptionAr: "مؤشر وظائف الكلى" },
  { id: "ldl", nameEn: "LDL Cholesterol", nameAr: "الكولسترول الضار", category: "lipids" as const, level: 2, unit: "mg/dL", normalRangeMin: 0, normalRangeMax: 100, recheckMonths: 6, descriptionEn: "Bad cholesterol", descriptionAr: "الكولسترول الضار" },
  { id: "hdl", nameEn: "HDL Cholesterol", nameAr: "الكولسترول النافع", category: "lipids" as const, level: 2, unit: "mg/dL", normalRangeMin: 40, normalRangeMax: 100, recheckMonths: 6, descriptionEn: "Good cholesterol", descriptionAr: "الكولسترول النافع" },
  { id: "triglycerides", nameEn: "Triglycerides", nameAr: "الدهون الثلاثية", category: "lipids" as const, level: 2, unit: "mg/dL", normalRangeMin: 0, normalRangeMax: 150, recheckMonths: 6, descriptionEn: "Type of fat in blood", descriptionAr: "نوع من الدهون في الدم" },
  
  // Level 3: Hormones & Performance
  { id: "t3", nameEn: "T3 (Triiodothyronine)", nameAr: "هرمون T3", category: "hormones" as const, level: 3, unit: "ng/dL", normalRangeMin: 80, normalRangeMax: 200, recheckMonths: 6, descriptionEn: "Active thyroid hormone", descriptionAr: "هرمون الغدة الدرقية النشط" },
  { id: "t4", nameEn: "T4 (Thyroxine)", nameAr: "هرمون T4", category: "hormones" as const, level: 3, unit: "mcg/dL", normalRangeMin: 5, normalRangeMax: 12, recheckMonths: 6, descriptionEn: "Main thyroid hormone", descriptionAr: "هرمون الغدة الدرقية الرئيسي" },
  { id: "free-t4", nameEn: "Free T4", nameAr: "T4 الحر", category: "hormones" as const, level: 3, unit: "ng/dL", normalRangeMin: 0.8, normalRangeMax: 1.8, recheckMonths: 6, descriptionEn: "Unbound active T4", descriptionAr: "هرمون T4 الحر غير المرتبط" },
  { id: "testosterone", nameEn: "Testosterone", nameAr: "التستوستيرون", category: "hormones" as const, level: 3, unit: "ng/dL", normalRangeMin: 300, normalRangeMax: 1000, recheckMonths: 6, descriptionEn: "Male sex hormone", descriptionAr: "الهرمون الذكري" },
  { id: "cortisol", nameEn: "Cortisol", nameAr: "الكورتيزول", category: "hormones" as const, level: 3, unit: "mcg/dL", normalRangeMin: 6, normalRangeMax: 23, recheckMonths: 6, descriptionEn: "Stress hormone", descriptionAr: "هرمون التوتر" },
  { id: "insulin", nameEn: "Fasting Insulin", nameAr: "الأنسولين الصائم", category: "hormones" as const, level: 3, unit: "uIU/mL", normalRangeMin: 2, normalRangeMax: 25, recheckMonths: 6, descriptionEn: "Blood sugar regulating hormone", descriptionAr: "هرمون تنظيم السكر" },
  { id: "folate", nameEn: "Folate", nameAr: "حمض الفوليك", category: "vitamins" as const, level: 3, unit: "ng/mL", normalRangeMin: 3, normalRangeMax: 20, recheckMonths: 6, descriptionEn: "B vitamin essential for cell division", descriptionAr: "فيتامين ب ضروري لانقسام الخلايا" },
  
  // Level 4: Immunity & Inflammation
  { id: "crp", nameEn: "C-Reactive Protein", nameAr: "بروتين سي التفاعلي", category: "immunity" as const, level: 4, unit: "mg/L", normalRangeMin: 0, normalRangeMax: 10, recheckMonths: 6, descriptionEn: "Inflammation marker", descriptionAr: "مؤشر الالتهاب" },
  { id: "hs-crp", nameEn: "High-Sensitivity CRP", nameAr: "CRP عالي الحساسية", category: "immunity" as const, level: 4, unit: "mg/L", normalRangeMin: 0, normalRangeMax: 3, recheckMonths: 6, descriptionEn: "Sensitive inflammation and heart disease marker", descriptionAr: "مؤشر حساس للالتهاب وأمراض القلب" },
  { id: "wbc", nameEn: "White Blood Cells", nameAr: "كريات الدم البيضاء", category: "blood" as const, level: 4, unit: "K/uL", normalRangeMin: 4, normalRangeMax: 11, recheckMonths: 12, descriptionEn: "Immune system cells", descriptionAr: "خلايا الجهاز المناعي" },
  { id: "esr", nameEn: "ESR", nameAr: "سرعة الترسيب", category: "immunity" as const, level: 4, unit: "mm/hr", normalRangeMin: 0, normalRangeMax: 20, recheckMonths: 6, descriptionEn: "Erythrocyte sedimentation rate", descriptionAr: "سرعة ترسيب كريات الدم الحمراء" },
  { id: "alt", nameEn: "ALT", nameAr: "إنزيم الكبد ALT", category: "organ_functions" as const, level: 4, unit: "U/L", normalRangeMin: 7, normalRangeMax: 56, recheckMonths: 12, descriptionEn: "Liver enzyme", descriptionAr: "إنزيم الكبد" },
  { id: "ast", nameEn: "AST", nameAr: "إنزيم الكبد AST", category: "organ_functions" as const, level: 4, unit: "U/L", normalRangeMin: 10, normalRangeMax: 40, recheckMonths: 12, descriptionEn: "Liver and heart enzyme", descriptionAr: "إنزيم الكبد والقلب" },
  
  // Level 5: Advanced Vitamins & Minerals
  { id: "calcium", nameEn: "Calcium", nameAr: "الكالسيوم", category: "minerals" as const, level: 5, unit: "mg/dL", normalRangeMin: 8.6, normalRangeMax: 10.3, recheckMonths: 12, descriptionEn: "Essential for bones and muscles", descriptionAr: "ضروري للعظام والعضلات" },
  { id: "magnesium", nameEn: "Magnesium", nameAr: "المغنيسيوم", category: "minerals" as const, level: 5, unit: "mg/dL", normalRangeMin: 1.7, normalRangeMax: 2.2, recheckMonths: 12, descriptionEn: "Essential for nerve and muscle function", descriptionAr: "ضروري لوظائف الأعصاب والعضلات" },
  { id: "zinc", nameEn: "Zinc", nameAr: "الزنك", category: "minerals" as const, level: 5, unit: "mcg/dL", normalRangeMin: 60, normalRangeMax: 120, recheckMonths: 12, descriptionEn: "Important for immunity and healing", descriptionAr: "مهم للمناعة والشفاء" },
  { id: "vitamin-a", nameEn: "Vitamin A", nameAr: "فيتامين أ", category: "vitamins" as const, level: 5, unit: "mcg/dL", normalRangeMin: 30, normalRangeMax: 80, recheckMonths: 12, descriptionEn: "Important for vision and immunity", descriptionAr: "مهم للرؤية والمناعة" },
  { id: "vitamin-e", nameEn: "Vitamin E", nameAr: "فيتامين هـ", category: "vitamins" as const, level: 5, unit: "mg/L", normalRangeMin: 5, normalRangeMax: 20, recheckMonths: 12, descriptionEn: "Antioxidant vitamin", descriptionAr: "فيتامين مضاد للأكسدة" },
  { id: "vitamin-c", nameEn: "Vitamin C", nameAr: "فيتامين ج", category: "vitamins" as const, level: 5, unit: "mg/dL", normalRangeMin: 0.4, normalRangeMax: 2.0, recheckMonths: 12, descriptionEn: "Essential for immunity and collagen", descriptionAr: "ضروري للمناعة والكولاجين" },
  { id: "sodium", nameEn: "Sodium", nameAr: "الصوديوم", category: "minerals" as const, level: 5, unit: "mEq/L", normalRangeMin: 136, normalRangeMax: 145, recheckMonths: 12, descriptionEn: "Important electrolyte for fluid balance", descriptionAr: "إلكتروليت مهم لتوازن السوائل" },
  { id: "potassium", nameEn: "Potassium", nameAr: "البوتاسيوم", category: "minerals" as const, level: 5, unit: "mEq/L", normalRangeMin: 3.5, normalRangeMax: 5.0, recheckMonths: 12, descriptionEn: "Essential for heart and muscles", descriptionAr: "ضروري للقلب والعضلات" },
  
  // Level 6: Heart & Coagulation
  { id: "pt", nameEn: "Prothrombin Time", nameAr: "زمن البروثرومبين", category: "coagulation" as const, level: 6, unit: "seconds", normalRangeMin: 11, normalRangeMax: 13.5, recheckMonths: 12, descriptionEn: "Blood clotting time", descriptionAr: "زمن تخثر الدم" },
  { id: "inr", nameEn: "INR", nameAr: "معدل التخثر الدولي", category: "coagulation" as const, level: 6, unit: "", normalRangeMin: 0.8, normalRangeMax: 1.2, recheckMonths: 12, descriptionEn: "International Normalized Ratio", descriptionAr: "المعدل الدولي الطبيعي للتخثر" },
  { id: "ptt", nameEn: "PTT", nameAr: "زمن الثرومبوبلاستين", category: "coagulation" as const, level: 6, unit: "seconds", normalRangeMin: 25, normalRangeMax: 35, recheckMonths: 12, descriptionEn: "Partial thromboplastin time", descriptionAr: "زمن الثرومبوبلاستين الجزئي" },
  { id: "d-dimer", nameEn: "D-Dimer", nameAr: "دي-دايمر", category: "coagulation" as const, level: 6, unit: "ng/mL", normalRangeMin: 0, normalRangeMax: 500, recheckMonths: 12, descriptionEn: "Blood clot breakdown marker", descriptionAr: "مؤشر تحلل الجلطات" },
  { id: "fibrinogen", nameEn: "Fibrinogen", nameAr: "الفيبرينوجين", category: "coagulation" as const, level: 6, unit: "mg/dL", normalRangeMin: 200, normalRangeMax: 400, recheckMonths: 12, descriptionEn: "Clotting factor", descriptionAr: "عامل التخثر" },
  { id: "rbc", nameEn: "Red Blood Cells", nameAr: "كريات الدم الحمراء", category: "blood" as const, level: 6, unit: "M/uL", normalRangeMin: 4.5, normalRangeMax: 5.5, recheckMonths: 12, descriptionEn: "Oxygen-carrying cells", descriptionAr: "الخلايا الناقلة للأكسجين" },
  { id: "platelets", nameEn: "Platelets", nameAr: "الصفائح الدموية", category: "blood" as const, level: 6, unit: "K/uL", normalRangeMin: 150, normalRangeMax: 400, recheckMonths: 12, descriptionEn: "Blood clotting cells", descriptionAr: "خلايا تخثر الدم" },
  
  // Level 7: Special Tests
  { id: "estradiol", nameEn: "Estradiol", nameAr: "الإستراديول", category: "hormones" as const, level: 7, unit: "pg/mL", normalRangeMin: 15, normalRangeMax: 350, recheckMonths: 6, descriptionEn: "Female sex hormone", descriptionAr: "الهرمون الأنثوي" },
  { id: "progesterone", nameEn: "Progesterone", nameAr: "البروجسترون", category: "hormones" as const, level: 7, unit: "ng/mL", normalRangeMin: 0.1, normalRangeMax: 25, recheckMonths: 6, descriptionEn: "Pregnancy hormone", descriptionAr: "هرمون الحمل" },
  { id: "prolactin", nameEn: "Prolactin", nameAr: "البرولاكتين", category: "hormones" as const, level: 7, unit: "ng/mL", normalRangeMin: 2, normalRangeMax: 29, recheckMonths: 6, descriptionEn: "Milk production hormone", descriptionAr: "هرمون إنتاج الحليب" },
  { id: "dhea", nameEn: "DHEA-S", nameAr: "DHEA-S", category: "hormones" as const, level: 7, unit: "mcg/dL", normalRangeMin: 35, normalRangeMax: 430, recheckMonths: 12, descriptionEn: "Adrenal hormone precursor", descriptionAr: "مقدمة هرمونات الغدة الكظرية" },
  { id: "pth", nameEn: "Parathyroid Hormone", nameAr: "هرمون الجار درقية", category: "hormones" as const, level: 7, unit: "pg/mL", normalRangeMin: 15, normalRangeMax: 65, recheckMonths: 12, descriptionEn: "Calcium regulating hormone", descriptionAr: "هرمون تنظيم الكالسيوم" },
  { id: "bun", nameEn: "Blood Urea Nitrogen", nameAr: "نيتروجين يوريا الدم", category: "organ_functions" as const, level: 7, unit: "mg/dL", normalRangeMin: 7, normalRangeMax: 20, recheckMonths: 12, descriptionEn: "Kidney function marker", descriptionAr: "مؤشر وظائف الكلى" },
  { id: "uric-acid", nameEn: "Uric Acid", nameAr: "حمض اليوريك", category: "organ_functions" as const, level: 7, unit: "mg/dL", normalRangeMin: 3.5, normalRangeMax: 7.2, recheckMonths: 12, descriptionEn: "Gout and kidney marker", descriptionAr: "مؤشر النقرس والكلى" },
  { id: "bilirubin", nameEn: "Total Bilirubin", nameAr: "البيليروبين الكلي", category: "organ_functions" as const, level: 7, unit: "mg/dL", normalRangeMin: 0.1, normalRangeMax: 1.2, recheckMonths: 12, descriptionEn: "Liver function marker", descriptionAr: "مؤشر وظائف الكبد" },
  { id: "albumin", nameEn: "Albumin", nameAr: "الألبومين", category: "organ_functions" as const, level: 7, unit: "g/dL", normalRangeMin: 3.5, normalRangeMax: 5.5, recheckMonths: 12, descriptionEn: "Liver and nutrition marker", descriptionAr: "مؤشر الكبد والتغذية" },
];

export async function seedTestDefinitions() {
  try {
    console.log("Seeding test definitions...");
    
    for (const test of tests) {
      await db
        .insert(testDefinitions)
        .values(test)
        .onConflictDoUpdate({
          target: testDefinitions.id,
          set: test,
        });
    }
    
    console.log(`Successfully seeded ${tests.length} test definitions`);
  } catch (error) {
    console.error("Error seeding test definitions:", error);
    throw error;
  }
}

// Run if executed directly
seedTestDefinitions().catch(console.error);
