import OpenAI from "openai";
import { createRequire } from "module";
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

export interface ExtractedInBodyMetric {
  testId: string;
  value: number | null;
  valueText: string | null;
  testDate: string | null;
}

const metricNameToId: Record<string, string> = {
  "weight": "inbody-weight",
  "body weight": "inbody-weight",
  "وزن": "inbody-weight",
  "الوزن": "inbody-weight",
  "total body water": "inbody-total-body-water",
  "tbw": "inbody-total-body-water",
  "ماء الجسم": "inbody-total-body-water",
  "total body water (%)": "inbody-total-body-water",
  "body fat percentage": "inbody-body-fat-percentage",
  "percent body fat": "inbody-body-fat-percentage",
  "pbf": "inbody-body-fat-percentage",
  "نسبة الدهون": "inbody-body-fat-percentage",
  "skeletal muscle mass": "inbody-skeletal-muscle-mass",
  "smm": "inbody-skeletal-muscle-mass",
  "كتلة العضلات": "inbody-skeletal-muscle-mass",
  "muscle mass": "inbody-skeletal-muscle-mass",
  "bmi": "inbody-bmi",
  "مؤشر كتلة الجسم": "inbody-bmi",
  "visceral fat level": "inbody-visceral-fat-level",
  "visceral fat": "inbody-visceral-fat-level",
  "دهون حشوية": "inbody-visceral-fat-level",
  "bmr": "inbody-bmr",
  "basal metabolic rate": "inbody-bmr",
  "معدل الأيض الأساسي": "inbody-bmr",
};

function findMetricId(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  if (metricNameToId[normalized]) return metricNameToId[normalized];
  for (const [key, value] of Object.entries(metricNameToId)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return null;
}

export async function analyzeInBodyPdf(pdfBuffer: Buffer): Promise<ExtractedInBodyMetric[]> {
  try {
    const pdfText = await extractPdfText(pdfBuffer);
    if (!pdfText || pdfText.trim().length < 50) {
      throw new Error("SCANNED_PDF");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `أنت محلل تقارير InBody.
استخرج فقط القياسات التالية إن وجدت:
- Weight
- Total Body Water
- Body Fat Percentage (PBF)
- Skeletal Muscle Mass (SMM)
- BMI
- Visceral Fat Level
- BMR

أعد النتيجة بصيغة JSON array فقط.
كل عنصر:
{
  "metricName": "name as shown",
  "value": 0,
  "unit": "kg/%/kcal/level",
  "testDate": "YYYY-MM-DD or null"
}
إذا لم تجد قياسات أعد [] فقط.`,
        },
        {
          role: "user",
          content: `حلل هذا التقرير واستخرج قياسات InBody:\n\n${pdfText}`,
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    return parseInBodyMetricsFromContent(content);
  } catch (error) {
    if (error instanceof Error && error.message === "SCANNED_PDF") throw error;
    throw new Error("INBODY_ANALYSIS_FAILED");
  }
}

export async function analyzeInBodyImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedInBodyMetric[]> {
  try {
    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `أنت محلل تقارير InBody من الصور.
استخرج فقط القياسات التالية إن وجدت:
- Weight
- Total Body Water
- Body Fat Percentage (PBF)
- Skeletal Muscle Mass (SMM)
- BMI
- Visceral Fat Level
- BMR

أعد النتيجة بصيغة JSON array فقط.
كل عنصر:
{
  "metricName": "name as shown",
  "value": 0,
  "unit": "kg/%/kcal/level",
  "testDate": "YYYY-MM-DD or null"
}
إذا لم تجد قياسات أعد [] فقط.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "حلل صورة InBody واستخرج القياسات المطلوبة فقط." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] as any,
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    return parseInBodyMetricsFromContent(content);
  } catch (error) {
    throw new Error("INBODY_IMAGE_ANALYSIS_FAILED");
  }
}

function parseInBodyMetricsFromContent(content: string): ExtractedInBodyMetric[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const out: ExtractedInBodyMetric[] = [];

  for (const row of parsed) {
    const metricName = String(row?.metricName || "").trim();
    const metricId = findMetricId(metricName);
    if (!metricId || seen.has(metricId)) continue;

    const numericValue = typeof row?.value === "number"
      ? row.value
      : typeof row?.value === "string"
        ? Number.parseFloat(row.value)
        : null;

    out.push({
      testId: metricId,
      value: Number.isFinite(numericValue as number) ? (numericValue as number) : null,
      valueText: null,
      testDate: row?.testDate || null,
    });
    seen.add(metricId);
  }

  return out;
}
