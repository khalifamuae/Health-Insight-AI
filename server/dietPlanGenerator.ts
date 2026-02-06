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
  deficiencies: { name: string; current: string; target: string; foods: string[] }[];
  mealPlan: {
    breakfast: { name: string; description: string; benefits: string }[];
    lunch: { name: string; description: string; benefits: string }[];
    dinner: { name: string; description: string; benefits: string }[];
    snacks: { name: string; description: string; benefits: string }[];
  };
  tips: string[];
  warnings: string[];
}

export async function generateDietPlan(userData: UserHealthData): Promise<DietPlanResult> {
  const isArabic = userData.language === "ar";

  const abnormalTests = userData.testResults.filter(t => t.status === "low" || t.status === "high");
  const normalTests = userData.testResults.filter(t => t.status === "normal");

  const bmi = userData.weight && userData.height
    ? (userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)
    : null;

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

  const systemPrompt = isArabic
    ? `أنت خبير تغذية طبية متخصص. مهمتك تصميم نظام غذائي مخصص بناءً على نتائج التحاليل الطبية والبيانات الجسدية للمستخدم.

تعليمات مهمة:
- ركز على الأطعمة التي تحسّن النواقص الموجودة في التحاليل
- قدم وجبات عملية وسهلة التحضير ومتوفرة في المنطقة العربية
- اذكر الفوائد الصحية لكل وجبة وارتباطها بتحسين الفحوصات
- قدم نصائح غذائية عامة بناءً على الحالة الصحية
- أضف تحذيرات إذا كانت هناك قيم خطرة تحتاج مراجعة طبيب
- جميع الردود يجب أن تكون باللغة العربية

أرجع JSON بالشكل التالي:
{
  "summary": "ملخص عام عن الحالة الغذائية",
  "deficiencies": [{"name": "اسم النقص", "current": "القيمة الحالية", "target": "القيمة المستهدفة", "foods": ["طعام 1", "طعام 2"]}],
  "mealPlan": {
    "breakfast": [{"name": "اسم الوجبة", "description": "وصف مختصر", "benefits": "الفوائد الصحية"}],
    "lunch": [{"name": "اسم الوجبة", "description": "وصف مختصر", "benefits": "الفوائد الصحية"}],
    "dinner": [{"name": "اسم الوجبة", "description": "وصف مختصر", "benefits": "الفوائد الصحية"}],
    "snacks": [{"name": "اسم الوجبة", "description": "وصف مختصر", "benefits": "الفوائد الصحية"}]
  },
  "tips": ["نصيحة 1", "نصيحة 2"],
  "warnings": ["تحذير 1"]
}`
    : `You are a medical nutrition expert. Design a personalized diet plan based on the user's lab results and physical data.

Important instructions:
- Focus on foods that address deficiencies found in lab results
- Provide practical, easy-to-prepare meals
- Mention health benefits of each meal and how they improve test results
- Provide general dietary tips based on the health condition
- Add warnings if there are dangerous values requiring doctor consultation
- All responses must be in English

Return JSON in this format:
{
  "summary": "General summary of nutritional status",
  "deficiencies": [{"name": "Deficiency name", "current": "Current value", "target": "Target value", "foods": ["food 1", "food 2"]}],
  "mealPlan": {
    "breakfast": [{"name": "Meal name", "description": "Brief description", "benefits": "Health benefits"}],
    "lunch": [{"name": "Meal name", "description": "Brief description", "benefits": "Health benefits"}],
    "dinner": [{"name": "Meal name", "description": "Brief description", "benefits": "Health benefits"}],
    "snacks": [{"name": "Meal name", "description": "Brief description", "benefits": "Health benefits"}]
  },
  "tips": ["tip 1", "tip 2"],
  "warnings": ["warning 1"]
}`;

  const userContent = isArabic
    ? `بيانات المستخدم:
- العمر: ${userData.age || "غير محدد"}
- الجنس: ${userData.gender === "male" ? "ذكر" : userData.gender === "female" ? "أنثى" : "غير محدد"}
- الوزن: ${userData.weight || "غير محدد"} كجم
- الطول: ${userData.height || "غير محدد"} سم
${bmi ? `- مؤشر كتلة الجسم (BMI): ${bmi}` : ""}

نتائج التحاليل:
${testsDescription || "لا توجد نتائج تحاليل متوفرة"}

ملخص:
- فحوصات طبيعية: ${normalTests.length}
- فحوصات غير طبيعية: ${abnormalTests.length}

صمم نظام غذائي مخصص يحسّن هذه النتائج.`
    : `User data:
- Age: ${userData.age || "Not specified"}
- Gender: ${userData.gender || "Not specified"}
- Weight: ${userData.weight || "Not specified"} kg
- Height: ${userData.height || "Not specified"} cm
${bmi ? `- BMI: ${bmi}` : ""}

Lab Results:
${testsDescription || "No lab results available"}

Summary:
- Normal tests: ${normalTests.length}
- Abnormal tests: ${abnormalTests.length}

Design a personalized diet plan that improves these results.`;

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
      deficiencies: parsed.deficiencies || [],
      mealPlan: {
        breakfast: parsed.mealPlan?.breakfast || [],
        lunch: parsed.mealPlan?.lunch || [],
        dinner: parsed.mealPlan?.dinner || [],
        snacks: parsed.mealPlan?.snacks || [],
      },
      tips: parsed.tips || [],
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error("Failed to parse diet plan response:", content);
    throw new Error("DIET_PLAN_PARSE_ERROR");
  }
}
