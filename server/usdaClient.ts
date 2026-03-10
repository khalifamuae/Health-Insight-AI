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

// ── Known ingredients with verified USDA per-100g data ────────────────────────
// Keys use "name:state" format for state-aware lookup. "name" alone = default.
// ALL VALUES ARE PER 100g. Sources: USDA SR Legacy.
const KNOWN_INGREDIENTS: Record<string, USDANutritionPer100g> = {
    // ── Grains & Cereals ──
    "oats:raw": { fdcId: 173904, description: "Oats, regular, dry", protein: 13.2, carbs: 67.7, fat: 6.5, calories: 379, fiber: 10.1, dataType: "SR Legacy" },
    "oats:cooked": { fdcId: 168449, description: "Oatmeal, cooked", protein: 2.4, carbs: 12.0, fat: 1.4, calories: 71, fiber: 1.7, dataType: "SR Legacy" },
    "oats": { fdcId: 173904, description: "Oats, regular, dry", protein: 13.2, carbs: 67.7, fat: 6.5, calories: 379, fiber: 10.1, dataType: "SR Legacy" },
    "rolled oats": { fdcId: 173904, description: "Oats, regular, dry", protein: 13.2, carbs: 67.7, fat: 6.5, calories: 379, fiber: 10.1, dataType: "SR Legacy" },

    "rice:raw": { fdcId: 169760, description: "Rice, white, raw", protein: 7.1, carbs: 80.0, fat: 0.7, calories: 365, fiber: 1.3, dataType: "SR Legacy" },
    "rice:cooked": { fdcId: 169756, description: "Rice, white, cooked", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, dataType: "SR Legacy" },
    "rice": { fdcId: 169756, description: "Rice, white, cooked", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, dataType: "SR Legacy" },
    "white rice:cooked": { fdcId: 169756, description: "Rice, white, cooked", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, dataType: "SR Legacy" },
    "white rice": { fdcId: 169756, description: "Rice, white, cooked", protein: 2.7, carbs: 28.2, fat: 0.3, calories: 130, fiber: 0.4, dataType: "SR Legacy" },
    "brown rice:raw": { fdcId: 169712, description: "Rice, brown, raw", protein: 7.5, carbs: 76.2, fat: 2.7, calories: 362, fiber: 3.4, dataType: "SR Legacy" },
    "brown rice:cooked": { fdcId: 169714, description: "Rice, brown, cooked", protein: 2.6, carbs: 23.5, fat: 0.9, calories: 112, fiber: 1.8, dataType: "SR Legacy" },
    "brown rice": { fdcId: 169714, description: "Rice, brown, cooked", protein: 2.6, carbs: 23.5, fat: 0.9, calories: 112, fiber: 1.8, dataType: "SR Legacy" },

    "quinoa:raw": { fdcId: 168874, description: "Quinoa, uncooked", protein: 14.1, carbs: 64.2, fat: 6.1, calories: 368, fiber: 7.0, dataType: "SR Legacy" },
    "quinoa:cooked": { fdcId: 168917, description: "Quinoa, cooked", protein: 4.4, carbs: 21.3, fat: 1.9, calories: 120, fiber: 2.8, dataType: "SR Legacy" },
    "quinoa": { fdcId: 168917, description: "Quinoa, cooked", protein: 4.4, carbs: 21.3, fat: 1.9, calories: 120, fiber: 2.8, dataType: "SR Legacy" },

    "pasta:raw": { fdcId: 168936, description: "Pasta, dry", protein: 13.0, carbs: 75.0, fat: 1.5, calories: 371, fiber: 3.2, dataType: "SR Legacy" },
    "pasta:cooked": { fdcId: 168938, description: "Pasta, cooked", protein: 5.8, carbs: 30.9, fat: 0.9, calories: 158, fiber: 1.8, dataType: "SR Legacy" },
    "pasta": { fdcId: 168938, description: "Pasta, cooked", protein: 5.8, carbs: 30.9, fat: 0.9, calories: 158, fiber: 1.8, dataType: "SR Legacy" },

    // ── Protein ──
    "chicken breast:raw": { fdcId: 171477, description: "Chicken breast, raw", protein: 23.1, carbs: 0, fat: 1.2, calories: 110, fiber: 0, dataType: "SR Legacy" },
    "chicken breast:cooked": { fdcId: 171534, description: "Chicken breast, cooked", protein: 31.0, carbs: 0, fat: 3.6, calories: 165, fiber: 0, dataType: "SR Legacy" },
    "chicken breast": { fdcId: 171534, description: "Chicken breast, cooked", protein: 31.0, carbs: 0, fat: 3.6, calories: 165, fiber: 0, dataType: "SR Legacy" },
    "grilled chicken breast": { fdcId: 171534, description: "Chicken breast, cooked", protein: 31.0, carbs: 0, fat: 3.6, calories: 165, fiber: 0, dataType: "SR Legacy" },
    "chicken": { fdcId: 171534, description: "Chicken breast, cooked", protein: 31.0, carbs: 0, fat: 3.6, calories: 165, fiber: 0, dataType: "SR Legacy" },

    "salmon:raw": { fdcId: 175167, description: "Salmon, Atlantic, raw", protein: 20.4, carbs: 0, fat: 13.4, calories: 208, fiber: 0, dataType: "SR Legacy" },
    "salmon:cooked": { fdcId: 175168, description: "Salmon, Atlantic, cooked", protein: 25.4, carbs: 0, fat: 8.1, calories: 182, fiber: 0, dataType: "SR Legacy" },
    "salmon": { fdcId: 175168, description: "Salmon, Atlantic, cooked", protein: 25.4, carbs: 0, fat: 8.1, calories: 182, fiber: 0, dataType: "SR Legacy" },

    "beef:raw": { fdcId: 174034, description: "Beef, ground, 90% lean, raw", protein: 20.0, carbs: 0, fat: 10.0, calories: 176, fiber: 0, dataType: "SR Legacy" },
    "beef:cooked": { fdcId: 174036, description: "Beef, ground, 90% lean, cooked", protein: 26.1, carbs: 0, fat: 11.8, calories: 217, fiber: 0, dataType: "SR Legacy" },
    "beef": { fdcId: 174036, description: "Beef, ground, 90% lean, cooked", protein: 26.1, carbs: 0, fat: 11.8, calories: 217, fiber: 0, dataType: "SR Legacy" },

    "tuna": { fdcId: 175159, description: "Tuna, light, canned in water", protein: 25.5, carbs: 0, fat: 0.8, calories: 116, fiber: 0, dataType: "SR Legacy" },
    "eggs": { fdcId: 173424, description: "Egg, whole, cooked", protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155, fiber: 0, dataType: "SR Legacy" },
    "egg": { fdcId: 173424, description: "Egg, whole, cooked", protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155, fiber: 0, dataType: "SR Legacy" },

    // ── Vegetables ──
    "broccoli:raw": { fdcId: 170379, description: "Broccoli, raw", protein: 2.8, carbs: 6.6, fat: 0.4, calories: 34, fiber: 2.6, dataType: "SR Legacy" },
    "broccoli:cooked": { fdcId: 170382, description: "Broccoli, cooked", protein: 2.4, carbs: 7.2, fat: 0.4, calories: 35, fiber: 3.3, dataType: "SR Legacy" },
    "broccoli": { fdcId: 170382, description: "Broccoli, cooked", protein: 2.4, carbs: 7.2, fat: 0.4, calories: 35, fiber: 3.3, dataType: "SR Legacy" },

    "spinach:raw": { fdcId: 170462, description: "Spinach, raw", protein: 2.9, carbs: 3.6, fat: 0.4, calories: 23, fiber: 2.2, dataType: "SR Legacy" },
    "spinach:cooked": { fdcId: 170464, description: "Spinach, cooked", protein: 2.5, carbs: 3.8, fat: 0.3, calories: 23, fiber: 2.4, dataType: "SR Legacy" },
    "spinach": { fdcId: 170462, description: "Spinach, raw", protein: 2.9, carbs: 3.6, fat: 0.4, calories: 23, fiber: 2.2, dataType: "SR Legacy" },

    "sweet potato:raw": { fdcId: 168481, description: "Sweet potato, raw", protein: 1.6, carbs: 20.1, fat: 0.1, calories: 86, fiber: 3.0, dataType: "SR Legacy" },
    "sweet potato:cooked": { fdcId: 168482, description: "Sweet potato, cooked", protein: 2.0, carbs: 20.7, fat: 0.1, calories: 90, fiber: 3.3, dataType: "SR Legacy" },
    "sweet potato": { fdcId: 168482, description: "Sweet potato, cooked", protein: 2.0, carbs: 20.7, fat: 0.1, calories: 90, fiber: 3.3, dataType: "SR Legacy" },

    "potato:raw": { fdcId: 170432, description: "Potatoes, raw", protein: 2.0, carbs: 17.5, fat: 0.1, calories: 77, fiber: 2.2, dataType: "SR Legacy" },
    "potato:cooked": { fdcId: 170434, description: "Potatoes, boiled, cooked", protein: 1.7, carbs: 20.0, fat: 0.1, calories: 87, fiber: 1.8, dataType: "SR Legacy" },
    "potato": { fdcId: 170434, description: "Potatoes, boiled, cooked", protein: 1.7, carbs: 20.0, fat: 0.1, calories: 87, fiber: 1.8, dataType: "SR Legacy" },

    "tomato": { fdcId: 170457, description: "Tomatoes, raw", protein: 0.9, carbs: 3.9, fat: 0.2, calories: 18, fiber: 1.2, dataType: "SR Legacy" },
    "cucumber": { fdcId: 170393, description: "Cucumber, raw", protein: 0.7, carbs: 3.6, fat: 0.1, calories: 15, fiber: 0.5, dataType: "SR Legacy" },
    "avocado": { fdcId: 171705, description: "Avocados, raw", protein: 2.0, carbs: 8.5, fat: 14.7, calories: 160, fiber: 6.7, dataType: "SR Legacy" },

    // ── Legumes ──
    "lentils:raw": { fdcId: 172419, description: "Lentils, raw", protein: 25.8, carbs: 60.1, fat: 1.1, calories: 352, fiber: 30.5, dataType: "SR Legacy" },
    "lentils:cooked": { fdcId: 172420, description: "Lentils, cooked", protein: 9.0, carbs: 20.1, fat: 0.4, calories: 116, fiber: 7.9, dataType: "SR Legacy" },
    "lentils": { fdcId: 172420, description: "Lentils, cooked", protein: 9.0, carbs: 20.1, fat: 0.4, calories: 116, fiber: 7.9, dataType: "SR Legacy" },

    "chickpeas:raw": { fdcId: 173755, description: "Chickpeas, dry", protein: 20.5, carbs: 63.0, fat: 6.0, calories: 378, fiber: 12.2, dataType: "SR Legacy" },
    "chickpeas:cooked": { fdcId: 173756, description: "Chickpeas, cooked", protein: 8.9, carbs: 27.4, fat: 2.6, calories: 164, fiber: 7.6, dataType: "SR Legacy" },
    "chickpeas": { fdcId: 173756, description: "Chickpeas, cooked", protein: 8.9, carbs: 27.4, fat: 2.6, calories: 164, fiber: 7.6, dataType: "SR Legacy" },

    // ── Dairy ──
    "milk": { fdcId: 171265, description: "Milk, lowfat, 1%", protein: 3.4, carbs: 5.0, fat: 1.0, calories: 42, fiber: 0, dataType: "SR Legacy" },
    "low fat milk": { fdcId: 171265, description: "Milk, lowfat, 1%", protein: 3.4, carbs: 5.0, fat: 1.0, calories: 42, fiber: 0, dataType: "SR Legacy" },
    "greek yogurt": { fdcId: 170903, description: "Yogurt, Greek, plain, lowfat", protein: 10.0, carbs: 3.6, fat: 0.7, calories: 59, fiber: 0, dataType: "SR Legacy" },
    "yogurt": { fdcId: 171284, description: "Yogurt, plain, low fat", protein: 5.3, carbs: 7.0, fat: 1.6, calories: 63, fiber: 0, dataType: "SR Legacy" },
    "cottage cheese": { fdcId: 172179, description: "Cheese, cottage, lowfat, 2%", protein: 11.8, carbs: 3.1, fat: 2.3, calories: 81, fiber: 0, dataType: "SR Legacy" },

    // ── Fruits ──
    "banana": { fdcId: 173944, description: "Bananas, raw", protein: 1.1, carbs: 22.8, fat: 0.3, calories: 89, fiber: 2.6, dataType: "SR Legacy" },
    "apple": { fdcId: 171688, description: "Apples, raw", protein: 0.3, carbs: 13.8, fat: 0.2, calories: 52, fiber: 2.4, dataType: "SR Legacy" },
    "dates": { fdcId: 171726, description: "Dates, medjool", protein: 1.8, carbs: 75.0, fat: 0.2, calories: 277, fiber: 6.7, dataType: "SR Legacy" },

    // ── Nuts & Seeds ──
    "almonds": { fdcId: 170567, description: "Almonds", protein: 21.2, carbs: 21.7, fat: 49.9, calories: 579, fiber: 12.5, dataType: "SR Legacy" },
    "walnuts": { fdcId: 170187, description: "Nuts, walnuts, English", protein: 15.2, carbs: 13.7, fat: 65.2, calories: 654, fiber: 6.7, dataType: "SR Legacy" },
    "peanut butter": { fdcId: 172470, description: "Peanut butter, smooth", protein: 25.1, carbs: 19.6, fat: 50.4, calories: 588, fiber: 6.0, dataType: "SR Legacy" },
    "chia seeds": { fdcId: 170554, description: "Seeds, chia seeds, dried", protein: 16.5, carbs: 42.1, fat: 30.7, calories: 486, fiber: 34.4, dataType: "SR Legacy" },

    // ── Oils & Sweeteners ──
    "olive oil": { fdcId: 171413, description: "Oil, olive", protein: 0, carbs: 0, fat: 100, calories: 884, fiber: 0, dataType: "SR Legacy" },
    "coconut oil": { fdcId: 171413, description: "Oil, coconut", protein: 0, carbs: 0, fat: 100, calories: 862, fiber: 0, dataType: "SR Legacy" },
    "honey": { fdcId: 169640, description: "Honey", protein: 0.3, carbs: 82.4, fat: 0, calories: 304, fiber: 0.2, dataType: "SR Legacy" },

    // ── Bread ──
    "whole wheat bread": { fdcId: 168013, description: "Bread, whole-wheat", protein: 12.5, carbs: 43.1, fat: 3.5, calories: 252, fiber: 6.0, dataType: "SR Legacy" },
    "bread": { fdcId: 168013, description: "Bread, whole-wheat", protein: 12.5, carbs: 43.1, fat: 3.5, calories: 252, fiber: 6.0, dataType: "SR Legacy" },
};

// ── USDA API search ───────────────────────────────────────────────────────────

/**
 * Search for a food in the USDA FoodData Central database.
 * First checks the hardcoded known-ingredient table, then local DB cache,
 * then finally the live API.
 */
export async function searchUSDA(ingredientName: string, state?: string): Promise<USDANutritionPer100g | null> {
    if (!USDA_API_KEY) {
        console.warn("[USDA] No API key configured — skipping lookup");
        return null;
    }

    const searchTerm = translateToEnglish(ingredientName).toLowerCase().trim();
    const normState = (state || "").toLowerCase().trim();

    // Step 1: Check hardcoded known ingredients (guaranteed accuracy)
    // Priority: "name:state" → "name" → partial match
    let knownResult: USDANutritionPer100g | null = null;

    // Try exact "name:state" match first (e.g., "rice:cooked")
    if (normState && normState !== "any") {
        const stateKey = `${searchTerm}:${normState}`;
        if (KNOWN_INGREDIENTS[stateKey]) {
            knownResult = KNOWN_INGREDIENTS[stateKey];
        } else {
            // Try partial: find a key that contains the search term AND has the right state
            const partialStateKey = Object.keys(KNOWN_INGREDIENTS).find(k =>
                k.endsWith(`:${normState}`) && (searchTerm.includes(k.split(':')[0]) || k.split(':')[0].includes(searchTerm))
            );
            if (partialStateKey) knownResult = KNOWN_INGREDIENTS[partialStateKey];
        }
    }

    // Fallback: try exact name key (no state)
    if (!knownResult && KNOWN_INGREDIENTS[searchTerm]) {
        knownResult = KNOWN_INGREDIENTS[searchTerm];
    }

    // Fallback: partial match on generic keys (no colon)
    if (!knownResult) {
        const genericKey = Object.keys(KNOWN_INGREDIENTS).find(k =>
            !k.includes(':') && (searchTerm.includes(k) || k.includes(searchTerm))
        );
        if (genericKey) knownResult = KNOWN_INGREDIENTS[genericKey];
    }

    if (knownResult) {
        console.log(`[USDA] Known ingredient: "${ingredientName}" (state:${normState || 'default'}) → "${knownResult.description}" (FDC #${knownResult.fdcId}) | P:${knownResult.protein} C:${knownResult.carbs} F:${knownResult.fat} Cal:${knownResult.calories}`);
        return knownResult;
    }

    // Step 2: Check local DB cache
    const cached = await checkCache(ingredientName);
    if (cached) {
        console.log(`[USDA] Cache hit: "${ingredientName}" → ${cached.description}`);
        return cached;
    }

    // Step 3: Live API search with state context
    let queryTerms = searchTerm;
    if (state && state !== "any") {
        queryTerms = `${searchTerm} ${state}`;
    }

    try {
        const url = `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(queryTerms)}&pageSize=5&dataType=SR%20Legacy,Foundation`;

        const response = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            console.warn(`[USDA] API returned ${response.status} for "${queryTerms}"`);
            return null;
        }

        const data: USDASearchResponse = await response.json();

        if (!data.foods || data.foods.length === 0) {
            console.warn(`[USDA] No results for "${queryTerms}"`);
            return null;
        }

        // Pick the best match: prefer results that contain the search term in the description
        let bestFood = data.foods[0];
        const searchWords = searchTerm.split(/\s+/);
        for (const food of data.foods) {
            const desc = food.description.toLowerCase();
            const matchScore = searchWords.filter(w => desc.includes(w)).length;
            const currentBestScore = searchWords.filter(w => bestFood.description.toLowerCase().includes(w)).length;
            if (matchScore > currentBestScore) {
                bestFood = food;
            }
        }

        const result: USDANutritionPer100g = {
            fdcId: bestFood.fdcId,
            description: bestFood.description,
            protein: Math.round(extractNutrient(bestFood.foodNutrients, NUTRIENT_IDS.PROTEIN) * 10) / 10,
            carbs: Math.round(extractNutrient(bestFood.foodNutrients, NUTRIENT_IDS.CARBS) * 10) / 10,
            fat: Math.round(extractNutrient(bestFood.foodNutrients, NUTRIENT_IDS.FAT) * 10) / 10,
            calories: Math.round(extractNutrient(bestFood.foodNutrients, NUTRIENT_IDS.ENERGY_KCAL)),
            fiber: Math.round(extractNutrient(bestFood.foodNutrients, NUTRIENT_IDS.FIBER) * 10) / 10,
            dataType: bestFood.dataType,
        };

        console.log(`[USDA] Found: "${queryTerms}" → "${bestFood.description}" (FDC #${bestFood.fdcId}) | P:${result.protein} C:${result.carbs} F:${result.fat} Cal:${result.calories}`);

        await saveToCache(searchTerm, result);
        return result;

    } catch (err: any) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            console.warn(`[USDA] Timeout searching for "${queryTerms}"`);
        } else {
            console.warn(`[USDA] Search error for "${queryTerms}":`, err.message || err);
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
            const usda = await searchUSDA(item.name, item.state || undefined);
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
