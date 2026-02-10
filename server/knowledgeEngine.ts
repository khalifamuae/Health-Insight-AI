import OpenAI from "openai";
import { storage } from "./storage";
import type { KnowledgeDomain, InsertKnowledgeEntry } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const TRUSTED_SOURCES = [
  "NIH (National Institutes of Health)",
  "PubMed",
  "WHO (World Health Organization)",
  "ACSM (American College of Sports Medicine)",
  "Harvard Health",
  "Mayo Clinic",
  "Open Food Facts",
  "USDA FoodData Central",
  "The Endocrine Society",
  "Journal of Clinical Endocrinology & Metabolism",
];

interface DomainTopicConfig {
  domain: KnowledgeDomain;
  nameEn: string;
  nameAr: string;
  topics: string[];
}

const DOMAIN_CONFIGS: DomainTopicConfig[] = [
  {
    domain: "nutrition",
    nameEn: "Clinical Nutrition",
    nameAr: "التغذية العلاجية",
    topics: [
      "therapeutic nutrition for chronic diseases",
      "nutrition for diabetes management",
      "anti-inflammatory diet protocols",
      "nutrition for fatty liver disease",
      "nutrition for kidney health",
      "nutrition for gut health and microbiome",
      "nutrition for cardiovascular health",
      "caloric deficit safety and minimum intake",
      "macronutrient ratios for different health conditions",
      "intermittent fasting evidence and guidelines",
      "nutrition for immune system support",
      "nutrition for bone health and osteoporosis prevention",
      "Mediterranean diet clinical evidence",
      "DASH diet for hypertension",
      "nutrition during pregnancy and lactation",
      "nutrition for elderly and aging",
      "food-drug interactions",
      "glycemic index and glycemic load of foods",
      "fiber intake recommendations and sources",
      "hydration and electrolyte balance",
    ],
  },
  {
    domain: "aerobic_training",
    nameEn: "Aerobic Training",
    nameAr: "التدريب الهوائي",
    topics: [
      "cardio exercise and heart rate zones",
      "HIIT vs steady-state cardio benefits",
      "aerobic exercise for weight loss optimization",
      "cardio and metabolic rate",
      "walking benefits and calorie expenditure",
      "swimming exercise physiology",
      "cycling training zones and benefits",
      "running biomechanics and injury prevention",
      "cardio exercise and blood pressure",
      "aerobic training and cholesterol improvement",
      "cardio exercise and insulin sensitivity",
      "VO2 max improvement protocols",
      "cardio recovery and nutrition timing",
      "low impact cardio for beginners",
      "cardio exercise during fasting",
    ],
  },
  {
    domain: "resistance_training",
    nameEn: "Resistance Training",
    nameAr: "تدريب المقاومة",
    topics: [
      "resistance training for muscle hypertrophy",
      "protein requirements for muscle building",
      "progressive overload principles",
      "resistance training and bone density",
      "compound vs isolation exercises",
      "resistance training and metabolic rate",
      "training volume and frequency optimization",
      "resistance training for fat loss",
      "muscle recovery nutrition and timing",
      "creatine supplementation evidence",
      "resistance training for elderly",
      "resistance training and hormonal response",
      "periodization training models",
      "resistance training and joint health",
      "bodyweight training effectiveness",
    ],
  },
  {
    domain: "vitamins_minerals",
    nameEn: "Vitamins & Minerals",
    nameAr: "الفيتامينات والمعادن",
    topics: [
      "vitamin D deficiency treatment and food sources",
      "iron deficiency anemia nutrition protocol",
      "vitamin B12 deficiency causes and treatment",
      "calcium absorption and cofactors",
      "magnesium types and bioavailability",
      "zinc deficiency symptoms and food sources",
      "folate vs folic acid in pregnancy",
      "vitamin C absorption and immune function",
      "vitamin A toxicity and safe dosages",
      "vitamin E antioxidant properties",
      "vitamin K and blood coagulation",
      "selenium and thyroid function",
      "iodine deficiency and thyroid health",
      "potassium and blood pressure regulation",
      "copper and iron metabolism interaction",
      "chromium and blood sugar regulation",
      "omega-3 fatty acids EPA and DHA benefits",
      "CoQ10 supplementation evidence",
      "biotin for hair and nail health",
      "mineral interactions and absorption blockers",
    ],
  },
  {
    domain: "hormones",
    nameEn: "Hormones & Nutrition",
    nameAr: "الهرمونات والتغذية",
    topics: [
      "testosterone and nutrition optimization",
      "estrogen metabolism and diet",
      "thyroid hormones T3 T4 TSH and nutrition",
      "cortisol management through nutrition",
      "insulin resistance dietary management",
      "growth hormone and nutrition",
      "leptin resistance and weight management",
      "ghrelin and hunger regulation",
      "DHEA and adrenal health nutrition",
      "prolactin and nutrition factors",
      "progesterone and diet connection",
      "vitamin D as a hormone precursor",
      "melatonin and sleep nutrition",
      "aldosterone and sodium potassium balance",
      "parathyroid hormone and calcium metabolism",
    ],
  },
];

async function generateKnowledgeForTopic(
  domain: KnowledgeDomain,
  topic: string
): Promise<InsertKnowledgeEntry[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a medical and nutrition research expert. Your task is to provide evidence-based scientific knowledge on specific health topics.

IMPORTANT RULES:
1. Only cite information from trusted medical sources: ${TRUSTED_SOURCES.join(", ")}
2. Provide specific, actionable data (dosages, food amounts in grams, durations)
3. Include both English content and Arabic translation
4. Focus on practical application for diet planning and health optimization
5. Do NOT provide medical diagnosis - use guiding language
6. Include specific food sources with gram amounts when relevant

Respond in JSON format with an array of knowledge entries:
[
  {
    "topic": "Specific topic title",
    "content": "Detailed scientific content in English with specific data, dosages, food sources with amounts",
    "contentAr": "Arabic translation of the content",
    "source": "Source name (e.g., NIH Office of Dietary Supplements)",
    "sourceUrl": "URL if applicable",
    "tags": ["relevant", "search", "tags"]
  }
]

Generate 2-4 detailed knowledge entries for the given topic. Each entry should be a distinct piece of actionable knowledge.`,
        },
        {
          role: "user",
          content: `Generate detailed scientific knowledge entries about: "${topic}"

Domain: ${domain}
Focus on practical, evidence-based information that can be used to create better diet and health plans.`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : parsed.entries || parsed.knowledge || [parsed];

    return entries
      .filter((e: { topic?: string; content?: string; source?: string }) => e.topic && e.content && e.source)
      .map((e: { topic: string; content: string; contentAr?: string; source: string; sourceUrl?: string; tags?: string[] }) => ({
        domain,
        topic: e.topic,
        content: e.content,
        contentAr: e.contentAr || null,
        source: e.source,
        sourceUrl: e.sourceUrl || null,
        tags: e.tags || [topic],
      }));
  } catch (error) {
    console.error(`[KnowledgeEngine] Error generating knowledge for topic "${topic}":`, error);
    return [];
  }
}

export async function learnDomain(domain: KnowledgeDomain): Promise<number> {
  const config = DOMAIN_CONFIGS.find((c) => c.domain === domain);
  if (!config) return 0;

  const lastLog = await storage.getLastLearningLog(domain);
  const lastLearnDate = lastLog?.createdAt ? new Date(lastLog.createdAt) : null;
  const previousTopics = lastLog?.topicsSearched || [];

  const availableTopics = config.topics.filter((t) => !previousTopics.includes(t));
  const topicsToLearn = availableTopics.length > 0 ? availableTopics : config.topics;
  const selectedTopics = topicsToLearn.slice(0, 3);

  console.log(`[KnowledgeEngine] Learning domain "${domain}" - topics: ${selectedTopics.join(", ")}`);

  let totalEntries = 0;
  for (const topic of selectedTopics) {
    const entries = await generateKnowledgeForTopic(domain, topic);
    if (entries.length > 0) {
      await storage.addKnowledgeEntries(entries);
      totalEntries += entries.length;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await storage.addLearningLog(domain, selectedTopics, totalEntries);
  console.log(`[KnowledgeEngine] Domain "${domain}" learned ${totalEntries} entries from ${selectedTopics.length} topics`);

  return totalEntries;
}

export async function dailyLearningJob(): Promise<void> {
  console.log("[KnowledgeEngine] Starting daily learning job...");

  const domains: KnowledgeDomain[] = [
    "nutrition",
    "aerobic_training",
    "resistance_training",
    "vitamins_minerals",
    "hormones",
  ];

  let totalNewEntries = 0;
  for (const domain of domains) {
    try {
      const count = await learnDomain(domain);
      totalNewEntries += count;
    } catch (error) {
      console.error(`[KnowledgeEngine] Error learning domain "${domain}":`, error);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`[KnowledgeEngine] Daily learning complete. Total new entries: ${totalNewEntries}`);
}

export async function searchRelevantKnowledge(
  testResults: { testName: string; status: string; category: string }[],
  fitnessGoal: string
): Promise<string> {
  const abnormalTests = testResults.filter((t) => t.status === "low" || t.status === "high");

  const searchTermsByDomain: Partial<Record<KnowledgeDomain, string[]>> = {};

  for (const test of abnormalTests) {
    const testNameLower = test.testName.toLowerCase();

    if (
      testNameLower.includes("vitamin") ||
      testNameLower.includes("iron") ||
      testNameLower.includes("ferritin") ||
      testNameLower.includes("calcium") ||
      testNameLower.includes("zinc") ||
      testNameLower.includes("magnesium") ||
      testNameLower.includes("folate") ||
      testNameLower.includes("selenium") ||
      testNameLower.includes("b12") ||
      testNameLower.includes("potassium")
    ) {
      if (!searchTermsByDomain["vitamins_minerals"]) searchTermsByDomain["vitamins_minerals"] = [];
      searchTermsByDomain["vitamins_minerals"].push(testNameLower);
    }

    if (
      testNameLower.includes("testosterone") ||
      testNameLower.includes("tsh") ||
      testNameLower.includes("t3") ||
      testNameLower.includes("t4") ||
      testNameLower.includes("cortisol") ||
      testNameLower.includes("insulin") ||
      testNameLower.includes("estrogen") ||
      testNameLower.includes("progesterone") ||
      testNameLower.includes("prolactin") ||
      testNameLower.includes("dhea")
    ) {
      if (!searchTermsByDomain["hormones"]) searchTermsByDomain["hormones"] = [];
      searchTermsByDomain["hormones"].push(testNameLower);
    }

    if (
      testNameLower.includes("cholesterol") ||
      testNameLower.includes("triglyceride") ||
      testNameLower.includes("glucose") ||
      testNameLower.includes("sugar") ||
      testNameLower.includes("hba1c") ||
      testNameLower.includes("albumin") ||
      testNameLower.includes("creatinine") ||
      testNameLower.includes("uric") ||
      test.category === "organ_functions" ||
      test.category === "lipids"
    ) {
      if (!searchTermsByDomain["nutrition"]) searchTermsByDomain["nutrition"] = [];
      searchTermsByDomain["nutrition"].push(testNameLower);
    }
  }

  if (fitnessGoal === "weight_loss" || fitnessGoal === "maintain") {
    if (!searchTermsByDomain["aerobic_training"]) searchTermsByDomain["aerobic_training"] = [];
    searchTermsByDomain["aerobic_training"].push("cardio", "weight loss", "fat loss");
  }
  if (fitnessGoal === "muscle_gain") {
    if (!searchTermsByDomain["resistance_training"]) searchTermsByDomain["resistance_training"] = [];
    searchTermsByDomain["resistance_training"].push("muscle", "protein", "hypertrophy");
  }

  let knowledgeContext = "";
  for (const [domain, terms] of Object.entries(searchTermsByDomain)) {
    const entries = await storage.searchKnowledge(domain as KnowledgeDomain, terms);
    if (entries.length > 0) {
      knowledgeContext += `\n\n--- ${domain.toUpperCase()} KNOWLEDGE ---\n`;
      for (const entry of entries.slice(0, 10)) {
        knowledgeContext += `[${entry.source}] ${entry.topic}: ${entry.content}\n`;
      }
    }
  }

  return knowledgeContext;
}

export async function learnFromDietPlanGeneration(
  testResults: { testName: string; status: string; value: number | null; unit: string | null }[],
  generatedPlan: {
    supplements?: { name: string; dosage: string; reason: string; foodSources?: string[]; scientificBasis?: string }[];
    conditionTips?: { condition: string; advice: string[] }[];
    deficiencies?: { name: string; current: string; target: string; foods: string[] }[];
  }
): Promise<void> {
  const entries: InsertKnowledgeEntry[] = [];

  if (generatedPlan.supplements) {
    for (const supp of generatedPlan.supplements) {
      const existing = await storage.searchKnowledge("vitamins_minerals", [supp.name.toLowerCase()]);
      const alreadyKnown = existing.some(
        (e) => e.topic.toLowerCase().includes(supp.name.toLowerCase()) && e.content.includes(supp.dosage)
      );
      if (!alreadyKnown) {
        entries.push({
          domain: "vitamins_minerals",
          topic: `${supp.name} supplementation - ${supp.dosage}`,
          content: `${supp.reason}. Recommended dosage: ${supp.dosage}. ${supp.foodSources ? "Natural food sources: " + supp.foodSources.join(", ") : ""}`,
          contentAr: null,
          source: supp.scientificBasis || "AI-generated from lab analysis",
          sourceUrl: null,
          tags: [supp.name.toLowerCase(), "supplement", "dosage"],
        });
      }
    }
  }

  if (generatedPlan.deficiencies) {
    for (const def of generatedPlan.deficiencies) {
      const existing = await storage.searchKnowledge("nutrition", [def.name.toLowerCase()]);
      if (existing.length < 3) {
        entries.push({
          domain: "nutrition",
          topic: `Foods for ${def.name} deficiency correction`,
          content: `Target range: ${def.target}. Recommended foods: ${def.foods.join(", ")}`,
          contentAr: null,
          source: "AI-generated from diet plan analysis",
          sourceUrl: null,
          tags: [def.name.toLowerCase(), "deficiency", "food sources"],
        });
      }
    }
  }

  if (entries.length > 0) {
    await storage.addKnowledgeEntries(entries);
    console.log(`[KnowledgeEngine] Stored ${entries.length} new knowledge entries from diet plan generation`);
  }
}

let dailyJobInterval: ReturnType<typeof setInterval> | null = null;

export function startDailyLearningSchedule(): void {
  dailyLearningJob().catch((err) => {
    console.error("[KnowledgeEngine] Initial learning job failed:", err);
  });

  dailyJobInterval = setInterval(
    () => {
      dailyLearningJob().catch((err) => {
        console.error("[KnowledgeEngine] Scheduled learning job failed:", err);
      });
    },
    24 * 60 * 60 * 1000
  );

  console.log("[KnowledgeEngine] Daily learning schedule started (runs every 24 hours)");
}

export function stopDailyLearningSchedule(): void {
  if (dailyJobInterval) {
    clearInterval(dailyJobInterval);
    dailyJobInterval = null;
  }
}
