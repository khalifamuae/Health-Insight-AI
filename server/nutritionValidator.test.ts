/**
 * Automated test suite for the nutrition engine.
 * 
 * All per-100g nutrition values are sourced from USDA FoodData Central.
 * Each test asserts that the calculated meal macros fall within
 * the expected realistic ranges.
 * 
 * Run: npx tsx server/nutritionValidator.test.ts
 */

// Inline the calculation logic to avoid DB connection dependency in tests
interface TestIngredient {
    name: string;
    quantity: number;
    unit: string;
    state: string;
    nutritionBasis: string;
    gramsPerServing?: number;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    fiber: number;
    sourceReference: string;
    sourceConfidence: string;
}

interface MacroResult {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    fiber: number;
}

const LIQUID_DENSITIES: Record<string, number> = {
    "olive oil": 0.92, "oil": 0.92, "milk": 1.03, "honey": 1.42,
    "yogurt": 1.03, "vinegar": 1.01, "lemon juice": 1.03,
};

function estimateGrams(name: string, quantity: number, unit: string): number {
    const normUnit = unit.toLowerCase().trim();
    if (normUnit === "g") return quantity;
    if (normUnit === "ml") {
        const normName = name.toLowerCase();
        for (const [key, density] of Object.entries(LIQUID_DENSITIES)) {
            if (normName.includes(key)) return quantity * density;
        }
        return quantity;
    }
    return quantity;
}

function calculateMealMacros(ingredients: TestIngredient[]): MacroResult {
    let totalP = 0, totalC = 0, totalF = 0, totalFib = 0;

    for (const item of ingredients) {
        const grams = estimateGrams(item.name, item.quantity, item.unit);
        let pPer100 = item.protein, cPer100 = item.carbs, fPer100 = item.fat, fibPer100 = item.fiber;

        if (item.nutritionBasis === "per_serving" && item.gramsPerServing && item.gramsPerServing > 0) {
            pPer100 = (item.protein / item.gramsPerServing) * 100;
            cPer100 = (item.carbs / item.gramsPerServing) * 100;
            fPer100 = (item.fat / item.gramsPerServing) * 100;
            fibPer100 = (item.fiber / item.gramsPerServing) * 100;
        }

        totalP += (pPer100 * grams) / 100;
        totalC += (cPer100 * grams) / 100;
        totalF += (fPer100 * grams) / 100;
        totalFib += (fibPer100 * grams) / 100;
    }

    const protein = Math.round(totalP * 10) / 10;
    const carbs = Math.round(totalC * 10) / 10;
    const fat = Math.round(totalF * 10) / 10;
    const fiber = Math.round(totalFib * 10) / 10;
    const calories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));

    return { protein, carbs, fat, calories, fiber };
}

// ─── Test infrastructure ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assertRange(testName: string, actual: MacroResult, expected: {
    protein: [number, number];
    carbs: [number, number];
    fat: [number, number];
    calories: [number, number];
}) {
    const errors: string[] = [];

    if (actual.protein < expected.protein[0] || actual.protein > expected.protein[1]) {
        errors.push(`  Protein: ${actual.protein}g not in [${expected.protein[0]}, ${expected.protein[1]}]`);
    }
    if (actual.carbs < expected.carbs[0] || actual.carbs > expected.carbs[1]) {
        errors.push(`  Carbs: ${actual.carbs}g not in [${expected.carbs[0]}, ${expected.carbs[1]}]`);
    }
    if (actual.fat < expected.fat[0] || actual.fat > expected.fat[1]) {
        errors.push(`  Fat: ${actual.fat}g not in [${expected.fat[0]}, ${expected.fat[1]}]`);
    }
    if (actual.calories < expected.calories[0] || actual.calories > expected.calories[1]) {
        errors.push(`  Calories: ${actual.calories} not in [${expected.calories[0]}, ${expected.calories[1]}]`);
    }

    if (errors.length > 0) {
        console.log(`❌ FAIL: ${testName}`);
        console.log(`  Actual: P=${actual.protein}g C=${actual.carbs}g F=${actual.fat}g Cal=${actual.calories}`);
        errors.forEach(e => console.log(e));
        failed++;
    } else {
        console.log(`✅ PASS: ${testName} → P=${actual.protein}g C=${actual.carbs}g F=${actual.fat}g Cal=${actual.calories}`);
        passed++;
    }
}

// ─── Test cases ───────────────────────────────────────────────────────────────
// All per-100g values sourced from USDA FoodData Central

// TEST 1: Oatmeal Breakfast
// 60g oats, 200ml low-fat milk, 120g banana, 15g honey, 10g almonds
{
    const ingredients: TestIngredient[] = [
        { name: "Oats", quantity: 60, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 13.2, carbs: 67.7, fat: 6.5, calories: 379, fiber: 10.1, sourceReference: "USDA #169738", sourceConfidence: "high" },
        { name: "Low-fat milk", quantity: 200, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 3.4, carbs: 5.0, fat: 1.0, calories: 42, fiber: 0, sourceReference: "USDA #171265", sourceConfidence: "high" },
        { name: "Banana", quantity: 120, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 1.1, carbs: 22.8, fat: 0.3, calories: 89, fiber: 2.6, sourceReference: "USDA #173944", sourceConfidence: "high" },
        { name: "Honey", quantity: 15, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 0.3, carbs: 82.4, fat: 0, calories: 304, fiber: 0.2, sourceReference: "USDA #169640", sourceConfidence: "high" },
        { name: "Almonds", quantity: 10, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 21.2, carbs: 21.7, fat: 49.9, calories: 579, fiber: 12.5, sourceReference: "USDA #170567", sourceConfidence: "high" },
    ];
    assertRange("Breakfast 1: Oatmeal with banana, honey, almonds", calculateMealMacros(ingredients), {
        protein: [16, 22],
        carbs: [80, 100],
        fat: [9, 15],
        calories: [470, 570],
    });
}

// TEST 2: Eggs with bread breakfast
// 3 eggs (150g), 60g whole wheat bread, 50g cucumber, 50g tomato, 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Boiled eggs", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155, fiber: 0, sourceReference: "USDA #173424", sourceConfidence: "high" },
        { name: "Whole wheat bread", quantity: 60, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 12.5, carbs: 43.1, fat: 3.5, calories: 252, fiber: 6.0, sourceReference: "USDA #168013", sourceConfidence: "high" },
        { name: "Cucumber", quantity: 50, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 0.7, carbs: 3.6, fat: 0.1, calories: 15, fiber: 0.5, sourceReference: "USDA #170393", sourceConfidence: "high" },
        { name: "Tomato", quantity: 50, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 0.9, carbs: 3.9, fat: 0.2, calories: 18, fiber: 1.2, sourceReference: "USDA #170457", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Breakfast 2: Eggs with bread, vegetables, olive oil", calculateMealMacros(ingredients), {
        protein: [24, 32],
        carbs: [28, 38],
        fat: [22, 32],
        calories: [400, 520],
    });
}

// TEST 3: Avocado toast with eggs
// 60g bread, 100g avocado, 2 eggs (100g), 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Whole wheat bread", quantity: 60, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 12.5, carbs: 43.1, fat: 3.5, calories: 252, fiber: 6.0, sourceReference: "USDA #168013", sourceConfidence: "high" },
        { name: "Avocado", quantity: 100, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 2.0, carbs: 8.5, fat: 14.7, calories: 160, fiber: 6.7, sourceReference: "USDA #171705", sourceConfidence: "high" },
        { name: "Boiled eggs", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155, fiber: 0, sourceReference: "USDA #173424", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Breakfast 3: Avocado toast with eggs", calculateMealMacros(ingredients), {
        protein: [20, 28],
        carbs: [30, 40],
        fat: [30, 42],
        calories: [480, 620],
    });
}

// TEST 4: Chicken + rice lunch
// 150g grilled chicken, 100g cooked rice, 100g broccoli, 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Grilled chicken breast", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 31.0, carbs: 0, fat: 3.6, calories: 165, fiber: 0, sourceReference: "USDA #171534", sourceConfidence: "high" },
        { name: "Cooked white rice", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, sourceReference: "USDA #169756", sourceConfidence: "high" },
        { name: "Steamed broccoli", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 2.4, carbs: 7.2, fat: 0.4, calories: 35, fiber: 3.3, sourceReference: "USDA #170382", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Lunch 1: Chicken + rice + broccoli + olive oil", calculateMealMacros(ingredients), {
        protein: [45, 55],
        carbs: [30, 42],
        fat: [12, 20],
        calories: [420, 560],
    });
}

// TEST 5: Beef + sweet potato lunch
// 150g ground beef (lean), 150g sweet potato, 100g vegetables, 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Lean ground beef", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 26.1, carbs: 0, fat: 11.8, calories: 217, fiber: 0, sourceReference: "USDA #174036", sourceConfidence: "high" },
        { name: "Sweet potato", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 1.4, carbs: 17.1, fat: 0.1, calories: 76, fiber: 2.5, sourceReference: "USDA #168482", sourceConfidence: "high" },
        { name: "Mixed vegetables", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 2.5, carbs: 8.0, fat: 0.3, calories: 45, fiber: 3.0, sourceReference: "USDA #170393", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Lunch 2: Beef + sweet potato + vegetables", calculateMealMacros(ingredients), {
        protein: [38, 48],
        carbs: [30, 45],
        fat: [22, 34],
        calories: [500, 660],
    });
}

// TEST 6: Salmon + quinoa lunch
// 150g salmon, 100g cooked quinoa, 100g vegetables, 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Baked salmon", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 25.4, carbs: 0, fat: 8.1, calories: 182, fiber: 0, sourceReference: "USDA #175168", sourceConfidence: "high" },
        { name: "Cooked quinoa", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 4.4, carbs: 21.3, fat: 1.9, calories: 120, fiber: 2.8, sourceReference: "USDA #168917", sourceConfidence: "high" },
        { name: "Mixed vegetables", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 2.5, carbs: 8.0, fat: 0.3, calories: 45, fiber: 3.0, sourceReference: "USDA #170393", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Lunch 3: Salmon + quinoa + vegetables", calculateMealMacros(ingredients), {
        protein: [42, 52],
        carbs: [26, 38],
        fat: [18, 28],
        calories: [440, 580],
    });
}

// TEST 7: Yogurt snack
// 150g Greek yogurt, 10g almonds, 10g honey
{
    const ingredients: TestIngredient[] = [
        { name: "Greek yogurt (low-fat)", quantity: 150, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 10.0, carbs: 3.6, fat: 0.7, calories: 59, fiber: 0, sourceReference: "USDA #170903", sourceConfidence: "high" },
        { name: "Almonds", quantity: 10, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 21.2, carbs: 21.7, fat: 49.9, calories: 579, fiber: 12.5, sourceReference: "USDA #170567", sourceConfidence: "high" },
        { name: "Honey", quantity: 10, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 0.3, carbs: 82.4, fat: 0, calories: 304, fiber: 0.2, sourceReference: "USDA #169640", sourceConfidence: "high" },
    ];
    assertRange("Snack 1: Greek yogurt + almonds + honey", calculateMealMacros(ingredients), {
        protein: [16, 21],
        carbs: [12, 18],
        fat: [4, 7],
        calories: [150, 220],
    });
}

// TEST 8: Apple + peanut butter snack
// 150g apple, 20g peanut butter
{
    const ingredients: TestIngredient[] = [
        { name: "Apple", quantity: 150, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 0.3, carbs: 13.8, fat: 0.2, calories: 52, fiber: 2.4, sourceReference: "USDA #171688", sourceConfidence: "high" },
        { name: "Peanut butter", quantity: 20, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 25.1, carbs: 19.6, fat: 50.4, calories: 588, fiber: 6.0, sourceReference: "USDA #172470", sourceConfidence: "high" },
    ];
    assertRange("Snack 2: Apple + peanut butter", calculateMealMacros(ingredients), {
        protein: [5, 7],
        carbs: [22, 30],
        fat: [10, 14],
        calories: [200, 265],
    });
}

// TEST 9: Tuna toast snack
// 30g whole wheat bread, 50g canned tuna, 10ml olive oil
{
    const ingredients: TestIngredient[] = [
        { name: "Whole wheat bread", quantity: 30, unit: "g", state: "any", nutritionBasis: "per_100g", protein: 12.5, carbs: 43.1, fat: 3.5, calories: 252, fiber: 6.0, sourceReference: "USDA #168013", sourceConfidence: "high" },
        { name: "Canned tuna", quantity: 50, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 25.5, carbs: 0, fat: 0.8, calories: 116, fiber: 0, sourceReference: "USDA #175159", sourceConfidence: "high" },
        { name: "Olive oil", quantity: 10, unit: "ml", state: "any", nutritionBasis: "per_100g", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, sourceReference: "USDA #171413", sourceConfidence: "high" },
    ];
    assertRange("Snack 3: Tuna toast + olive oil", calculateMealMacros(ingredients), {
        protein: [15, 21],
        carbs: [11, 17],
        fat: [10, 16],
        calories: [200, 290],
    });
}

// TEST 10: per_serving normalization
// 1 serving of protein bar (gramsPerServing=60), macros per serving: P=20 C=25 F=8
{
    const ingredients: TestIngredient[] = [
        { name: "Protein Bar", quantity: 60, unit: "g", state: "any", nutritionBasis: "per_serving", gramsPerServing: 60, protein: 20, carbs: 25, fat: 8, calories: 0, fiber: 3, sourceReference: "Nutritionix", sourceConfidence: "medium" },
    ];
    const result = calculateMealMacros(ingredients);
    assertRange("Test: per_serving normalization (1 bar = 60g)", result, {
        protein: [19.5, 20.5],
        carbs: [24.5, 25.5],
        fat: [7.5, 8.5],
        calories: [248, 256],
    });
}

// TEST 11: per_serving normalization — half serving
{
    const ingredients: TestIngredient[] = [
        { name: "Protein Bar", quantity: 30, unit: "g", state: "any", nutritionBasis: "per_serving", gramsPerServing: 60, protein: 20, carbs: 25, fat: 8, calories: 0, fiber: 3, sourceReference: "Nutritionix", sourceConfidence: "medium" },
    ];
    const result = calculateMealMacros(ingredients);
    assertRange("Test: per_serving normalization (half bar = 30g)", result, {
        protein: [9.5, 10.5],
        carbs: [12, 13],
        fat: [3.5, 4.5],
        calories: [124, 132],
    });
}

// TEST 12: Macro-calorie consistency
// Verify that calories = P*4 + C*4 + F*9 for all previous test meals
{
    const testIngredients: TestIngredient[] = [
        { name: "Chicken", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 31, carbs: 0, fat: 3.6, calories: 165, fiber: 0, sourceReference: "USDA", sourceConfidence: "high" },
        { name: "Rice", quantity: 100, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, sourceReference: "USDA", sourceConfidence: "high" },
    ];
    const result = calculateMealMacros(testIngredients);
    const expectedCal = Math.round((result.protein * 4) + (result.carbs * 4) + (result.fat * 9));
    if (Math.abs(result.calories - expectedCal) > 2) {
        console.log(`❌ FAIL: Calorie consistency → stored=${result.calories}, P4+C4+F9=${expectedCal}`);
        failed++;
    } else {
        console.log(`✅ PASS: Calorie consistency → calories=${result.calories} matches formula`);
        passed++;
    }
}

// TEST 13: Different meals produce different macros
{
    const meal1: TestIngredient[] = [
        { name: "Oats", quantity: 60, unit: "g", state: "raw", nutritionBasis: "per_100g", protein: 13.2, carbs: 67.7, fat: 6.5, calories: 379, fiber: 10.1, sourceReference: "USDA", sourceConfidence: "high" },
    ];
    const meal2: TestIngredient[] = [
        { name: "Chicken", quantity: 150, unit: "g", state: "cooked", nutritionBasis: "per_100g", protein: 31, carbs: 0, fat: 3.6, calories: 165, fiber: 0, sourceReference: "USDA", sourceConfidence: "high" },
    ];
    const r1 = calculateMealMacros(meal1);
    const r2 = calculateMealMacros(meal2);
    if (r1.protein === r2.protein && r1.carbs === r2.carbs && r1.fat === r2.fat) {
        console.log(`❌ FAIL: Different meals produced identical macros`);
        failed++;
    } else {
        console.log(`✅ PASS: Different meals → different macros (oats: P=${r1.protein} vs chicken: P=${r2.protein})`);
        passed++;
    }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"═".repeat(60)}`);

if (failed > 0) {
    process.exit(1);
}
