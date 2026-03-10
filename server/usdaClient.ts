/**
 * USDA FoodData Central API Client
 * 
 * Provides real-time ingredient nutrition lookup from the USDA database.
 * Used to verify and replace AI-generated nutrition values with authoritative data.
 * 
 * API docs: https://fdc.nal.usda.gov/api-guide.html
 */

import { db } from "./db";
import { nutritionIngredients } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";

const USDA_API_KEY = process.env.USDA_API_KEY || "";
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// ── USDA Nutrient IDs ─────────────────────────────────────────────────────────
// These are the standard nutrient numbers used across all USDA datasets
const NUTRIENT_IDS = {
    PROTEIN: 1003,
    FAT: 1004,
    CARBS: 1005,
    ENERGY_KCAL: 1008,
    FIBER: 1079,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface USDANutritionPer100g {
    fdcId: number;
    description: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    fiber: number;
    dataType: string;
}

interface USDAFoodNutrient {
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
}

interface USDASearchFood {
    fdcId: number;
    description: string;
    dataType: string;
    foodNutrients: USDAFoodNutrient[];
}

interface USDASearchResponse {
    foods: USDASearchFood[];
    totalHits: number;
}

// ── Common English translations for Arabic ingredient names ───────────────────
// Allows the system to search USDA using English terms when AI outputs Arabic names
const ARABIC_TO_ENGLISH: Record<string, string> = {
    "شوفان": "oats",
    "أرز": "rice",
    "أرز بني": "brown rice",
    "أرز أبيض": "white rice",
    "صدر دجاج": "chicken breast",
    "دجاج": "chicken",
    "لحم بقر": "beef",
    "لحم": "meat",
    "سلمون": "salmon",
    "تونة": "tuna",
    "بيض": "eggs",
    "بيضة": "egg",
    "حليب": "milk",
    "حليب قليل الدسم": "low fat milk",
    "زبادي": "yogurt",
    "زبادي يوناني": "greek yogurt",
    "لوز": "almonds",
    "جوز": "walnuts",
    "فول سوداني": "peanuts",
    "زبدة فول سوداني": "peanut butter",
    "موز": "banana",
    "تفاح": "apple",
    "أفوكادو": "avocado",
    "بروكلي": "broccoli",
    "سبانخ": "spinach",
    "طماطم": "tomato",
    "خيار": "cucumber",
    "بطاطا حلوة": "sweet potato",
    "بطاطا": "potato",
    "خبز": "bread",
    "خبز أسمر": "whole wheat bread",
    "عسل": "honey",
    "زيت زيتون": "olive oil",
    "زيت جوز الهند": "coconut oil",
    "كينوا": "quinoa",
    "عدس": "lentils",
    "حمص": "chickpeas",
    "فاصوليا": "beans",
    "تمر": "dates",
    "جبن": "cheese",
    "جبن قريش": "cottage cheese",
    "شيا": "chia seeds",
    "بذور الكتان": "flax seeds",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractNutrient(nutrients: USDAFoodNutrient[], nutrientId: number): number {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient ? Number(nutrient.value) || 0 : 0;
}

/**
 * Translate Arabic ingredient name to English for USDA search.
 * Returns the original name if no translation found.
 */
function translateToEnglish(name: string): string {
    const trimmed = name.trim();
    // Direct match
    if (ARABIC_TO_ENGLISH[trimmed]) return ARABIC_TO_ENGLISH[trimmed];
    // Partial match — check if any Arabic key is contained in the name
    for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH)) {
        if (trimmed.includes(ar)) return en;
    }
    return trimmed;
}

// ── Database cache layer ──────────────────────────────────────────────────────

/**
 * Check if we already have this ingredient cached in our nutrition_ingredients table.
 * Returns the cached per-100g data if found, null otherwise.
 */
async function checkCache(ingredientName: string): Promise<USDANutritionPer100g | null> {
    try {
        const englishName = translateToEnglish(ingredientName);

        const results = await db
            .select()
            .from(nutritionIngredients)
            .where(
                and(
                    ilike(nutritionIngredients.nameEn, `%${englishName}%`),
                    ilike(nutritionIngredients.sourceName, "%USDA%")
                )
            )
            .limit(1);

        if (results.length > 0) {
            const cached = results[0];
            return {
                fdcId: 0, // cached, no FDC ID stored
                description: cached.nameEn,
                protein: Number(cached.protein) || 0,
                carbs: Number(cached.carbs) || 0,
                fat: Number(cached.fat) || 0,
                calories: Number(cached.calories) || 0,
                fiber: Number(cached.fiber) || 0,
                dataType: "Cached",
            };
        }
        return null;
    } catch (err) {
        console.warn("[USDA Cache] Cache lookup failed:", err);
        return null;
    }
}

/**
 * Save a verified USDA result to the database cache for future use.
 */
async function saveToCache(englishName: string, data: USDANutritionPer100g): Promise<void> {
    try {
        await db.insert(nutritionIngredients).values({
            nameEn: englishName,
            nameAr: englishName, // TODO: reverse-translate
            state: "any",
            basis: "per_100g",
            gramsPerServing: null,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            calories: data.calories,
            fiber: data.fiber,
            sourceName: `USDA FoodData Central (FDC #${data.fdcId})`,
            confidence: "high",
        }).onConflictDoNothing();
    } catch (err) {
        console.warn("[USDA Cache] Failed to save:", err);
    }
}

// ── USDA API search ───────────────────────────────────────────────────────────

/**
 * Search for a food in the USDA FoodData Central database.
 * Prefers "SR Legacy" and "Foundation" data types for highest quality per-100g data.
 * Returns the per-100g nutrition values of the best match.
 */
export async function searchUSDA(ingredientName: string): Promise<USDANutritionPer100g | null> {
    if (!USDA_API_KEY) {
        console.warn("[USDA] No API key configured — skipping lookup");
        return null;
    }

    // Step 1: Check local cache first
    const cached = await checkCache(ingredientName);
    if (cached) {
        console.log(`[USDA] Cache hit: "${ingredientName}" → ${cached.description}`);
        return cached;
    }

    // Step 2: Translate Arabic names to English for USDA search
    const searchTerm = translateToEnglish(ingredientName);

    try {
        // Prefer SR Legacy (standard reference) for highest quality per-100g data
        const url = `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchTerm)}&pageSize=3&dataType=SR%20Legacy,Foundation`;

        const response = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (!response.ok) {
            console.warn(`[USDA] API returned ${response.status} for "${searchTerm}"`);
            return null;
        }

        const data: USDASearchResponse = await response.json();

        if (!data.foods || data.foods.length === 0) {
            console.warn(`[USDA] No results for "${searchTerm}"`);
            return null;
        }

        // Pick the first (best) match
        const food = data.foods[0];
        const result: USDANutritionPer100g = {
            fdcId: food.fdcId,
            description: food.description,
            protein: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN) * 10) / 10,
            carbs: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS) * 10) / 10,
            fat: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT) * 10) / 10,
            calories: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY_KCAL)),
            fiber: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER) * 10) / 10,
            dataType: food.dataType,
        };

        console.log(`[USDA] Found: "${searchTerm}" → "${food.description}" (FDC #${food.fdcId}) | P:${result.protein} C:${result.carbs} F:${result.fat} Cal:${result.calories}`);

        // Save to cache for next time
        await saveToCache(searchTerm, result);

        return result;

    } catch (err: any) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            console.warn(`[USDA] Timeout searching for "${searchTerm}"`);
        } else {
            console.warn(`[USDA] Search error for "${searchTerm}":`, err.message || err);
        }
        return null;
    }
}

// ── Batch verify ──────────────────────────────────────────────────────────────

export interface VerifiedIngredient {
    originalName: string;
    usdaMatch: string | null;
    fdcId: number | null;
    /** Original AI values */
    aiProtein: number;
    aiCarbs: number;
    aiFat: number;
    /** Verified USDA values (per 100g) */
    usdaProtein: number | null;
    usdaCarbs: number | null;
    usdaFat: number | null;
    usdaCalories: number | null;
    /** Whether the AI values deviate significantly (>15%) from USDA */
    deviationDetected: boolean;
    /** Which values were corrected */
    corrected: boolean;
}

/**
 * Verify a batch of AI-generated ingredients against USDA data.
 * For each ingredient, looks up USDA values and replaces AI values if deviation > 15%.
 * 
 * IMPORTANT: This mutates the ingredient objects in-place to replace values.
 * This runs asynchronously and should not block the user response.
 */
export async function verifyAndCorrectIngredients(
    ingredients: any[]
): Promise<VerifiedIngredient[]> {
    if (!USDA_API_KEY || !ingredients || ingredients.length === 0) {
        return [];
    }

    const results: VerifiedIngredient[] = [];

    for (const item of ingredients) {
        if (!item.name) continue;

        const verified: VerifiedIngredient = {
            originalName: item.name,
            usdaMatch: null,
            fdcId: null,
            aiProtein: Number(item.protein) || 0,
            aiCarbs: Number(item.carbs) || 0,
            aiFat: Number(item.fat || item.fats) || 0,
            usdaProtein: null,
            usdaCarbs: null,
            usdaFat: null,
            usdaCalories: null,
            deviationDetected: false,
            corrected: false,
        };

        try {
            const usda = await searchUSDA(item.name);
            if (!usda) {
                results.push(verified);
                continue;
            }

            verified.usdaMatch = usda.description;
            verified.fdcId = usda.fdcId;
            verified.usdaProtein = usda.protein;
            verified.usdaCarbs = usda.carbs;
            verified.usdaFat = usda.fat;
            verified.usdaCalories = usda.calories;

            // Check for significant deviation (>15% on any major macro)
            const checkDeviation = (aiVal: number, usdaVal: number): boolean => {
                if (usdaVal === 0 && aiVal === 0) return false;
                if (usdaVal === 0) return aiVal > 1; // AI says non-zero, USDA says zero
                return Math.abs(aiVal - usdaVal) / usdaVal > 0.15;
            };

            const proteinDev = checkDeviation(verified.aiProtein, usda.protein);
            const carbsDev = checkDeviation(verified.aiCarbs, usda.carbs);
            const fatDev = checkDeviation(verified.aiFat, usda.fat);

            verified.deviationDetected = proteinDev || carbsDev || fatDev;

            if (verified.deviationDetected) {
                console.warn(`[USDA Correction] "${item.name}": AI values (P:${verified.aiProtein} C:${verified.aiCarbs} F:${verified.aiFat}) deviate from USDA (P:${usda.protein} C:${usda.carbs} F:${usda.fat}) — replacing with USDA values`);

                // Replace AI values with USDA values (these are per-100g, same basis)
                item.protein = usda.protein;
                item.carbs = usda.carbs;
                item.fat = usda.fat;
                item.fiber = usda.fiber;
                item.sourceReference = `USDA FoodData Central (FDC #${usda.fdcId})`;
                item.sourceConfidence = "high";
                verified.corrected = true;
            } else {
                // AI values are close enough — just upgrade the source reference
                item.sourceReference = `USDA Verified (FDC #${usda.fdcId})`;
                item.sourceConfidence = "high";
            }
        } catch (err) {
            console.warn(`[USDA] Failed to verify "${item.name}":`, err);
        }

        results.push(verified);
    }

    // Log summary
    const corrected = results.filter(r => r.corrected).length;
    const verified = results.filter(r => r.usdaMatch !== null).length;
    console.log(`[USDA] Verification complete: ${verified}/${results.length} verified, ${corrected} corrected`);

    return results;
}
