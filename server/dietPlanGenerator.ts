import OpenAI from "openai";
import { searchRelevantKnowledge, learnFromDietPlanGeneration } from "./knowledgeEngine";

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
  };
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
    breakfast: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    lunch: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    dinner: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
    snacks: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; benefits: string; preparationTip: string }[];
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
  return Math.round(proteinGrams * 4 * 0.25 + carbGrams * 4 * 0.08 + fatGrams * 9 * 0.03);
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
    let deficit = 500;
    if (hasSevereDeficiency) {
      deficit = 200;
    }
    const target = Math.max(Math.round(tdee - deficit), bmr);
    return { target, delta: target - tdee };
  }
  if (goal === "muscle_gain") {
    return { target: Math.round(tdee + 300), delta: 300 };
  }
  return { target: tdee, delta: 0 };
}

function getMacroTargets(targetCalories: number, goal: string, preference: string, weight: number) {
  let proteinPerKg: number, fatPercentage: number, minCarbGrams: number;

  if (preference === "high_protein") {
    proteinPerKg = goal === "muscle_gain" ? 2.4 : 2.2;
    fatPercentage = 0.20;
    minCarbGrams = 0;
  } else if (preference === "low_carb") {
    proteinPerKg = 1.8;
    fatPercentage = 0.50;
    minCarbGrams = Math.round(weight * 1.5);
  } else if (preference === "keto") {
    proteinPerKg = 1.6;
    fatPercentage = 0.70;
    minCarbGrams = Math.round(weight * 0.3);
  } else if (preference === "vegetarian") {
    proteinPerKg = 1.4;
    fatPercentage = 0.30;
    minCarbGrams = 0;
  } else {
    minCarbGrams = 0;
    switch (goal) {
      case "weight_loss":
        proteinPerKg = 2.0;
        fatPercentage = 0.25;
        break;
      case "muscle_gain":
        proteinPerKg = 2.2;
        fatPercentage = 0.25;
        break;
      default:
        proteinPerKg = 1.6;
        fatPercentage = 0.30;
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

export async function generateDietPlan(userData: UserHealthData): Promise<DietPlanResult> {
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

  const { hasSevere: hasSevereDeficiency, list: severeDeficiencyList } = detectSevereDeficiencies(userData.testResults);

  const bmr = Math.round(calculateBMR(weight, height, age, gender));
  const tdee = calculateTDEE(bmr, activityLevel);
  const { target: targetCalories, delta } = getTargetCalories(tdee, bmr, goal, hasSevereDeficiency);
  const macros = getMacroTargets(targetCalories, goal, mealPreference, weight);
  const tef = calculateTEF(targetCalories, macros.protein.grams, macros.carbs.grams, macros.fats.grams);
  const fiberTarget = calculateFiberTarget(targetCalories, gender);
  const waterTarget = calculateWaterIntake(weight, activityLevel);

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
      ? `\n⚠️ تنبيه مهم: تم اكتشاف نقص في عناصر غذائية حيوية (${severeDeficiencyList.join("، ")}). لذلك ${goal === "weight_loss" ? "تم تخفيف العجز الحراري إلى 200 سعرة فقط بدلاً من 500 لضمان حصول الجسم على ما يكفي من العناصر الغذائية أثناء نزول الوزن. الأولوية هي تصحيح النواقص أولاً." : "الأولوية هي تصحيح هذه النواقص من خلال الغذاء الطبيعي قبل التركيز على السعرات."}
- لا تقترح أي خطة غذائية تقل سعراتها عن BMR (${bmr} سعرة). هذا الحد الأدنى الآمن لوظائف الجسم الحيوية.`
      : `\nIMPORTANT: Severe nutritional deficiencies detected (${severeDeficiencyList.join(", ")}). Therefore ${goal === "weight_loss" ? "the calorie deficit has been reduced to only 200 kcal instead of 500 to ensure the body gets enough nutrients while losing weight. Priority is correcting deficiencies first." : "priority is correcting these deficiencies through natural food before focusing on calories."}
- NEVER suggest a diet plan below BMR (${bmr} kcal). This is the minimum safe threshold for vital body functions.`
    : isArabic
      ? `\n- لا تقترح أي خطة غذائية تقل سعراتها عن BMR (${bmr} سعرة). هذا الحد الأدنى الآمن لوظائف الجسم الحيوية.`
      : `\n- NEVER suggest a diet plan below BMR (${bmr} kcal). This is the minimum safe threshold for vital body functions.`;

  const bmiCategoryLabels: Record<string, { en: string; ar: string }> = {
    underweight: { en: "Underweight", ar: "أقل من الوزن الطبيعي" },
    healthy: { en: "Healthy Weight", ar: "وزن صحي" },
    overweight: { en: "Overweight", ar: "زيادة في الوزن" },
    obese: { en: "Obesity", ar: "سمنة" },
  };

  const systemPrompt = isArabic
    ? `أنت بروفيسور في التغذية العلاجية والطب الوقائي، حاصل على زمالة الجمعية الأمريكية للتغذية السريرية (ASPEN) وعضوية الجمعية الدولية للتغذية الرياضية (ISSN). تعمل بمنهجية الطب المبني على الأدلة (Evidence-Based Medicine) وتصمم بروتوكولات غذائية علاجية مخصصة بناءً على التحاليل المخبرية والقياسات الأنثروبومترية.

⸻ البروتوكول السريري (Clinical Protocol) - اتبعه بالترتيب: ⸻

📋 المرحلة 1: التقييم السريري (Clinical Assessment)
- تحليل شامل لجميع نتائج التحاليل المخبرية: تحديد القيم الطبيعية، النقص (Deficiency)، الارتفاع (Excess)
- تقييم الترابطات بين المؤشرات الحيوية (Biomarker Correlations): مثال: انخفاض الفيريتين + انخفاض الهيموجلوبين = أنيميا نقص الحديد
- أعطِ الأولوية لتصحيح أي خلل أيضي قبل التوصية بعجز أو فائض حراري
- اكتب "healthSummary" يتضمن: تقييم سريري شامل بناءً على التحاليل (القيم الطبيعية، ما يحتاج تحسين، الترابطات بين النتائج، الأولويات العلاجية الغذائية)

📊 المرحلة 2: حسابات الطاقة المتقدمة (Advanced Energy Calculations)
- BMR = ${bmr} سعرة (معادلة Mifflin-St Jeor 1990 - المرجع الذهبي لحساب الأيض الأساسي)
- TDEE = ${tdee} سعرة (بناءً على مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel} - معامل النشاط وفق ACSM)
- TEF (التأثير الحراري للغذاء) = ${tef} سعرة (Thermic Effect of Food: بروتين 25%، كربوهيدرات 8%، دهون 3%)
- السعرات المستهدفة = ${targetCalories} سعرة
- الألياف المستهدفة = ${fiberTarget} جرام/يوم (وفق توصيات ADA 2005: 14 جرام/1000 سعرة)
- الماء المستهدف = ${waterTarget} لتر/يوم (بناءً على الوزن ومستوى النشاط - EFSA Guidelines)
${deficiencyCalorieNote}

🧬 المرحلة 3: التقييم الأيضي (Metabolic Assessment)
- الهدف: ${goalDescriptions[goal].ar}
${goal === "weight_loss" && hasSevereDeficiency ? "- ⚠️ يوجد نقص غذائي حاد → تم تخفيف العجز الحراري وتركيز البروتوكول على تعويض النواقص أولاً (ASPEN Clinical Guidelines)" : ""}
${goal === "weight_loss" ? "- استخدم عجزاً معتدلاً فقط (AMDR). إذا وُجد نقص غذائي حاد → خفّف العجز أو أوقفه مؤقتاً وأوصِ بأطعمة داعمة" : ""}
- اكتب "intakeAlignment" يشرح: التوافق بين السعرات المستهدفة والهدف والحالة الأيضية، وما يحتاج تعديل

🔬 المرحلة 4: تحسين التوافر الحيوي (Bioavailability Optimization)
- الحديد + فيتامين C = تحسين امتصاص الحديد غير الهيم بنسبة 2-6 أضعاف (Hallberg 1991)
- الكالسيوم + فيتامين D = تحسين امتصاص الكالسيوم المعوي (Endocrine Society Guidelines)
- الفيتامينات الذائبة في الدهون (A, D, E, K) = تناولها مع مصدر دهون لزيادة الامتصاص
- تجنب الجمع بين الكالسيوم والحديد في نفس الوجبة (Cook & Reddy 2001)
- الزنك + النحاس = تجنب تناولهما معاً لأنهما يتنافسان على الامتصاص
- اكتب "nutrientInteractions" تتضمن قائمة بالتفاعلات الغذائية المهمة لهذا المستخدم

🍽️ المرحلة 5: تصميم البروتوكول الغذائي (Dietary Protocol Design)
- اربط كل توصية غذائية بسبب سريري واضح من التحاليل
- مثال: نقص فيتامين D → أطعمة غنية بفيتامين D مع مصدر دهون | انخفاض الحديد → مصادر حديد + فيتامين C لتحسين الامتصاص
- في "benefits" لكل وجبة: اذكر بوضوح السبب السريري والتحليل المرتبط
- في "preparationTip" لكل وجبة: اذكر نصيحة تحضير تحسّن القيمة الغذائية أو التوافر الحيوي
- في "fiber" لكل وجبة: اذكر كمية الألياف بالجرام
- اكتب "mealTimingAdvice" يتضمن: توصيات التوقيت الغذائي (Chrononutrition) - أفضل أوقات تناول الوجبات بناءً على الإيقاع اليومي والهدف

⸻ تعليمات البروتوكول الغذائي: ⸻

مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
نوع الوجبات المفضل: ${preferenceLabels[mealPreference]?.ar || mealPreference}
البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `الكربوهيدرات المفضلة: ${carbListAr}` : ""}
BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].ar})

السعرات المستهدفة: ${targetCalories} سعرة حرارية يومياً
البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
الألياف: ${fiberTarget}جم | الماء: ${waterTarget} لتر | TEF: ${tef} سعرة
${toneInstruction}

تعليمات البروتوكول:
- هذا البروتوكول الغذائي مصمم خصيصاً لهذا المستخدم بناءً على: الطول (${height}سم)، الوزن (${weight}كجم)، الجنس (${gender === "male" ? "ذكر" : "أنثى"})، العمر (${age})، الهدف (${goalDescriptions[goal].ar})، ونتائج الفحوصات المخبرية
- صمم الوجبات بحيث تتوافق مع السعرات والماكرو والألياف المستهدفة أعلاه
- ⚠️⚠️ قاعدة إلزامية: يجب تقديم بالضبط 5 خيارات مختلفة ومتنوعة لكل وجبة (فطور = 5 خيارات، غداء = 5 خيارات، عشاء = 5 خيارات، وجبات خفيفة = 5 خيارات). المجموع = 20 خيار وجبة. هذا شرط أساسي لا يمكن تجاوزه. لكي يختار المستخدم ما يناسبه ويغير يومياً${proteinInstruction}${carbInstruction}
- ⚠️ قاعدة ذهبية: لا تضع أي مكون لم يختره المستخدم. النظام مبني فقط على اختيارات المستخدم من البروتين والكربوهيدرات. إذا لم يختر مصدراً معيناً، لا تدرجه في أي وجبة
- ${goal === "weight_loss" ? "ركز على وجبات مشبعة ومنخفضة السعرات وغنية بالبروتين والألياف" : ""}
- ${goal === "muscle_gain" ? "ركز على مصادر غذاء نظيفة وصحية فقط (لا وجبات سريعة، لا دهون مشبعة مفرطة)" : ""}
- ${goal === "maintain" ? "ركز على التوازن بين العناصر الغذائية وتعديل النواقص من خلال الطعام" : ""}
- ${mealPreference === "high_protein" ? "⚠️ نظام عالي البروتين (ISSN Position Stand): ركز على بروتين بنسبة " + macros.protein.percentage + "% من السعرات (" + macros.protein.grams + " جرام/يوم = " + currentProteinPerKg + " جرام/كجم من وزن الجسم). وزّع البروتين بالتساوي على جميع الوجبات (30-50 جرام لكل وجبة رئيسية)" : ""}
- ${mealPreference === "low_carb" ? "⚠️ نظام منخفض الكربوهيدرات (لو كارب): الكاربوهيدرات محددة بـ " + macros.carbs.grams + " جرام/يوم فقط وهي أقل نسبة آمنة يحتاجها الجسم (~" + currentMinCarbGrams + " جرام كحد أدنى = 1.5 جرام/كجم). عوّض السعرات المتبقية بالدهون الصحية (" + macros.fats.percentage + "%) والبروتين" : ""}
- ${mealPreference === "keto" ? "⚠️ نظام كيتو: الكربوهيدرات منخفضة جداً " + macros.carbs.grams + " جرام/يوم (~" + macros.carbs.percentage + "% فقط) لإدخال الجسم في حالة الكيتوسيز. الدهون الصحية هي المصدر الرئيسي للطاقة (" + macros.fats.percentage + "% = " + macros.fats.grams + " جرام/يوم). ركز على: زيت الزيتون، الأفوكادو، المكسرات، الزبدة، جبن كامل الدسم. تجنب تماماً: الأرز، الخبز، المعكرونة، البطاطس، السكريات، الفواكه عالية السكر. الخضروات المسموحة: ورقية فقط (سبانخ، خس، بروكلي، كوسا، خيار)" : ""}
- ${mealPreference === "balanced" || mealPreference === "custom_macros" || (!["high_protein", "low_carb", "keto", "vegetarian"].includes(mealPreference)) ? "نظام متوازن (AMDR): وزّع العناصر الغذائية بشكل متوازن - بروتين " + macros.protein.percentage + "%، كربوهيدرات " + macros.carbs.percentage + "%، دهون " + macros.fats.percentage + "%" : ""}
- ${mealPreference === "vegetarian" ? "جميع الوجبات نباتية - لا لحوم أو دواجن أو أسماك. اعتمد على البقوليات والحبوب والمكسرات كمصادر بروتين" : ""}
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل وتساعد على تعويضها طبيعياً مع مراعاة التوافر الحيوي
- حلّل نتائج الفحوصات وصمم الوجبات لمعالجة النواقص مع تحسين الامتصاص: إذا كان الحديد منخفض أضف مصادر حديد مع فيتامين C، إذا كان فيتامين د منخفض أضف أطعمة غنية به مع دهون صحية
${hasAllergies && allergyList ? `- ⚠️ حساسية المستخدم (وفق FARE Guidelines): ${allergyList}. يُمنع منعاً باتاً وضع أي مكون يسبب الحساسية في أي وجبة أو بديل يحتوي على نفس البروتين المسبب` : ""}
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- ⚠️ قاعدة إلزامية: يجب كتابة كل مكون بالجرامات بدقة في وصف الوجبة لضمان عدم تجاوز السعرات الحرارية المحددة. مثال: "150 جرام صدر دجاج مشوي، 80 جرام أرز بسمتي، 100 جرام خضروات مشكلة، 10 مل زيت زيتون". لا تكتب "قطعة دجاج" أو "طبق أرز" - يجب تحديد الوزن بالجرام لكل مكون
- تأكد أن مجموع سعرات المكونات بالجرامات يتطابق مع السعرات المعلنة لكل وجبة
- اذكر القيم الغذائية (بروتين، كارب، دهون، ألياف) بالجرام لكل وجبة
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين نتائج الفحوصات المحددة
- أضف "preparationTip" لكل وجبة: نصيحة تحضير تحسّن القيمة الغذائية أو التوافر الحيوي${supplementInstruction}
- لكل مكمل أضف "timingAdvice" (أفضل وقت للتناول) و "interactions" (التفاعلات مع أدوية أو مكملات أخرى)
- لكل نقص أضف "absorptionTip" (نصيحة لتحسين الامتصاص بناءً على الأدلة العلمية)
- قدم نصائح غذائية عامة بأسلوب إيجابي ومحفّز بناءً على الحالة الصحية والهدف
- أضف نصائح مخصصة لكل حالة صحية مكتشفة في "conditionTips" بأسلوب إيجابي (بدون تخويف) مع "scientificReason" لكل حالة
- إذا كانت هناك قيم تحتاج متابعة طبيب، اذكرها بلطف في "warnings" (مثال: "ننصحك بمتابعة مستوى X مع طبيبك للاطمئنان")

⸻ السلامة الطبية: ⸻
- لا تقدم تشخيصاً طبياً
- لا توصي بمكملات دوائية بجرعات علاجية
- استخدم لغة إرشادية غير علاجية (مثل: "يمكنك مناقشة مع طبيبك"، "قد يكون من المفيد")
- جميع الردود يجب أن تكون باللغة العربية

⚠️⚠️⚠️ قاعدة حرجة جداً:
1. يُمنع منعاً باتاً استخدام "..." أو أي اختصار في أي حقل
2. كل خيار من الـ 20 وجبة يجب أن يحتوي على بيانات كاملة في جميع الحقول (name, description, calories, protein, carbs, fats, fiber, benefits, preparationTip)
3. حقل "name" = اسم وصفي للوجبة (مثل: "شوفان بالموز والعسل"). يُمنع استخدام "خيار 1" أو "خيار 2"
4. حقل "description" = جميع المكونات بالجرامات (مثل: "60 جرام شوفان، 200 مل حليب")
5. حقل "benefits" = الفائدة الصحية المرتبطة بالتحاليل (مثل: "يساعد في تحسين الكولسترول")
6. حقل "fiber" = كمية الألياف بالجرام (رقم)
7. حقل "preparationTip" = نصيحة تحضير تحسّن القيمة الغذائية أو التوافر الحيوي
8. المثال أدناه يعرض خيارين فقط للاختصار، لكن يجب كتابة 5 خيارات كاملة لكل وجبة

أرجع JSON بالشكل التالي (المثال يعرض 2 من 5 خيارات - اكتب 5 كاملة):
{
  "healthSummary": "تقييم سريري شامل بناءً على التحاليل المخبرية مع الترابطات بين المؤشرات",
  "summary": "ملخص عام إيجابي عن البروتوكول الغذائي",
  "goalDescription": "وصف مختصر للهدف والبروتوكول بأسلوب تحفيزي مبني على الأدلة",
  "intakeAlignment": "شرح مفصل: التوافق بين السعرات والهدف والحالة الأيضية",
  "deficiencies": [{"name": "اسم النقص", "current": "القيمة الحالية", "target": "القيمة المستهدفة", "foods": ["طعام 1 (وسبب اختياره)", "طعام 2"], "absorptionTip": "نصيحة لتحسين الامتصاص مبنية على الأدلة العلمية"}],
  "supplements": [{"name": "اسم المكمل", "dosage": "الجرعة المقترحة", "reason": "سبب الحاجة مرتبط بالتحليل", "duration": "مدة الاستخدام", "foodSources": ["100 جرام سلمون = 600 وحدة دولية", "كوب حليب مدعم = 400 وحدة دولية", "بيضة واحدة = 40 وحدة دولية"], "targetLabValue": "فيتامين د: 30-50 نانوجرام/مل", "scientificBasis": "Endocrine Society Clinical Practice Guideline", "timingAdvice": "يُفضل تناوله مع الوجبة الرئيسية الدسمة لتحسين الامتصاص", "interactions": "يتعارض مع مضادات الحموضة - يُفضل الفصل بساعتين"}],
  "mealPlan": {
    "breakfast": [
      {"name": "شوفان بالموز والعسل", "description": "60 جرام شوفان، 200 مل حليب قليل الدسم، موزة واحدة، 15 جرام عسل", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "fiber": 6, "benefits": "غني بالألياف القابلة للذوبان (بيتا-جلوكان) يساعد في تحسين مستوى الكولسترول", "preparationTip": "انقع الشوفان ليلاً لتقليل حمض الفيتيك وزيادة امتصاص المعادن"},
      {"name": "بيض مسلوق مع خبز أسمر", "description": "3 بيضات مسلوقة، شريحتين خبز أسمر، 50 جرام خيار، 50 جرام طماطم", "calories": 400, "protein": 24, "carbs": 35, "fats": 18, "fiber": 4, "benefits": "مصدر ممتاز للبروتين الكامل والكولين لدعم العضلات ووظائف الكبد", "preparationTip": "أضف الطماطم كمصدر فيتامين C لتحسين امتصاص الحديد من البيض"}
    ],
    "lunch": [{"name": "اسم وصفي", "description": "مكونات بالجرامات", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "فائدة صحية مرتبطة بالتحاليل", "preparationTip": "نصيحة تحضير"}],
    "dinner": [{"name": "اسم وصفي", "description": "مكونات بالجرامات", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "فائدة صحية مرتبطة بالتحاليل", "preparationTip": "نصيحة تحضير"}],
    "snacks": [{"name": "اسم وصفي", "description": "مكونات بالجرامات", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "فائدة صحية مرتبطة بالتحاليل", "preparationTip": "نصيحة تحضير"}]
  },
  "mealTimingAdvice": "توصيات التوقيت الغذائي (Chrononutrition): أفضل أوقات تناول الوجبات بناءً على الإيقاع اليومي والهدف",
  "tips": ["نصيحة مع السبب الصحي والمرجع العلمي"],
  "warnings": ["ننصحك بمتابعة X مع طبيبك للاطمئنان"],
  "conditionTips": [{"condition": "اسم الحالة", "advice": ["نصيحة 1"], "avoidFoods": ["طعام يفضل تقليله"], "scientificReason": "السبب العلمي المبني على الأدلة لهذه التوصية"}],
  "nutrientInteractions": ["الحديد + فيتامين C = تحسين الامتصاص بنسبة 2-6 أضعاف (Hallberg 1991)", "تجنب الكالسيوم مع الحديد في نفس الوجبة (Cook & Reddy 2001)"],
  "references": ["Mifflin-St Jeor (1990) - معادلة حساب BMR", "ACSM Guidelines - معاملات النشاط البدني", "ASPEN Clinical Guidelines - التغذية السريرية", "ISSN Position Stand - البروتين والأداء الرياضي", "Hallberg 1991 - امتصاص الحديد", "Cook & Reddy 2001 - تفاعلات الكالسيوم والحديد", "ADA 2005 - توصيات الألياف الغذائية", "Endocrine Society - فيتامين د", "EFSA - توصيات الماء", "AMDR - نطاقات المغذيات الكبرى المقبولة", "FARE Guidelines - إرشادات الحساسية الغذائية"]
}`
    : `You are a Professor of Clinical Nutrition and Preventive Medicine, board-certified by the American Society for Parenteral and Enteral Nutrition (ASPEN) and member of the International Society of Sports Nutrition (ISSN). You work with Evidence-Based Medicine methodology and design personalized therapeutic dietary protocols based on laboratory results and anthropometric measurements.

⸻ CLINICAL PROTOCOL (follow in order): ⸻

PHASE 1: Clinical Assessment
- Comprehensive analysis of ALL lab results: identify normal values, deficiencies, elevated values
- Evaluate Biomarker Correlations: e.g., low ferritin + low hemoglobin = iron-deficiency anemia
- PRIORITIZE correcting any metabolic imbalance BEFORE recommending calorie deficit or surplus
- Write "healthSummary": comprehensive clinical assessment based on lab results (normal values, areas for improvement, correlations between results, nutritional therapeutic priorities)

PHASE 2: Advanced Energy Calculations
- BMR = ${bmr} kcal (Mifflin-St Jeor equation 1990 - gold standard for basal metabolic rate)
- TDEE = ${tdee} kcal (based on activity level: ${activityLabels[activityLevel]?.en || activityLevel} - ACSM activity factor)
- TEF (Thermic Effect of Food) = ${tef} kcal (Protein 25%, Carbs 8%, Fats 3%)
- Target Calories = ${targetCalories} kcal
- Fiber Target = ${fiberTarget} g/day (per ADA 2005 recommendations: 14g/1000 kcal)
- Water Target = ${waterTarget} L/day (based on weight and activity level - EFSA Guidelines)
${deficiencyCalorieNote}

PHASE 3: Metabolic Assessment
- Goal: ${goalDescriptions[goal].en}
${goal === "weight_loss" && hasSevereDeficiency ? "- WARNING: Severe nutritional deficiencies detected → calorie deficit reduced, protocol focuses on correcting deficiencies first (ASPEN Clinical Guidelines)" : ""}
${goal === "weight_loss" ? "- Use MODERATE deficit only (AMDR). If severe nutritional deficiencies exist → reduce deficit or pause it temporarily and recommend supportive foods" : ""}
- Write "intakeAlignment": explain alignment between target calories, goal, and metabolic status, and what needs adjustment

PHASE 4: Bioavailability Optimization
- Iron + Vitamin C = improve non-heme iron absorption by 2-6x (Hallberg 1991)
- Calcium + Vitamin D = improve intestinal calcium absorption (Endocrine Society Guidelines)
- Fat-soluble vitamins (A, D, E, K) = consume with a fat source to increase absorption
- Avoid combining calcium and iron in the same meal (Cook & Reddy 2001)
- Zinc + Copper = avoid consuming together as they compete for absorption
- Write "nutrientInteractions" containing a list of important nutrient interactions for this user

PHASE 5: Dietary Protocol Design
- Link EVERY dietary recommendation to a clear clinical reason from lab results
- Example: Low Vitamin D → Vitamin D-rich foods with a fat source | Low Iron → iron sources + Vitamin C for enhanced absorption
- In "benefits" for each meal: clearly state the clinical reason and linked lab result
- In "preparationTip" for each meal: provide a preparation tip that improves nutritional value or bioavailability
- In "fiber" for each meal: specify fiber content in grams
- Write "mealTimingAdvice": Chrononutrition recommendations - optimal meal timing based on circadian rhythm and goal

⸻ DIETARY PROTOCOL INSTRUCTIONS: ⸻

Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `Carb Preferences: ${carbListEn}` : ""}
BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].en})

Target Calories: ${targetCalories} kcal/day
Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
Fiber: ${fiberTarget}g | Water: ${waterTarget}L | TEF: ${tef} kcal
${toneInstruction}

Protocol Instructions:
- This dietary protocol MUST be custom-designed for this specific user based on: Height (${height}cm), Weight (${weight}kg), Gender (${gender}), Age (${age}), Goal (${goalDescriptions[goal].en}), and their lab test results
- Design meals that align with the calorie, macro, and fiber targets above
- MANDATORY: Provide EXACTLY 5 different varied options for each meal (breakfast = 5 options, lunch = 5 options, dinner = 5 options, snacks = 5 options). Total = 20 meal options. This is a NON-NEGOTIABLE requirement. The user needs to choose and rotate daily${proteinInstruction}${carbInstruction}
- GOLDEN RULE: Do NOT include any ingredient the user did NOT select. The protocol is built EXCLUSIVELY from the user's protein and carbohydrate choices. If a source was not selected, it MUST NOT appear in any meal
- ${goal === "weight_loss" ? "Focus on satiating, low-calorie meals rich in protein and fiber" : ""}
- ${goal === "muscle_gain" ? "Focus on clean, healthy food sources ONLY (no fast food, no excessive saturated fats)" : ""}
- ${goal === "maintain" ? "Focus on balanced nutrition and correcting deficiencies through food" : ""}
- ${mealPreference === "high_protein" ? "HIGH PROTEIN PLAN (ISSN Position Stand): Focus on protein at " + macros.protein.percentage + "% of calories (" + macros.protein.grams + "g/day = " + currentProteinPerKg + "g/kg body weight). Distribute protein evenly across all meals (30-50g per main meal)" : ""}
- ${mealPreference === "low_carb" ? "LOW CARB PLAN: Carbs limited to " + macros.carbs.grams + "g/day - the minimum safe amount (~" + currentMinCarbGrams + "g minimum = 1.5g/kg). Compensate remaining calories with healthy fats (" + macros.fats.percentage + "%) and protein" : ""}
- ${mealPreference === "keto" ? "KETO PLAN: Very low carbs at " + macros.carbs.grams + "g/day (~" + macros.carbs.percentage + "% only) to put the body into ketosis. Healthy fats are the primary energy source (" + macros.fats.percentage + "% = " + macros.fats.grams + "g/day). Focus on: olive oil, avocado, nuts, butter, full-fat cheese. STRICTLY AVOID: rice, bread, pasta, potatoes, sugars, high-sugar fruits. Allowed vegetables: leafy only (spinach, lettuce, broccoli, zucchini, cucumber)" : ""}
- ${mealPreference === "balanced" || mealPreference === "custom_macros" || (!["high_protein", "low_carb", "keto", "vegetarian"].includes(mealPreference)) ? "BALANCED PLAN (AMDR): Distribute nutrients evenly - Protein " + macros.protein.percentage + "%, Carbs " + macros.carbs.percentage + "%, Fats " + macros.fats.percentage + "%" : ""}
- ${mealPreference === "vegetarian" ? "All meals must be vegetarian - no meat, poultry, or fish. Rely on legumes, grains, and nuts as protein sources" : ""}
- Focus on foods that address deficiencies found in lab results and compensate naturally with bioavailability optimization
- Analyze test results and design meals to treat deficiencies with enhanced absorption: if Iron is low add iron sources with Vitamin C, if Vitamin D is low add foods rich in it with healthy fats
${hasAllergies && allergyList ? `- ALLERGY WARNING (per FARE Guidelines): User is allergic to: ${allergyList}. You MUST NOT include any allergen-containing ingredient or cross-reactive allergen protein in any meal` : ""}
- Provide practical, easy-to-prepare meals
- MANDATORY RULE: Every ingredient in the meal description MUST be specified in grams. Example: "150g grilled chicken breast, 80g basmati rice, 100g mixed vegetables, 10ml olive oil". Do NOT write "a piece of chicken" or "a plate of rice" - specify the exact weight in grams for every single ingredient
- Ensure the total calories from gram-specified ingredients match the declared calories for each meal
- Include macronutrient breakdown (protein, carbs, fats, fiber) in grams for each meal
- Mention health benefits of each meal and link them to specific lab result improvements
- Add "preparationTip" for each meal: a preparation tip that improves nutritional value or bioavailability${supplementInstruction}
- For each supplement add "timingAdvice" (optimal time to take) and "interactions" (interactions with medications or other supplements)
- For each deficiency add "absorptionTip" (evidence-based tip to improve absorption)
- Provide general dietary tips with a positive, encouraging tone based on the health condition and goal
- Add personalized tips for each detected health condition in "conditionTips" with a positive tone (no scary language) including "scientificReason" for each condition
- If there are values that need doctor follow-up, mention them gently in "warnings"

⸻ MEDICAL SAFETY: ⸻
- Do NOT provide medical diagnosis
- Do NOT recommend pharmaceutical drugs or therapeutic dosages
- Use guiding, non-therapeutic language (e.g., "you may discuss with your doctor", "it may be helpful to consider")
- All responses must be in English

CRITICAL RULES:
1. You MUST NOT use "..." or any abbreviation in any field
2. Every single one of the 20 meal options MUST have COMPLETE data in ALL fields (name, description, calories, protein, carbs, fats, fiber, benefits, preparationTip)
3. "name" = descriptive meal name (e.g., "Oatmeal with Banana and Honey"). NEVER use "Option 1" or "Option 2"
4. "description" = ALL ingredients with gram weights (e.g., "60g oats, 200ml low-fat milk")
5. "benefits" = health benefit linked to lab results (e.g., "Helps improve cholesterol levels")
6. "fiber" = fiber content in grams (number)
7. "preparationTip" = preparation tip that improves nutritional value or bioavailability
8. The example below shows only 2 options for brevity, but you MUST write 5 COMPLETE options for each meal

Return JSON in this format (example shows 2 of 5 options - write all 5 complete):
{
  "healthSummary": "Comprehensive clinical assessment based on lab results with biomarker correlations",
  "summary": "Positive summary of the dietary protocol",
  "goalDescription": "Brief evidence-based motivating description of the goal and protocol",
  "intakeAlignment": "Detailed explanation of calorie alignment with goal and metabolic status",
  "deficiencies": [{"name": "Deficiency name", "current": "Current value", "target": "Target value", "foods": ["food 1 (reason)", "food 2"], "absorptionTip": "Evidence-based tip to improve absorption"}],
  "supplements": [{"name": "Supplement name", "dosage": "Suggested dosage", "reason": "Reason linked to lab result", "duration": "Duration", "foodSources": ["100g salmon = 600 IU vitamin D", "1 cup fortified milk = 400 IU", "1 egg = 40 IU"], "targetLabValue": "Vitamin D: 30-50 ng/mL", "scientificBasis": "Endocrine Society Clinical Practice Guideline", "timingAdvice": "Take with the fattiest meal of the day for optimal absorption", "interactions": "Conflicts with antacids - separate by 2 hours"}],
  "mealPlan": {
    "breakfast": [
      {"name": "Oatmeal with Banana and Honey", "description": "60g oats, 200ml low-fat milk, 1 banana, 15g honey", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "fiber": 6, "benefits": "Rich in soluble fiber (beta-glucan), helps improve cholesterol levels", "preparationTip": "Soak oats overnight to reduce phytic acid and improve mineral absorption"},
      {"name": "Boiled Eggs with Brown Toast", "description": "3 boiled eggs, 2 slices brown bread, 50g cucumber, 50g tomato", "calories": 400, "protein": 24, "carbs": 35, "fats": 18, "fiber": 4, "benefits": "Excellent source of complete protein and choline for muscle and liver support", "preparationTip": "Add tomato as a vitamin C source to improve iron absorption from eggs"}
    ],
    "lunch": [{"name": "Descriptive meal name", "description": "ingredients with grams", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "health benefit linked to lab results", "preparationTip": "preparation tip"}],
    "dinner": [{"name": "Descriptive meal name", "description": "ingredients with grams", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "health benefit linked to lab results", "preparationTip": "preparation tip"}],
    "snacks": [{"name": "Descriptive meal name", "description": "ingredients with grams", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "benefits": "health benefit linked to lab results", "preparationTip": "preparation tip"}]
  },
  "mealTimingAdvice": "Chrononutrition recommendations: optimal meal timing based on circadian rhythm and goal",
  "tips": ["tip with health reason and scientific reference"],
  "warnings": ["We recommend following up on X with your doctor for peace of mind"],
  "conditionTips": [{"condition": "Condition (positive framing)", "advice": ["tip 1"], "avoidFoods": ["food to reduce"], "scientificReason": "Evidence-based scientific reason for this recommendation"}],
  "nutrientInteractions": ["Iron + Vitamin C = improved absorption by 2-6x (Hallberg 1991)", "Avoid calcium with iron in the same meal (Cook & Reddy 2001)"],
  "references": ["Mifflin-St Jeor (1990) - BMR calculation", "ACSM Guidelines - Physical activity factors", "ASPEN Clinical Guidelines - Clinical nutrition", "ISSN Position Stand - Protein and athletic performance", "Hallberg 1991 - Iron absorption", "Cook & Reddy 2001 - Calcium-iron interactions", "ADA 2005 - Dietary fiber recommendations", "Endocrine Society - Vitamin D", "EFSA - Water intake recommendations", "AMDR - Acceptable macronutrient distribution ranges", "FARE Guidelines - Food allergy management"]
}`;

  const userContent = isArabic
    ? `بيانات المستخدم:
- العمر: ${age} سنة
- الجنس: ${gender === "male" ? "ذكر" : "أنثى"}
- الوزن: ${weight} كجم
- الطول: ${height} سم
- مؤشر كتلة الجسم (BMI): ${bmi} (${bmiCategoryLabels[bmiCategory].ar})
- الهدف: ${goalDescriptions[goal].ar}
- مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
- نوع الوجبات: ${preferenceLabels[mealPreference]?.ar || mealPreference}
- البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `- الكربوهيدرات المفضلة: ${carbListAr}` : ""}
${hasAllergies && allergyList ? `- الحساسيات الغذائية: ${allergyList}` : "- لا يوجد حساسيات غذائية"}

حسابات الطاقة:
- BMR (معدل الأيض الأساسي): ${bmr} سعرة (الحد الأدنى الآمن - لا يمكن النزول عنه)
- TDEE (إجمالي الطاقة اليومية): ${tdee} سعرة
- السعرات المستهدفة: ${targetCalories} سعرة/يوم (${delta > 0 ? "فائض +" + delta : delta < 0 ? "عجز " + delta : "ثبات"} سعرة)
- البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${hasSevereDeficiency ? `\n⚠️ تنبيه: تم اكتشاف نقص حاد في: ${severeDeficiencyList.join("، ")}. ${goal === "weight_loss" ? "تم تخفيف العجز الحراري لضمان تعويض النواقص أولاً." : "الأولوية تصحيح النواقص."}` : ""}

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}

ملخص:
- فحوصات طبيعية: ${normalTests.length}
- فحوصات غير طبيعية: ${abnormalTests.length}

المطلوب:
1. ابدأ بتحليل الحالة الصحية من التحاليل (healthSummary)
2. تحقق من أن السعرات آمنة (لا تقل عن BMR = ${bmr}) وتتوافق مع الحالة الصحية (intakeAlignment)
3. صمم نظام غذائي مخصص 100% لهذا المستخدم
4. استخدم فقط البروتينات التي اختارها: [${proteinListAr}]
5. استخدم فقط الكربوهيدرات التي اختارها: [${carbPrefs.length > 0 ? carbListAr : "لم يحدد"}]
6. اربط كل وجبة وتوصية بسبب صحي واضح من التحاليل
7. عالج النواقص من خلال الغذاء الطبيعي أولاً
8. اقترح مكملات فقط عند الحاجة الفعلية (بلغة إرشادية)
9. قدم بالضبط 5 خيارات متنوعة لكل وجبة (فطور = 5، غداء = 5، عشاء = 5، وجبات خفيفة = 5) المجموع 20 خيار - لا تقدم أقل من 5
10. أضف المراجع العلمية في "references"`
    : `User data:
- Age: ${age} years
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].en})
- Goal: ${goalDescriptions[goal].en}
- Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
- Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
- Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `- Carb Preferences: ${carbListEn}` : ""}
${hasAllergies && allergyList ? `- Food Allergies: ${allergyList}` : "- No food allergies"}

Energy Calculations:
- BMR (Basal Metabolic Rate): ${bmr} kcal (minimum safe threshold - cannot go below this)
- TDEE (Total Daily Energy Expenditure): ${tdee} kcal
- Target Calories: ${targetCalories} kcal/day (${delta > 0 ? "surplus +" + delta : delta < 0 ? "deficit " + delta : "maintenance"} kcal)
- Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${hasSevereDeficiency ? `\nWARNING: Severe deficiencies detected in: ${severeDeficiencyList.join(", ")}. ${goal === "weight_loss" ? "Calorie deficit reduced to ensure deficiency correction first." : "Priority is correcting deficiencies."}` : ""}

Lab Results:
${testsDescription || "No lab results available"}

Summary:
- Normal tests: ${normalTests.length}
- Abnormal tests: ${abnormalTests.length}

Requirements:
1. Start with health analysis from lab results (healthSummary)
2. Verify calories are safe (not below BMR = ${bmr}) and aligned with health status (intakeAlignment)
3. Design a 100% personalized diet plan for this specific user
4. Use ONLY the proteins they selected: [${proteinListEn}]
5. Use ONLY the carbs they selected: [${carbPrefs.length > 0 ? carbListEn : "not specified"}]
6. Link every meal and recommendation to a clear health reason from lab results
7. Treat deficiencies through natural food first
8. Suggest supplements ONLY when truly needed (use guiding language)
9. Provide EXACTLY 5 varied options for each meal (breakfast = 5, lunch = 5, dinner = 5, snacks = 5) Total 20 options - do NOT provide fewer than 5
10. Add scientific references in "references"`;

  let knowledgeContext = "";
  try {
    knowledgeContext = await searchRelevantKnowledge(
      userData.testResults.map(t => ({
        testName: t.testName,
        status: t.status,
        category: t.category,
      })),
      goal
    );
    if (knowledgeContext) {
      console.log(`[KnowledgeEngine] Found relevant knowledge context (${knowledgeContext.length} chars)`);
    }
  } catch (err) {
    console.warn("[KnowledgeEngine] Failed to fetch knowledge context:", err);
  }

  const knowledgeSection = knowledgeContext
    ? isArabic
      ? `\n\n--- معلومات علمية من قاعدة المعرفة (استخدمها لتحسين التوصيات) ---\n${knowledgeContext}`
      : `\n\n--- Scientific Knowledge from Knowledge Base (use to enhance recommendations) ---\n${knowledgeContext}`
    : "";

  const finalUserContent = userContent + knowledgeSection;

  console.log("Calling OpenAI for diet plan generation...");
  const callStart = Date.now();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: finalUserContent },
    ],
    max_completion_tokens: 16384,
    temperature: 0.4,
  });
  console.log(`OpenAI response received in ${((Date.now() - callStart) / 1000).toFixed(1)}s`);

  const content = response.choices[0]?.message?.content || "{}";

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

    const cleanMeal = (m: any) => ({
      name: m.name || "",
      description: m.description || "",
      calories: m.calories || 0,
      protein: m.protein || 0,
      carbs: m.carbs || 0,
      fats: m.fats || 0,
      fiber: m.fiber || 0,
      benefits: m.benefits || "",
      preparationTip: m.preparationTip || "",
    });

    const sanitizedMealPlan = {
      breakfast: (parsed.mealPlan?.breakfast || []).map(cleanMeal),
      lunch: (parsed.mealPlan?.lunch || []).map(cleanMeal),
      dinner: (parsed.mealPlan?.dinner || []).map(cleanMeal),
      snacks: (parsed.mealPlan?.snacks || []).map(cleanMeal),
    };

    let incompleteMeals = 0;
    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      for (const meal of meals as any[]) {
        if (isPlaceholder(meal.name) || isPlaceholder(meal.description) || isPlaceholder(meal.benefits)) {
          incompleteMeals++;
          console.warn(`Incomplete meal in ${section}: name="${meal.name}", desc="${(meal.description || "").slice(0, 30)}", benefits="${(meal.benefits || "").slice(0, 30)}"`);
        }
      }
    }

    for (const [section, meals] of Object.entries(sanitizedMealPlan)) {
      if ((meals as any[]).length < 3) {
        console.error(`REJECTED: ${section} has only ${(meals as any[]).length} options (minimum 3 required)`);
        throw new Error("DIET_PLAN_INCOMPLETE");
      }
    }

    if (incompleteMeals > 4) {
      console.error(`REJECTED: ${incompleteMeals} out of 20 meal options have incomplete data`);
      throw new Error("DIET_PLAN_INCOMPLETE");
    } else if (incompleteMeals > 0) {
      console.warn(`WARNING: ${incompleteMeals} meal options have incomplete data but within acceptable threshold`);
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

    const avgBreakfast = sanitizedMealPlan.breakfast.reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max(sanitizedMealPlan.breakfast.length, 1);
    const avgLunch = sanitizedMealPlan.lunch.reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max(sanitizedMealPlan.lunch.length, 1);
    const avgDinner = sanitizedMealPlan.dinner.reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max(sanitizedMealPlan.dinner.length, 1);
    const avgSnacks = sanitizedMealPlan.snacks.reduce((s: number, m: any) => s + (m.calories || 0), 0) / Math.max(sanitizedMealPlan.snacks.length, 1);
    const totalAvgCalories = avgBreakfast + avgLunch + avgDinner + avgSnacks;
    const calorieDeviation = Math.abs(totalAvgCalories - targetCalories) / targetCalories;
    if (calorieDeviation > 0.15) {
      console.warn(`[Clinical QC] Total calorie deviation: target=${targetCalories}, plan avg=${Math.round(totalAvgCalories)}, deviation=${(calorieDeviation * 100).toFixed(0)}%`);
    } else {
      console.log(`[Clinical QC] Calorie target met: target=${targetCalories}, plan avg=${Math.round(totalAvgCalories)} (${(calorieDeviation * 100).toFixed(0)}% deviation)`);
    }

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
      },
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
      mealPlan: sanitizedMealPlan,
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
