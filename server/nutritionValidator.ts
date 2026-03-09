import { db } from "./db";
import { nutritionIngredients } from "@shared/schema";

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

export interface ValidatedMeal {
    name: string;
    description: string; // The joined ingredient string
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

/**
 * Standard density mappings for volume-to-weight conversions (g/ml).
 */
const LIQUID_DENSITIES: Record<string, number> = {
    "olive oil": 0.92,
    "oil": 0.92,
    "milk": 1.03,
    "water": 1.0,
    "honey": 1.42,
    "yogurt": 1.06,
};

function estimateGrams(ingredientName: string, quantity: number, unit: string): number {
    const normUnit = unit.toLowerCase().trim();
    if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
        return quantity;
    }

    if (normUnit === "ml" || normUnit === "milliliter") {
        // Check density
        const normName = ingredientName.toLowerCase();
        for (const [key, density] of Object.entries(LIQUID_DENSITIES)) {
            if (normName.includes(key)) {
                return quantity * density;
            }
        }
        return quantity; // fallback 1:1
    }

    // Fallback for pieces/cups if AI outputs them (which it shouldn't, but safety first)
    return quantity;
}

export function recalculateMealMacros(
    rawMealName: string,
    rawBenefits: string,
    rawPrepTip: string,
    ingredients: any[]
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

        // Default to per_100g if missing
        const basis = item.nutritionBasis || "per_100g";

        let multiplier = 0;

        if (basis === "per_100g") {
            multiplier = grams / 100;
        } else if (basis === "per_serving") {
            const servingGrams = item.gramsPerServing || 1; // Fallback to 1 to avoid div by zero, though inaccurate
            multiplier = grams / servingGrams;
            if (!item.gramsPerServing) {
                notes.push(`Missing gramsPerServing for ${item.name}. Calculations may be wildly inaccurate.`);
                isSuspicious = true;
            }
        } else {
            multiplier = grams / 100; // fallback
        }

        const itemProtein = (Number(item.protein) || 0) * multiplier;
        const itemCarbs = (Number(item.carbs) || 0) * multiplier;
        const itemFats = (Number(item.fat || item.fats) || 0) * multiplier;
        const itemFiber = (Number(item.fiber) || 0) * multiplier;

        totalProtein += itemProtein;
        totalCarbs += itemCarbs;
        totalFats += itemFats;
        totalFiber += itemFiber;

        validIngredients.push({
            name: item.name,
            quantity: item.quantity,
            unit: unit,
            state: item.state || "any",
            nutritionBasis: basis,
            gramsPerServing: item.gramsPerServing,
            protein: itemProtein, // absolute scaled value
            carbs: itemCarbs,
            fat: itemFats,
            calories: Math.round((itemProtein * 4) + (itemCarbs * 4) + (itemFats * 9)),
            fiber: itemFiber,
            sourceReference: item.sourceReference || "Unknown",
            sourceConfidence: item.sourceConfidence || "low",
        });

        if (item.sourceConfidence === "low" || !item.sourceReference) {
            notes.push(`Low confidence ingredient data for: ${item.name}`);
        }
    }

    // Recalculate final calorie strict formula
    const finalProtein = Math.round(totalProtein);
    const finalCarbs = Math.round(totalCarbs);
    const finalFats = Math.round(totalFats);
    const finalCalories = Math.round((finalProtein * 4) + (finalCarbs * 4) + (finalFats * 9));

    // Build the description mechanically
    const description = validIngredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join("، ");

    return {
        name: rawMealName || "Meal",
        description,
        ingredients: validIngredients,
        protein: finalProtein,
        carbs: finalCarbs,
        fats: finalFats,
        calories: finalCalories,
        fiber: Math.round(totalFiber),
        benefits: rawBenefits || "",
        preparationTip: rawPrepTip || "",
        validationStatus: isSuspicious ? "suspicious" : "pass",
        validationNotes: notes,
    };
}

/**
 * Validates whether the calculated macros map roughly to standard healthy patterns.
 * e.g., huge carbs for no obvious starch, or extremely high fat for low-oil meals.
 */
export function validateHealthyMealRanges(meal: ValidatedMeal): ValidatedMeal {
    const notes = [...meal.validationNotes];
    let status = meal.validationStatus;

    // Sanity check extreme bounds
    if (meal.calories > 1500 || meal.calories < 50) {
        notes.push(`Calories (${meal.calories}) fall outside realistic human single meal bounds.`);
        status = "fail";
    }

    if (meal.carbs > 200) {
        notes.push(`Carbs (${meal.carbs}g) are excessively high, check starch quantities.`);
        status = "suspicious";
    }

    if (meal.protein > 100) {
        notes.push(`Protein (${meal.protein}g) is wildly high for a single meal.`);
        status = "suspicious";
    }

    // Keyword-based sanity checks 
    const desc = meal.description.toLowerCase();

    // E.g., if egg-based but massive carbs (and no bread/oats/honey)
    if (desc.includes("egg") || desc.includes("بيض")) {
        const hasHighCarbLoad = desc.includes("bread") || desc.includes("oat") || desc.includes("خبز") || desc.includes("شوفان") || desc.includes("honey") || desc.includes("عسل");
        if (!hasHighCarbLoad && meal.carbs > 40) {
            notes.push("High carbs detected in egg meal without apparent starch source.");
            status = "suspicious";
        }
    }

    meal.validationNotes = notes;
    meal.validationStatus = status;

    return meal;
}

/**
 * Persists verified ingredients to the database to build a cache of trusted nutrition data.
 */
export async function saveValidatedIngredients(ingredients: DietPlanIngredient[]) {
    if (!ingredients || ingredients.length === 0) return;

    try {
        const toInsert = ingredients.map(i => ({
            nameEn: i.name,
            nameAr: i.name, // Keep both until we add a strict translator hook
            state: i.state,
            basis: i.nutritionBasis,
            gramsPerServing: i.gramsPerServing || null,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
            calories: i.calories,
            fiber: i.fiber || 0,
            sourceName: i.sourceReference || "Unknown Context API",
            confidence: i.sourceConfidence,
        }));

        // Perform an insert that skips purely identical names to prevent infinite bloat
        for (const item of toInsert) {
            await db.insert(nutritionIngredients).values(item).onConflictDoNothing();
        }

        console.log(`[Nutrition Cache] Successfully cached ${toInsert.length} validated ingredients.`);
    } catch (error) {
        console.error("[Nutrition Cache] Failed to persist valid ingredients:", error);
    }
}
