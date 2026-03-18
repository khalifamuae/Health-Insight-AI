import OpenAI from "openai";
import { searchRelevantKnowledge, learnFromDietPlanGeneration } from "./knowledgeEngine";
import { recalculateMealMacros, validateHealthyMealRanges, saveValidatedIngredients } from "./nutritionValidator";
import { verifyAndCorrectIngredients } from "./usdaClient";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface UserHealthData {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  fitnessGoal: string | null;
  activityLevel: string | null;
  mealPreference: string | null;
  hasAllergies: boolean | null;
  allergies: string[] | null;
  proteinPreference: string | null;
  proteinPreferences: string[] | null;
  carbPreferences: string[] | null;
  mealDistribution?: string | null;
  customTargetCalories?: number | null;
  language: string;
  testResults: {
    testId?: string;
    testName: string;
    value: number | null;
    status: string;
    normalRangeMin: number | null;
    normalRangeMax: number | null;
    unit: string | null;
    category: string;
  }[];
}

export interface DietPlanResult {
  healthSummary: string;
  summary: string;
  goalDescription: string;
  calories: {
    bmr: number;
    tdee: number;
    tef: number;
    target: number;
    deficit_or_surplus: number;
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  mealSlots?: { key: string; labelAr: string; labelEn: string; percent: number; calories: number; protein: number; carbs: number; fats: number; icon: string }[];
  macros: {
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fats: { grams: number; percentage: number };
    fiber: { grams: number };
    water: { liters: number };
  };
  intakeAlignment: string;
  deficiencies: { name: string; current: string; target: string; foods: string[]; absorptionTip: string }[];
  supplements: { name: string; dosage: string; reason: string; duration: string; foodSources: string[]; targetLabValue: string; scientificBasis: string; timingAdvice: string; interactions: string }[];
  mealPlan: {
    breakfast: { name: string; description: string; calories: number; targetCalories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    lunch: { name: string; description: string; calories: number; targetCalories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    dinner: { name: string; description: string; calories: number; targetCalories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    snacks: { name: string; description: string; calories: number; targetCalories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
  };
  mealTimingAdvice: string;
  tips: string[];
  warnings: string[];
  conditionTips: { condition: string; advice: string[]; avoidFoods: string[]; scientificReason: string }[];
  nutrientInteractions: string[];
  references: string[];
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function getActivityMultiplier(level: string): number {
  switch (level) {
    case "sedentary": return 1.2;
    case "lightly_active": return 1.375;
    case "very_active": return 1.725;
    case "extremely_active": return 1.9;
    default: return 1.375;
  }
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * getActivityMultiplier(activityLevel));
}

function calculateTEF(targetCalories: number, proteinGrams: number, carbGrams: number, fatGrams: number): number {
  const proteinTEF = 0.25;
  const carbTEF = 0.075;
  const fatTEF = 0.015;
  return Math.round(proteinGrams * 4 * proteinTEF + carbGrams * 4 * carbTEF + fatGrams * 9 * fatTEF);
}

function calculateFiberTarget(targetCalories: number, gender: string): number {
  if (gender === "male") return Math.max(30, Math.round(targetCalories / 1000 * 14));
  return Math.max(25, Math.round(targetCalories / 1000 * 14));
}

function calculateWaterIntake(weight: number, activityLevel: string): number {
  let base = weight * 0.033;
  if (activityLevel === "very_active") base += 0.5;
  if (activityLevel === "extremely_active") base += 1.0;
  return Math.round(base * 10) / 10;
}

function getTargetCalories(tdee: number, bmr: number, goal: string, hasSevereDeficiency: boolean): { target: number; delta: number } {
  if (goal === "weight_loss") {
    // Safe deficit: 15-20% of TDEE (Helms et al., 2014)
    // Reduce deficit if severe nutrient deficiency detected
    const deficitPercent = hasSevereDeficiency ? 0.10 : 0.18;
    const deficit = Math.round(tdee * deficitPercent);
    // Never go below BMR to preserve metabolic health
    const target = Math.max(Math.round(tdee - deficit), bmr);
    return { target, delta: target - tdee };
  }
  if (goal === "muscle_gain") {
    // Lean bulk: 10-15% surplus (Iraki et al., 2019)
    // Higher surplus = more fat gain, moderate is optimal
    const surplus = Math.round(tdee * 0.12);
    return { target: Math.round(tdee + surplus), delta: surplus };
  }
  // Maintain: TDEE exactly
  return { target: tdee, delta: 0 };
}

function getMacroTargets(targetCalories: number, goal: string, preference: string, weight: number) {
  let proteinPerKg: number, fatPercentage: number, minCarbGrams: number;

  // Special diet preferences override goal-based defaults
  if (preference === "high_protein") {
    proteinPerKg = goal === "muscle_gain" ? 2.4 : 2.2;
    fatPercentage = 0.22;
    minCarbGrams = 0;
  } else if (preference === "low_carb") {
    proteinPerKg = 2.0;
    fatPercentage = 0.45;
    minCarbGrams = Math.round(weight * 1.5);
  } else if (preference === "keto") {
    proteinPerKg = 1.6;
    fatPercentage = 0.70;
    minCarbGrams = Math.round(weight * 0.3);
  } else if (preference === "vegetarian") {
    proteinPerKg = 1.6;
    fatPercentage = 0.28;
    minCarbGrams = 0;
  } else {
    // Evidence-based macros per goal (ISSN/ACSM guidelines)
    minCarbGrams = 0;
    switch (goal) {
      case "weight_loss":
        // High protein preserves muscle during deficit
        // ISSN: 1.6-2.2g/kg during caloric deficit
        proteinPerKg = 2.0;
        fatPercentage = 0.25; // 25% fat for satiety + hormone health
        break;
      case "muscle_gain":
        // ISSN: 1.6-2.2g/kg for hypertrophy, surplus requires more carbs
        proteinPerKg = 2.2;
        fatPercentage = 0.22; // Lower fat = more room for carbs (fuel for training)
        break;
      default: // maintain
        // Balanced approach for weight maintenance
        proteinPerKg = 1.8;
        fatPercentage = 0.28;
    }
  }

  const proteinGrams = Math.round(weight * proteinPerKg);
  const proteinCalories = proteinGrams * 4;
  const fatCalories = Math.round(targetCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9);
  let carbCalories = targetCalories - proteinCalories - fatCalories;
  let carbGrams = Math.round(Math.max(carbCalories, 0) / 4);

  if ((preference === "low_carb" || preference === "keto") && carbGrams < minCarbGrams) {
    carbGrams = minCarbGrams;
    carbCalories = carbGrams * 4;
    const remaining = targetCalories - proteinCalories - carbCalories;
    const adjustedFatGrams = Math.round(Math.max(remaining, 0) / 9);
    return {
      protein: { grams: proteinGrams, percentage: Math.round((proteinCalories / targetCalories) * 100) },
      carbs: { grams: carbGrams, percentage: Math.round((carbCalories / targetCalories) * 100) },
      fats: { grams: adjustedFatGrams, percentage: Math.round((adjustedFatGrams * 9 / targetCalories) * 100) },
    };
  }

  return {
    protein: { grams: proteinGrams, percentage: Math.round((proteinCalories / targetCalories) * 100) },
    carbs: { grams: carbGrams, percentage: Math.round((Math.max(carbCalories, 0) / targetCalories) * 100) },
    fats: { grams: fatGrams, percentage: Math.round((fatCalories / targetCalories) * 100) },
  };
}

function detectSevereDeficiencies(testResults: UserHealthData["testResults"]): { hasSevere: boolean; list: string[] } {
  const severeList: string[] = [];
  const criticalTestIds = ["vitamin-d", "iron", "vitamin-b12", "hemoglobin", "ferritin", "calcium", "folate"];

  for (const t of testResults) {
    if (t.value == null) continue;
    if (t.status === "low") {
      const id = (t.testId || "").toLowerCase();
      if (criticalTestIds.some(ct => id === ct || id.includes(ct))) {
        severeList.push(t.testName);
      }
    }
  }
  return { hasSevere: severeList.length > 0, list: severeList };
}

function isMealSectionComplete(text: string, section: string): boolean {
  const pattern = `"${section}"`;
  const idx = text.indexOf(pattern);
  if (idx === -1) return false;
  const bracketStart = text.indexOf('[', idx);
  if (bracketStart === -1) return false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = bracketStart; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) return true; }
  }
  return false;
}

function extractMealSection(text: string, section: string): any[] | null {
  const pattern = `"${section}"`;
  const idx = text.indexOf(pattern);
  if (idx === -1) return null;
  const bracketStart = text.indexOf('[', idx);
  if (bracketStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = bracketStart; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.substring(bracketStart, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

export type ProgressCallback = (completedSections: string[], partialMeals: Record<string, any[]>) => Promise<void>;

export async function generateDietPlan(userData: UserHealthData, onProgress?: ProgressCallback): Promise<DietPlanResult> {
  const isArabic = userData.language === "ar";
  const goal = userData.fitnessGoal || "maintain";
  const activityLevel = userData.activityLevel || "sedentary";
  const mealPreference = userData.mealPreference || "balanced";
  const allergies = userData.allergies || [];
  const hasAllergies = userData.hasAllergies || false;
  const proteinPref = userData.proteinPreference || "mixed";
  const proteinPrefs = userData.proteinPreferences && userData.proteinPreferences.length > 0
    ? userData.proteinPreferences
    : [proteinPref];
  const carbPrefs = userData.carbPreferences || [];

  const abnormalTests = userData.testResults.filter(t => t.status === "low" || t.status === "high");
  const normalTests = userData.testResults.filter(t => t.status === "normal");

  const weight = userData.weight || 70;
  const height = userData.height || 170;
  const age = userData.age || 30;
  const gender = userData.gender || "male";

  // Extract InBody metrics if available in the test results
  const pbfTest = userData.testResults.find(t => t.testId === "inbody-pbf" || (t.testId && t.testId.includes("pbf")));
  const smmTest = userData.testResults.find(t => t.testId === "inbody-smm" || (t.testId && t.testId.includes("smm")));
  const visceralTest = userData.testResults.find(t => t.testId === "inbody-vf" || (t.testId && t.testId.includes("visceral")));

  const inbodyPbf = pbfTest?.value || null;
  const inbodySmm = smmTest?.value || null;
  const inbodyVisceral = visceralTest?.value || null;

  const { hasSevere: hasSevereDeficiency, list: severeDeficiencyList } = detectSevereDeficiencies(userData.testResults);

  // Retrieve verifiable clinical context from RAG Memory System
  const knowledgeContext = await searchRelevantKnowledge(userData.testResults, goal);

  const bmr = Math.round(calculateBMR(weight, height, age, gender));
  const tdee = calculateTDEE(bmr, activityLevel);
  const { target: autoTargetCalories } = getTargetCalories(tdee, bmr, goal, hasSevereDeficiency);
  const hasCustomTargetCalories = mealPreference === "custom_macros" && typeof userData.customTargetCalories === "number" && Number.isFinite(userData.customTargetCalories);
  const normalizedCustomTargetCalories = hasCustomTargetCalories
    ? Math.max(800, Math.min(6000, Math.round(userData.customTargetCalories as number)))
    : null;
  const targetCalories = normalizedCustomTargetCalories ?? autoTargetCalories;
  const delta = targetCalories - tdee;
  const macros = getMacroTargets(targetCalories, goal, mealPreference, weight);
  const tef = calculateTEF(targetCalories, macros.protein.grams, macros.carbs.grams, macros.fats.grams);
  const fiberTarget = calculateFiberTarget(targetCalories, gender);
  const waterTarget = calculateWaterIntake(weight, activityLevel);

  const mealDistribution = userData.mealDistribution || "auto";

  type MealSlot = { key: string; labelAr: string; labelEn: string; percent: number; icon: string };

  function getMealSlots(distribution: string, calories: number): MealSlot[] {
    if (distribution === "3_meals") {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 30, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 40, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 30, icon: "moon" },
      ];
    }
    if (distribution === "3_meals_snack") {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 25, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 35, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
        { key: "snacks", labelAr: "سناك", labelEn: "Snack", percent: 15, icon: "cafe" },
      ];
    }
    if (distribution === "4_meals_snack") {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 20, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 30, icon: "restaurant" },
        { key: "snack1", labelAr: "سناك بعد الغداء", labelEn: "Afternoon Snack", percent: 10, icon: "cafe" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
        { key: "snacks", labelAr: "سناك مسائي", labelEn: "Evening Snack", percent: 15, icon: "cafe" },
      ];
    }
    if (distribution === "equal") {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 25, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 25, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
        { key: "snacks", labelAr: "سناك", labelEn: "Snack", percent: 25, icon: "cafe" },
      ];
    }

    // AUTO mode: scientific distribution based on calories + goal
    // Low calories (deficit/weight loss): 3 meals, no snack needed
    // Prevents unnecessary calorie splitting for deficit diets
    if (calories <= 1600) {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 30, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 40, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 30, icon: "moon" },
      ];
    }
    // Medium calories: 3 meals + 1 snack
    // Snack helps maintain blood sugar and prevent overeating at meals
    if (calories <= 2200) {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 25, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 35, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
        { key: "snacks", labelAr: "سناك", labelEn: "Snack", percent: 15, icon: "cafe" },
      ];
    }
    // High calories (2200-2800): 3 meals + 1 larger snack
    // More food per meal, snack becomes more substantial
    if (calories <= 2800) {
      return [
        { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 25, icon: "sunny" },
        { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 30, icon: "restaurant" },
        { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
        { key: "snacks", labelAr: "سناك", labelEn: "Snack", percent: 20, icon: "cafe" },
      ];
    }
    // Very high calories (2800+): 4 meals + snack
    // Muscle gain / bulking: spreading protein intake across more meals
    // optimizes MPS (Muscle Protein Synthesis) per Schoenfeld et al.
    return [
      { key: "breakfast", labelAr: "فطور", labelEn: "Breakfast", percent: 20, icon: "sunny" },
      { key: "lunch", labelAr: "غداء", labelEn: "Lunch", percent: 28, icon: "restaurant" },
      { key: "snack1", labelAr: "سناك بعد الغداء", labelEn: "Afternoon Snack", percent: 12, icon: "cafe" },
      { key: "dinner", labelAr: "عشاء", labelEn: "Dinner", percent: 25, icon: "moon" },
      { key: "snacks", labelAr: "سناك مسائي", labelEn: "Evening Snack", percent: 15, icon: "cafe" },
    ];
  }

  const mealSlots = getMealSlots(mealDistribution, targetCalories);
  const mealSplits = mealSlots.map(slot => ({
    ...slot,
    calories: Math.round(targetCalories * slot.percent / 100),
    protein: Math.round(macros.protein.grams * slot.percent / 100),
    carbs: Math.round(macros.carbs.grams * slot.percent / 100),
    fats: Math.round(macros.fats.grams * slot.percent / 100),
  }));

  const breakfastCalories = mealSplits.find(s => s.key === "breakfast")?.calories || Math.round(targetCalories * 0.25);
  const lunchCalories = mealSplits.find(s => s.key === "lunch")?.calories || Math.round(targetCalories * 0.35);
  const dinnerCalories = mealSplits.find(s => s.key === "dinner")?.calories || Math.round(targetCalories * 0.30);
  const snackCalories = mealSplits.find(s => s.key === "snacks")?.calories || (targetCalories - breakfastCalories - lunchCalories - dinnerCalories);

  const breakfastProtein = mealSplits.find(s => s.key === "breakfast")?.protein || Math.round(macros.protein.grams * 0.25);
  const lunchProtein = mealSplits.find(s => s.key === "lunch")?.protein || Math.round(macros.protein.grams * 0.35);
  const dinnerProtein = mealSplits.find(s => s.key === "dinner")?.protein || Math.round(macros.protein.grams * 0.30);
  const snackProtein = mealSplits.find(s => s.key === "snacks")?.protein || (macros.protein.grams - breakfastProtein - lunchProtein - dinnerProtein);
  const breakfastCarbs = mealSplits.find(s => s.key === "breakfast")?.carbs || Math.round(macros.carbs.grams * 0.25);
  const lunchCarbs = mealSplits.find(s => s.key === "lunch")?.carbs || Math.round(macros.carbs.grams * 0.35);
  const dinnerCarbs = mealSplits.find(s => s.key === "dinner")?.carbs || Math.round(macros.carbs.grams * 0.30);
  const snackCarbs = mealSplits.find(s => s.key === "snacks")?.carbs || (macros.carbs.grams - breakfastCarbs - lunchCarbs - dinnerCarbs);
  const breakfastFats = mealSplits.find(s => s.key === "breakfast")?.fats || Math.round(macros.fats.grams * 0.25);
  const lunchFats = mealSplits.find(s => s.key === "lunch")?.fats || Math.round(macros.fats.grams * 0.35);
  const dinnerFats = mealSplits.find(s => s.key === "dinner")?.fats || Math.round(macros.fats.grams * 0.30);
  const snackFats = mealSplits.find(s => s.key === "snacks")?.fats || (macros.fats.grams - breakfastFats - lunchFats - dinnerFats);

  const currentProteinPerKg = mealPreference === "high_protein"
    ? (goal === "muscle_gain" ? 2.4 : 2.2)
    : mealPreference === "low_carb" ? 1.8
      : mealPreference === "keto" ? 1.6
        : mealPreference === "vegetarian" ? 1.4
          : goal === "weight_loss" ? 2.0
            : goal === "muscle_gain" ? 2.2 : 1.6;
  const currentMinCarbGrams = mealPreference === "keto" ? Math.round(weight * 0.3)
    : mealPreference === "low_carb" ? Math.round(weight * 1.5) : 0;

  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  const bmiCategory = parseFloat(bmi) < 18.5 ? "underweight" : parseFloat(bmi) < 25 ? "healthy" : parseFloat(bmi) < 30 ? "overweight" : "obese";

  const allergyNames: Record<string, { en: string; ar: string }> = {
    eggs: { en: "Eggs", ar: "بيض" },
    dairy: { en: "Dairy", ar: "مشتقات الألبان" },
    peanuts: { en: "Peanuts", ar: "فول سوداني" },
    nuts: { en: "Nuts", ar: "مكسرات" },
    seafood: { en: "Seafood", ar: "مأكولات بحرية" },
    soy: { en: "Soy", ar: "صويا" },
    sesame: { en: "Sesame", ar: "سمسم" },
    wheat: { en: "Wheat", ar: "قمح" },
    fish: { en: "Fish", ar: "سمك" },
  };

  const allergyList = hasAllergies && allergies.length > 0
    ? allergies.map(a => isArabic ? (allergyNames[a]?.ar || a) : (allergyNames[a]?.en || a)).join(", ")
    : "";

  const activityLabels: Record<string, { en: string; ar: string }> = {
    sedentary: { en: "Sedentary", ar: "قليل الحركة" },
    lightly_active: { en: "Lightly Active", ar: "نشيط بشكل خفيف" },
    very_active: { en: "Very Active", ar: "نشيط بشكل عالي" },
    extremely_active: { en: "Extremely Active", ar: "نشيط بشكل عالي جداً" },
  };

  const preferenceLabels: Record<string, { en: string; ar: string }> = {
    high_protein: { en: "High Protein", ar: "عالية البروتين" },
    balanced: { en: "Balanced", ar: "متوازنة" },
    low_carb: { en: "Low Carb", ar: "لو-كارب" },
    keto: { en: "Keto", ar: "كيتو" },
    vegetarian: { en: "Vegetarian", ar: "نباتية" },
    custom_macros: { en: "Custom Macros", ar: "ماكروز مخصصة" },
  };

  const proteinPrefLabels: Record<string, { en: string; ar: string }> = {
    fish: { en: "Fish", ar: "أسماك" },
    chicken: { en: "Chicken", ar: "دجاج" },
    meat: { en: "Red Meat", ar: "لحوم حمراء" },
    vegetarian: { en: "Vegetarian (Legumes, Tofu, Lentils)", ar: "نباتي (بقوليات، توفو، عدس)" },
    mixed: { en: "Mixed (all types)", ar: "متنوع (جميع الأنواع)" },
  };

  const carbPrefLabels: Record<string, { en: string; ar: string }> = {
    rice: { en: "Rice", ar: "أرز" },
    bread: { en: "Bread", ar: "خبز" },
    pasta: { en: "Pasta", ar: "معكرونة" },
    oats: { en: "Oats", ar: "شوفان" },
    potato: { en: "Potato", ar: "بطاطس" },
    sweet_potato: { en: "Sweet Potato", ar: "بطاطا حلوة" },
    quinoa: { en: "Quinoa", ar: "كينوا" },
    bulgur: { en: "Bulgur", ar: "برغل" },
    keto: { en: "Keto (Nuts & Seeds)", ar: "كيتو (مكسرات وبذور)" },
    corn: { en: "Corn", ar: "ذرة" },
    beans: { en: "Beans & Legumes", ar: "بقوليات" },
    fruits: { en: "Fruits", ar: "فواكه" },
  };

  const testsDescription = userData.testResults
    .filter(t => t.value != null)
    .map(t => {
      const statusText = t.status === "low" ? "LOW" : t.status === "high" ? "HIGH" : "NORMAL";
      const range = t.normalRangeMin != null && t.normalRangeMax != null
        ? `(normal: ${t.normalRangeMin}-${t.normalRangeMax} ${t.unit || ""})`
        : "";
      return `- ${t.testName}: ${t.value} ${t.unit || ""} [${statusText}] ${range}`;
    })
    .join("\n");

  const goalDescriptions: Record<string, { en: string; ar: string }> = {
    weight_loss: {
      en: "Weight Loss - Low calorie diet to lose fat while preserving muscle",
      ar: "نزول الوزن - نظام منخفض السعرات لخسارة الدهون مع الحفاظ على العضلات",
    },
    maintain: {
      en: "Weight Maintenance - Balanced diet to maintain current weight and correct deficiencies",
      ar: "ثبات الوزن - نظام متوازن للحفاظ على الوزن الحالي وتعديل النواقص",
    },
    muscle_gain: {
      en: "Muscle Gain - Clean calorie surplus for building lean muscle with healthy food sources only",
      ar: "زيادة الوزن (عضل) - زيادة سعرات من مصادر نظيفة وصحية لبناء العضلات فقط",
    },
  };

  const proteinListAr = proteinPrefs.map(p => proteinPrefLabels[p]?.ar || p).join("، ");
  const proteinListEn = proteinPrefs.map(p => proteinPrefLabels[p]?.en || p).join(", ");

  const proteinInstruction = mealPreference !== "vegetarian"
    ? isArabic
      ? `\n- ⚠️ قاعدة صارمة: المستخدم اختار هذه البروتينات فقط: [${proteinListAr}]. يُمنع منعاً باتاً استخدام أي نوع بروتين لم يختره المستخدم. إذا اختار "دجاج" فقط، لا تضع سمك أو لحم. إذا اختار "دجاج ولحم حمراء"، لا تضع سمك. نوّع بين الأنواع المختارة فقط.`
      : `\n- STRICT RULE: The user selected ONLY these proteins: [${proteinListEn}]. You MUST NOT include any protein source the user did NOT select. If they chose only "Chicken", do NOT include fish or red meat. If they chose "Chicken and Red Meat", do NOT include fish. Rotate ONLY between the selected types.`
    : "";

  const carbListAr = carbPrefs.map(c => carbPrefLabels[c]?.ar || c).join("، ");
  const carbListEn = carbPrefs.map(c => carbPrefLabels[c]?.en || c).join(", ");

  const carbInstruction = carbPrefs.length > 0
    ? isArabic
      ? `\n- ⚠️ قاعدة صارمة: المستخدم اختار هذه الكربوهيدرات فقط: [${carbListAr}]. يُمنع منعاً باتاً استخدام أي مصدر كربوهيدرات لم يختره المستخدم. إذا اختار "شوفان وأرز" فقط، لا تضع خبز أو معكرونة أو بطاطس. استخدم فقط ما اختاره المستخدم.`
      : `\n- STRICT RULE: The user selected ONLY these carb sources: [${carbListEn}]. You MUST NOT include any carbohydrate source the user did NOT select. If they chose only "Oats and Rice", do NOT include bread, pasta, or potato. Use ONLY the user's selected carb sources.`
    : "";

  const toneInstruction = isArabic
    ? `\n\nأسلوب مهم جداً:
- لا تخوّف المستخدم! لا تستخدم كلمات مثل "خطورة" أو "خطر الإصابة" أو "مرض".
- بدلاً من ذلك، استخدم أسلوب إيجابي ومشجع. مثلاً:
  - بدل "هناك خطورة للإصابة بالسكري" → "هدفنا تخفيض مستوى السكر الصائم للوصول إلى الحد الطبيعي"
  - بدل "أنت معرض لأمراض القلب" → "نعمل على تحسين مستويات الدهون لصحة قلب أفضل"
  - بدل "لديك نقص خطير" → "نسعى لرفع مستوى [الفيتامين/المعدن] للوصول إلى المعدل المثالي"
- الهدف هو مساعدة المستخدم للوصول إلى الصحة المثالية بأسلوب محفّز وإيجابي
- ركز على ما يمكن فعله وليس على المخاطر
- استخدم عبارات مثل: "لتحسين"، "للوصول إلى المعدل الطبيعي"، "لتعزيز صحتك"، "خطوة نحو صحة أفضل"`
    : `\n\nIMPORTANT TONE GUIDELINES:
- Do NOT scare the user! Never use words like "risk", "danger", "disease risk", or "you are at risk of".
- Instead, use a positive, encouraging, supportive tone. For example:
  - Instead of "You are at risk of diabetes" → "Our goal is to bring your fasting sugar to the normal range"
  - Instead of "You are at risk of heart disease" → "We're working on improving your lipid levels for better heart health"
  - Instead of "You have a serious deficiency" → "Let's work on raising your [vitamin/mineral] to the optimal level"
- The goal is to help the user reach optimal health with a motivating, positive approach
- Focus on what can be done, not on risks
- Use phrases like: "to improve", "to reach the normal range", "to boost your health", "a step toward better health"`;

  const supplementInstruction = isArabic
    ? `\n- بناءً على نتائج التحاليل والنواقص، اقترح مكملات غذائية محددة إذا لزم الأمر (مثل فيتامين د، حديد، ب12، أوميغا-3، إلخ). لكل مكمل حدد:
  * "name": اسم المكمل
  * "dosage": الجرعة المقترحة (مثال: "1000 وحدة دولية يومياً")
  * "reason": سبب الحاجة مرتبط بنتيجة التحليل
  * "duration": مدة الاستخدام المقترحة
  * "foodSources": قائمة بـ 3-5 أطعمة طبيعية غنية بهذا العنصر مع الكمية (مثل: "100 جرام سلمون = 600 وحدة دولية فيتامين د")
  * "targetLabValue": القيمة المستهدفة للتحليل المرتبط (مثال: "فيتامين د: 30-50 نانوجرام/مل")
  * "scientificBasis": مرجع علمي مختصر يدعم التوصية (مثال: "NIH Office of Dietary Supplements - توصيات الجرعة اليومية")
- ركز أولاً على تعويض النواقص من خلال الغذاء الطبيعي، وأضف المكملات فقط عند الحاجة الفعلية
- اذكر المصادر الغذائية الطبيعية لكل مكمل حتى يمكن الحصول عليه من الطعام أيضاً
- ⚠️ لا تقدم تشخيصاً طبياً. لا توصي بأدوية أو مكملات دوائية بجرعات علاجية. استخدم لغة إرشادية مثل "يمكنك مناقشة مع طبيبك" أو "قد يكون من المفيد"`
    : `\n- Based on lab results and deficiencies, suggest specific dietary supplements if needed (e.g., Vitamin D, Iron, B12, Omega-3, etc.). For each supplement provide:
  * "name": Supplement name
  * "dosage": Suggested dosage (e.g., "1000 IU daily")
  * "reason": Reason linked to specific lab result
  * "duration": Suggested duration of use
  * "foodSources": List of 3-5 natural foods rich in this nutrient with amounts (e.g., "100g salmon = 600 IU vitamin D")
  * "targetLabValue": Target value for the related lab test (e.g., "Vitamin D: 30-50 ng/mL")
  * "scientificBasis": Brief scientific reference supporting the recommendation (e.g., "NIH Office of Dietary Supplements - daily intake recommendations")
- Focus first on compensating deficiencies through natural food, and add supplements only when truly needed
- List natural food sources for each supplement so the user can also get it from food
- Do NOT provide medical diagnosis. Do NOT recommend pharmaceutical drugs or therapeutic dosages. Use guiding language like "you may discuss with your doctor" or "it may be helpful to consider".`;

  const deficiencyCalorieNote = hasSevereDeficiency
    ? isArabic
      ? `\n⚠️ تنبيه مهم: تم اكتشاف نقص في عناصر غذائية حيوية (${severeDeficiencyList.join("، ")}). لذلك ${goal === "weight_loss" ? "تم تخفيف العجز الحراري إلى 8% فقط من TDEE بدلاً من 15% لضمان حصول الجسم على ما يكفي من العناصر الغذائية أثناء نزول الوزن. الأولوية هي تصحيح النواقص أولاً." : "الأولوية هي تصحيح هذه النواقص من خلال الغذاء الطبيعي قبل التركيز على السعرات."}
- لا تقترح أي خطة غذائية تقل سعراتها عن BMR (${bmr} سعرة). هذا الحد الأدنى الآمن لوظائف الجسم الحيوية.`
      : `\nIMPORTANT: Severe nutritional deficiencies detected (${severeDeficiencyList.join(", ")}). Therefore ${goal === "weight_loss" ? "the calorie deficit has been reduced to only 8% of TDEE instead of 15% to ensure the body gets enough nutrients while losing weight. Priority is correcting deficiencies first." : "priority is correcting these deficiencies through natural food before focusing on calories."}
- NEVER suggest a diet plan below BMR (${bmr} kcal). This is the minimum safe threshold for vital body functions.`
    : isArabic
      ? `\n- لا تقترح أي خطة غذائية تقل سعراتها عن BMR (${bmr} سعرة). هذا الحد الأدنى الآمن لوظائف الجسم الحيوية.`
      : `\n- NEVER suggest a diet plan below BMR (${bmr} kcal). This is the minimum safe threshold for vital body functions.`;

  const customCalorieInstruction = hasCustomTargetCalories && normalizedCustomTargetCalories
    ? isArabic
      ? `\n- ⚠️ سعرات مخصصة من المستخدم: ${normalizedCustomTargetCalories} سعرة/يوم.
- قاعدة إلزامية: متوسط مجموع سعرات اليوم (فطور + غداء + عشاء + سناك) يجب أن يكون أقل من أو يساوي ${normalizedCustomTargetCalories} سعرة، ولا يتجاوزها.`
      : `\n- ⚠️ User-selected custom calories: ${normalizedCustomTargetCalories} kcal/day.
- Mandatory rule: The average total daily calories (breakfast + lunch + dinner + snacks) must be less than or equal to ${normalizedCustomTargetCalories} kcal and must not exceed it.`
    : "";

  const bmiCategoryLabels: Record<string, { en: string; ar: string }> = {
    underweight: { en: "Underweight", ar: "أقل من الوزن الطبيعي" },
    healthy: { en: "Healthy Weight", ar: "وزن صحي" },
    overweight: { en: "Overweight", ar: "زيادة في الوزن" },
    obese: { en: "Obesity", ar: "سمنة" },
  };

  // Old monolithic systemPrompt + userContent removed — replaced by 3-phase prompts below
  void 0; // placeholder

  console.log("Calling OpenAI for diet plan generation (3-phase approach)...");
  const callStart = Date.now();

  const userContextBlock = isArabic
    ? `بيانات المستخدم الأساسية:
- العمر: ${age} سنة | الجنس: ${gender === "male" ? "ذكر" : "أنثى"} | الوزن: ${weight} كجم | الطول: ${height} سم
- BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].ar})
- الهدف: ${goalDescriptions[goal].ar}
- مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
- نوع الوجبات: ${preferenceLabels[mealPreference]?.ar || mealPreference}
- البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `- الكربوهيدرات المفضلة: ${carbListAr}` : ""}
${hasAllergies && allergyList ? `- الحساسيات الغذائية: ${allergyList}` : "- لا يوجد حساسيات غذائية"}
- BMR: ${bmr} سعرة | TDEE: ${tdee} سعرة | السعرات المستهدفة: ${targetCalories} سعرة
- البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${hasSevereDeficiency ? `- ⚠️ نقص حاد في: ${severeDeficiencyList.join("، ")}` : ""}

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}`
    : `Core User Data:
- Age: ${age} | Gender: ${gender} | Weight: ${weight}kg | Height: ${height}cm
- BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].en})
- Goal: ${goalDescriptions[goal].en}
- Activity: ${activityLabels[activityLevel]?.en || activityLevel}
- Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
- Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `- Carb Preferences: ${carbListEn}` : ""}
${hasAllergies && allergyList ? `- Allergies: ${allergyList}` : "- No allergies"}
- BMR: ${bmr} kcal | TDEE: ${tdee} kcal | Target: ${targetCalories} kcal
- Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${hasSevereDeficiency ? `- WARNING: Severe deficiencies in: ${severeDeficiencyList.join(", ")}` : ""}

Lab Results:
${testsDescription || "No lab results available"}`;

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Health Analysis (no meals)
  // ═══════════════════════════════════════════════════════════
  const phase1SystemPrompt = isArabic
    ? `أنت بروفيسور في التغذية العلاجية والطب الوقائي. مهمتك في هذه المرحلة: التحليل الصحي فقط (بدون وجبات).

${userContextBlock}

المطلوب:
1. "healthSummary": تقييم سريري شامل بناءً على التحاليل (إن وجدت) أو الملف الجسدي
2. "intakeAlignment": شرح التوافق بين السعرات المستهدفة (${targetCalories}) والهدف والحالة الأيضية
3. "deficiencies": مصفوفة للنواقص المكتشفة (إن وجدت). لكل نقص: name, current, target, foods (3-5 أطعمة غنية بالعنصر), absorptionTip
4. "supplements": مصفوفة للمكملات المقترحة (إن وجدت). لكل مكمل: name, dosage, reason, duration, foodSources (3-5 مصادر مع الكمية), targetLabValue, scientificBasis, timingAdvice, interactions
5. "conditionTips": نصائح مخصصة لكل حالة مكتشفة. لكل حالة: condition, advice[], avoidFoods[], scientificReason
6. "tips": نصائح غذائية عامة إيجابية ومحفزة (5-8 نصائح)
7. "warnings": تنبيهات لطيفة للمتابعة الطبية (إن لزم)
8. "mealTimingAdvice": توصيات التوقيت الغذائي (Chrononutrition)
9. "nutrientInteractions": تفاعلات غذائية مهمة لهذا المستخدم
10. "references": المراجع العلمية
11. "summary": ملخص إيجابي عن البروتوكول
12. "goalDescription": وصف مختصر تحفيزي للهدف

${toneInstruction}
${deficiencyCalorieNote}
${supplementInstruction}

- إذا لم تتوفر تحاليل: اعتمد على الملف الجسدي والهدف فقط، وأرجع مصفوفات فارغة [] لـ deficiencies و supplements
- لا تقدم تشخيصاً طبياً. استخدم لغة إرشادية
- جميع الردود باللغة العربية
- أرجع JSON فقط`
    : `You are a Professor of Clinical Nutrition and Preventive Medicine. Your task in this phase: Health analysis ONLY (no meals).

${userContextBlock}

Requirements:
1. "healthSummary": Comprehensive clinical assessment based on lab results (if available) or physical profile
2. "intakeAlignment": Explain alignment between target calories (${targetCalories}), goal, and metabolic status
3. "deficiencies": Array of detected deficiencies (if any). Each: name, current, target, foods (3-5 rich foods), absorptionTip
4. "supplements": Array of suggested supplements (if any). Each: name, dosage, reason, duration, foodSources (3-5 with amounts), targetLabValue, scientificBasis, timingAdvice, interactions
5. "conditionTips": Personalized tips for each detected condition. Each: condition, advice[], avoidFoods[], scientificReason
6. "tips": General positive dietary tips (5-8 tips)
7. "warnings": Gentle follow-up reminders (if needed)
8. "mealTimingAdvice": Chrononutrition recommendations
9. "nutrientInteractions": Important nutrient interactions for this user
10. "references": Scientific references
11. "summary": Positive protocol summary
12. "goalDescription": Brief motivating goal description

${toneInstruction}
${deficiencyCalorieNote}
${supplementInstruction}

- If no lab results: base assessment on physical profile and goal only, return empty arrays [] for deficiencies and supplements
- Do NOT provide medical diagnosis. Use guiding language
- All responses in English
- Return JSON only`;

  console.log("[Phase 1] Starting health analysis...");
  if (onProgress) {
    try { await onProgress(['analysis_started'], {}); } catch (e) { /* ignore */ }
  }

  const phase1Response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: phase1SystemPrompt },
      { role: "user", content: isArabic ? "حلل الحالة الصحية وقدم التوصيات بناءً على البيانات أعلاه. أرجع JSON فقط." : "Analyze the health status and provide recommendations based on the data above. Return JSON only." },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: 8000,
  });

  const phase1Content = phase1Response.choices[0]?.message?.content || '{}';
  const phase1Data = JSON.parse(phase1Content.match(/\{[\s\S]*\}/)?.[0] || '{}');
  console.log(`[Phase 1] Health analysis complete at ${((Date.now() - callStart) / 1000).toFixed(1)}s`);

  const phase1Summary = isArabic
    ? `ملخص التحليل الصحي من المرحلة 1:
- الملخص: ${(phase1Data.healthSummary || '').slice(0, 300)}
- النواقص: ${(phase1Data.deficiencies || []).map((d: any) => d.name).join("، ") || "لا يوجد"}
- المكملات: ${(phase1Data.supplements || []).map((s: any) => s.name).join("، ") || "لا يوجد"}
- الحالات: ${(phase1Data.conditionTips || []).map((c: any) => c.condition).join("، ") || "لا يوجد"}`
    : `Phase 1 Health Analysis Summary:
- Summary: ${(phase1Data.healthSummary || '').slice(0, 300)}
- Deficiencies: ${(phase1Data.deficiencies || []).map((d: any) => d.name).join(", ") || "None"}
- Supplements: ${(phase1Data.supplements || []).map((s: any) => s.name).join(", ") || "None"}
- Conditions: ${(phase1Data.conditionTips || []).map((c: any) => c.condition).join(", ") || "None"}`;

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Breakfast + Lunch meals
  // ═══════════════════════════════════════════════════════════
  const phase2MealSlots = mealSplits.filter(s => s.key === 'breakfast' || s.key === 'lunch');
  const phase2MealKeys = phase2MealSlots.map(s => s.key);

  const mealRulesBlock = isArabic
    ? `⸻ قواعد الدقة العلمية: ⸻
- يُمنع تخمين السعرات أو الماكروز. احسب من جداول USDA لكل مكون بالجرام
- معادلة السعرات: (بروتين×4) + (كارب×4) + (دهون×9) — هامش ±10 سعرات فقط
- كل مكون يجب تحديد وزنه بالجرام بدقة

⸻ قواعد التنوع: ⸻
- 5 خيارات مختلفة تماماً لكل وجبة في المكونات الرئيسية وأسلوب الطهي
- لا تكرر نفس المكون الرئيسي في أكثر من خيارين
- استلهم من قوائم شركات الوجبات الصحية (Calo, RightBite, Diet Center)
- نوّع أساليب الطهي (مشوي، مسلوق، مخبوز، مقلي بالهواء) والمطابخ
- كل خيار وجبة كاملة (بروتين + كارب + خضار + دهون صحية)
${proteinInstruction}${carbInstruction}
- ⚠️ لا تضع أي مكون لم يختره المستخدم

⸻ هيكل JSON لكل وجبة: ⸻
كل خيار يحتوي: name (اسم وصفي), benefits (فائدة صحية مرتبطة بالتحاليل/الهدف), preparationTip (نصيحة تحسين القيمة الغذائية), ingredients (مصفوفة المكونات)
كل مكون: name, quantity (بالجرام), unit ("g"), state ("raw"/"cooked"/"liquid"/"dried" — إلزامي), nutritionBasis ("per_100g"), protein, carbs, fat, calories, fiber, sourceReference, sourceConfidence
- ⚠️ state إلزامي ويؤثر على القيم الغذائية (أرز ني=365 سعرة vs مطبوخ=130 سعرة)`
    : `⸻ SCIENTIFIC ACCURACY RULES: ⸻
- NEVER guess calories or macros. Calculate from USDA tables per ingredient in grams
- Calorie formula: (protein×4) + (carbs×4) + (fats×9) — ±10 kcal tolerance only
- Every ingredient MUST have exact weight in grams

⸻ VARIETY RULES: ⸻
- 5 completely different options per meal in main ingredients and cooking method
- Do NOT repeat the same main ingredient in more than 2 options
- Draw inspiration from premium meal-prep companies (Calo, RightBite, Diet Center)
- Vary cooking methods (grilled, boiled, baked, air-fried) and cuisines
- Each option = complete meal (protein + carb + vegetables + healthy fats)
${proteinInstruction}${carbInstruction}
- GOLDEN RULE: Do NOT include any ingredient the user did NOT select

⸻ JSON STRUCTURE per meal: ⸻
Each option: name (descriptive), benefits (health benefit linked to labs/goal), preparationTip (nutrient optimization tip), ingredients (array)
Each ingredient: name, quantity (grams), unit ("g"), state ("raw"/"cooked"/"liquid"/"dried" — MANDATORY), nutritionBasis ("per_100g"), protein, carbs, fat, calories, fiber, sourceReference, sourceConfidence
- state is MANDATORY and affects nutritional values (raw rice=365cal vs cooked=130cal)`;

  const phase2SystemPrompt = isArabic
    ? `أنت بروفيسور تغذية علاجية. مهمتك: تصميم وجبات الفطور والغداء فقط (5 خيارات لكل وجبة).

${userContextBlock}

${phase1Summary}

${mealRulesBlock}

⚠️ بناءً على التحليل الصحي أعلاه، صمم الوجبات لمعالجة النواقص المكتشفة من خلال الغذاء الطبيعي.
${hasAllergies && allergyList ? `- ⚠️ حساسية: ${allergyList}. يُمنع وضع أي مسبب حساسية` : ""}
${customCalorieInstruction}

أرجع JSON بهذا الشكل:
{
  "mealPlan": {
${phase2MealSlots.map(s => `    "${s.key}": [5 خيارات — كل خيار ${s.calories} سعرة (P:${s.protein}g C:${s.carbs}g F:${s.fats}g)]`).join(",\n")}
  }
}
- يجب بالضبط 5 خيارات كاملة لكل وجبة
- أرجع JSON فقط`
    : `You are a Professor of Clinical Nutrition. Your task: Design Breakfast and Lunch meals ONLY (5 options each).

${userContextBlock}

${phase1Summary}

${mealRulesBlock}

Based on the health analysis above, design meals that address detected deficiencies through natural food.
${hasAllergies && allergyList ? `- ALLERGY WARNING: ${allergyList}. MUST NOT include any allergen` : ""}
${customCalorieInstruction}

Return JSON in this format:
{
  "mealPlan": {
${phase2MealSlots.map(s => `    "${s.key}": [5 options — each ~${s.calories} kcal (P:${s.protein}g C:${s.carbs}g F:${s.fats}g)]`).join(",\n")}
  }
}
- EXACTLY 5 complete options per meal
- Return JSON only`;

  console.log("[Phase 2] Generating breakfast + lunch...");
  if (onProgress) {
    try { await onProgress(['analysis_complete'], {}); } catch (e) { /* ignore */ }
  }

  const phase2Response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: phase2SystemPrompt },
      { role: "user", content: isArabic ? "صمم وجبات الفطور والغداء (5 خيارات لكل وجبة) بناءً على البيانات والتحليل الصحي أعلاه. أرجع JSON فقط." : "Design breakfast and lunch meals (5 options each) based on the data and health analysis above. Return JSON only." },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_completion_tokens: 12000,
  });

  const phase2Content = phase2Response.choices[0]?.message?.content || '{}';
  const phase2Data = JSON.parse(phase2Content.match(/\{[\s\S]*\}/)?.[0] || '{}');
  console.log(`[Phase 2] Breakfast + Lunch complete at ${((Date.now() - callStart) / 1000).toFixed(1)}s`);

  if (onProgress) {
    const partialMeals: Record<string, any[]> = {};
    for (const key of phase2MealKeys) {
      if (phase2Data.mealPlan?.[key]) partialMeals[key] = phase2Data.mealPlan[key];
    }
    try { await onProgress(['breakfast', 'lunch'], partialMeals); } catch (e) { /* ignore */ }
  }

  const phase2MealNames = isArabic
    ? `أسماء وجبات الفطور والغداء التي تم تصميمها (يُمنع تكرار نفس المكونات الرئيسية):
${phase2MealKeys.map(key => {
      const meals = phase2Data.mealPlan?.[key] || [];
      return meals.map((m: any, i: number) => `- ${key} ${i + 1}: ${m.name || 'N/A'}`).join("\n");
    }).join("\n")}`
    : `Breakfast and Lunch meal names already designed (DO NOT repeat the same main ingredients):
${phase2MealKeys.map(key => {
      const meals = phase2Data.mealPlan?.[key] || [];
      return meals.map((m: any, i: number) => `- ${key} ${i + 1}: ${m.name || 'N/A'}`).join("\n");
    }).join("\n")}`;

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: Dinner + Snacks meals
  // ═══════════════════════════════════════════════════════════
  const phase3MealSlots = mealSplits.filter(s => s.key !== 'breakfast' && s.key !== 'lunch');
  const phase3MealKeys = phase3MealSlots.map(s => s.key);

  const phase3SystemPrompt = isArabic
    ? `أنت بروفيسور تغذية علاجية. مهمتك: تصميم وجبات ${phase3MealSlots.map(s => s.labelAr).join(" و ")} فقط (5 خيارات لكل وجبة).

${userContextBlock}

${phase1Summary}

${phase2MealNames}

${mealRulesBlock}

⚠️ بناءً على التحليل الصحي، صمم الوجبات لمعالجة النواقص. لا تكرر نفس المكونات الرئيسية من الفطور والغداء أعلاه.
${hasAllergies && allergyList ? `- ⚠️ حساسية: ${allergyList}. يُمنع وضع أي مسبب حساسية` : ""}
${customCalorieInstruction}

أرجع JSON بهذا الشكل:
{
  "mealPlan": {
${phase3MealSlots.map(s => `    "${s.key}": [5 خيارات — كل خيار ${s.calories} سعرة (P:${s.protein}g C:${s.carbs}g F:${s.fats}g)]`).join(",\n")}
  }
}
- يجب بالضبط 5 خيارات كاملة لكل وجبة
- أرجع JSON فقط`
    : `You are a Professor of Clinical Nutrition. Your task: Design ${phase3MealSlots.map(s => s.labelEn).join(" and ")} meals ONLY (5 options each).

${userContextBlock}

${phase1Summary}

${phase2MealNames}

${mealRulesBlock}

Based on the health analysis, design meals that address deficiencies. DO NOT repeat main ingredients from breakfast/lunch above.
${hasAllergies && allergyList ? `- ALLERGY WARNING: ${allergyList}. MUST NOT include any allergen` : ""}
${customCalorieInstruction}

Return JSON in this format:
{
  "mealPlan": {
${phase3MealSlots.map(s => `    "${s.key}": [5 options — each ~${s.calories} kcal (P:${s.protein}g C:${s.carbs}g F:${s.fats}g)]`).join(",\n")}
  }
}
- EXACTLY 5 complete options per meal
- Return JSON only`;

  console.log("[Phase 3] Generating dinner + snacks...");

  const phase3Response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: phase3SystemPrompt },
      { role: "user", content: isArabic ? `صمم وجبات ${phase3MealSlots.map(s => s.labelAr).join(" و ")} (5 خيارات لكل وجبة) بناءً على البيانات والتحليل الصحي. تجنب تكرار مكونات الفطور والغداء. أرجع JSON فقط.` : `Design ${phase3MealSlots.map(s => s.labelEn).join(" and ")} meals (5 options each) based on the data and health analysis. Avoid repeating breakfast/lunch ingredients. Return JSON only.` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_completion_tokens: 12000,
  });

  const phase3Content = phase3Response.choices[0]?.message?.content || '{}';
  const phase3Data = JSON.parse(phase3Content.match(/\{[\s\S]*\}/)?.[0] || '{}');
  console.log(`[Phase 3] Dinner + Snacks complete at ${((Date.now() - callStart) / 1000).toFixed(1)}s`);

  if (onProgress) {
    const allMeals: Record<string, any[]> = {};
    for (const key of phase2MealKeys) {
      if (phase2Data.mealPlan?.[key]) allMeals[key] = phase2Data.mealPlan[key];
    }
    for (const key of phase3MealKeys) {
      if (phase3Data.mealPlan?.[key]) allMeals[key] = phase3Data.mealPlan[key];
    }
    try { await onProgress(['breakfast', 'lunch', 'dinner', 'snacks'], allMeals); } catch (e) { /* ignore */ }
  }

  console.log(`[3-Phase] All phases complete in ${((Date.now() - callStart) / 1000).toFixed(1)}s`);

  const mergedMealPlan: Record<string, any[]> = {};
  for (const key of phase2MealKeys) {
    mergedMealPlan[key] = phase2Data.mealPlan?.[key] || [];
  }
  for (const key of phase3MealKeys) {
    mergedMealPlan[key] = phase3Data.mealPlan?.[key] || [];
  }

  const content = JSON.stringify({
    ...phase1Data,
    mealPlan: mergedMealPlan,
  });

  if (!content || content === '{}') {
    throw new Error("No content generated by AI");
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);

    const defaultReferences = isArabic
      ? [
        "Mifflin MD et al. (1990) - معادلة Mifflin-St Jeor لحساب BMR - Am J Clin Nutr 51(2):241-7",
        "NHLBI BMI Calculator - المعهد الوطني للقلب والرئة والدم - nhlbi.nih.gov",
        "Dietary Reference Intakes (DRI) - National Academies of Sciences",
        "EFSA (2010) - التوصيات الأوروبية لاستهلاك الماء والألياف",
        "NIH Office of Dietary Supplements - ods.od.nih.gov",
        "PubMed - المكتبة الوطنية للطب - pubmed.ncbi.nlm.nih.gov",
        "ISSN Position Stand - International Society of Sports Nutrition",
        "Hallberg L (1991) - تفاعلات امتصاص المعادن - Am J Clin Nutr",
      ]
      : [
        "Mifflin MD et al. (1990) - Mifflin-St Jeor BMR equation - Am J Clin Nutr 51(2):241-7",
        "NHLBI BMI Calculator - National Heart, Lung, and Blood Institute - nhlbi.nih.gov",
        "Dietary Reference Intakes (DRI) - National Academies of Sciences",
        "EFSA (2010) - European Water and Fiber Intake Recommendations",
        "NIH Office of Dietary Supplements - ods.od.nih.gov",
        "PubMed - National Library of Medicine - pubmed.ncbi.nlm.nih.gov",
        "ISSN Position Stand - International Society of Sports Nutrition",
        "Hallberg L (1991) - Mineral absorption interactions - Am J Clin Nutr",
      ];

    const isPlaceholder = (val: string) => !val || val === "..." || val === "…" || val.trim().length < 3;

    // ── USDA Verification: Replace AI-fabricated nutrition with verified USDA data ──
    // This runs BEFORE cleanMeal so the macro calculations use verified per-100g values.
    // Fire-and-forget on purpose — it mutates ingredient objects in-place.
    try {
      const allRawIngredients: any[] = [];
      for (const slot of mealSplits) {
        const meals = parsed.mealPlan?.[slot.key] || [];
        for (const meal of meals) {
          if (Array.isArray(meal?.ingredients)) {
            allRawIngredients.push(...meal.ingredients);
          }
        }
      }
      if (allRawIngredients.length > 0) {
        console.log(`[USDA] Verifying ${allRawIngredients.length} ingredients against USDA FoodData Central...`);
        await verifyAndCorrectIngredients(allRawIngredients);
      }
    } catch (err) {
      console.warn("[USDA] Verification failed (non-blocking):", err);
    }

    const cleanMeal = (m: any, mealTargetCal: number) => {
      const hasIngredients = Array.isArray(m.ingredients) && m.ingredients.length > 0;

      let validMeal;
      if (hasIngredients) {
        // PRIMARY PATH: Calculate macros from ingredient-level data
        validMeal = recalculateMealMacros(
          m.name || "",
          m.benefits || "",
          m.preparationTip || "",
          m.ingredients
        );
      } else {
        // FALLBACK PATH: AI returned old format (meal-level macros, no ingredients)
        // Use the AI's macros but recalculate calories from P*4 + C*4 + F*9
        const protein = Number(m.protein) || 0;
        const carbs = Number(m.carbs) || 0;
        const fats = Number(m.fats || m.fat) || 0;
        const fiber = Number(m.fiber) || 0;
        const calories = Math.round((protein * 4) + (carbs * 4) + (fats * 9));
        console.warn(`[Nutrition Fallback] Meal "${(m.name || '').slice(0, 30)}" has no ingredients array — using AI meal-level macros (P:${protein} C:${carbs} F:${fats} = ${calories}cal)`);
        validMeal = {
          name: m.name || "Meal",
          description: m.description || "",
          ingredients: [],
          protein,
          carbs,
          fats,
          calories,
          fiber,
          benefits: m.benefits || "",
          preparationTip: m.preparationTip || "",
          validationStatus: "suspicious" as const,
          validationNotes: ["No ingredients array — used AI meal-level macros as fallback"],
        };
      }

      validMeal = validateHealthyMealRanges(validMeal);

      // Keep track of what we aimed for front-end rendering
      (validMeal as any).targetCalories = mealTargetCal;

      return validMeal;
    };

    const sanitizedMealPlan: Record<string, any[]> = {};
    for (const slot of mealSplits) {
      sanitizedMealPlan[slot.key] = (parsed.mealPlan?.[slot.key] || []).map((m: any) => cleanMeal(m, slot.calories));
    }
    if (!sanitizedMealPlan.breakfast) sanitizedMealPlan.breakfast = (parsed.mealPlan?.breakfast || []).map((m: any) => cleanMeal(m, breakfastCalories));
    if (!sanitizedMealPlan.lunch) sanitizedMealPlan.lunch = (parsed.mealPlan?.lunch || []).map((m: any) => cleanMeal(m, lunchCalories));
    if (!sanitizedMealPlan.dinner) sanitizedMealPlan.dinner = (parsed.mealPlan?.dinner || []).map((m: any) => cleanMeal(m, dinnerCalories));
    if (!sanitizedMealPlan.snacks) sanitizedMealPlan.snacks = (parsed.mealPlan?.snacks || []).map((m: any) => cleanMeal(m, snackCalories));

    let incompleteMeals = 0;
    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      for (const meal of meals as any[]) {
        if (isPlaceholder(meal.name) || (meal.ingredients.length === 0 && meal.calories === 0) || isPlaceholder(meal.benefits)) {
          incompleteMeals++;
          console.warn(`Incomplete meal in ${section}: name="${meal.name}", ingredients count=${meal.ingredients.length}, benefits="${(meal.benefits || "").slice(0, 30)}"`);
        }
      }
    }

    let emptySections = 0;
    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      if ((meals as any[]).length < 1) {
        console.warn(`WARNING: ${section} has 0 options - will use fallback`);
        emptySections++;
        const slotInfo = mealSplits.find(s => s.key === section);
        const fallbackTarget = slotInfo?.calories || (section === 'breakfast' ? breakfastCalories : section === 'lunch' ? lunchCalories : section === 'dinner' ? dinnerCalories : snackCalories);
        const fallbackName = slotInfo
          ? (isArabic ? `وجبة ${slotInfo.labelAr} متوازنة` : `Balanced ${slotInfo.labelEn}`)
          : (isArabic ? 'وجبة متوازنة' : 'Balanced Meal');
        // Bug 2 fix: fallback uses real ingredients, not hardcoded macros
        const fallbackIngredients = section === 'snacks' || section === 'snack1'
          ? [
            { name: isArabic ? 'زبادي يوناني قليل الدسم' : 'Low-fat Greek yogurt', quantity: 150, unit: 'g', state: 'any', nutritionBasis: 'per_100g', protein: 10, carbs: 3.6, fat: 0.7, calories: 59, fiber: 0, sourceReference: 'USDA FoodData Central', sourceConfidence: 'high' },
            { name: isArabic ? 'لوز' : 'Almonds', quantity: 15, unit: 'g', state: 'raw', nutritionBasis: 'per_100g', protein: 21.2, carbs: 21.6, fat: 49.9, calories: 579, fiber: 12.5, sourceReference: 'USDA FoodData Central', sourceConfidence: 'high' },
          ]
          : [
            { name: isArabic ? 'صدر دجاج مشوي' : 'Grilled chicken breast', quantity: 150, unit: 'g', state: 'cooked', nutritionBasis: 'per_100g', protein: 31, carbs: 0, fat: 3.6, calories: 165, fiber: 0, sourceReference: 'USDA FoodData Central', sourceConfidence: 'high' },
            { name: isArabic ? 'أرز بني مطبوخ' : 'Cooked brown rice', quantity: 100, unit: 'g', state: 'cooked', nutritionBasis: 'per_100g', protein: 2.6, carbs: 23, fat: 0.9, calories: 112, fiber: 1.8, sourceReference: 'USDA FoodData Central', sourceConfidence: 'high' },
            { name: isArabic ? 'بروكلي مسلوق' : 'Steamed broccoli', quantity: 100, unit: 'g', state: 'cooked', nutritionBasis: 'per_100g', protein: 2.8, carbs: 7, fat: 0.4, calories: 35, fiber: 3.3, sourceReference: 'USDA FoodData Central', sourceConfidence: 'high' },
          ];
        const fallbackMeal = cleanMeal({ name: fallbackName, benefits: isArabic ? 'تغذية متوازنة للجسم' : 'Balanced nutrition for the body', preparationTip: '', ingredients: fallbackIngredients }, fallbackTarget);
        sanitizedMealPlan[section] = [fallbackMeal];
      }
    }

    if (emptySections >= 3) {
      console.error(`REJECTED: ${emptySections} out of 4 sections are empty - plan is unusable`);
      throw new Error("DIET_PLAN_INCOMPLETE");
    }

    if (incompleteMeals > 15) {
      console.error(`REJECTED: ${incompleteMeals} out of 20 meal options have incomplete data`);
      throw new Error("DIET_PLAN_INCOMPLETE");
    } else if (incompleteMeals > 0) {
      console.warn(`WARNING: ${incompleteMeals} meal options have incomplete data but proceeding anyway to prevent crash`);
    }

    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      for (const meal of meals as any[]) {
        const macroCalories = (meal.protein || 0) * 4 + (meal.carbs || 0) * 4 + (meal.fats || 0) * 9;
        const declaredCalories = meal.calories || 0;
        if (declaredCalories > 0 && macroCalories > 0) {
          const deviation = Math.abs(macroCalories - declaredCalories) / declaredCalories;
          if (deviation > 0.25) {
            console.warn(`[Clinical QC] Macro-calorie mismatch in ${section} "${(meal.name || "").slice(0, 30)}": declared=${declaredCalories}, macro-calc=${Math.round(macroCalories)}, deviation=${(deviation * 100).toFixed(0)}%`);
          }
        }
      }
    }

    let totalAvgCalories = 0;
    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      const avg = (meals as any[]).reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max((meals as any[]).length, 1);
      totalAvgCalories += avg;
    }
    const calorieDeviation = Math.abs(totalAvgCalories - targetCalories) / targetCalories;
    if (calorieDeviation > 0.15) {
      console.warn(`[Clinical QC] Total calorie deviation: target=${targetCalories}, plan avg=${Math.round(totalAvgCalories)}, deviation=${(calorieDeviation * 100).toFixed(0)}%`);
    } else {
      console.log(`[Clinical QC] Calorie target met: target=${targetCalories}, plan avg=${Math.round(totalAvgCalories)} (${(calorieDeviation * 100).toFixed(0)}% deviation)`);
    }

    // Collect RAW AI ingredients (per-100g base values) for database cache
    const rawIngredientsForCache: any[] = [];
    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      // Access the original parsed data to get raw base values
      const originalMeals = parsed.mealPlan?.[section] || [];
      for (const origMeal of originalMeals) {
        if (Array.isArray(origMeal?.ingredients)) {
          rawIngredientsForCache.push(...origMeal.ingredients);
        }
      }
    }

    // Fire and forget cache save with RAW per-100g base values
    saveValidatedIngredients(rawIngredientsForCache).catch(err => console.error("Cache save error:", err));

    const result: DietPlanResult = {
      healthSummary: parsed.healthSummary || "",
      summary: parsed.summary || "",
      goalDescription: parsed.goalDescription || "",
      calories: {
        bmr,
        tdee,
        tef,
        target: targetCalories,
        deficit_or_surplus: delta,
        breakfast: breakfastCalories,
        lunch: lunchCalories,
        dinner: dinnerCalories,
        snack: snackCalories,
      },
      mealSlots: mealSplits.map(s => ({ key: s.key, labelAr: s.labelAr, labelEn: s.labelEn, percent: s.percent, calories: s.calories, protein: s.protein, carbs: s.carbs, fats: s.fats, icon: s.icon })),
      macros: {
        ...macros,
        fiber: { grams: fiberTarget },
        water: { liters: waterTarget },
      },
      intakeAlignment: parsed.intakeAlignment || "",
      deficiencies: (parsed.deficiencies || []).map((d: any) => ({
        name: d.name || "",
        current: d.current || "",
        target: d.target || "",
        foods: Array.isArray(d.foods) ? d.foods : [],
        absorptionTip: d.absorptionTip || "",
      })),
      supplements: (parsed.supplements || []).map((s: any) => ({
        name: s.name || "",
        dosage: s.dosage || "",
        reason: s.reason || "",
        duration: s.duration || "",
        foodSources: Array.isArray(s.foodSources) ? s.foodSources : [],
        targetLabValue: s.targetLabValue || "",
        scientificBasis: s.scientificBasis || "",
        timingAdvice: s.timingAdvice || "",
        interactions: s.interactions || "",
      })),
      mealPlan: sanitizedMealPlan as any,
      mealTimingAdvice: parsed.mealTimingAdvice || "",
      tips: parsed.tips || [],
      warnings: parsed.warnings || [],
      conditionTips: (parsed.conditionTips || []).map((c: any) => ({
        condition: c.condition || "",
        advice: Array.isArray(c.advice) ? c.advice : [],
        avoidFoods: Array.isArray(c.avoidFoods) ? c.avoidFoods : [],
        scientificReason: c.scientificReason || "",
      })),
      nutrientInteractions: parsed.nutrientInteractions || [],
      references: parsed.references && parsed.references.length > 0 ? parsed.references : defaultReferences,
    };

    learnFromDietPlanGeneration(
      userData.testResults.map(t => ({
        testName: t.testName,
        status: t.status,
        value: t.value,
        unit: t.unit,
      })),
      result
    ).catch(err => console.warn("[KnowledgeEngine] Failed to learn from generation:", err));

    return result;
  } catch (error: any) {
    if (error?.message === "DIET_PLAN_INCOMPLETE") {
      throw error;
    }
    console.error("Failed to parse diet plan response:", content?.slice(0, 500));
    throw new Error("DIET_PLAN_PARSE_ERROR");
  }
}

export async function translateDietPlan(plan: any, targetLanguage: 'en' | 'ar'): Promise<any> {
  const languageName = targetLanguage === 'ar' ? 'Arabic' : 'English';

  const prompt = `Translate the following JSON diet plan into ${languageName}.
You MUST strictly preserve the exact JSON structure, keys, numbers, and formatting.
Only translate the text values. Do not change any JSON keys.
Return ONLY valid JSON without Markdown blocks or any other explanation.

JSON to translate:
${JSON.stringify(plan)}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert medical translator. You translate complex nutritional JSON data perfectly, preserving all JSON structures and keys intact."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error("Translation failed to return content");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("DIET_PLAN_TRANSLATE_ERROR", error);
    throw new Error("Failed to translate diet plan");
  }
}
