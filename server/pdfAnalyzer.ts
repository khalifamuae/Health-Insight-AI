import OpenAI from "openai";

// Use Replit AI Integrations (no API key needed)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "placeholder",
});

interface ExtractedTest {
  testId: string;
  value: number | null;
  valueText: string | null;
}

// Map common test names to our test IDs
const testNameMapping: Record<string, string> = {
  // Vitamins
  "vitamin d": "vitamin-d",
  "vitamin d3": "vitamin-d",
  "25-oh vitamin d": "vitamin-d",
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
  
  // Minerals
  "calcium": "calcium",
  "magnesium": "magnesium",
  "zinc": "zinc",
  "sodium": "sodium",
  "potassium": "potassium",
  "phosphorus": "phosphorus",
  "copper": "copper",
  "selenium": "selenium",
  
  // Hormones
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
  
  // Organ Functions
  "glucose": "glucose",
  "fasting glucose": "glucose",
  "blood sugar": "glucose",
  "hba1c": "hba1c",
  "hemoglobin a1c": "hba1c",
  "glycated hemoglobin": "hba1c",
  "creatinine": "creatinine",
  "bun": "bun",
  "blood urea nitrogen": "bun",
  "urea": "bun",
  "alt": "alt",
  "sgpt": "alt",
  "ast": "ast",
  "sgot": "ast",
  "ggt": "ggt",
  "gamma gt": "ggt",
  "alkaline phosphatase": "alp",
  "alp": "alp",
  "bilirubin": "bilirubin",
  "total bilirubin": "bilirubin",
  "albumin": "albumin",
  "total protein": "total-protein",
  "uric acid": "uric-acid",
  
  // Lipids
  "cholesterol": "total-cholesterol",
  "total cholesterol": "total-cholesterol",
  "ldl": "ldl",
  "ldl cholesterol": "ldl",
  "hdl": "hdl",
  "hdl cholesterol": "hdl",
  "triglycerides": "triglycerides",
  "vldl": "vldl",
  
  // Blood Tests
  "hemoglobin": "hemoglobin",
  "hb": "hemoglobin",
  "hematocrit": "hematocrit",
  "hct": "hematocrit",
  "rbc": "rbc",
  "red blood cells": "rbc",
  "wbc": "wbc",
  "white blood cells": "wbc",
  "platelets": "platelets",
  "plt": "platelets",
  "mcv": "mcv",
  "mch": "mch",
  "mchc": "mchc",
  "rdw": "rdw",
  "esr": "esr",
  
  // Immunity
  "crp": "crp",
  "c-reactive protein": "crp",
  "hs-crp": "hs-crp",
  
  // Coagulation
  "pt": "pt",
  "prothrombin time": "pt",
  "inr": "inr",
  "ptt": "ptt",
  "aptt": "ptt",
  "d-dimer": "d-dimer",
  "fibrinogen": "fibrinogen",
};

export async function analyzeLabPdf(pdfBuffer: Buffer): Promise<ExtractedTest[]> {
  try {
    // Convert PDF to base64
    const base64Pdf = pdfBuffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical lab report analyzer. Extract all test results from the provided lab report.
For each test found, provide:
- testName: The exact name of the test as it appears
- value: The numeric value if available (as a number, not string)
- valueText: The text value if it's not numeric (like "Positive", "Negative", etc.)
- unit: The unit of measurement

Return the results as a JSON array. Example:
[
  {"testName": "Vitamin D", "value": 35.5, "valueText": null, "unit": "ng/mL"},
  {"testName": "HbA1c", "value": 5.7, "valueText": null, "unit": "%"},
  {"testName": "Blood Type", "value": null, "valueText": "A+", "unit": null}
]

Only include tests that have actual values. Skip reference ranges or headers.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this lab report and extract all test results with their values."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let parsed: any[];
    try {
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = [];
    }

    // Map extracted tests to our test IDs
    const extractedTests: ExtractedTest[] = [];
    
    for (const test of parsed) {
      const testName = (test.testName || "").toLowerCase().trim();
      const testId = testNameMapping[testName];
      
      if (testId) {
        extractedTests.push({
          testId,
          value: typeof test.value === "number" ? test.value : null,
          valueText: test.valueText || null,
        });
      }
    }

    return extractedTests;
  } catch (error) {
    console.error("PDF analysis error:", error);
    // Return empty array on error - frontend will show 0 tests found
    return [];
  }
}
