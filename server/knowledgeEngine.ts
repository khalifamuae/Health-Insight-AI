import OpenAI from "openai";
import { storage } from "./storage";
import type { KnowledgeDomain, InsertKnowledgeEntry } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NIH_ODS_BASE = "https://ods.od.nih.gov/factsheets";

interface DomainTopicConfig {
  domain: KnowledgeDomain;
  nameEn: string;
  nameAr: string;
  topics: {
    query: string;
    pubmedTerms: string;
    nihFactSheet?: string;
  }[];
}

const DOMAIN_CONFIGS: DomainTopicConfig[] = [
  {
    domain: "nutrition",
    nameEn: "Clinical Nutrition",
    nameAr: "التغذية العلاجية",
    topics: [
      { query: "therapeutic nutrition chronic diseases", pubmedTerms: "nutrition therapy[mh] AND chronic disease[mh] AND review[pt]" },
      { query: "nutrition diabetes management", pubmedTerms: "diabetes mellitus[mh] AND diet therapy[mh] AND review[pt]" },
      { query: "anti-inflammatory diet", pubmedTerms: "anti-inflammatory agents[mh] AND diet[mh] AND review[pt]" },
      { query: "nutrition fatty liver disease", pubmedTerms: "non-alcoholic fatty liver disease[mh] AND diet[mh] AND review[pt]" },
      { query: "nutrition kidney health", pubmedTerms: "renal insufficiency[mh] AND diet therapy[mh] AND review[pt]" },
      { query: "gut health microbiome nutrition", pubmedTerms: "gastrointestinal microbiome[mh] AND diet[mh] AND review[pt]" },
      { query: "cardiovascular nutrition", pubmedTerms: "cardiovascular diseases[mh] AND diet therapy[mh] AND review[pt]" },
      { query: "caloric restriction safety", pubmedTerms: "caloric restriction[mh] AND safety[tiab] AND review[pt]" },
      { query: "macronutrient ratios health", pubmedTerms: "macronutrients[tiab] AND dietary recommendations[tiab] AND review[pt]" },
      { query: "intermittent fasting evidence", pubmedTerms: "fasting[mh] AND intermittent[tiab] AND clinical trial[pt]" },
      { query: "nutrition immune system", pubmedTerms: "immune system[mh] AND nutritional status[mh] AND review[pt]" },
      { query: "bone health nutrition osteoporosis", pubmedTerms: "osteoporosis[mh] AND diet[mh] AND prevention[tiab] AND review[pt]" },
      { query: "Mediterranean diet clinical evidence", pubmedTerms: "diet, Mediterranean[mh] AND clinical trial[pt]" },
      { query: "DASH diet hypertension", pubmedTerms: "dietary approaches to stop hypertension[mh] AND review[pt]" },
      { query: "glycemic index foods", pubmedTerms: "glycemic index[mh] AND food[mh] AND review[pt]" },
      { query: "dietary fiber health", pubmedTerms: "dietary fiber[mh] AND health[tiab] AND review[pt]" },
      { query: "hydration electrolyte balance", pubmedTerms: "water-electrolyte balance[mh] AND nutrition[tiab] AND review[pt]" },
      { query: "food drug interactions", pubmedTerms: "food-drug interactions[mh] AND review[pt]" },
      { query: "nutrition during pregnancy", pubmedTerms: "pregnancy[mh] AND nutritional requirements[mh] AND review[pt]" },
      { query: "elderly nutrition aging", pubmedTerms: "aged[mh] AND nutritional requirements[mh] AND review[pt]" },
    ],
  },
  {
    domain: "aerobic_training",
    nameEn: "Aerobic Training",
    nameAr: "التدريب الهوائي",
    topics: [
      { query: "cardio exercise heart rate zones", pubmedTerms: "exercise[mh] AND heart rate[mh] AND aerobic[tiab] AND review[pt]" },
      { query: "HIIT vs steady-state cardio", pubmedTerms: "high-intensity interval training[mh] AND comparative study[pt]" },
      { query: "aerobic exercise weight loss", pubmedTerms: "exercise[mh] AND weight loss[mh] AND aerobic[tiab] AND review[pt]" },
      { query: "cardio metabolic rate", pubmedTerms: "basal metabolism[mh] AND exercise[mh] AND review[pt]" },
      { query: "walking health benefits", pubmedTerms: "walking[mh] AND health benefit[tiab] AND review[pt]" },
      { query: "swimming exercise physiology", pubmedTerms: "swimming[mh] AND exercise[mh] AND physiology[tiab] AND review[pt]" },
      { query: "cycling training benefits", pubmedTerms: "bicycling[mh] AND physical fitness[mh] AND review[pt]" },
      { query: "running injury prevention", pubmedTerms: "running[mh] AND athletic injuries[mh] AND prevention[tiab] AND review[pt]" },
      { query: "cardio exercise blood pressure", pubmedTerms: "exercise[mh] AND blood pressure[mh] AND aerobic[tiab] AND review[pt]" },
      { query: "aerobic training cholesterol", pubmedTerms: "exercise[mh] AND cholesterol[mh] AND aerobic[tiab] AND review[pt]" },
      { query: "cardio insulin sensitivity", pubmedTerms: "exercise[mh] AND insulin resistance[mh] AND review[pt]" },
      { query: "VO2 max improvement", pubmedTerms: "oxygen consumption[mh] AND exercise[mh] AND training[tiab] AND review[pt]" },
      { query: "cardio recovery nutrition", pubmedTerms: "exercise[mh] AND recovery[tiab] AND nutrition[tiab] AND review[pt]" },
      { query: "low impact cardio beginners", pubmedTerms: "exercise[mh] AND low impact[tiab] AND sedentary[tiab] AND review[pt]" },
      { query: "exercise during fasting", pubmedTerms: "exercise[mh] AND fasting[mh] AND review[pt]" },
    ],
  },
  {
    domain: "resistance_training",
    nameEn: "Resistance Training",
    nameAr: "تدريب المقاومة",
    topics: [
      { query: "resistance training muscle hypertrophy", pubmedTerms: "resistance training[mh] AND muscle hypertrophy[tiab] AND review[pt]" },
      { query: "protein requirements muscle building", pubmedTerms: "dietary proteins[mh] AND muscle development[mh] AND review[pt]" },
      { query: "progressive overload principles", pubmedTerms: "resistance training[mh] AND progressive[tiab] AND overload[tiab] AND review[pt]" },
      { query: "resistance training bone density", pubmedTerms: "resistance training[mh] AND bone density[mh] AND review[pt]" },
      { query: "compound vs isolation exercises", pubmedTerms: "resistance training[mh] AND exercise[mh] AND comparison[tiab] AND review[pt]" },
      { query: "resistance training metabolic rate", pubmedTerms: "resistance training[mh] AND basal metabolism[mh] AND review[pt]" },
      { query: "training volume frequency", pubmedTerms: "resistance training[mh] AND exercise dosage[tiab] AND frequency[tiab] AND review[pt]" },
      { query: "resistance training fat loss", pubmedTerms: "resistance training[mh] AND weight loss[mh] AND body fat[tiab] AND review[pt]" },
      { query: "muscle recovery nutrition timing", pubmedTerms: "muscle[mh] AND recovery[tiab] AND nutrient timing[tiab] AND review[pt]" },
      { query: "creatine supplementation evidence", pubmedTerms: "creatine[mh] AND supplementation[tiab] AND review[pt]" },
      { query: "resistance training elderly", pubmedTerms: "resistance training[mh] AND aged[mh] AND review[pt]" },
      { query: "resistance training hormonal response", pubmedTerms: "resistance training[mh] AND hormones[mh] AND review[pt]" },
      { query: "periodization training", pubmedTerms: "resistance training[mh] AND periodization[tiab] AND review[pt]" },
      { query: "resistance training joint health", pubmedTerms: "resistance training[mh] AND joint diseases[mh] AND review[pt]" },
      { query: "bodyweight training effectiveness", pubmedTerms: "body weight[tiab] AND exercise[mh] AND effectiveness[tiab] AND review[pt]" },
    ],
  },
  {
    domain: "vitamins_minerals",
    nameEn: "Vitamins & Minerals",
    nameAr: "الفيتامينات والمعادن",
    topics: [
      { query: "vitamin D deficiency treatment", pubmedTerms: "vitamin D deficiency[mh] AND therapy[sh] AND review[pt]", nihFactSheet: "VitaminD-HealthProfessional" },
      { query: "iron deficiency anemia nutrition", pubmedTerms: "anemia, iron-deficiency[mh] AND diet therapy[sh] AND review[pt]", nihFactSheet: "Iron-HealthProfessional" },
      { query: "vitamin B12 deficiency treatment", pubmedTerms: "vitamin B 12 deficiency[mh] AND therapy[sh] AND review[pt]", nihFactSheet: "VitaminB12-HealthProfessional" },
      { query: "calcium absorption cofactors", pubmedTerms: "calcium[mh] AND biological availability[mh] AND review[pt]", nihFactSheet: "Calcium-HealthProfessional" },
      { query: "magnesium bioavailability types", pubmedTerms: "magnesium[mh] AND biological availability[mh] AND review[pt]", nihFactSheet: "Magnesium-HealthProfessional" },
      { query: "zinc deficiency food sources", pubmedTerms: "zinc[mh] AND deficiency[tiab] AND dietary intake[tiab] AND review[pt]", nihFactSheet: "Zinc-HealthProfessional" },
      { query: "folate folic acid pregnancy", pubmedTerms: "folic acid[mh] AND pregnancy[mh] AND review[pt]", nihFactSheet: "Folate-HealthProfessional" },
      { query: "vitamin C immune function", pubmedTerms: "ascorbic acid[mh] AND immune system[mh] AND review[pt]", nihFactSheet: "VitaminC-HealthProfessional" },
      { query: "vitamin A safe dosages", pubmedTerms: "vitamin A[mh] AND toxicity[tiab] AND dosage[tiab] AND review[pt]", nihFactSheet: "VitaminA-HealthProfessional" },
      { query: "vitamin E antioxidant", pubmedTerms: "vitamin E[mh] AND antioxidants[mh] AND review[pt]", nihFactSheet: "VitaminE-HealthProfessional" },
      { query: "vitamin K coagulation", pubmedTerms: "vitamin K[mh] AND blood coagulation[mh] AND review[pt]", nihFactSheet: "VitaminK-HealthProfessional" },
      { query: "selenium thyroid function", pubmedTerms: "selenium[mh] AND thyroid gland[mh] AND review[pt]", nihFactSheet: "Selenium-HealthProfessional" },
      { query: "iodine thyroid health", pubmedTerms: "iodine[mh] AND thyroid diseases[mh] AND review[pt]", nihFactSheet: "Iodine-HealthProfessional" },
      { query: "potassium blood pressure", pubmedTerms: "potassium[mh] AND blood pressure[mh] AND review[pt]", nihFactSheet: "Potassium-HealthProfessional" },
      { query: "omega-3 EPA DHA benefits", pubmedTerms: "fatty acids, omega-3[mh] AND health[tiab] AND review[pt]", nihFactSheet: "Omega3FattyAcids-HealthProfessional" },
      { query: "chromium blood sugar regulation", pubmedTerms: "chromium[mh] AND blood glucose[mh] AND review[pt]", nihFactSheet: "Chromium-HealthProfessional" },
      { query: "copper iron metabolism", pubmedTerms: "copper[mh] AND iron[mh] AND metabolism[mh] AND review[pt]" },
      { query: "CoQ10 supplementation", pubmedTerms: "ubiquinone[mh] AND supplementation[tiab] AND review[pt]" },
      { query: "biotin hair nail health", pubmedTerms: "biotin[mh] AND hair[mh] AND review[pt]", nihFactSheet: "Biotin-HealthProfessional" },
      { query: "mineral absorption interactions", pubmedTerms: "minerals[mh] AND biological availability[mh] AND drug interactions[mh] AND review[pt]" },
    ],
  },
  {
    domain: "hormones",
    nameEn: "Hormones & Nutrition",
    nameAr: "الهرمونات والتغذية",
    topics: [
      { query: "testosterone nutrition optimization", pubmedTerms: "testosterone[mh] AND diet[mh] AND review[pt]" },
      { query: "estrogen metabolism diet", pubmedTerms: "estrogens[mh] AND diet[mh] AND metabolism[mh] AND review[pt]" },
      { query: "thyroid hormones TSH nutrition", pubmedTerms: "thyroid hormones[mh] AND nutritional status[mh] AND review[pt]" },
      { query: "cortisol management nutrition", pubmedTerms: "hydrocortisone[mh] AND diet[mh] AND stress[tiab] AND review[pt]" },
      { query: "insulin resistance dietary management", pubmedTerms: "insulin resistance[mh] AND diet therapy[sh] AND review[pt]" },
      { query: "growth hormone nutrition", pubmedTerms: "human growth hormone[mh] AND nutrition[tiab] AND review[pt]" },
      { query: "leptin resistance weight management", pubmedTerms: "leptin[mh] AND obesity[mh] AND diet[mh] AND review[pt]" },
      { query: "ghrelin hunger regulation", pubmedTerms: "ghrelin[mh] AND appetite regulation[mh] AND review[pt]" },
      { query: "DHEA adrenal health", pubmedTerms: "dehydroepiandrosterone[mh] AND adrenal glands[mh] AND review[pt]" },
      { query: "prolactin nutrition factors", pubmedTerms: "prolactin[mh] AND nutrition[tiab] AND review[pt]" },
      { query: "progesterone diet connection", pubmedTerms: "progesterone[mh] AND diet[mh] AND review[pt]" },
      { query: "vitamin D hormone precursor", pubmedTerms: "vitamin D[mh] AND hormones[mh] AND metabolism[mh] AND review[pt]" },
      { query: "melatonin sleep nutrition", pubmedTerms: "melatonin[mh] AND sleep[mh] AND diet[mh] AND review[pt]" },
      { query: "aldosterone sodium potassium", pubmedTerms: "aldosterone[mh] AND sodium[mh] AND potassium[mh] AND review[pt]" },
      { query: "parathyroid hormone calcium", pubmedTerms: "parathyroid hormone[mh] AND calcium[mh] AND metabolism[mh] AND review[pt]" },
    ],
  },
];

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
}

async function fetchPubMedArticles(searchTerm: string, maxResults: number = 3): Promise<PubMedArticle[]> {
  try {
    const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=${maxResults}&sort=relevance&retmode=json`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    await new Promise((r) => setTimeout(r, 400));

    const fetchUrl = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return [];
    const xmlText = await fetchRes.text();

    const articles: PubMedArticle[] = [];
    const articleBlocks = xmlText.split("<PubmedArticle>");

    for (const block of articleBlocks.slice(1)) {
      const pmid = extractXmlTag(block, "PMID") || "";
      const title = extractXmlTag(block, "ArticleTitle") || "";
      const abstractParts: string[] = [];
      const abstractTexts = block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
      if (abstractTexts) {
        for (const at of abstractTexts) {
          const cleaned = at.replace(/<[^>]+>/g, "").trim();
          if (cleaned) abstractParts.push(cleaned);
        }
      }
      const abstract = abstractParts.join(" ");

      const authorNames: string[] = [];
      const authorBlocks = block.match(/<Author[^>]*>[\s\S]*?<\/Author>/g);
      if (authorBlocks) {
        for (const ab of authorBlocks.slice(0, 3)) {
          const lastName = extractXmlTag(ab, "LastName") || "";
          const initials = extractXmlTag(ab, "Initials") || "";
          if (lastName) authorNames.push(`${lastName} ${initials}`.trim());
        }
      }

      const journal = extractXmlTag(block, "Title") || extractXmlTag(block, "ISOAbbreviation") || "";
      const year = extractXmlTag(block, "Year") || "";

      if (title && abstract.length > 100) {
        articles.push({
          pmid,
          title: cleanXmlText(title),
          abstract: cleanXmlText(abstract),
          authors: authorNames.join(", ") + (authorBlocks && authorBlocks.length > 3 ? " et al." : ""),
          journal: cleanXmlText(journal),
          year,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`[KnowledgeEngine] PubMed fetch error:`, error);
    return [];
  }
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function cleanXmlText(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchNIHFactSheet(sheetName: string): Promise<string | null> {
  try {
    const url = `${NIH_ODS_BASE}/${sheetName}/`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();

    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 8000) {
      text = text.substring(0, 8000);
    }

    return text.length > 200 ? text : null;
  } catch (error) {
    console.error(`[KnowledgeEngine] NIH fact sheet fetch error for ${sheetName}:`, error);
    return null;
  }
}

async function processRealSourcesForTopic(
  domain: KnowledgeDomain,
  topic: { query: string; pubmedTerms: string; nihFactSheet?: string }
): Promise<InsertKnowledgeEntry[]> {
  let realContent = "";
  let sources: { name: string; url: string }[] = [];

  const articles = await fetchPubMedArticles(topic.pubmedTerms, 3);
  if (articles.length > 0) {
    for (const article of articles) {
      realContent += `\n\n[PubMed Study - ${article.journal} ${article.year}]\nTitle: ${article.title}\nAuthors: ${article.authors}\nAbstract: ${article.abstract}\n`;
      sources.push({ name: `PubMed - ${article.journal} (${article.year})`, url: article.url });
    }
  }

  await new Promise((r) => setTimeout(r, 400));

  if (topic.nihFactSheet) {
    const nihContent = await fetchNIHFactSheet(topic.nihFactSheet);
    if (nihContent) {
      realContent += `\n\n[NIH Office of Dietary Supplements - ${topic.nihFactSheet}]\n${nihContent}\n`;
      sources.push({
        name: "NIH Office of Dietary Supplements",
        url: `https://ods.od.nih.gov/factsheets/${topic.nihFactSheet}/`,
      });
    }
  }

  if (!realContent || realContent.length < 200) {
    console.log(`[KnowledgeEngine] Insufficient real content for "${topic.query}" - skipping`);
    return [];
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a medical research summarizer. You ONLY summarize content from the REAL scientific sources provided below. 
Do NOT generate or invent any information. Only extract and organize facts from the provided research content.

RULES:
1. ONLY use data explicitly stated in the provided source material
2. Include specific numbers, dosages, and measurements from the sources
3. Cite which source each fact comes from
4. Provide Arabic translation
5. Focus on practical, actionable health information
6. If a fact is not in the provided sources, do NOT include it

Respond in JSON:
{
  "entries": [
    {
      "topic": "Specific extracted topic",
      "content": "Summary of real findings from the sources with specific data",
      "contentAr": "Arabic translation",
      "sourceIndex": 0
    }
  ]
}

Generate 2-4 entries that summarize distinct findings from the provided research.`,
        },
        {
          role: "user",
          content: `Summarize and structure the following REAL scientific content about "${topic.query}":\n\n${realContent}`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    const entries = parsed.entries || (Array.isArray(parsed) ? parsed : []);

    return entries
      .filter((e: { topic?: string; content?: string }) => e.topic && e.content && e.content.length > 50)
      .map((e: { topic: string; content: string; contentAr?: string; sourceIndex?: number }) => {
        const sourceIdx = typeof e.sourceIndex === "number" && e.sourceIndex < sources.length ? e.sourceIndex : 0;
        const source = sources[sourceIdx] || sources[0] || { name: "PubMed", url: "" };
        return {
          domain,
          topic: e.topic,
          content: e.content,
          contentAr: e.contentAr || null,
          source: source.name,
          sourceUrl: source.url,
          tags: [topic.query, domain],
        };
      });
  } catch (error) {
    console.error(`[KnowledgeEngine] AI summarization error for "${topic.query}":`, error);
    return [];
  }
}

export async function learnDomain(domain: KnowledgeDomain): Promise<number> {
  const config = DOMAIN_CONFIGS.find((c) => c.domain === domain);
  if (!config) return 0;

  const lastLog = await storage.getLastLearningLog(domain);
  const previousTopics = lastLog?.topicsSearched || [];

  const availableTopics = config.topics.filter((t) => !previousTopics.includes(t.query));
  const topicsToLearn = availableTopics.length > 0 ? availableTopics : config.topics;
  const selectedTopics = topicsToLearn.slice(0, 3);

  console.log(`[KnowledgeEngine] Learning domain "${domain}" from real sources - topics: ${selectedTopics.map((t) => t.query).join(", ")}`);

  let totalEntries = 0;
  for (const topic of selectedTopics) {
    const entries = await processRealSourcesForTopic(domain, topic);
    if (entries.length > 0) {
      await storage.addKnowledgeEntries(entries);
      totalEntries += entries.length;
      console.log(`[KnowledgeEngine] "${topic.query}" -> ${entries.length} entries from real sources`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  await storage.addLearningLog(domain, selectedTopics.map((t) => t.query), totalEntries);
  console.log(`[KnowledgeEngine] Domain "${domain}" learned ${totalEntries} entries from ${selectedTopics.length} real-source topics`);

  return totalEntries;
}

export async function dailyLearningJob(): Promise<void> {
  console.log("[KnowledgeEngine] Starting daily learning job (fetching from real scientific sources)...");

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
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`[KnowledgeEngine] Daily learning complete. Total new entries from real sources: ${totalNewEntries}`);
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
      knowledgeContext += `\n\n--- ${domain.toUpperCase()} KNOWLEDGE (from verified sources) ---\n`;
      for (const entry of entries.slice(0, 10)) {
        knowledgeContext += `[Source: ${entry.source}${entry.sourceUrl ? " - " + entry.sourceUrl : ""}] ${entry.topic}: ${entry.content}\n`;
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
      if (!alreadyKnown && supp.scientificBasis && supp.scientificBasis !== "AI-generated") {
        entries.push({
          domain: "vitamins_minerals",
          topic: `${supp.name} supplementation - ${supp.dosage}`,
          content: `${supp.reason}. Recommended dosage: ${supp.dosage}. ${supp.foodSources ? "Natural food sources: " + supp.foodSources.join(", ") : ""}`,
          contentAr: null,
          source: supp.scientificBasis || "Clinical diet plan analysis",
          sourceUrl: null,
          tags: [supp.name.toLowerCase(), "supplement", "dosage"],
        });
      }
    }
  }

  if (entries.length > 0) {
    await storage.addKnowledgeEntries(entries);
    console.log(`[KnowledgeEngine] Stored ${entries.length} new verified knowledge entries from diet plan generation`);
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

  console.log("[KnowledgeEngine] Daily learning schedule started (fetches from PubMed + NIH every 24 hours)");
}

export function stopDailyLearningSchedule(): void {
  if (dailyJobInterval) {
    clearInterval(dailyJobInterval);
    dailyJobInterval = null;
  }
}
