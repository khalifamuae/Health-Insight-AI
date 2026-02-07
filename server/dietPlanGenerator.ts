import OpenAI from "openai";

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
    target: number;
    deficit_or_surplus: number;
  };
  macros: {
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fats: { grams: number; percentage: number };
  };
  intakeAlignment: string;
  deficiencies: { name: string; current: string; target: string; foods: string[] }[];
  supplements: { name: string; dosage: string; reason: string; duration: string }[];
  mealPlan: {
    breakfast: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; benefits: string }[];
    lunch: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; benefits: string }[];
    dinner: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; benefits: string }[];
    snacks: { name: string; description: string; calories: number; protein: number; carbs: number; fats: number; benefits: string }[];
  };
  tips: string[];
  warnings: string[];
  conditionTips: { condition: string; advice: string[]; avoidFoods: string[] }[];
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
    ? `\n- بناءً على نتائج التحاليل والنواقص، اقترح مكملات غذائية محددة إذا لزم الأمر (مثل فيتامين د، حديد، ب12، أوميغا-3، إلخ). حدد الجرعة المقترحة ومدة الاستخدام وسبب الحاجة. ضعها في "supplements". إذا لم يحتج المستخدم مكملات، اترك المصفوفة فارغة.
- ركز أولاً على تعويض النواقص من خلال الغذاء الطبيعي، وأضف المكملات فقط عند الحاجة الفعلية.
- ⚠️ لا تقدم تشخيصاً طبياً. لا توصي بأدوية أو مكملات دوائية بجرعات علاجية. استخدم لغة إرشادية مثل "يمكنك مناقشة مع طبيبك" أو "قد يكون من المفيد".`
    : `\n- Based on lab results and deficiencies, suggest specific dietary supplements if needed (e.g., Vitamin D, Iron, B12, Omega-3, etc.). Specify suggested dosage, duration, and reason. Put them in "supplements". If the user doesn't need supplements, leave the array empty.
- Focus first on compensating deficiencies through natural food, and add supplements only when truly needed.
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
    ? `أنت خبير تغذية ودود ومحفّز يعمل بمنهجية طبية. مهمتك تصميم نظام غذائي مخصص بناءً على نتائج التحاليل الطبية والبيانات الجسدية للمستخدم.

⸻ المنهجية المطلوبة (اتبعها بالترتيب): ⸻

📋 الخطوة 1: التحقق الصحي أولاً
- اقرأ جميع نتائج التحاليل وحدد: القيم الطبيعية، النقص، الارتفاع
- أعطِ الأولوية لتصحيح أي خلل صحي قبل التوصية بعجز أو فائض حراري
- اكتب "healthSummary" يتضمن: ملخص شامل للحالة الصحية بناءً على التحاليل (ما هو طبيعي، ما يحتاج تحسين، ما يحتاج متابعة)

📊 الخطوة 2: حساب الطاقة (BMR / TDEE)
- BMR = ${bmr} سعرة (الحد الأدنى الآمن - معادلة Mifflin-St Jeor)
- TDEE = ${tdee} سعرة (بناءً على مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel})
- السعرات المستهدفة = ${targetCalories} سعرة
${deficiencyCalorieNote}

🎯 الخطوة 3: مواءمة الهدف مع الحالة الصحية
- الهدف: ${goalDescriptions[goal].ar}
${goal === "weight_loss" && hasSevereDeficiency ? "- ⚠️ يوجد نقص غذائي حاد → تم تخفيف العجز الحراري وتركيز النظام على تعويض النواقص أولاً" : ""}
${goal === "weight_loss" ? "- استخدم عجزاً معتدلاً فقط. إذا وُجد نقص غذائي حاد → خفّف العجز أو أوقفه مؤقتاً وأوصِ بأطعمة داعمة" : ""}
- اكتب "intakeAlignment" يشرح: مدى توافق السعرات الحالية مع الهدف، ما يحتاج زيادة، ما يحتاج تقليل

🔗 الخطوة 4: الربط بين الغذاء والتحاليل
- اربط كل توصية غذائية بسبب صحي واضح من التحاليل
- مثال: نقص فيتامين D → أطعمة غنية بفيتامين D | انخفاض الحديد → مصادر حديد + أطعمة تحسّن الامتصاص
- في "benefits" لكل وجبة: اذكر بوضوح لماذا هذه الوجبة مفيدة وأي تحليل تساعد في تحسينه

⸻ تعليمات النظام الغذائي: ⸻

مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
نوع الوجبات المفضل: ${preferenceLabels[mealPreference]?.ar || mealPreference}
البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `الكربوهيدرات المفضلة: ${carbListAr}` : ""}
BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].ar})

السعرات المستهدفة: ${targetCalories} سعرة حرارية يومياً
البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${toneInstruction}

تعليمات مهمة:
- هذا النظام الغذائي يجب أن يكون مصمماً خصيصاً لهذا المستخدم بناءً على: الطول (${height}سم)، الوزن (${weight}كجم)، الجنس (${gender === "male" ? "ذكر" : "أنثى"})، العمر (${age})، الهدف (${goalDescriptions[goal].ar})، ونتائج الفحوصات الطبية
- صمم الوجبات بحيث تتوافق مع السعرات والماكرو المحدد أعلاه
- قدم 7 خيارات مختلفة ومتنوعة لكل وجبة (فطور، غداء، عشاء، وجبات خفيفة) لكي يختار المستخدم ما يناسبه ويغير يومياً لمدة أسبوع كامل${proteinInstruction}${carbInstruction}
- ⚠️ قاعدة ذهبية: لا تضع أي مكون لم يختره المستخدم. النظام مبني فقط على اختيارات المستخدم من البروتين والكربوهيدرات. إذا لم يختر مصدراً معيناً، لا تدرجه في أي وجبة
- ${goal === "weight_loss" ? "ركز على وجبات مشبعة ومنخفضة السعرات وغنية بالبروتين والألياف" : ""}
- ${goal === "muscle_gain" ? "ركز على مصادر غذاء نظيفة وصحية فقط (لا وجبات سريعة، لا دهون مشبعة مفرطة)" : ""}
- ${goal === "maintain" ? "ركز على التوازن بين العناصر الغذائية وتعديل النواقص من خلال الطعام" : ""}
- ${mealPreference === "high_protein" ? "⚠️ نظام عالي البروتين: ركز على بروتين بنسبة " + macros.protein.percentage + "% من السعرات (" + macros.protein.grams + " جرام/يوم = " + currentProteinPerKg + " جرام/كجم من وزن الجسم). وزّع البروتين بالتساوي على جميع الوجبات (30-50 جرام لكل وجبة رئيسية)" : ""}
- ${mealPreference === "low_carb" ? "⚠️ نظام منخفض الكربوهيدرات (لو كارب): الكاربوهيدرات محددة بـ " + macros.carbs.grams + " جرام/يوم فقط وهي أقل نسبة آمنة يحتاجها الجسم (~" + currentMinCarbGrams + " جرام كحد أدنى = 1.5 جرام/كجم). عوّض السعرات المتبقية بالدهون الصحية (" + macros.fats.percentage + "%) والبروتين" : ""}
- ${mealPreference === "keto" ? "⚠️ نظام كيتو: الكربوهيدرات منخفضة جداً " + macros.carbs.grams + " جرام/يوم (~" + macros.carbs.percentage + "% فقط) لإدخال الجسم في حالة الكيتوسيز. الدهون الصحية هي المصدر الرئيسي للطاقة (" + macros.fats.percentage + "% = " + macros.fats.grams + " جرام/يوم). ركز على: زيت الزيتون، الأفوكادو، المكسرات، الزبدة، جبن كامل الدسم. تجنب تماماً: الأرز، الخبز، المعكرونة، البطاطس، السكريات، الفواكه عالية السكر. الخضروات المسموحة: ورقية فقط (سبانخ، خس، بروكلي، كوسا، خيار)" : ""}
- ${mealPreference === "balanced" || mealPreference === "custom_macros" || (!["high_protein", "low_carb", "keto", "vegetarian"].includes(mealPreference)) ? "نظام متوازن: وزّع العناصر الغذائية بشكل متوازن - بروتين " + macros.protein.percentage + "%، كربوهيدرات " + macros.carbs.percentage + "%، دهون " + macros.fats.percentage + "%" : ""}
- ${mealPreference === "vegetarian" ? "جميع الوجبات نباتية - لا لحوم أو دواجن أو أسماك. اعتمد على البقوليات والحبوب والمكسرات كمصادر بروتين" : ""}
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل وتساعد على تعويضها طبيعياً من خلال التغذية
- حلّل نتائج الفحوصات وصمم الوجبات لمعالجة النواقص: إذا كان فيتامين د منخفض أضف أطعمة غنية به، إذا كان الحديد منخفض أضف مصادر حديد طبيعية، وهكذا
${hasAllergies && allergyList ? `- ⚠️ حساسية المستخدم: ${allergyList}. يُمنع منعاً باتاً وضع أي مكون يسبب الحساسية في أي وجبة` : ""}
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- ⚠️ قاعدة إلزامية: يجب كتابة كل مكون بالجرامات بدقة في وصف الوجبة لضمان عدم تجاوز السعرات الحرارية المحددة. مثال: "150 جرام صدر دجاج مشوي، 80 جرام أرز بسمتي، 100 جرام خضروات مشكلة، 10 مل زيت زيتون". لا تكتب "قطعة دجاج" أو "طبق أرز" - يجب تحديد الوزن بالجرام لكل مكون
- تأكد أن مجموع سعرات المكونات بالجرامات يتطابق مع السعرات المعلنة لكل وجبة
- اذكر القيم الغذائية (بروتين، كارب، دهون) بالجرام لكل وجبة
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين نتائج الفحوصات المحددة${supplementInstruction}
- قدم نصائح غذائية عامة بأسلوب إيجابي ومحفّز بناءً على الحالة الصحية والهدف
- أضف نصائح مخصصة لكل حالة صحية مكتشفة في "conditionTips" بأسلوب إيجابي (بدون تخويف)
- إذا كانت هناك قيم تحتاج متابعة طبيب، اذكرها بلطف في "warnings" (مثال: "ننصحك بمتابعة مستوى X مع طبيبك للاطمئنان")

⸻ السلامة الطبية: ⸻
- لا تقدم تشخيصاً طبياً
- لا توصي بمكملات دوائية بجرعات علاجية
- استخدم لغة إرشادية غير علاجية (مثل: "يمكنك مناقشة مع طبيبك"، "قد يكون من المفيد")
- جميع الردود يجب أن تكون باللغة العربية

أرجع JSON بالشكل التالي:
{
  "healthSummary": "ملخص شامل للحالة الصحية بناءً على التحاليل: ما هو طبيعي، ما يحتاج تحسين، أي ارتباط بين النتائج",
  "summary": "ملخص عام إيجابي عن الخطة الغذائية وكيف ستساعد في تحسين الصحة",
  "goalDescription": "وصف مختصر للهدف والخطة بأسلوب تحفيزي",
  "intakeAlignment": "شرح مفصل: هل السعرات المستهدفة تتوافق مع الهدف والحالة الصحية؟ ما يحتاج زيادة وما يحتاج تقليل ولماذا",
  "deficiencies": [{"name": "اسم النقص", "current": "القيمة الحالية", "target": "القيمة المستهدفة", "foods": ["طعام 1 (وسبب اختياره)", "طعام 2"]}],
  "supplements": [{"name": "اسم المكمل", "dosage": "الجرعة المقترحة", "reason": "سبب الحاجة مرتبط بنتيجة التحليل", "duration": "مدة الاستخدام"}],
  "mealPlan": {
    "breakfast": [{"name": "اسم الوجبة", "description": "60 جرام شوفان، 200 مل حليب...", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "benefits": "غني بالألياف | يساعد في تحسين مستوى [اسم التحليل]"}, ...],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  },
  "tips": ["نصيحة مع السبب الصحي"],
  "warnings": ["ننصحك بمتابعة ... مع طبيبك للاطمئنان"],
  "conditionTips": [{"condition": "اسم الحالة (بأسلوب إيجابي)", "advice": ["نصيحة 1"], "avoidFoods": ["طعام يفضل تقليله"]}],
  "references": ["معادلة Mifflin-St Jeor لحساب BMR", "NHLBI BMI Calculator (nhlbi.nih.gov)", "مرجع آخر حسب التوصيات"]
}`
    : `You are a friendly, motivating nutrition expert who works with a medical methodology. Your mission is to design a personalized diet plan based on the user's lab results and physical data.

⸻ REQUIRED METHODOLOGY (follow in order): ⸻

STEP 1: Health Verification First
- Read ALL lab results and identify: normal values, deficiencies, elevated values
- PRIORITIZE correcting any health imbalance BEFORE recommending calorie deficit or surplus
- Write "healthSummary": comprehensive health status based on lab results (what's normal, what needs improvement, any correlations between results)

STEP 2: Energy Calculation (BMR / TDEE)
- BMR = ${bmr} kcal (minimum safe threshold - Mifflin-St Jeor equation)
- TDEE = ${tdee} kcal (based on activity level: ${activityLabels[activityLevel]?.en || activityLevel})
- Target Calories = ${targetCalories} kcal
${deficiencyCalorieNote}

STEP 3: Align Goal with Health Status
- Goal: ${goalDescriptions[goal].en}
${goal === "weight_loss" && hasSevereDeficiency ? "- WARNING: Severe nutritional deficiencies detected → calorie deficit reduced, plan focuses on correcting deficiencies first" : ""}
${goal === "weight_loss" ? "- Use MODERATE deficit only. If severe nutritional deficiencies exist → reduce deficit or pause it temporarily and recommend supportive foods instead of focusing only on calories" : ""}
- Write "intakeAlignment": explain whether current calorie target aligns with the goal, what needs to increase, what needs to decrease

STEP 4: Link Food to Lab Results
- Link EVERY dietary recommendation to a clear health reason from lab results
- Example: Low Vitamin D → Vitamin D-rich foods | Low Iron → iron sources + absorption-enhancing foods
- In "benefits" for each meal: clearly state WHY this meal is beneficial and WHICH specific lab result it helps improve

⸻ DIET PLAN INSTRUCTIONS: ⸻

Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `Carb Preferences: ${carbListEn}` : ""}
BMI: ${bmi} (${bmiCategoryLabels[bmiCategory].en})

Target Calories: ${targetCalories} kcal/day
Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${toneInstruction}

Important instructions:
- This diet plan MUST be custom-designed for this specific user based on: Height (${height}cm), Weight (${weight}kg), Gender (${gender}), Age (${age}), Goal (${goalDescriptions[goal].en}), and their lab test results
- Design meals that align with the calorie and macro targets above
- Provide 7 DIFFERENT varied options for each meal (breakfast, lunch, dinner, snacks) so the user can choose and rotate daily for an entire week${proteinInstruction}${carbInstruction}
- GOLDEN RULE: Do NOT include any ingredient the user did NOT select. The diet plan is built EXCLUSIVELY from the user's protein and carbohydrate choices. If a source was not selected, it MUST NOT appear in any meal
- ${goal === "weight_loss" ? "Focus on satiating, low-calorie meals rich in protein and fiber" : ""}
- ${goal === "muscle_gain" ? "Focus on clean, healthy food sources ONLY (no fast food, no excessive saturated fats)" : ""}
- ${goal === "maintain" ? "Focus on balanced nutrition and correcting deficiencies through food" : ""}
- ${mealPreference === "high_protein" ? "HIGH PROTEIN PLAN: Focus on protein at " + macros.protein.percentage + "% of calories (" + macros.protein.grams + "g/day = " + currentProteinPerKg + "g/kg body weight). Distribute protein evenly across all meals (30-50g per main meal)" : ""}
- ${mealPreference === "low_carb" ? "LOW CARB PLAN: Carbs limited to " + macros.carbs.grams + "g/day - the minimum safe amount (~" + currentMinCarbGrams + "g minimum = 1.5g/kg). Compensate remaining calories with healthy fats (" + macros.fats.percentage + "%) and protein" : ""}
- ${mealPreference === "keto" ? "KETO PLAN: Very low carbs at " + macros.carbs.grams + "g/day (~" + macros.carbs.percentage + "% only) to put the body into ketosis. Healthy fats are the primary energy source (" + macros.fats.percentage + "% = " + macros.fats.grams + "g/day). Focus on: olive oil, avocado, nuts, butter, full-fat cheese. STRICTLY AVOID: rice, bread, pasta, potatoes, sugars, high-sugar fruits. Allowed vegetables: leafy only (spinach, lettuce, broccoli, zucchini, cucumber)" : ""}
- ${mealPreference === "balanced" || mealPreference === "custom_macros" || (!["high_protein", "low_carb", "keto", "vegetarian"].includes(mealPreference)) ? "BALANCED PLAN: Distribute nutrients evenly - Protein " + macros.protein.percentage + "%, Carbs " + macros.carbs.percentage + "%, Fats " + macros.fats.percentage + "%" : ""}
- ${mealPreference === "vegetarian" ? "All meals must be vegetarian - no meat, poultry, or fish. Rely on legumes, grains, and nuts as protein sources" : ""}
- Focus on foods that address deficiencies found in lab results and compensate naturally through nutrition
- Analyze test results and design meals to treat deficiencies: if Vitamin D is low add foods rich in it, if Iron is low add natural iron sources, and so on
${hasAllergies && allergyList ? `- ALLERGY WARNING: User is allergic to: ${allergyList}. You MUST NOT include any allergen-containing ingredient in any meal` : ""}
- Provide practical, easy-to-prepare meals
- MANDATORY RULE: Every ingredient in the meal description MUST be specified in grams. Example: "150g grilled chicken breast, 80g basmati rice, 100g mixed vegetables, 10ml olive oil". Do NOT write "a piece of chicken" or "a plate of rice" - specify the exact weight in grams for every single ingredient
- Ensure the total calories from gram-specified ingredients match the declared calories for each meal
- Include macronutrient breakdown (protein, carbs, fats) in grams for each meal
- Mention health benefits of each meal and link them to specific lab result improvements${supplementInstruction}
- Provide general dietary tips with a positive, encouraging tone based on the health condition and goal
- Add personalized tips for each detected health condition in "conditionTips" with a positive tone (no scary language)
- If there are values that need doctor follow-up, mention them gently in "warnings"

⸻ MEDICAL SAFETY: ⸻
- Do NOT provide medical diagnosis
- Do NOT recommend pharmaceutical drugs or therapeutic dosages
- Use guiding, non-therapeutic language (e.g., "you may discuss with your doctor", "it may be helpful to consider")
- All responses must be in English

Return JSON in this format:
{
  "healthSummary": "Comprehensive health status based on lab results: what's normal, what needs improvement, any correlations",
  "summary": "Positive summary of the diet plan and how it will help improve health",
  "goalDescription": "Brief motivating description of the goal and plan",
  "intakeAlignment": "Detailed explanation: do target calories align with the goal and health status? What needs to increase/decrease and why",
  "deficiencies": [{"name": "Deficiency name", "current": "Current value", "target": "Target value", "foods": ["food 1 (reason for choice)", "food 2"]}],
  "supplements": [{"name": "Supplement name", "dosage": "Suggested dosage", "reason": "Reason linked to lab result", "duration": "Duration"}],
  "mealPlan": {
    "breakfast": [{"name": "Meal name", "description": "60g oats, 200ml milk...", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "benefits": "Rich in fiber | Helps improve [specific test name] levels"}, ...],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  },
  "tips": ["tip with health reason"],
  "warnings": ["We recommend following up on ... with your doctor for peace of mind"],
  "conditionTips": [{"condition": "Condition (positive framing)", "advice": ["tip 1"], "avoidFoods": ["food to reduce"]}],
  "references": ["Mifflin-St Jeor equation for BMR calculation", "NHLBI BMI Calculator (nhlbi.nih.gov)", "other relevant references"]
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
9. قدم 7 خيارات متنوعة لكل وجبة (فطور، غداء، عشاء، وجبات خفيفة) لتغطية أسبوع كامل
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
9. Provide 7 varied options for each meal (breakfast, lunch, dinner, snacks) to cover a full week
10. Add scientific references in "references"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_completion_tokens: 12000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);

    const defaultReferences = isArabic
      ? [
        "معادلة Mifflin-St Jeor لحساب معدل الأيض الأساسي (BMR)",
        "حاسبة مؤشر كتلة الجسم - المعهد الوطني للقلب والرئة والدم (NHLBI) - nhlbi.nih.gov",
        "إرشادات التغذية - منظمة الصحة العالمية (WHO)",
      ]
      : [
        "Mifflin-St Jeor equation for Basal Metabolic Rate (BMR) calculation",
        "NHLBI BMI Calculator - National Heart, Lung, and Blood Institute - nhlbi.nih.gov",
        "WHO Dietary Guidelines",
      ];

    return {
      healthSummary: parsed.healthSummary || "",
      summary: parsed.summary || "",
      goalDescription: parsed.goalDescription || "",
      calories: {
        bmr,
        tdee,
        target: targetCalories,
        deficit_or_surplus: delta,
      },
      macros,
      intakeAlignment: parsed.intakeAlignment || "",
      deficiencies: parsed.deficiencies || [],
      supplements: parsed.supplements || [],
      mealPlan: {
        breakfast: (parsed.mealPlan?.breakfast || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        lunch: (parsed.mealPlan?.lunch || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        dinner: (parsed.mealPlan?.dinner || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        snacks: (parsed.mealPlan?.snacks || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
      },
      tips: parsed.tips || [],
      warnings: parsed.warnings || [],
      conditionTips: parsed.conditionTips || [],
      references: parsed.references && parsed.references.length > 0 ? parsed.references : defaultReferences,
    };
  } catch (error) {
    console.error("Failed to parse diet plan response:", content);
    throw new Error("DIET_PLAN_PARSE_ERROR");
  }
}
