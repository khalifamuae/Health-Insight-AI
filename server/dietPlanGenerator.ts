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
    breakfast: { name: string; description: string; calories: number; benefits: string }[];
    lunch: { name: string; description: string; calories: number; benefits: string }[];
    dinner: { name: string; description: string; calories: number; benefits: string }[];
    snacks: { name: string; description: string; calories: number; benefits: string }[];
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

  const proteinInstruction = mealPreference !== "vegetarian"
    ? isArabic
      ? `\n- المستخدم يفضل: ${proteinPrefLabels[proteinPref]?.ar || "متنوع"}. ركّز على هذا النوع من البروتين الحيواني في الوجبات الرئيسية مع التنويع.`
      : `\n- User prefers: ${proteinPrefLabels[proteinPref]?.en || "Mixed"}. Focus on this protein source in main meals while maintaining variety.`
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
البروتين المفضل: ${proteinPrefLabels[proteinPref]?.ar || "متنوع"}

السعرات المستهدفة: ${targetCalories} سعرة حرارية يومياً
البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${toneInstruction}

تعليمات مهمة:
- صمم الوجبات بحيث تتوافق مع السعرات والماكرو المحدد أعلاه
- قدم 3 خيارات مختلفة ومتنوعة لكل وجبة (فطور، غداء، عشاء) لكي يختار المستخدم ما يناسبه ويغير يومياً${proteinInstruction}
- ${goal === "weight_loss" ? "ركز على وجبات مشبعة ومنخفضة السعرات وغنية بالبروتين والألياف" : ""}
- ${goal === "muscle_gain" ? "ركز على مصادر غذاء نظيفة وصحية فقط (لا وجبات سريعة، لا دهون مشبعة مفرطة)" : ""}
- ${goal === "maintain" ? "ركز على التوازن بين العناصر الغذائية وتعديل النواقص من خلال الطعام" : ""}
- ${mealPreference === "high_protein" ? "ركز على مصادر بروتين عالية الجودة في كل وجبة" : ""}
- ${mealPreference === "low_carb" ? "قلل الكربوهيدرات واستبدلها بدهون صحية وبروتين" : ""}
- ${mealPreference === "vegetarian" ? "جميع الوجبات نباتية - لا لحوم أو دواجن أو أسماك" : ""}
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل وتساعد على تعويضها طبيعياً
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- اذكر السعرات التقريبية لكل وجبة
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين الفحوصات${allergyInstruction}${supplementInstruction}
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
    "breakfast": [{"name": "خيار 1", "description": "وصف مع المقادير", "calories": 400, "benefits": "الفوائد"}, {"name": "خيار 2", ...}, {"name": "خيار 3", ...}],
    "lunch": [{"name": "خيار 1", ...}, {"name": "خيار 2", ...}, {"name": "خيار 3", ...}],
    "dinner": [{"name": "خيار 1", ...}, {"name": "خيار 2", ...}, {"name": "خيار 3", ...}],
    "snacks": [{"name": "سناك 1", ...}, {"name": "سناك 2", ...}]
  },
  "tips": ["نصيحة إيجابية 1", "نصيحة إيجابية 2"],
  "warnings": ["ننصحك بمتابعة ... مع طبيبك للاطمئنان"],
  "conditionTips": [{"condition": "اسم الحالة (بأسلوب إيجابي)", "advice": ["نصيحة 1", "نصيحة 2"], "avoidFoods": ["طعام يفضل تقليله 1"]}]
}`
    : `You are a friendly and motivating nutrition expert. Your mission is to design a personalized diet plan based on the user's lab results and physical data to help them reach optimal health.

Goal: ${goalDescriptions[goal].en}
Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
Protein Preference: ${proteinPrefLabels[proteinPref]?.en || "Mixed"}

Target Calories: ${targetCalories} kcal/day
Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${toneInstruction}

Important instructions:
- Design meals that align with the calorie and macro targets above
- Provide 3 DIFFERENT varied options for each meal (breakfast, lunch, dinner) so the user can choose and rotate daily${proteinInstruction}
- ${goal === "weight_loss" ? "Focus on satiating, low-calorie meals rich in protein and fiber" : ""}
- ${goal === "muscle_gain" ? "Focus on clean, healthy food sources ONLY (no fast food, no excessive saturated fats)" : ""}
- ${goal === "maintain" ? "Focus on balanced nutrition and correcting deficiencies through food" : ""}
- ${mealPreference === "high_protein" ? "Emphasize high-quality protein sources in every meal" : ""}
- ${mealPreference === "low_carb" ? "Minimize carbohydrates and replace with healthy fats and protein" : ""}
- ${mealPreference === "vegetarian" ? "All meals must be vegetarian - no meat, poultry, or fish" : ""}
- Focus on foods that address deficiencies found in lab results and compensate naturally through nutrition
- Provide practical, easy-to-prepare meals
- Include approximate calories for each meal
- Mention health benefits of each meal and how they improve test results${allergyInstruction}${supplementInstruction}
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
    "breakfast": [{"name": "Option 1", "description": "Description with portions", "calories": 400, "benefits": "Benefits"}, ...],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
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
- البروتين المفضل: ${proteinPrefLabels[proteinPref]?.ar || "متنوع"}
- السعرات المستهدفة: ${targetCalories} سعرة/يوم
- البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم
${hasAllergies && allergyList ? `- الحساسيات الغذائية: ${allergyList}` : "- لا يوجد حساسيات غذائية"}

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}

ملخص:
- فحوصات طبيعية: ${normalTests.length}
- فحوصات غير طبيعية: ${abnormalTests.length}

المطلوب:
1. صمم نظام غذائي مخصص يتناسب مع هدف المستخدم ويحسّن هذه النتائج
2. ركّز على تعويض النواقص من خلال الغذاء الطبيعي أولاً
3. اقترح مكملات غذائية إذا لزم الأمر (مثل فيتامين د، حديد، إلخ)
4. قدم 3 خيارات لكل وجبة
5. استخدم أسلوباً إيجابياً ومحفّزاً في جميع النصائح`
    : `User data:
- Age: ${age} years
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}
- Goal: ${goalDescriptions[goal].en}
- Activity Level: ${activityLabels[activityLevel]?.en || activityLevel}
- Meal Preference: ${preferenceLabels[mealPreference]?.en || mealPreference}
- Protein Preference: ${proteinPrefLabels[proteinPref]?.en || "Mixed"}
- Target Calories: ${targetCalories} kcal/day
- Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g
${hasAllergies && allergyList ? `- Food Allergies: ${allergyList}` : "- No food allergies"}

Lab Results:
${testsDescription || "No lab results available"}

Summary:
- Normal tests: ${normalTests.length}
- Abnormal tests: ${abnormalTests.length}

Requirements:
1. Design a personalized diet plan that matches the user's goal and improves these results
2. Focus on compensating deficiencies through natural food first
3. Suggest dietary supplements if needed (e.g., Vitamin D, Iron, etc.)
4. Provide 3 options for each meal
5. Use a positive, motivating tone in all tips and advice`;

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
