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
  mealPlan: {
    breakfast: { name: string; description: string; calories: number; benefits: string }[];
    lunch: { name: string; description: string; calories: number; benefits: string }[];
    dinner: { name: string; description: string; calories: number; benefits: string }[];
    snacks: { name: string; description: string; calories: number; benefits: string }[];
  };
  tips: string[];
  warnings: string[];
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateTDEE(bmr: number): number {
  return Math.round(bmr * 1.55);
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

function getMacroTargets(targetCalories: number, goal: string, weight: number) {
  let proteinPerKg: number, fatPercentage: number;

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

  const proteinGrams = Math.round(weight * proteinPerKg);
  const proteinCalories = proteinGrams * 4;
  const fatCalories = Math.round(targetCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9);
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  return {
    protein: { grams: proteinGrams, percentage: Math.round((proteinCalories / targetCalories) * 100) },
    carbs: { grams: carbGrams, percentage: Math.round((carbCalories / targetCalories) * 100) },
    fats: { grams: fatGrams, percentage: Math.round((fatCalories / targetCalories) * 100) },
  };
}

export async function generateDietPlan(userData: UserHealthData): Promise<DietPlanResult> {
  const isArabic = userData.language === "ar";
  const goal = userData.fitnessGoal || "maintain";

  const abnormalTests = userData.testResults.filter(t => t.status === "low" || t.status === "high");
  const normalTests = userData.testResults.filter(t => t.status === "normal");

  const weight = userData.weight || 70;
  const height = userData.height || 170;
  const age = userData.age || 30;
  const gender = userData.gender || "male";

  const bmr = Math.round(calculateBMR(weight, height, age, gender));
  const tdee = calculateTDEE(bmr);
  const { target: targetCalories, delta } = getTargetCalories(tdee, goal);
  const macros = getMacroTargets(targetCalories, goal, weight);

  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);

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

  const systemPrompt = isArabic
    ? `أنت خبير تغذية طبية متخصص. مهمتك تصميم نظام غذائي مخصص بناءً على نتائج التحاليل الطبية والبيانات الجسدية للمستخدم.

الهدف: ${goalDescriptions[goal].ar}

السعرات المستهدفة: ${targetCalories} سعرة حرارية يومياً
البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم

تعليمات مهمة:
- صمم الوجبات بحيث تتوافق مع السعرات والماكرو المحدد أعلاه
- ${goal === "weight_loss" ? "ركز على وجبات مشبعة ومنخفضة السعرات وغنية بالبروتين والألياف" : ""}
- ${goal === "muscle_gain" ? "ركز على مصادر غذاء نظيفة وصحية فقط (لا وجبات سريعة، لا دهون مشبعة مفرطة)" : ""}
- ${goal === "maintain" ? "ركز على التوازن بين العناصر الغذائية وتعديل النواقص من خلال الطعام" : ""}
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- اذكر السعرات التقريبية لكل وجبة
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين الفحوصات
- قدم نصائح غذائية عامة بناءً على الحالة الصحية والهدف
- أضف تحذيرات إذا كانت هناك قيم خطرة تحتاج مراجعة طبيب
- جميع الردود يجب أن تكون باللغة العربية

أرجع JSON بالشكل التالي:
{
  "summary": "ملخص عام عن الحالة الغذائية والهدف",
  "goalDescription": "وصف مختصر للهدف والخطة",
  "deficiencies": [{"name": "اسم النقص", "current": "القيمة الحالية", "target": "القيمة المستهدفة", "foods": ["طعام 1", "طعام 2"]}],
  "mealPlan": {
    "breakfast": [{"name": "اسم الوجبة", "description": "وصف مختصر مع المقادير", "calories": 400, "benefits": "الفوائد الصحية"}],
    "lunch": [{"name": "اسم الوجبة", "description": "وصف مختصر مع المقادير", "calories": 500, "benefits": "الفوائد الصحية"}],
    "dinner": [{"name": "اسم الوجبة", "description": "وصف مختصر مع المقادير", "calories": 400, "benefits": "الفوائد الصحية"}],
    "snacks": [{"name": "اسم الوجبة", "description": "وصف مختصر", "calories": 200, "benefits": "الفوائد الصحية"}]
  },
  "tips": ["نصيحة 1", "نصيحة 2"],
  "warnings": ["تحذير 1"]
}`
    : `You are a medical nutrition expert. Design a personalized diet plan based on the user's lab results and physical data.

Goal: ${goalDescriptions[goal].en}

Target Calories: ${targetCalories} kcal/day
Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g

Important instructions:
- Design meals that align with the calorie and macro targets above
- ${goal === "weight_loss" ? "Focus on satiating, low-calorie meals rich in protein and fiber" : ""}
- ${goal === "muscle_gain" ? "Focus on clean, healthy food sources ONLY (no fast food, no excessive saturated fats)" : ""}
- ${goal === "maintain" ? "Focus on balanced nutrition and correcting deficiencies through food" : ""}
- Focus on foods that address deficiencies found in lab results
- Provide practical, easy-to-prepare meals
- Include approximate calories for each meal
- Mention health benefits of each meal and how they improve test results
- Provide general dietary tips based on the health condition and goal
- Add warnings if there are dangerous values requiring doctor consultation
- All responses must be in English

Return JSON in this format:
{
  "summary": "General summary of nutritional status and goal",
  "goalDescription": "Brief description of the goal and plan",
  "deficiencies": [{"name": "Deficiency name", "current": "Current value", "target": "Target value", "foods": ["food 1", "food 2"]}],
  "mealPlan": {
    "breakfast": [{"name": "Meal name", "description": "Brief description with portions", "calories": 400, "benefits": "Health benefits"}],
    "lunch": [{"name": "Meal name", "description": "Brief description with portions", "calories": 500, "benefits": "Health benefits"}],
    "dinner": [{"name": "Meal name", "description": "Brief description with portions", "calories": 400, "benefits": "Health benefits"}],
    "snacks": [{"name": "Meal name", "description": "Brief description", "calories": 200, "benefits": "Health benefits"}]
  },
  "tips": ["tip 1", "tip 2"],
  "warnings": ["warning 1"]
}`;

  const userContent = isArabic
    ? `بيانات المستخدم:
- العمر: ${age} سنة
- الجنس: ${gender === "male" ? "ذكر" : "أنثى"}
- الوزن: ${weight} كجم
- الطول: ${height} سم
- مؤشر كتلة الجسم (BMI): ${bmi}
- الهدف: ${goalDescriptions[goal].ar}
- السعرات المستهدفة: ${targetCalories} سعرة/يوم
- البروتين: ${macros.protein.grams}جم | الكاربوهيدرات: ${macros.carbs.grams}جم | الدهون: ${macros.fats.grams}جم

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}

ملخص:
- فحوصات طبيعية: ${normalTests.length}
- فحوصات غير طبيعية: ${abnormalTests.length}

صمم نظام غذائي مخصص يتناسب مع هدف المستخدم ويحسّن هذه النتائج.`
    : `User data:
- Age: ${age} years
- Gender: ${gender}
- Weight: ${weight} kg
- Height: ${height} cm
- BMI: ${bmi}
- Goal: ${goalDescriptions[goal].en}
- Target Calories: ${targetCalories} kcal/day
- Protein: ${macros.protein.grams}g | Carbs: ${macros.carbs.grams}g | Fats: ${macros.fats.grams}g

Lab Results:
${testsDescription || "No lab results available"}

Summary:
- Normal tests: ${normalTests.length}
- Abnormal tests: ${abnormalTests.length}

Design a personalized diet plan that matches the user's goal and improves these results.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_completion_tokens: 4000,
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
      mealPlan: {
        breakfast: (parsed.mealPlan?.breakfast || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        lunch: (parsed.mealPlan?.lunch || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        dinner: (parsed.mealPlan?.dinner || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
        snacks: (parsed.mealPlan?.snacks || []).map((m: any) => ({ ...m, calories: m.calories || 0 })),
      },
      tips: parsed.tips || [],
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error("Failed to parse diet plan response:", content);
    throw new Error("DIET_PLAN_PARSE_ERROR");
  }
}
