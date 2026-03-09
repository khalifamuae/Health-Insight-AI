import { db } from "./db";
import { nutritionIngredients } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DietPlanIngredient {
    name: string;
    quantity: number;
    unit: string;
    state: "raw" | "cooked" | "any";
    nutritionBasis: "per_100g" | "per_serving";
    gramsPerServing?: number;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    fiber?: number;
    sourceReference: string;
    sourceConfidence: "high" | "medium" | "low";
}

/** The raw ingredient data as received from the AI (per-100g or per-serving basis). */
export interface RawAIIngredient {
    name: string;
    quantity: number;
    unit?: string;
    state?: string;
    nutritionBasis?: string;
    gramsPerServing?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fats?: number;
    calories?: number;
    fiber?: number;
    sourceReference?: string;
    sourceConfidence?: string;
}

export interface ValidatedMeal {
    name: string;
    description: string;
    ingredients: DietPlanIngredient[];
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    fiber: number;
    benefits: string;
    preparationTip: string;
    validationStatus: "pass" | "suspicious" | "fail";
    validationNotes: string[];
}

// ─── Liquid density mappings (g/ml) ───────────────────────────────────────────
// Sources: USDA FoodData Central, engineering reference tables

const LIQUID_DENSITIES: Record<string, number> = {
    "olive oil": 0.92,
    "coconut oil": 0.92,
    "sesame oil": 0.92,
    "oil": 0.92,
    "زيت": 0.92,
    "milk": 1.03,
    "حليب": 1.03,
    "لبن": 1.03,
    "water": 1.0,
    "ماء": 1.0,
    "honey": 1.42,
    "عسل": 1.42,
    "yogurt": 1.03,
    "زبادي": 1.03,
    "vinegar": 1.01,
    "خل": 1.01,
    "lemon juice": 1.03,
    "عصير ليمون": 1.03,
    "soy sauce": 1.17,
    "صويا": 1.17,
    "cream": 0.99,
    "كريمة": 0.99,
};

// ─── Unit conversion ──────────────────────────────────────────────────────────

function estimateGrams(ingredientName: string, quantity: number, unit: string): number {
    const normUnit = unit.toLowerCase().trim();

    if (normUnit === "g" || normUnit === "gram" || normUnit === "grams" || normUnit === "جرام") {
        return quantity;
    }

    if (normUnit === "ml" || normUnit === "milliliter" || normUnit === "مل") {
        const normName = ingredientName.toLowerCase();
        for (const [key, density] of Object.entries(LIQUID_DENSITIES)) {
            if (normName.includes(key)) {
                return quantity * density;
            }
        }
        return quantity; // fallback 1:1 (density ≈ water)
    }

    // Unsupported unit — return quantity as-is (best effort)
    return quantity;
}

// ─── Core calculation engine ──────────────────────────────────────────────────

/**
 * Takes raw AI ingredient data, normalizes all values to per-100g,
 * then scales by actual quantity. Returns the validated meal with
 * deterministically calculated macros.
 */
export function recalculateMealMacros(
    rawMealName: string,
    rawBenefits: string,
    rawPrepTip: string,
    ingredients: RawAIIngredient[]
): ValidatedMeal {
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalFiber = 0;

    const notes: string[] = [];
    let isSuspicious = false;
    const validIngredients: DietPlanIngredient[] = [];

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        notes.push("Meal has zero ingredients.");
        isSuspicious = true;
    }

    for (const item of ingredients) {
        if (!item.name || !item.quantity) continue;

        const unit = item.unit || "g";
        const grams = estimateGrams(item.name, item.quantity, unit);
        const basis = item.nutritionBasis || "per_100g";

        // ── Step 1: Normalize all nutritional values to per-100g ──
        let proteinPer100g: number;
        let carbsPer100g: number;
        let fatPer100g: number;
        let fiberPer100g: number;

        const rawProtein = Number(item.protein) || 0;
        const rawCarbs = Number(item.carbs) || 0;
        const rawFat = Number(item.fat || item.fats) || 0;
        const rawFiber = Number(item.fiber) || 0;

        if (basis === "per_serving") {
            const servingGrams = item.gramsPerServing;
            if (!servingGrams || servingGrams <= 0) {
                notes.push(`Missing or invalid gramsPerServing for "${item.name}". Cannot normalize to per-100g.`);
                isSuspicious = true;
                // Skip this ingredient entirely — we cannot calculate safely
                continue;
            }
            // Convert: value_per_serving → value_per_100g
            proteinPer100g = (rawProtein / servingGrams) * 100;
            carbsPer100g = (rawCarbs / servingGrams) * 100;
            fatPer100g = (rawFat / servingGrams) * 100;
            fiberPer100g = (rawFiber / servingGrams) * 100;
        } else {
            // Already per_100g (or unknown — treat as per_100g)
            proteinPer100g = rawProtein;
            carbsPer100g = rawCarbs;
            fatPer100g = rawFat;
            fiberPer100g = rawFiber;
        }

        // ── Step 2: Scale by actual quantity ──
        // actual_macro = (macro_per_100g × quantity_in_grams) / 100
        const scaledProtein = (proteinPer100g * grams) / 100;
        const scaledCarbs = (carbsPer100g * grams) / 100;
        const scaledFat = (fatPer100g * grams) / 100;
        const scaledFiber = (fiberPer100g * grams) / 100;

        // ── Step 3: Calculate calories strictly from macros ──
        const scaledCalories = Math.round((scaledProtein * 4) + (scaledCarbs * 4) + (scaledFat * 9));

        totalProtein += scaledProtein;
        totalCarbs += scaledCarbs;
        totalFats += scaledFat;
        totalFiber += scaledFiber;

        validIngredients.push({
            name: item.name,
            quantity: item.quantity,
            unit: unit,
            state: (item.state as "raw" | "cooked" | "any") || "any",
            nutritionBasis: basis as "per_100g" | "per_serving",
            gramsPerServing: item.gramsPerServing,
            // Store the SCALED absolute values for display
            protein: scaledProtein,
            carbs: scaledCarbs,
            fat: scaledFat,
            calories: scaledCalories,
            fiber: scaledFiber,
            sourceReference: item.sourceReference || "Unknown",
            sourceConfidence: (item.sourceConfidence as "high" | "medium" | "low") || "low",
        });

        if (!item.sourceReference || item.sourceReference === "Unknown") {
            notes.push(`No source reference for: ${item.name}`);
        }
        if (item.sourceConfidence === "low" || !item.sourceConfidence) {
            notes.push(`Low confidence data for: ${item.name}`);
        }
    }

    // ── Final totals: always recalculate calories from macros ──
    const finalProtein = Math.round(totalProtein * 10) / 10;
    const finalCarbs = Math.round(totalCarbs * 10) / 10;
    const finalFats = Math.round(totalFats * 10) / 10;
    const finalFiber = Math.round(totalFiber * 10) / 10;
    const finalCalories = Math.round((finalProtein * 4) + (finalCarbs * 4) + (finalFats * 9));

    const description = validIngredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join("، ");

    return {
        name: rawMealName || "Meal",
        description,
        ingredients: validIngredients,
        protein: finalProtein,
        carbs: finalCarbs,
        fats: finalFats,
        calories: finalCalories,
        fiber: finalFiber,
        benefits: rawBenefits || "",
        preparationTip: rawPrepTip || "",
        validationStatus: isSuspicious ? "suspicious" : "pass",
        validationNotes: notes,
    };
}

// ─── Validation engine ────────────────────────────────────────────────────────

/**
 * Validates calculated macros against realistic human-meal boundaries
 * and keyword-based sanity checks.
 */
export function validateHealthyMealRanges(meal: ValidatedMeal): ValidatedMeal {
    const notes = [...meal.validationNotes];
    let status = meal.validationStatus;

    // ── Extreme bounds ──
    if (meal.calories > 1500) {
        notes.push(`Calories (${meal.calories}) exceed realistic single-meal maximum.`);
        status = "fail";
    }
    if (meal.calories > 0 && meal.calories < 30) {
        notes.push(`Calories (${meal.calories}) unrealistically low for a meal.`);
        status = "fail";
    }

    // ── Macro-specific checks ──
    if (meal.carbs > 150) {
        notes.push(`Carbs (${meal.carbs}g) excessively high — verify starch quantities.`);
        if (status !== "fail") status = "suspicious";
    }
    if (meal.protein > 80) {
        notes.push(`Protein (${meal.protein}g) very high for a single meal.`);
        if (status !== "fail") status = "suspicious";
    }
    if (meal.fats > 60) {
        notes.push(`Fat (${meal.fats}g) very high for a single meal.`);
        if (status !== "fail") status = "suspicious";
    }

    // ── Keyword-based sanity checks ──
    const desc = meal.description.toLowerCase();

    // Egg meals with inflated carbs
    if ((desc.includes("egg") || desc.includes("بيض")) &&
        !desc.includes("bread") && !desc.includes("خبز") &&
        !desc.includes("oat") && !desc.includes("شوفان") &&
        !desc.includes("honey") && !desc.includes("عسل") &&
        !desc.includes("rice") && !desc.includes("أرز") &&
        !desc.includes("potato") && !desc.includes("بطاطا")) {
        if (meal.carbs > 25) {
            notes.push(`Egg meal showing ${meal.carbs}g carbs without obvious starch source.`);
            if (status !== "fail") status = "suspicious";
        }
    }

    // Chicken + rice — protein sanity
    if ((desc.includes("chicken") || desc.includes("دجاج")) && meal.protein > 75) {
        notes.push(`Chicken meal with ${meal.protein}g protein — verify portion sizes.`);
        if (status !== "fail") status = "suspicious";
    }

    // Yogurt + nuts snack — calorie sanity
    if ((desc.includes("yogurt") || desc.includes("زبادي")) &&
        (desc.includes("almond") || desc.includes("لوز")) &&
        meal.calories > 350) {
        notes.push(`Yogurt-almond snack at ${meal.calories} kcal seems high.`);
        if (status !== "fail") status = "suspicious";
    }

    // ── Macro-calorie consistency check ──
    const recalcCal = Math.round((meal.protein * 4) + (meal.carbs * 4) + (meal.fats * 9));
    if (Math.abs(recalcCal - meal.calories) > 5) {
        notes.push(`Internal inconsistency: stored calories=${meal.calories}, P4+C4+F9=${recalcCal}`);
        if (status !== "fail") status = "suspicious";
    }

    meal.validationNotes = notes;
    meal.validationStatus = status;
    return meal;
}

// ─── Database persistence ─────────────────────────────────────────────────────

/**
 * Persists ingredient BASE nutrition data (per-100g values) to the database
 * for building a trusted reference cache. We store the ORIGINAL AI-provided
 * per-100g values, not the scaled absolute values.
 */
export async function saveValidatedIngredients(
    rawIngredients: RawAIIngredient[]
) {
    if (!rawIngredients || rawIngredients.length === 0) return;

    try {
        for (const item of rawIngredients) {
            if (!item.name || !item.quantity) continue;

            const basis = item.nutritionBasis || "per_100g";
            const rawProtein = Number(item.protein) || 0;
            const rawCarbs = Number(item.carbs) || 0;
            const rawFat = Number(item.fat || item.fats) || 0;
            const rawFiber = Number(item.fiber) || 0;
            const state = (item.state as "raw" | "cooked" | "any") || "any";

            // Normalize to per-100g if needed
            let proteinPer100g = rawProtein;
            let carbsPer100g = rawCarbs;
            let fatPer100g = rawFat;
            let fiberPer100g = rawFiber;

            if (basis === "per_serving" && item.gramsPerServing && item.gramsPerServing > 0) {
                proteinPer100g = (rawProtein / item.gramsPerServing) * 100;
                carbsPer100g = (rawCarbs / item.gramsPerServing) * 100;
                fatPer100g = (rawFat / item.gramsPerServing) * 100;
                fiberPer100g = (rawFiber / item.gramsPerServing) * 100;
            }

            const caloriesPer100g = Math.round((proteinPer100g * 4) + (carbsPer100g * 4) + (fatPer100g * 9));

            await db.insert(nutritionIngredients).values({
                nameEn: item.name,
                nameAr: item.name,
                state: state,
                basis: "per_100g", // Always store as per_100g after normalization
                gramsPerServing: item.gramsPerServing || null,
                protein: proteinPer100g,
                carbs: carbsPer100g,
                fat: fatPer100g,
                calories: caloriesPer100g,
                fiber: fiberPer100g,
                sourceName: item.sourceReference || "Unknown",
                confidence: (item.sourceConfidence as "high" | "medium" | "low") || "low",
            }).onConflictDoNothing();
        }
        console.log(`[Nutrition Cache] Cached ${rawIngredients.length} ingredients (per-100g base values).`);
    } catch (error) {
        console.error("[Nutrition Cache] Failed to persist ingredients:", error);
    }
}
