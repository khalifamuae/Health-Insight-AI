import OpenAI from "openai";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

let extractPdfText: (buffer: Buffer) => Promise<string>;
try {
  const _require = createRequire(import.meta.url);
  extractPdfText = _require("./pdfLoader.cjs").extractText;
} catch {
  const _require = createRequire(path.resolve(__dirname || ".", "dummy.js"));
  extractPdfText = _require("./pdfLoader.cjs").extractText;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ExtractedTest {
  testId: string;
  value: number | null;
  valueText: string | null;
  testDate: string | null;
}

const testNameMapping: Record<string, string> = {
  // Vitamins (English)
  "vitamin d": "vitamin-d",
  "vitamin d3": "vitamin-d",
  "25-oh vitamin d": "vitamin-d",
  "25-hydroxyvitamin d": "vitamin-d",
  "vitamin b12": "vitamin-b12",
  "cobalamin": "vitamin-b12",
  "folate": "folate",
  "folic acid": "folate",
  "vitamin b9": "folate",
  "iron": "iron",
  "serum iron": "iron",
  "ferritin": "ferritin",
  "vitamin a": "vitamin-a",
  "retinol": "vitamin-a",
  "vitamin e": "vitamin-e",
  "tocopherol": "vitamin-e",
  "vitamin k": "vitamin-k",
  "vitamin c": "vitamin-c",
  "ascorbic acid": "vitamin-c",

  // Vitamins (Arabic)
  "فيتامين د": "vitamin-d",
  "فيتامين د3": "vitamin-d",
  "فيتامين ب12": "vitamin-b12",
  "حمض الفوليك": "folate",
  "الحديد": "iron",
  "الفيريتين": "ferritin",
  "فيتامين أ": "vitamin-a",
  "فيتامين هـ": "vitamin-e",
  "فيتامين ك": "vitamin-k",
  "فيتامين ج": "vitamin-c",

  // Minerals (English)
  "calcium": "calcium",
  "magnesium": "magnesium",
  "zinc": "zinc",
  "sodium": "sodium",
  "potassium": "potassium",
  "phosphorus": "phosphorus",
  "copper": "copper",
  "selenium": "selenium",

  // Minerals (Arabic)
  "الكالسيوم": "calcium",
  "المغنيسيوم": "magnesium",
  "الزنك": "zinc",
  "الصوديوم": "sodium",
  "البوتاسيوم": "potassium",
  "الفوسفور": "phosphorus",
  "النحاس": "copper",
  "السيلينيوم": "selenium",

  // Hormones (English)
  "tsh": "tsh",
  "thyroid stimulating hormone": "tsh",
  "t3": "t3",
  "triiodothyronine": "t3",
  "t4": "t4",
  "thyroxine": "t4",
  "free t4": "free-t4",
  "ft4": "free-t4",
  "testosterone": "testosterone",
  "cortisol": "cortisol",
  "insulin": "insulin",
  "estradiol": "estradiol",
  "progesterone": "progesterone",
  "prolactin": "prolactin",
  "dhea": "dhea",
  "dhea-s": "dhea",
  "growth hormone": "growth-hormone",
  "gh": "growth-hormone",
  "pth": "pth",
  "parathyroid hormone": "pth",

  // Hormones (Arabic)
  "هرمون الغدة الدرقية": "tsh",
  "التستوستيرون": "testosterone",
  "الكورتيزول": "cortisol",
  "الأنسولين": "insulin",
  "الاستراديول": "estradiol",
  "البروجسترون": "progesterone",
  "البرولاكتين": "prolactin",

  // Organ Functions (English)
  "glucose": "glucose",
  "fasting glucose": "glucose",
  "blood sugar": "glucose",
  "fasting blood sugar": "glucose",
  "fbs": "glucose",
  "random blood sugar": "glucose",
  "rbs": "glucose",
  "hba1c": "hba1c",
  "hemoglobin a1c": "hba1c",
  "glycated hemoglobin": "hba1c",
  "creatinine": "creatinine",
  "bun": "bun",
  "blood urea nitrogen": "bun",
  "urea": "bun",
  "alt": "alt",
  "sgpt": "alt",
  "alanine aminotransferase": "alt",
  "ast": "ast",
  "sgot": "ast",
  "aspartate aminotransferase": "ast",
  "ggt": "ggt",
  "gamma gt": "ggt",
  "gamma-glutamyl transferase": "ggt",
  "alkaline phosphatase": "alp",
  "alp": "alp",
  "bilirubin": "bilirubin",
  "total bilirubin": "bilirubin",
  "albumin": "albumin",
  "total protein": "total-protein",
  "uric acid": "uric-acid",

  // Organ Functions (Arabic)
  "السكر الصائم": "glucose",
  "سكر الدم": "glucose",
  "الجلوكوز": "glucose",
  "السكر التراكمي": "hba1c",
  "الكرياتينين": "creatinine",
  "اليوريا": "bun",
  "إنزيمات الكبد": "alt",
  "البيليروبين": "bilirubin",
  "الألبومين": "albumin",
  "البروتين الكلي": "total-protein",
  "حمض اليوريك": "uric-acid",

  // Lipids (English)
  "cholesterol": "total-cholesterol",
  "total cholesterol": "total-cholesterol",
  "ldl": "ldl",
  "ldl cholesterol": "ldl",
  "ldl-c": "ldl",
  "hdl": "hdl",
  "hdl cholesterol": "hdl",
  "hdl-c": "hdl",
  "triglycerides": "triglycerides",
  "tg": "triglycerides",
  "vldl": "vldl",

  // Lipids (Arabic)
  "الكوليسترول": "total-cholesterol",
  "الكوليسترول الكلي": "total-cholesterol",
  "الكوليسترول الضار": "ldl",
  "الكوليسترول النافع": "hdl",
  "الدهون الثلاثية": "triglycerides",

  // Blood Tests (English)
  "hemoglobin": "hemoglobin",
  "hb": "hemoglobin",
  "hgb": "hemoglobin",
  "hematocrit": "hematocrit",
  "hct": "hematocrit",
  "rbc": "rbc",
  "red blood cells": "rbc",
  "red blood cell count": "rbc",
  "wbc": "wbc",
  "white blood cells": "wbc",
  "white blood cell count": "wbc",
  "platelets": "platelets",
  "plt": "platelets",
  "platelet count": "platelets",
  "mcv": "mcv",
  "mean corpuscular volume": "mcv",
  "mch": "mch",
  "mean corpuscular hemoglobin": "mch",
  "mchc": "mchc",
  "rdw": "rdw",
  "esr": "esr",
  "erythrocyte sedimentation rate": "esr",

  // Blood Tests (Arabic)
  "الهيموجلوبين": "hemoglobin",
  "خضاب الدم": "hemoglobin",
  "كريات الدم الحمراء": "rbc",
  "كريات الدم البيضاء": "wbc",
  "الصفائح الدموية": "platelets",
  "سرعة الترسيب": "esr",

  // Immunity (English)
  "crp": "crp",
  "c-reactive protein": "crp",
  "hs-crp": "hs-crp",
  "high sensitivity crp": "hs-crp",

  // Immunity (Arabic)
  "بروتين سي التفاعلي": "crp",

  // Coagulation (English)
  "pt": "pt",
  "prothrombin time": "pt",
  "inr": "inr",
  "ptt": "ptt",
  "aptt": "ptt",
  "partial thromboplastin time": "ptt",
  "d-dimer": "d-dimer",
  "fibrinogen": "fibrinogen",

  // Coagulation (Arabic)
  "زمن البروثرومبين": "pt",
  "الفيبرينوجين": "fibrinogen",
};

function findTestId(testName: string): string | null {
  const normalized = testName.toLowerCase().trim();

  if (testNameMapping[normalized]) {
    return testNameMapping[normalized];
  }

  for (const [key, value] of Object.entries(testNameMapping)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

export async function analyzeLabImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedTest[]> {
  try {
    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,\${base64}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `أنت محلل نتائج تحاليل طبية متخصص من الصور. مهمتك استخراج جميع نتائج الفحوصات من صورة التقرير المختبري.

لكل فحص تجده، استخرج:
- testName: اسم الفحص (بالعربية أو الإنجليزية كما يظهر)
- value: القيمة الرقمية (رقم)
- valueText: القيمة النصية إن لم تكن رقمية (مثل "Positive", "Negative", "إيجابي", "سلبي")
- unit: وحدة القياس
- testDate: تاريخ الفحص إن وجد بصيغة YYYY-MM-DD

أنواع الفحوصات التي يجب البحث عنها:
1. الفيتامينات: Vitamin D, Vitamin B12, Folic Acid, Iron, Ferritin, Vitamin A, E, K, C
2. المعادن: Calcium, Magnesium, Zinc, Sodium, Potassium, Phosphorus, Copper, Selenium
3. الهرمونات: TSH, T3, T4, Free T4, Testosterone, Cortisol, Insulin, Estradiol, Progesterone, Prolactin
4. وظائف الكبد: ALT, AST, ALP, GGT, Bilirubin, Albumin, Total Protein
5. وظائف الكلى: Creatinine, BUN, Uric Acid
6. الدهون: Cholesterol, LDL, HDL, Triglycerides
7. السكر: Glucose, Fasting Blood Sugar, HbA1c
8. صورة الدم: Hemoglobin, RBC, WBC, Platelets, MCV, MCH, MCHC, RDW, ESR
9. التخثر والمناعة: PT, PTT, INR, CRP, hs-CRP

تعليمات مهمة:
- استخرج القيمة الفعلية فقط، وليس المعدل الطبيعي (Reference Range)
- القيم تكون عادة في عمود "Result" أو "نتيجة" أو "القيمة"
- تعامل مع الأسماء بالعربية والإنجليزية
- إذا كان الرقم مثل "5.5" حوله إلى 5.5 رقمياً

أرجع JSON array فقط. مثال:
[
  {"testName": "Vitamin D", "value": 35.5, "valueText": null, "unit": "ng/mL", "testDate": "2026-01-15"}
]
إذا لم تجد أي نتائج، أرجع: []`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "حلل صورة التقرير المختبري هذه واستخرج جميع نتائج الفحوصات المطلوبة فقط." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] as any,
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    let parsed: any[];
    try {
      const jsonMatch = content.match(/\\[[\\s\\S]*\\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      console.error("Failed to parse AI image response:", content);
      parsed = [];
    }

    const extractedTests: ExtractedTest[] = [];
    for (const test of parsed) {
      const testName = (test.testName || "").trim();
      const testId = findTestId(testName);
      if (testId) {
        const numericValue = typeof test.value === "number" ? test.value :
          typeof test.value === "string" ? parseFloat(test.value) : null;
        extractedTests.push({
          testId,
          value: !isNaN(numericValue as number) ? numericValue : null,
          valueText: test.valueText || null,
          testDate: test.testDate || null,
        });
      }
    }
    return extractedTests;
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error("IMAGE_ANALYSIS_FAILED");
  }
}

export async function analyzeLabPdf(pdfBuffer: Buffer): Promise<ExtractedTest[]> {
  try {
    const pdfText = await extractPdfText(pdfBuffer);
    if (!pdfText || pdfText.trim().length < 50) {
      console.error("PDF text extraction failed or too short - may be a scanned image PDF");
      throw new Error("SCANNED_PDF");
    }

    const alphanumericChars = pdfText.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "").length;
    const totalChars = pdfText.length;
    const textDensity = alphanumericChars / totalChars;

    if (textDensity < 0.1) {
      console.error("Low text density - PDF may be scanned or image-based");
      throw new Error("SCANNED_PDF");
    }

    console.log("Extracted PDF text length:", pdfText.length, "Density:", textDensity.toFixed(2));

    // Limit text to prevent OpenAI token overflow
    const maxTextLength = 15000;
    const truncatedText = pdfText.length > maxTextLength
      ? pdfText.substring(0, maxTextLength) + "\n\n[... truncated ...]"
      : pdfText;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `أنت محلل نتائج تحاليل طبية متخصص.مهمتك استخراج جميع نتائج الفحوصات من التقرير المختبري.

لكل فحص تجده، استخرج:
        - testName: اسم الفحص(بالعربية أو الإنجليزية كما يظهر)
        - value: القيمة الرقمية(رقم)
        - valueText: القيمة النصية إن لم تكن رقمية(مثل "Positive", "Negative", "إيجابي", "سلبي")
        - unit: وحدة القياس
        - testDate: تاريخ الفحص إن وجد بصيغة YYYY - MM - DD

أنواع الفحوصات التي يجب البحث عنها:
        1. الفيتامينات: Vitamin D, Vitamin B12, Vitamin B1, Vitamin B6, Folic Acid, Vitamin A, Vitamin E, Vitamin K, Vitamin C
2. المعادن: Calcium, Magnesium, Iron, Zinc, Phosphorus, Sodium, Potassium, Chloride
3. الهرمونات: TSH, T3, T4, Free T4, Testosterone, Estrogen, Progesterone, FSH, LH, Cortisol, Insulin, DHEA
4. وظائف الكبد: ALT, AST, ALP, GGT, Bilirubin, Albumin, Total Protein
5. وظائف الكلى: Creatinine, BUN, Urea, Uric Acid, GFR
6. الدهون: Cholesterol, LDL, HDL, Triglycerides
7. السكر: Glucose, Fasting Glucose, HbA1c
8. صورة الدم: Hemoglobin, RBC, WBC, Platelets, MCV, MCH, MCHC, RDW, ESR, Hematocrit
9. التخثر: PT, INR, PTT, D - Dimer, Fibrinogen
10. المناعة: CRP, hs - CRP

تعليمات مهمة:
        - استخرج القيمة الفعلية فقط، وليس المعدل الطبيعي(Reference Range)
        - القيم تكون عادة في عمود "Result" أو "نتيجة" أو "القيمة"
        - المعدل الطبيعي يكون في عمود "Reference" أو "Normal" أو "المعدل الطبيعي" - لا تستخرجه
        - تعامل مع الأسماء بالعربية والإنجليزية
        - إذا كان الرقم مثل "5.5" حوله إلى 5.5 رقمياً

أرجع JSON array فقط.مثال:
        [
          { "testName": "Vitamin D", "value": 35.5, "valueText": null, "unit": "ng/mL", "testDate": "2026-01-15" },
          { "testName": "HbA1c", "value": 5.7, "valueText": null, "unit": "%", "testDate": null },
          { "testName": "فيتامين ب12", "value": 450, "valueText": null, "unit": "pg/mL", "testDate": null }
        ]

إذا لم تجد أي نتائج، أرجع: []`
        },
        {
          role: "user",
          content: `حلل هذا التقرير المختبري واستخرج جميع نتائج الفحوصات: \n\n${truncatedText}`
        }
      ],
      max_completion_tokens: 4000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "[]";
    console.log("AI Response:", content.substring(0, 500));

    let parsed: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      parsed = [];
    }

    console.log("Parsed tests count:", parsed.length);

    const extractedTests: ExtractedTest[] = [];

    for (const test of parsed) {
      const testName = (test.testName || "").trim();
      const testId = findTestId(testName);

      if (testId) {
        const numericValue = typeof test.value === "number" ? test.value :
          typeof test.value === "string" ? parseFloat(test.value) : null;

        extractedTests.push({
          testId,
          value: !isNaN(numericValue as number) ? numericValue : null,
          valueText: test.valueText || null,
          testDate: test.testDate || null,
        });
        console.log(`Matched: ${testName} -> ${testId} = ${numericValue}`);
      } else {
        console.log(`No mapping for test: ${testName}`);
      }
    }

    console.log("Final extracted tests:", extractedTests.length);
    return extractedTests;
  } catch (error) {
    console.error("PDF analysis error:", error);
    if (error instanceof Error && error.message === "SCANNED_PDF") {
      throw error;
    }
    throw new Error("ANALYSIS_FAILED");
  }
}
