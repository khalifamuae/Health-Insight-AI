/**
 * Food Search API Routes
 * 
 * Provides food search functionality using:
 * 1. Local KNOWN_INGREDIENTS cache (instant)
 * 2. USDA FoodData Central API (with auto-caching for future speed)
 */

import type { Express, Response } from "express";
import { isAuthenticated } from "./replit_integrations/auth";

const USDA_API_KEY = process.env.USDA_API_KEY || "";
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// ── Arabic ↔ English translation map ──────────────────────────────────────────
const ARABIC_TO_ENGLISH: Record<string, string> = {
    "شوفان": "oats", "أرز": "rice", "أرز بني": "brown rice", "أرز أبيض": "white rice",
    "صدر دجاج": "chicken breast", "دجاج": "chicken", "لحم بقر": "beef", "لحم": "meat",
    "سلمون": "salmon", "تونة": "tuna", "بيض": "eggs", "بيضة": "egg",
    "حليب": "milk", "حليب قليل الدسم": "low fat milk", "زبادي": "yogurt",
    "زبادي يوناني": "greek yogurt", "لوز": "almonds", "جوز": "walnuts",
    "فول سوداني": "peanuts", "زبدة فول سوداني": "peanut butter",
    "موز": "banana", "تفاح": "apple", "أفوكادو": "avocado",
    "بروكلي": "broccoli", "سبانخ": "spinach", "طماطم": "tomato",
    "خيار": "cucumber", "بطاطا حلوة": "sweet potato", "بطاطا": "potato",
    "خبز": "bread", "خبز أسمر": "whole wheat bread", "عسل": "honey",
    "زيت زيتون": "olive oil", "زيت جوز الهند": "coconut oil",
    "كينوا": "quinoa", "عدس": "lentils", "حمص": "chickpeas",
    "فاصوليا": "beans", "تمر": "dates", "جبن": "cheese",
    "جبن قريش": "cottage cheese", "شيا": "chia seeds", "بذور الكتان": "flax seeds",
    "ربيان": "shrimp", "سمك": "fish", "تونا": "tuna", "روبيان": "shrimp",
    "برتقال": "orange", "عنب": "grapes", "فراولة": "strawberry",
    "توت": "berries", "مانجو": "mango", "أناناس": "pineapple",
    "جزر": "carrot", "فلفل": "pepper", "بصل": "onion", "ثوم": "garlic",
    "كرفس": "celery", "خس": "lettuce", "ملفوف": "cabbage",
    "زبدة": "butter", "كريمة": "cream", "جبنة": "cheese",
    "ديك رومي": "turkey", "لحم غنم": "lamb", "كبدة": "liver",
    "فشار": "popcorn", "شوكولاتة": "chocolate", "كعك": "cake",
    "معكرونة": "pasta", "نودلز": "noodles",
};

const ENGLISH_TO_ARABIC: Record<string, string> = {};
for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH)) {
    if (!ENGLISH_TO_ARABIC[en]) ENGLISH_TO_ARABIC[en] = ar;
}

// ── Local food database (per 100g values) ─────────────────────────────────────
interface FoodItem {
    id: string;
    nameEn: string;
    nameAr: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    servingUnits: { unit: string; grams: number; labelEn: string; labelAr: string }[];
}

const LOCAL_FOODS: FoodItem[] = [
    // ── Grains ──
    { id: "rice", nameEn: "White Rice (cooked)", nameAr: "أرز أبيض (مطبوخ)", calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 186, labelEn: "cup", labelAr: "كوب" }] },
    { id: "brown-rice", nameEn: "Brown Rice (cooked)", nameAr: "أرز بني (مطبوخ)", calories: 112, protein: 2.6, carbs: 23.5, fat: 0.9, fiber: 1.8, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 195, labelEn: "cup", labelAr: "كوب" }] },
    { id: "oats", nameEn: "Oats (dry)", nameAr: "شوفان (جاف)", calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 81, labelEn: "cup", labelAr: "كوب" }, { unit: "tbsp", grams: 5, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },
    { id: "quinoa", nameEn: "Quinoa (cooked)", nameAr: "كينوا (مطبوخة)", calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 185, labelEn: "cup", labelAr: "كوب" }] },
    { id: "pasta", nameEn: "Pasta (cooked)", nameAr: "معكرونة (مطبوخة)", calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 140, labelEn: "cup", labelAr: "كوب" }] },
    { id: "bread", nameEn: "Whole Wheat Bread", nameAr: "خبز أسمر", calories: 252, protein: 12.5, carbs: 43.1, fat: 3.5, fiber: 6.0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "slice", grams: 28, labelEn: "slice", labelAr: "شريحة" }] },
    { id: "sweet-potato", nameEn: "Sweet Potato (cooked)", nameAr: "بطاطا حلوة (مطبوخة)", calories: 90, protein: 2.0, carbs: 20.7, fat: 0.1, fiber: 3.3, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },
    { id: "potato", nameEn: "Potato (boiled)", nameAr: "بطاطا (مسلوقة)", calories: 87, protein: 1.7, carbs: 20.0, fat: 0.1, fiber: 1.8, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },

    // ── Protein ──
    { id: "chicken-breast", nameEn: "Chicken Breast (cooked)", nameAr: "صدر دجاج (مطبوخ)", calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 174, labelEn: "piece", labelAr: "قطعة" }] },
    { id: "chicken-thigh", nameEn: "Chicken Thigh (cooked)", nameAr: "فخذ دجاج (مطبوخ)", calories: 209, protein: 26.0, carbs: 0, fat: 10.9, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },
    { id: "beef", nameEn: "Beef, Ground 90% Lean (cooked)", nameAr: "لحم بقر مفروم (مطبوخ)", calories: 217, protein: 26.1, carbs: 0, fat: 11.8, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },
    { id: "salmon", nameEn: "Salmon (cooked)", nameAr: "سلمون (مطبوخ)", calories: 182, protein: 25.4, carbs: 0, fat: 8.1, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "fillet", grams: 170, labelEn: "fillet", labelAr: "فيليه" }] },
    { id: "tuna", nameEn: "Tuna (canned in water)", nameAr: "تونة (معلبة بالماء)", calories: 116, protein: 25.5, carbs: 0, fat: 0.8, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "can", grams: 165, labelEn: "can", labelAr: "علبة" }] },
    { id: "eggs", nameEn: "Egg (whole, cooked)", nameAr: "بيضة (مسلوقة)", calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "egg", grams: 50, labelEn: "egg", labelAr: "بيضة" }] },
    { id: "shrimp", nameEn: "Shrimp (cooked)", nameAr: "ربيان (مطبوخ)", calories: 99, protein: 24.0, carbs: 0.2, fat: 0.3, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },
    { id: "turkey", nameEn: "Turkey Breast (cooked)", nameAr: "ديك رومي (مطبوخ)", calories: 135, protein: 30.0, carbs: 0, fat: 1.0, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },
    { id: "lamb", nameEn: "Lamb (cooked)", nameAr: "لحم غنم (مطبوخ)", calories: 282, protein: 25.5, carbs: 0, fat: 19.4, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }] },

    // ── Dairy ──
    { id: "greek-yogurt", nameEn: "Greek Yogurt (low fat)", nameAr: "زبادي يوناني (قليل الدسم)", calories: 59, protein: 10.0, carbs: 3.6, fat: 0.7, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 245, labelEn: "cup", labelAr: "كوب" }] },
    { id: "milk", nameEn: "Milk (low fat 1%)", nameAr: "حليب (قليل الدسم)", calories: 42, protein: 3.4, carbs: 5.0, fat: 1.0, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 244, labelEn: "cup", labelAr: "كوب" }] },
    { id: "cottage-cheese", nameEn: "Cottage Cheese (low fat)", nameAr: "جبن قريش", calories: 81, protein: 11.8, carbs: 3.1, fat: 2.3, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 226, labelEn: "cup", labelAr: "كوب" }] },

    // ── Fruits ──
    { id: "banana", nameEn: "Banana", nameAr: "موز", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 118, labelEn: "piece", labelAr: "حبة" }] },
    { id: "apple", nameEn: "Apple", nameAr: "تفاح", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 182, labelEn: "piece", labelAr: "حبة" }] },
    { id: "dates", nameEn: "Dates (Medjool)", nameAr: "تمر", calories: 277, protein: 1.8, carbs: 75.0, fat: 0.2, fiber: 6.7, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 24, labelEn: "piece", labelAr: "حبة" }] },
    { id: "orange", nameEn: "Orange", nameAr: "برتقال", calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 131, labelEn: "piece", labelAr: "حبة" }] },
    { id: "strawberry", nameEn: "Strawberry", nameAr: "فراولة", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 152, labelEn: "cup", labelAr: "كوب" }] },
    { id: "mango", nameEn: "Mango", nameAr: "مانجو", calories: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 165, labelEn: "cup", labelAr: "كوب" }] },
    { id: "grapes", nameEn: "Grapes", nameAr: "عنب", calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 151, labelEn: "cup", labelAr: "كوب" }] },
    { id: "avocado", nameEn: "Avocado", nameAr: "أفوكادو", calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "half", grams: 68, labelEn: "half", labelAr: "نصف" }] },

    // ── Vegetables ──
    { id: "broccoli", nameEn: "Broccoli (cooked)", nameAr: "بروكلي (مطبوخ)", calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 3.3, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 156, labelEn: "cup", labelAr: "كوب" }] },
    { id: "spinach", nameEn: "Spinach (raw)", nameAr: "سبانخ", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 30, labelEn: "cup", labelAr: "كوب" }] },
    { id: "tomato", nameEn: "Tomato", nameAr: "طماطم", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 123, labelEn: "piece", labelAr: "حبة" }] },
    { id: "cucumber", nameEn: "Cucumber", nameAr: "خيار", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 201, labelEn: "piece", labelAr: "حبة" }] },
    { id: "carrot", nameEn: "Carrot", nameAr: "جزر", calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "piece", grams: 61, labelEn: "piece", labelAr: "حبة" }] },
    { id: "lettuce", nameEn: "Lettuce", nameAr: "خس", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 36, labelEn: "cup", labelAr: "كوب" }] },

    // ── Legumes ──
    { id: "lentils", nameEn: "Lentils (cooked)", nameAr: "عدس (مطبوخ)", calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 198, labelEn: "cup", labelAr: "كوب" }] },
    { id: "chickpeas", nameEn: "Chickpeas (cooked)", nameAr: "حمص (مطبوخ)", calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 164, labelEn: "cup", labelAr: "كوب" }] },
    { id: "beans", nameEn: "Beans (cooked)", nameAr: "فاصوليا (مطبوخة)", calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 7.4, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "cup", grams: 177, labelEn: "cup", labelAr: "كوب" }] },

    // ── Nuts & Seeds ──
    { id: "almonds", nameEn: "Almonds", nameAr: "لوز", calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9, fiber: 12.5, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "handful", grams: 28, labelEn: "handful", labelAr: "حفنة" }] },
    { id: "walnuts", nameEn: "Walnuts", nameAr: "جوز", calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "handful", grams: 28, labelEn: "handful", labelAr: "حفنة" }] },
    { id: "peanut-butter", nameEn: "Peanut Butter", nameAr: "زبدة فول سوداني", calories: 588, protein: 25.1, carbs: 19.6, fat: 50.4, fiber: 6.0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 16, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },
    { id: "chia-seeds", nameEn: "Chia Seeds", nameAr: "بذور شيا", calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 12, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },

    // ── Oils & Fats ──
    { id: "olive-oil", nameEn: "Olive Oil", nameAr: "زيت زيتون", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 14, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }, { unit: "tsp", grams: 5, labelEn: "tsp", labelAr: "ملعقة صغيرة" }] },
    { id: "coconut-oil", nameEn: "Coconut Oil", nameAr: "زيت جوز الهند", calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 14, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },
    { id: "butter", nameEn: "Butter", nameAr: "زبدة", calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 14, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },

    // ── Sweeteners ──
    { id: "honey", nameEn: "Honey", nameAr: "عسل", calories: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, servingUnits: [{ unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" }, { unit: "tbsp", grams: 21, labelEn: "tbsp", labelAr: "ملعقة كبيرة" }] },
];

// ── Dynamic cache for USDA search results ─────────────────────────────────────
const dynamicFoodsCache: FoodItem[] = [];

function translateToEnglish(name: string): string {
    const trimmed = name.trim();
    if (ARABIC_TO_ENGLISH[trimmed]) return ARABIC_TO_ENGLISH[trimmed];
    for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH)) {
        if (trimmed.includes(ar)) return en;
    }
    return trimmed;
}

function searchLocalFoods(query: string): FoodItem[] {
    const q = query.toLowerCase().trim();
    const translatedQ = translateToEnglish(q).toLowerCase();

    const allFoods = [...LOCAL_FOODS, ...dynamicFoodsCache];

    return allFoods.filter(food => {
        const nameEnLower = food.nameEn.toLowerCase();
        const nameArLower = food.nameAr.toLowerCase();
        return nameEnLower.includes(q) || nameEnLower.includes(translatedQ) ||
            nameArLower.includes(q) || food.id.includes(q);
    }).slice(0, 20);
}

async function searchUSDAApi(query: string): Promise<FoodItem[]> {
    if (!USDA_API_KEY) return [];

    const englishQuery = translateToEnglish(query);
    try {
        const url = `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(englishQuery)}&pageSize=10&dataType=SR%20Legacy,Foundation`;
        const response = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.foods || data.foods.length === 0) return [];

        const NUTRIENT_IDS = { PROTEIN: 1003, FAT: 1004, CARBS: 1005, ENERGY_KCAL: 1008, FIBER: 1079 };
        const extractNutrient = (nutrients: any[], id: number) => {
            const n = nutrients.find((x: any) => x.nutrientId === id);
            return n ? Math.round(Number(n.value) * 10) / 10 : 0;
        };

        const results: FoodItem[] = data.foods.map((food: any) => {
            const protein = extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN);
            const carbs = extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS);
            const fat = extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT);
            const calories = extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY_KCAL);
            const fiber = extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER);

            const nameAr = ENGLISH_TO_ARABIC[englishQuery.toLowerCase()] || food.description;

            const item: FoodItem = {
                id: `usda-${food.fdcId}`,
                nameEn: food.description,
                nameAr: nameAr,
                calories, protein, carbs, fat, fiber,
                servingUnits: [
                    { unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" },
                    { unit: "oz", grams: 28.35, labelEn: "oz", labelAr: "أونصة" },
                    { unit: "cup", grams: 150, labelEn: "cup", labelAr: "كوب" },
                ],
            };

            // Auto-cache for faster future lookups
            if (!dynamicFoodsCache.find(f => f.id === item.id)) {
                dynamicFoodsCache.push(item);
            }

            return item;
        });

        return results;
    } catch (err) {
        console.warn("[FoodSearch] USDA API error:", err);
        return [];
    }
}

// ── FatSecret Integration ──────────────────────────────────────────

const FATSECRET_CLIENT_ID = process.env.FATSECRET_CLIENT_ID || "b05a23d48f30473e913d510cbb849edf";
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET || "5309bbf3e588493695e37ab4f93ffc58";

let fatSecretToken: string | null = null;
let fatSecretTokenExpires: number = 0;

async function getFatSecretToken(): Promise<string> {
    if (fatSecretToken && Date.now() < fatSecretTokenExpires) {
        return fatSecretToken;
    }
    const auth = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');
    const res = await fetch("https://oauth.api.fatsecret.com/connect/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials&scope=basic"
    });
    if (!res.ok) throw new Error("Failed to get FatSecret token");
    const data = await res.json();
    fatSecretToken = data.access_token;
    fatSecretTokenExpires = Date.now() + (data.expires_in - 300) * 1000;
    return fatSecretToken || '';
}

async function searchFatSecretAPI(barcode: string): Promise<FoodItem | null> {
    try {
        const token = await getFatSecretToken();
        if (!token) return null;
        const findRes = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.find_id_for_barcode&barcode=${barcode}&format=json`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!findRes.ok) return null;

        const findData = await findRes.json();
        if (!findData || !findData.food_id || !findData.food_id.value) {
            return null; // Not found
        }

        const foodId = findData.food_id.value;
        const getRes = await fetch(`https://platform.fatsecret.com/rest/server.api?method=food.get.v3&food_id=${foodId}&format=json`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!getRes.ok) return null;

        const getData = await getRes.json();
        if (!getData || !getData.food) return null;

        const food = getData.food;
        const nameEn = food.food_name || `Product ${barcode}`;
        const nameAr = nameEn;

        if (!food.servings || !food.servings.serving) return null;

        let servingsArray = Array.isArray(food.servings.serving) ? food.servings.serving : [food.servings.serving];
        let defaultServing = servingsArray[0];

        let calories = Number(defaultServing.calories) || 0;
        let protein = Math.round(Number(defaultServing.protein) * 10) / 10 || 0;
        let carbs = Math.round(Number(defaultServing.carbohydrate) * 10) / 10 || 0;
        let fat = Math.round(Number(defaultServing.fat) * 10) / 10 || 0;
        let fiber = Math.round(Number(defaultServing.fiber) * 10) / 10 || 0;

        // Normalize to 100g if appropriate
        const amt = Number(defaultServing.metric_serving_amount);
        const unit = String(defaultServing.metric_serving_unit).toLowerCase();
        if (amt && amt > 0 && (unit === 'g' || unit === 'ml')) {
            const ratio = 100 / amt;
            calories = Math.round(calories * ratio);
            protein = Math.round(protein * ratio * 10) / 10;
            carbs = Math.round(carbs * ratio * 10) / 10;
            fat = Math.round(fat * ratio * 10) / 10;
            fiber = Math.round(fiber * ratio * 10) / 10;
        }

        const item: FoodItem = {
            id: `fs-${foodId}`,
            nameEn,
            nameAr,
            calories, protein, carbs, fat, fiber,
            servingUnits: [
                { unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" },
                { unit: "oz", grams: 28.35, labelEn: "oz", labelAr: "أونصة" },
                { unit: "100g", grams: 100, labelEn: "100g", labelAr: "١٠٠ غرام" },
            ]
        };

        for (const s of servingsArray) {
            const svAmt = Number(s.metric_serving_amount);
            if (svAmt > 0 && s.measurement_description) {
                item.servingUnits.push({ unit: s.measurement_description, grams: svAmt, labelEn: s.measurement_description, labelAr: s.measurement_description });
            }
        }

        return item;
    } catch (err) {
        console.warn("[FoodSearch] FatSecret API error:", err);
        return null;
    }
}

// ── OpenFoodFacts Integration ──────────────────────────────────────────

async function searchOpenFoodFactsAPI(barcode: string): Promise<FoodItem | null> {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
            headers: { "User-Agent": "HealthInsightAI - Expo App - UAE" },
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;

        const data = await response.json();
        if (data.status !== 1 || !data.product) return null;

        const p = data.product;
        const nameEn = p.product_name_en || p.product_name || `Product ${barcode}`;
        const nameAr = p.product_name_ar || nameEn;

        const nut = p.nutriments || {};
        const calories = Math.round(Number(nut['energy-kcal_100g']) || 0);
        const protein = Math.round((Number(nut.proteins_100g) || 0) * 10) / 10;
        const carbs = Math.round((Number(nut.carbohydrates_100g) || 0) * 10) / 10;
        const fat = Math.round((Number(nut.fat_100g) || 0) * 10) / 10;
        const fiber = Math.round((Number(nut.fiber_100g) || 0) * 10) / 10;

        if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
            // No nutritional data found for this barcode
            return null;
        }

        const item: FoodItem = {
            id: `barcode-${barcode}`,
            nameEn,
            nameAr,
            calories, protein, carbs, fat, fiber,
            servingUnits: [
                { unit: "g", grams: 1, labelEn: "g", labelAr: "غرام" },
                { unit: "oz", grams: 28.35, labelEn: "oz", labelAr: "أونصة" },
                { unit: "100g", grams: 100, labelEn: "100g", labelAr: "١٠٠ غرام" },
            ],
        };

        if (p.serving_quantity) {
            const sq = Number(p.serving_quantity);
            if (sq > 0) {
                item.servingUnits.push({ unit: "serving", grams: sq, labelEn: "serving", labelAr: "حصة" });
            }
        }
        return item;
    } catch (err) {
        console.warn("[FoodSearch] OpenFoodFacts API error:", err);
        return null;
    }
}

export function registerFoodSearchRoutes(app: Express) {
    // Search for foods
    app.get("/api/food/search", isAuthenticated, async (req: any, res: Response) => {
        try {
            const query = (req.query.q || "").toString().trim();
            if (query.length < 2) {
                return res.json({ foods: [] });
            }

            // Step 1: Search local database first (instant)
            let results = searchLocalFoods(query);

            // Step 2: If few local results, search USDA API (auto-caches for future)
            if (results.length < 5) {
                const usdaResults = await searchUSDAApi(query);
                // Merge, avoiding duplicates
                const existingIds = new Set(results.map(r => r.id));
                for (const r of usdaResults) {
                    if (!existingIds.has(r.id)) {
                        results.push(r);
                    }
                }
            }

            res.json({ foods: results.slice(0, 20) });
        } catch (error) {
            console.error("Food search error:", error);
            res.status(500).json({ error: "Food search failed" });
        }
    });

    // Lookup food by Barcode
    app.get("/api/food/barcode/:code", isAuthenticated, async (req: any, res: Response) => {
        try {
            const code = req.params.code;
            if (!code) {
                return res.status(400).json({ error: "Barcode is required" });
            }

            // 1. Try FatSecret API (Premium commercial database, highly accurate)
            let item = await searchFatSecretAPI(code);

            // 2. Fallback to OpenFoodFacts (Massive open-source global database)
            if (!item) {
                item = await searchOpenFoodFactsAPI(code);
            }

            if (!item) {
                return res.status(404).json({ error: "Product not found or has no nutritional data" });
            }

            res.json({ food: item });
        } catch (error) {
            console.error("Barcode lookup error:", error);
            res.status(500).json({ error: "Barcode lookup failed" });
        }
    });
}
