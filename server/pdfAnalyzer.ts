import OpenAI from "openai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ExtractedTest {
  testId: string;
  value: number | null;
  valueText: string | null;
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

export async function analyzeLabPdf(pdfBuffer: Buffer): Promise<ExtractedTest[]> {
  try {
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical lab report analyzer specialized in extracting test results from laboratory reports. 
Your task is to carefully analyze the provided lab report text and extract ALL test results.

For each test found, provide:
- testName: The name of the test (in the language it appears, Arabic or English)
- value: The numeric value if available (as a number)
- valueText: The text value if not numeric (like "Positive", "Negative", "إيجابي", "سلبي")
- unit: The unit of measurement

IMPORTANT GUIDELINES:
1. Look for common lab tests like: CBC (Complete Blood Count), Lipid Panel, Liver Function, Kidney Function, Thyroid, Vitamins, Minerals, Hormones
2. Extract ACTUAL values only - ignore reference ranges
3. Handle both Arabic and English test names
4. Parse numeric values correctly (e.g., "5.5" should be 5.5)
5. Include the unit when available

Return ONLY a valid JSON array. Example:
[
  {"testName": "Vitamin D", "value": 35.5, "valueText": null, "unit": "ng/mL"},
  {"testName": "HbA1c", "value": 5.7, "valueText": null, "unit": "%"},
  {"testName": "فيتامين ب12", "value": 450, "valueText": null, "unit": "pg/mL"},
  {"testName": "Hemoglobin", "value": 14.5, "valueText": null, "unit": "g/dL"}
]

If you cannot find any test results, return an empty array: []`
        },
        {
          role: "user",
          content: `Please analyze this lab report and extract all test results:\n\n${pdfText}`
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
