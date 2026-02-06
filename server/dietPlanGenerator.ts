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

function getTargetCalories(tdee: number, goal: string): { target: number; delta: number } {
  switch (goal) {
    case "weight_loss":
      return { target: Math.round(tdee - 500), delta: -500 };
    case "muscle_gain":
      return { target: Math.round(tdee + 300), delta: 300 };
    default:
      return { target: tdee, delta: 0 };
  }
}

function getMacroTargets(targetCalories: number, goal: string, preference: string, weight: number) {
  let proteinPerKg: number, fatPercentage: number;

  if (preference === "high_protein") {
    proteinPerKg = 2.2;
    fatPercentage = 0.20;
  } else if (preference === "low_carb") {
    proteinPerKg = 1.8;
    fatPercentage = 0.45;
  } else if (preference === "vegetarian") {
    proteinPerKg = 1.4;
    fatPercentage = 0.30;
  } else {
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
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(Math.max(carbCalories, 0) / 4);

  return {
    protein: { grams: proteinGrams, percentage: Math.round((proteinCalories / targetCalories) * 100) },
    carbs: { grams: carbGrams, percentage: Math.round((Math.max(carbCalories, 0) / targetCalories) * 100) },
    fats: { grams: fatGrams, percentage: Math.round((fatCalories / targetCalories) * 100) },
  };
}

function detectDeficiencies(testResults: UserHealthData["testResults"]): string[] {
  const deficiencies: string[] = [];
  for (const t of testResults) {
    if (t.value == null) continue;
    if (t.status === "low" || t.status === "high") {
      deficiencies.push(t.testName);
    }
  }
  return deficiencies;
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

  const bmr = Math.round(calculateBMR(weight, height, age, gender));
  const tdee = calculateTDEE(bmr, activityLevel);
  const { target: targetCalories, delta } = getTargetCalories(tdee, goal);
  const macros = getMacroTargets(targetCalories, goal, mealPreference, weight);

  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);

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

  const allergyInstruction = hasAllergies && allergyList
    ? isArabic
      ? `\n- المستخدم لديه حساسية تجاه: ${allergyList}. تجنب هذه المكونات تماماً في جميع الوجبات.`
      : `\n- User has allergies to: ${allergyList}. Completely avoid these ingredients in all meals.`
    : "";

  const proteinListAr = proteinPrefs.map(p => proteinPrefLabels[p]?.ar || p).join("، ");
  const proteinListEn = proteinPrefs.map(p => proteinPrefLabels[p]?.en || p).join(", ");

  const proteinInstruction = mealPreference !== "vegetarian"
    ? isArabic
      ? `\n- ⚠️ قاعدة صارمة: المستخدم اختار هذه البروتينات فقط: [${proteinListAr}]. يُمنع منعاً باتاً استخدام أي نوع بروتين لم يختره المستخدم. إذا اختار "دجاج" فقط، لا تضع سمك أو لحم. إذا اختار "دجاج ولحم حمراء"، لا تضع سمك. نوّع بين الأنواع المختارة فقط.`
      : `\n- ⚠️ STRICT RULE: The user selected ONLY these proteins: [${proteinListEn}]. You MUST NOT include any protein source the user did NOT select. If they chose only "Chicken", do NOT include fish or red meat. If they chose "Chicken and Red Meat", do NOT include fish. Rotate ONLY between the selected types.`
    : "";

  const carbListAr = carbPrefs.map(c => carbPrefLabels[c]?.ar || c).join("، ");
  const carbListEn = carbPrefs.map(c => carbPrefLabels[c]?.en || c).join(", ");

  const carbInstruction = carbPrefs.length > 0
    ? isArabic
      ? `\n- ⚠️ قاعدة صارمة: المستخدم اختار هذه الكربوهيدرات فقط: [${carbListAr}]. يُمنع منعاً باتاً استخدام أي مصدر كربوهيدرات لم يختره المستخدم. إذا اختار "شوفان وأرز" فقط، لا تضع خبز أو معكرونة أو بطاطس. استخدم فقط ما اختاره المستخدم.`
      : `\n- ⚠️ STRICT RULE: The user selected ONLY these carb sources: [${carbListEn}]. You MUST NOT include any carbohydrate source the user did NOT select. If they chose only "Oats and Rice", do NOT include bread, pasta, or potato. Use ONLY the user's selected carb sources.`
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
- ركز أولاً على تعويض النواقص من خلال الغذاء الطبيعي، وأضف المكملات فقط عند الحاجة الفعلية.`
    : `\n- Based on lab results and deficiencies, suggest specific dietary supplements if needed (e.g., Vitamin D, Iron, B12, Omega-3, etc.). Specify suggested dosage, duration, and reason. Put them in "supplements". If the user doesn't need supplements, leave the array empty.
- Focus first on compensating deficiencies through natural food, and add supplements only when truly needed.`;

  const systemPrompt = isArabic
    ? `أنت خبير تغذية ودود ومحفّز. مهمتك تصميم نظام غذائي مخصص بناءً على نتائج التحاليل الطبية والبيانات الجسدية للمستخدم لمساعدته في الوصول إلى الصحة المثالية.

الهدف: ${goalDescriptions[goal].ar}
مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
نوع الوجبات المفضل: ${preferenceLabels[mealPreference]?.ar || mealPreference}
البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `الكربوهيدرات المفضلة: ${carbListAr}` : ""}

السعرات المستهدفة: ${targetCalories} سعرة حرارية يومياً
البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${toneInstruction}

تعليمات مهمة:
- هذا النظام الغذائي يجب أن يكون مصمماً خصيصاً لهذا المستخدم بناءً على: الطول (${height}سم)، الوزن (${weight}كجم)، الجنس (${gender === "male" ? "ذكر" : "أنثى"})، العمر (${age})، الهدف (${goalDescriptions[goal].ar})، ونتائج الفحوصات الطبية
- صمم الوجبات بحيث تتوافق مع السعرات والماكرو المحدد أعلاه
- قدم 3 خيارات مختلفة ومتنوعة لكل وجبة (فطور، غداء، عشاء) لكي يختار المستخدم ما يناسبه ويغير يومياً${proteinInstruction}${carbInstruction}
- ⚠️ قاعدة ذهبية: لا تضع أي مكون لم يختره المستخدم. النظام مبني فقط على اختيارات المستخدم من البروتين والكربوهيدرات. إذا لم يختر مصدراً معيناً، لا تدرجه في أي وجبة
- ${goal === "weight_loss" ? "ركز على وجبات مشبعة ومنخفضة السعرات وغنية بالبروتين والألياف" : ""}
- ${goal === "muscle_gain" ? "ركز على مصادر غذاء نظيفة وصحية فقط (لا وجبات سريعة، لا دهون مشبعة مفرطة)" : ""}
- ${goal === "maintain" ? "ركز على التوازن بين العناصر الغذائية وتعديل النواقص من خلال الطعام" : ""}
- ${mealPreference === "high_protein" ? "ركز على مصادر بروتين عالية الجودة في كل وجبة" : ""}
- ${mealPreference === "low_carb" ? "قلل الكربوهيدرات واستبدلها بدهون صحية وبروتين" : ""}
- ${mealPreference === "vegetarian" ? "جميع الوجبات نباتية - لا لحوم أو دواجن أو أسماك" : ""}
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل وتساعد على تعويضها طبيعياً من خلال التغذية
- حلّل نتائج الفحوصات وصمم الوجبات لمعالجة النواقص: إذا كان فيتامين د منخفض أضف أطعمة غنية به، إذا كان الحديد منخفض أضف مصادر حديد طبيعية، وهكذا
${hasAllergies && allergyList ? `- ⚠️ حساسية المستخدم: ${allergyList}. يُمنع منعاً باتاً وضع أي مكون يسبب الحساسية في أي وجبة` : ""}
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- ⚠️ قاعدة إلزامية: يجب كتابة كل مكون بالجرامات بدقة في وصف الوجبة لضمان عدم تجاوز السعرات الحرارية المحددة. مثال: "150 جرام صدر دجاج مشوي، 80 جرام أرز بسمتي، 100 جرام خضروات مشكلة، 10 مل زيت زيتون". لا تكتب "قطعة دجاج" أو "طبق أرز" - يجب تحديد الوزن بالجرام لكل مكون
- تأكد أن مجموع سعرات المكونات بالجرامات يتطابق مع السعرات المعلنة لكل وجبة
- اذكر القيم الغذائية (بروتين، كارب، دهون) بالجرام لكل وجبة
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين الفحوصات${supplementInstruction}
- قدم نصائح غذائية عامة بأسلوب إيجابي ومحفّز بناءً على الحالة الصحية والهدف
- أضف نصائح مخصصة لكل حالة صحية مكتشفة في "conditionTips" بأسلوب إيجابي (بدون تخويف)
- إذا كانت هناك قيم تحتاج متابعة طبيب، اذكرها بلطف في "warnings" (مثال: "ننصحك بمتابعة مستوى X مع طبيبك للاطمئنان")
- جميع الردود يجب أن تكون باللغة العربية

أرجع JSON بالشكل التالي:
{
  "summary": "ملخص عام إيجابي عن الحالة الغذائية والخطة",
  "goalDescription": "وصف مختصر للهدف والخطة بأسلوب تحفيزي",
  "deficiencies": [{"name": "اسم النقص", "current": "القيمة الحالية", "target": "القيمة المستهدفة", "foods": ["طعام 1", "طعام 2"]}],
  "supplements": [{"name": "اسم المكمل", "dosage": "الجرعة المقترحة", "reason": "سبب الحاجة", "duration": "مدة الاستخدام"}],
  "mealPlan": {
    "breakfast": [{"name": "شوفان بالحليب والموز", "description": "60 جرام شوفان، 200 مل حليب قليل الدسم، 1 موزة متوسطة (120 جرام)، 10 جرام عسل، 15 جرام لوز", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "benefits": "غني بالألياف والطاقة المستدامة"}, ...],
    "lunch": [{"name": "دجاج مشوي مع أرز", "description": "150 جرام صدر دجاج مشوي، 80 جرام أرز بسمتي مطبوخ، 100 جرام سلطة خضراء، 10 مل زيت زيتون", "calories": 520, "protein": 42, "carbs": 48, "fats": 15, "benefits": "بروتين عالي الجودة مع كربوهيدرات معتدلة"}, ...],
    "dinner": [{"name": "سمك مشوي مع خضروات", "description": "130 جرام سمك فيليه مشوي، 150 جرام خضروات مشوية (كوسة، فلفل، بصل)، 60 جرام بطاطا حلوة مشوية، 5 مل زيت زيتون", "calories": 380, "protein": 32, "carbs": 30, "fats": 12, "benefits": "غني بأوميغا-3 ومضادات الأكسدة"}, ...],
    "snacks": [{"name": "زبادي مع فواكه", "description": "150 جرام زبادي يوناني، 80 جرام فراولة طازجة، 10 جرام عسل", "calories": 160, "protein": 12, "carbs": 18, "fats": 4, "benefits": "بروبيوتيك طبيعي لصحة الجهاز الهضمي"}, ...]
  },
  "tips": ["نصيحة إيجابية 1", "نصيحة إيجابية 2"],
  "warnings": ["ننصحك بمتابعة ... مع طبيبك للاطمئنان"],
  "conditionTips": [{"condition": "اسم الحالة (بأسلوب إيجابي)", "advice": ["نصيحة 1", "نصيحة 2"], "avoidFoods": ["طعام يفضل تقليله 1"]}]
}`
    : `You are a friendly and motivating nutrition expert. Your mission is to design a personalized diet plan based on the user's lab results and physical data to help them reach optimal health.

Goal: ${goalDescriptions[goal].en}
Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `Carb Preferences: ${carbListEn}` : ""}

Target Calories: ${targetCalories} kcal/day
Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${toneInstruction}

Important instructions:
- This diet plan MUST be custom-designed for this specific user based on: Height (${height}cm), Weight (${weight}kg), Gender (${gender}), Age (${age}), Goal (${goalDescriptions[goal].en}), and their lab test results
- Design meals that align with the calorie and macro targets above
- Provide 3 DIFFERENT varied options for each meal (breakfast, lunch, dinner) so the user can choose and rotate daily${proteinInstruction}${carbInstruction}
- GOLDEN RULE: Do NOT include any ingredient the user did NOT select. The diet plan is built EXCLUSIVELY from the user's protein and carbohydrate choices. If a source was not selected, it MUST NOT appear in any meal
- ${goal === "weight_loss" ? "Focus on satiating, low-calorie meals rich in protein and fiber" : ""}
- ${goal === "muscle_gain" ? "Focus on clean, healthy food sources ONLY (no fast food, no excessive saturated fats)" : ""}
- ${goal === "maintain" ? "Focus on balanced nutrition and correcting deficiencies through food" : ""}
- ${mealPreference === "high_protein" ? "Emphasize high-quality protein sources in every meal" : ""}
- ${mealPreference === "low_carb" ? "Minimize carbohydrates and replace with healthy fats and protein" : ""}
- ${mealPreference === "vegetarian" ? "All meals must be vegetarian - no meat, poultry, or fish" : ""}
- Focus on foods that address deficiencies found in lab results and compensate naturally through nutrition
- Analyze test results and design meals to treat deficiencies: if Vitamin D is low add foods rich in it, if Iron is low add natural iron sources, and so on
${hasAllergies && allergyList ? `- ALLERGY WARNING: User is allergic to: ${allergyList}. You MUST NOT include any allergen-containing ingredient in any meal` : ""}
- Provide practical, easy-to-prepare meals
- MANDATORY RULE: Every ingredient in the meal description MUST be specified in grams to ensure calories are precise and not exceeded. Example: "150g grilled chicken breast, 80g basmati rice, 100g mixed vegetables, 10ml olive oil". Do NOT write "a piece of chicken" or "a plate of rice" - specify the exact weight in grams for every single ingredient
- Ensure the total calories from gram-specified ingredients match the declared calories for each meal
- Include macronutrient breakdown (protein, carbs, fats) in grams for each meal
- Mention health benefits of each meal and how they improve test results${supplementInstruction}
- Provide general dietary tips with a positive, encouraging tone based on the health condition and goal
- Add personalized tips for each detected health condition in "conditionTips" with a positive tone (no scary language)
- If there are values that need doctor follow-up, mention them gently in "warnings" (e.g., "We recommend following up on X with your doctor for peace of mind")
- All responses must be in English

Return JSON in this format:
{
  "summary": "Positive general summary of nutritional status and plan",
  "goalDescription": "Brief motivating description of the goal and plan",
  "deficiencies": [{"name": "Deficiency name", "current": "Current value", "target": "Target value", "foods": ["food 1", "food 2"]}],
  "supplements": [{"name": "Supplement name", "dosage": "Suggested dosage", "reason": "Reason needed", "duration": "Duration of use"}],
  "mealPlan": {
    "breakfast": [{"name": "Oatmeal with Banana", "description": "60g oats, 200ml low-fat milk, 1 medium banana (120g), 10g honey, 15g almonds", "calories": 420, "protein": 15, "carbs": 62, "fats": 12, "benefits": "Rich in fiber and sustained energy"}, ...],
    "lunch": [{"name": "Grilled Chicken with Rice", "description": "150g grilled chicken breast, 80g cooked basmati rice, 100g green salad, 10ml olive oil", "calories": 520, "protein": 42, "carbs": 48, "fats": 15, "benefits": "High-quality protein with moderate carbs"}, ...],
    "dinner": [{"name": "Grilled Fish with Vegetables", "description": "130g grilled fish fillet, 150g roasted vegetables (zucchini, bell pepper, onion), 60g roasted sweet potato, 5ml olive oil", "calories": 380, "protein": 32, "carbs": 30, "fats": 12, "benefits": "Rich in omega-3 and antioxidants"}, ...],
    "snacks": [{"name": "Greek Yogurt with Berries", "description": "150g Greek yogurt, 80g fresh strawberries, 10g honey", "calories": 160, "protein": 12, "carbs": 18, "fats": 4, "benefits": "Natural probiotics for digestive health"}, ...]
  },
  "tips": ["positive tip 1", "positive tip 2"],
  "warnings": ["We recommend following up on ... with your doctor for peace of mind"],
  "conditionTips": [{"condition": "Condition name (positive framing)", "advice": ["tip 1", "tip 2"], "avoidFoods": ["food to reduce 1"]}]
}`;

  const userContent = isArabic
    ? `بيانات المستخدم:
- العمر: ${age} سنة
- الجنس: ${gender === "male" ? "ذكر" : "أنثى"}
- الوزن: ${weight} كجم
- الطول: ${height} سم
- مؤشر كتلة الجسم (BMI): ${bmi}
- الهدف: ${goalDescriptions[goal].ar}
- مستوى النشاط: ${activityLabels[activityLevel]?.ar || activityLevel}
- نوع الوجبات: ${preferenceLabels[mealPreference]?.ar || mealPreference}
- البروتين المفضل: ${proteinListAr}
${carbPrefs.length > 0 ? `- الكربوهيدرات المفضلة: ${carbListAr}` : ""}
- السعرات المستهدفة: ${targetCalories} سعرة/يوم
- البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${hasAllergies && allergyList ? `- الحساسيات الغذائية: ${allergyList}` : "- لا يوجد حساسيات غذائية"}

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}

ملخص:
- فحوصات طبيعية: ${normalTests.length}
- فحوصات غير طبيعية: ${abnormalTests.length}

المطلوب:
1. صمم نظام غذائي مخصص 100% لهذا المستخدم بناءً على بياناته الجسدية وفحوصاته واختياراته
2. استخدم فقط البروتينات التي اختارها: [${proteinListAr}] - لا تضع أي بروتين آخر
3. استخدم فقط الكربوهيدرات التي اختارها: [${carbPrefs.length > 0 ? carbListAr : "لم يحدد"}] - لا تضع أي كارب آخر
4. عالج النواقص في الفحوصات من خلال الغذاء الطبيعي أولاً (مثلاً: نقص حديد → أطعمة غنية بالحديد من ضمن اختياراته)
5. اقترح مكملات غذائية فقط إذا لم يكف الغذاء الطبيعي لتعويض النقص
6. قدم 3 خيارات متنوعة لكل وجبة مع مراعاة السعرات والماكرو
7. تجنب تماماً أي مسببات حساسية${hasAllergies ? ` (${allergyList})` : ""}
8. استخدم أسلوباً إيجابياً ومحفّزاً في جميع النصائح`
    : `User data:
- Age: ${age} years
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}
- Goal: ${goalDescriptions[goal].en}
- Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
- Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
- Protein Preferences: ${proteinListEn}
${carbPrefs.length > 0 ? `- Carb Preferences: ${carbListEn}` : ""}
- Target Calories: ${targetCalories} kcal/day
- Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${hasAllergies && allergyList ? `- Food Allergies: ${allergyList}` : "- No food allergies"}

Lab Results:
${testsDescription || "No lab results available"}

Summary:
- Normal tests: ${normalTests.length}
- Abnormal tests: ${abnormalTests.length}

Requirements:
1. Design a 100% personalized diet plan for this specific user based on their physical data, lab results, and preferences
2. Use ONLY the proteins they selected: [${proteinListEn}] - do NOT include any other protein source
3. Use ONLY the carbs they selected: [${carbPrefs.length > 0 ? carbListEn : "not specified"}] - do NOT include any other carb source
4. Treat lab result deficiencies through natural food first (e.g., low iron → iron-rich foods from their selected choices)
5. Suggest supplements ONLY if natural food is insufficient to compensate deficiencies
6. Provide 3 varied options for each meal while respecting calorie and macro targets
7. Strictly avoid all allergens${hasAllergies ? ` (${allergyList})` : ""}
8. Use a positive, motivating tone in all tips and advice`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_completion_tokens: 6000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || "",
      goalDescription: parsed.goalDescription || "",
      calories: {
        bmr,
        tdee,
        target: targetCalories,
        deficit_or_surplus: delta,
      },
      macros,
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
    };
  } catch (error) {
    console.error("Failed to parse diet plan response:", content);
    throw new Error("DIET_PLAN_PARSE_ERROR");
  }
}
