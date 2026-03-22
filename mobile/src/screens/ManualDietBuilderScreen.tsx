import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    ScrollView, ActivityIndicator, I18nManager, Alert, KeyboardAvoidingView, Platform,
    SafeAreaView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { api, queries } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';

const isArabic = I18nManager.isRTL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServingUnit {
    unit: string;
    grams: number;
    labelEn: string;
    labelAr: string;
}

interface FoodResult {
    id: string;
    nameEn: string;
    nameAr: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    servingUnits: ServingUnit[];
}

interface SelectedFood {
    key: string;
    food: FoodResult;
    quantity: number;
    selectedUnit: ServingUnit;
}

// ── Built-in food database for instant search ─────────────────────────────────
const WEIGHT_UNITS: ServingUnit[] = [
    { unit: 'g', grams: 1, labelEn: 'g', labelAr: 'غرام' },
    { unit: 'oz', grams: 28.35, labelEn: 'oz', labelAr: 'أونصة' },
];

const VOLUME_UNITS: ServingUnit[] = [
    ...WEIGHT_UNITS,
    { unit: 'cup', grams: 240, labelEn: 'cup', labelAr: 'كوب' },
    { unit: 'container', grams: 150, labelEn: 'container', labelAr: 'علبة' },
    { unit: 'tbsp', grams: 15, labelEn: 'tbsp', labelAr: 'ملعقة طعام' },
    { unit: 'tsp', grams: 5, labelEn: 'tsp', labelAr: 'ملعقة صغيرة' },
];

const withUnits = (base: ServingUnit[], extra: ServingUnit[]): ServingUnit[] => {
    // Merge default units + extra units, without duplicates
    const map = new Map<string, ServingUnit>();
    base.forEach(u => map.set(u.unit, u));
    extra.forEach(u => map.set(u.unit, { ...u, labelEn: u.labelEn || u.unit, labelAr: u.labelAr || u.unit }));
    return Array.from(map.values());
};

const LOCAL_FOODS: FoodResult[] = [
    // ── Protein ──
    { id: 'chicken-breast', nameEn: 'Chicken Breast', nameAr: 'صدر دجاج', calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 174, labelEn: 'piece', labelAr: 'قطعة' }]) },
    { id: 'grilled-chicken', nameEn: 'Grilled Chicken', nameAr: 'دجاج مشوي', calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 174, labelEn: 'piece', labelAr: 'قطعة' }, { unit: 'whole', grams: 800, labelEn: 'whole chicken', labelAr: 'دجاجة كاملة' }]) },
    { id: 'boiled-chicken', nameEn: 'Boiled Chicken', nameAr: 'دجاج مسلوق', calories: 150, protein: 29.0, carbs: 0, fat: 3.0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 174, labelEn: 'piece', labelAr: 'قطعة' }, { unit: 'whole', grams: 800, labelEn: 'whole chicken', labelAr: 'دجاجة كاملة' }]) },
    { id: 'chicken-thigh', nameEn: 'Chicken Thigh', nameAr: 'فخذ دجاج', calories: 209, protein: 26.0, carbs: 0, fat: 10.9, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 110, labelEn: 'piece', labelAr: 'قطعة' }]) },
    { id: 'chicken', nameEn: 'Chicken', nameAr: 'دجاج', calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'whole', grams: 800, labelEn: 'whole chicken', labelAr: 'دجاجة كاملة' }]) },
    { id: 'beef', nameEn: 'Beef (Ground, Lean)', nameAr: 'لحم بقر مفروم', calories: 217, protein: 26.1, carbs: 0, fat: 11.8, fiber: 0, servingUnits: WEIGHT_UNITS },
    { id: 'grilled-steak', nameEn: 'Grilled Beef Steak', nameAr: 'ستيك لحم مشوي', calories: 271, protein: 25.0, carbs: 0, fat: 19.0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 200, labelEn: 'steak', labelAr: 'شريحة ستيك' }]) },
    { id: 'lamb', nameEn: 'Lamb', nameAr: 'لحم غنم', calories: 282, protein: 25.5, carbs: 0, fat: 19.4, fiber: 0, servingUnits: WEIGHT_UNITS },
    { id: 'salmon', nameEn: 'Salmon', nameAr: 'سلمون', calories: 182, protein: 25.4, carbs: 0, fat: 8.1, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'fillet', grams: 170, labelEn: 'fillet', labelAr: 'فيليه' }]) },
    { id: 'tuna', nameEn: 'Tuna (canned)', nameAr: 'تونة معلبة', calories: 116, protein: 25.5, carbs: 0, fat: 0.8, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'can', grams: 165, labelEn: 'can', labelAr: 'علبة' }]) },
    { id: 'eggs', nameEn: 'Egg', nameAr: 'بيض', calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'egg', grams: 50, labelEn: 'egg', labelAr: 'بيضة' }]) },
    { id: 'shrimp', nameEn: 'Shrimp', nameAr: 'ربيان', calories: 99, protein: 24.0, carbs: 0.2, fat: 0.3, fiber: 0, servingUnits: WEIGHT_UNITS },
    { id: 'turkey', nameEn: 'Turkey Breast', nameAr: 'ديك رومي', calories: 135, protein: 30.0, carbs: 0, fat: 1.0, fiber: 0, servingUnits: WEIGHT_UNITS },

    // ── Grains ──
    { id: 'rice', nameEn: 'White Rice (cooked)', nameAr: 'أرز أبيض', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 186, labelEn: 'cup', labelAr: 'كوب' }, { unit: 'tbsp', grams: 15, labelEn: 'tbsp', labelAr: 'ملعقة طعام' }]) },
    { id: 'brown-rice', nameEn: 'Brown Rice (cooked)', nameAr: 'أرز بني', calories: 112, protein: 2.6, carbs: 23.5, fat: 0.9, fiber: 1.8, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 195, labelEn: 'cup', labelAr: 'كوب' }, { unit: 'tbsp', grams: 15, labelEn: 'tbsp', labelAr: 'ملعقة طعام' }]) },
    { id: 'oats', nameEn: 'Oats (dry)', nameAr: 'شوفان', calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 81, labelEn: 'cup', labelAr: 'كوب' }, { unit: 'tbsp', grams: 5, labelEn: 'tbsp', labelAr: 'ملعقة كبيرة' }]) },
    { id: 'quinoa', nameEn: 'Quinoa (cooked)', nameAr: 'كينوا', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 185, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'pasta', nameEn: 'Pasta (cooked)', nameAr: 'معكرونة', calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 140, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'bread', nameEn: 'Whole Wheat Bread', nameAr: 'خبز أسمر', calories: 252, protein: 12.5, carbs: 43.1, fat: 3.5, fiber: 6.0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'slice', grams: 28, labelEn: 'slice', labelAr: 'شريحة' }]) },
    { id: 'sweet-potato', nameEn: 'Sweet Potato', nameAr: 'بطاطا حلوة', calories: 90, protein: 2.0, carbs: 20.7, fat: 0.1, fiber: 3.3, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 130, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'potato', nameEn: 'Potato', nameAr: 'بطاطا', calories: 87, protein: 1.7, carbs: 20.0, fat: 0.1, fiber: 1.8, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 150, labelEn: 'piece', labelAr: 'حبة' }]) },

    // ── Dairy ──
    { id: 'greek-yogurt', nameEn: 'Greek Yogurt', nameAr: 'زبادي يوناني', calories: 59, protein: 10.0, carbs: 3.6, fat: 0.7, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'yogurt', nameEn: 'Yogurt', nameAr: 'زبادي', calories: 63, protein: 5.3, carbs: 7.0, fat: 1.6, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'milk', nameEn: 'Milk (low fat)', nameAr: 'حليب قليل الدسم', calories: 42, protein: 3.4, carbs: 5.0, fat: 1.0, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'cheese', nameEn: 'Cheese', nameAr: 'جبن', calories: 402, protein: 25.0, carbs: 1.3, fat: 33.1, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'slice', grams: 28, labelEn: 'slice', labelAr: 'شريحة' }]) },
    { id: 'cottage-cheese', nameEn: 'Cottage Cheese', nameAr: 'جبن قريش', calories: 81, protein: 11.8, carbs: 3.1, fat: 2.3, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },

    // ── Fruits ──
    { id: 'banana', nameEn: 'Banana', nameAr: 'موز', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 118, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'apple', nameEn: 'Apple', nameAr: 'تفاح', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 182, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'dates', nameEn: 'Dates', nameAr: 'تمر', calories: 277, protein: 1.8, carbs: 75.0, fat: 0.2, fiber: 6.7, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 24, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'orange', nameEn: 'Orange', nameAr: 'برتقال', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 131, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'strawberry', nameEn: 'Strawberry', nameAr: 'فراولة', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 152, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'mango', nameEn: 'Mango', nameAr: 'مانجو', calories: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 165, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'grapes', nameEn: 'Grapes', nameAr: 'عنب', calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 151, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'avocado', nameEn: 'Avocado', nameAr: 'أفوكادو', calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'half', grams: 68, labelEn: 'half', labelAr: 'نصف' }]) },
    { id: 'watermelon', nameEn: 'Watermelon', nameAr: 'بطيخ', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 152, labelEn: 'cup', labelAr: 'كوب' }]) },

    // ── Vegetables ──
    { id: 'broccoli', nameEn: 'Broccoli', nameAr: 'بروكلي', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 3.3, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 156, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'spinach', nameEn: 'Spinach', nameAr: 'سبانخ', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 30, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'tomato', nameEn: 'Tomato', nameAr: 'طماطم', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 123, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'cucumber', nameEn: 'Cucumber', nameAr: 'خيار', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 201, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'carrot', nameEn: 'Carrot', nameAr: 'جزر', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'piece', grams: 61, labelEn: 'piece', labelAr: 'حبة' }]) },
    { id: 'lettuce', nameEn: 'Lettuce', nameAr: 'خس', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'cup', grams: 36, labelEn: 'cup', labelAr: 'كوب' }]) },

    // ── Legumes ──
    { id: 'lentils', nameEn: 'Lentils (cooked)', nameAr: 'عدس', calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'chickpeas', nameEn: 'Chickpeas', nameAr: 'حمص', calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'beans', nameEn: 'Beans', nameAr: 'فاصوليا', calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 7.4, servingUnits: withUnits(VOLUME_UNITS, []) },

    // ── Nuts & Seeds ──
    { id: 'almonds', nameEn: 'Almonds', nameAr: 'لوز', calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9, fiber: 12.5, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'handful', grams: 28, labelEn: 'handful (28g)', labelAr: 'حفنة (28غ)' }, { unit: 'cup', grams: 143, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'walnuts', nameEn: 'Walnuts', nameAr: 'جوز', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'handful', grams: 28, labelEn: 'handful (28g)', labelAr: 'حفنة (28غ)' }, { unit: 'cup', grams: 117, labelEn: 'cup', labelAr: 'كوب' }]) },
    { id: 'peanut-butter', nameEn: 'Peanut Butter', nameAr: 'زبدة فول سوداني', calories: 588, protein: 25.1, carbs: 19.6, fat: 50.4, fiber: 6.0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'chia-seeds', nameEn: 'Chia Seeds', nameAr: 'بذور شيا', calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, servingUnits: withUnits(VOLUME_UNITS, []) },

    // ── Oils & Fats ──
    { id: 'olive-oil', nameEn: 'Olive Oil', nameAr: 'زيت زيتون', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'butter', nameEn: 'Butter', nameAr: 'زبدة', calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },
    { id: 'coconut-oil', nameEn: 'Coconut Oil', nameAr: 'زيت جوز الهند', calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, servingUnits: withUnits(VOLUME_UNITS, []) },

    // ── Sweeteners ──
    { id: 'honey', nameEn: 'Honey', nameAr: 'عسل', calories: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, servingUnits: withUnits(VOLUME_UNITS, []) },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManualDietBuilderScreen({ navigation }: any) {
    const { colors, isDark } = useAppTheme();
    const queryClient = useQueryClient();

    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);

    // Barcode Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextKeyRef = useRef(0);

    // ── LOCAL instant search (prefix + substring match) ─────────────────────────

    const searchLocal = useCallback((query: string): FoodResult[] => {
        const q = query.toLowerCase().trim();
        if (q.length < 2) return [];

        // Score-based matching: prefix match gets higher priority
        const scored = LOCAL_FOODS.map(food => {
            const en = food.nameEn.toLowerCase();
            const ar = food.nameAr;
            const id = food.id;
            let score = 0;
            if (en.startsWith(q) || id.startsWith(q)) score = 100;
            else if (en.includes(q) || ar.includes(q) || id.includes(q)) score = 50;
            // Check individual words for prefix match
            if (score === 0) {
                const words = en.split(/[\s,()-]+/);
                for (const w of words) {
                    if (w.startsWith(q)) { score = 80; break; }
                }
            }
            return { food, score };
        })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(x => x.food);

        return scored.slice(0, 15);
    }, []);

    // ── Combined search: local first, then API backup ───────────────────────────

    const performSearch = useCallback(async (query: string, forceApiResult = false) => {
        const q = query.trim();
        if (q.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        // Step 1: Instant local results - only update state if we are NOT forcing API
        // If we're forcing API, we want to keep current results visible while loading
        const localResults = searchLocal(q);
        if (!forceApiResult) {
            setSearchResults(localResults);
        }
        setShowResults(true);

        // Step 2: Also try API for more results (in background or forced)
        if (localResults.length < 5 || forceApiResult) {
            setIsSearching(true);
            try {
                const data = await api.get<{ foods: FoodResult[] }>(`/api/food/search?q=${encodeURIComponent(q)}`);
                const apiResults = data.foods || [];

                // Give apiResults proper units if missing
                apiResults.forEach(r => {
                    if (!r.servingUnits || r.servingUnits.length === 0) {
                        r.servingUnits = WEIGHT_UNITS; // Fallback for external API items where we don't know the exact type
                    } else {
                        r.servingUnits = withUnits(WEIGHT_UNITS, r.servingUnits);
                    }
                });

                // Merge API results with local, avoid duplicates
                const existingIds = new Set(localResults.map(r => r.id));
                const merged = [...localResults, ...apiResults.filter(r => !existingIds.has(r.id))];
                setSearchResults(merged.slice(0, 30));
            } catch {
                // Keep local results if API fails
            } finally {
                setIsSearching(false);
            }
        }
    }, [searchLocal]);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        const q = searchText.trim();
        if (q.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        // Instant local search
        const localResults = searchLocal(q);
        if (localResults.length > 0) {
            setSearchResults(localResults);
            setShowResults(true);
        }
        // Debounced API search
        searchTimeoutRef.current = setTimeout(() => performSearch(searchText), 400);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchText, searchLocal, performSearch]);

    // ── Barcode Scanner Handler ──────────────────────────────────────────

    const handleBarcodeScanned = async ({ type, data }: any) => {
        if (isScanning) return;
        setIsScanning(true);
        setShowScanner(false); // Close camera immediately for better UX

        try {
            const res = await queries.lookupBarcode(data) as any;
            if (res && res.food) {
                // Instantly select this food so user can input quantity
                const newItem: FoodResult = res.food;

                // Emulate picking it from the list
                const newKey = `item_${newItem.id}_${Date.now()}_${nextKeyRef.current++}`;
                setSelectedFoods(prev => [...prev, {
                    key: newKey,
                    food: newItem,
                    quantity: newItem.servingUnits[0].grams || 100, // Def grams
                    selectedUnit: newItem.servingUnits[0]
                }]);
                Alert.alert(
                    isArabic ? 'تمت القراءة ✅' : 'Scanned ✅',
                    isArabic ? `تم إيجاد المنتج: ${newItem.nameAr}` : `Product found: ${newItem.nameEn}`
                );
            }
        } catch (error) {
            console.error('Barcode Error:', error);
            Alert.alert(isArabic ? 'عذراً' : 'Sorry', isArabic ? 'لم نتمكن من التعرف على هذا المنتج' : 'We could not recognize this product');
        } finally {
            setIsScanning(false);
        }
    };

    // ── Add food ────────────────────────────────────────────────────────────────

    const addFood = useCallback((food: FoodResult) => {
        const defaultUnit = food.servingUnits[0] || { unit: 'g', grams: 1, labelEn: 'g', labelAr: 'غرام' };
        setSelectedFoods(prev => [
            ...prev,
            { key: `${food.id}-${nextKeyRef.current++}`, food, quantity: 100, selectedUnit: defaultUnit },
        ]);
        setSearchText('');
        setShowResults(false);
        setSearchResults([]);
    }, []);

    const [unitSelectionModalVisible, setUnitSelectionModalVisible] = useState(false);
    const [activeUnitSelectionKey, setActiveUnitSelectionKey] = useState<string | null>(null);

    const updateQuantity = useCallback((key: string, qty: number) => {
        setSelectedFoods(prev => prev.map(item => item.key === key ? { ...item, quantity: qty } : item));
    }, []);

    const openUnitSelector = useCallback((key: string) => {
        setActiveUnitSelectionKey(key);
        setUnitSelectionModalVisible(true);
    }, []);

    const selectUnit = useCallback((unit: ServingUnit) => {
        if (activeUnitSelectionKey) {
            setSelectedFoods(prev => prev.map(item => {
                if (item.key !== activeUnitSelectionKey) return item;
                return { ...item, selectedUnit: unit };
            }));
        }
        setUnitSelectionModalVisible(false);
        setActiveUnitSelectionKey(null);
    }, [activeUnitSelectionKey]);

    const removeFood = useCallback((key: string) => {
        setSelectedFoods(prev => prev.filter(item => item.key !== key));
    }, []);

    // ── Calculate macros ────────────────────────────────────────────────────────

    const calculateItemMacros = (item: SelectedFood) => {
        const gramsTotal = item.quantity * item.selectedUnit.grams;
        const factor = gramsTotal / 100;
        return {
            calories: Math.round(item.food.calories * factor),
            protein: Math.round(item.food.protein * factor * 10) / 10,
            carbs: Math.round(item.food.carbs * factor * 10) / 10,
            fat: Math.round(item.food.fat * factor * 10) / 10,
        };
    };

    const totals = useMemo(() => {
        return selectedFoods.reduce(
            (acc, item) => {
                const m = calculateItemMacros(item);
                return {
                    calories: acc.calories + m.calories,
                    protein: Math.round((acc.protein + m.protein) * 10) / 10,
                    carbs: Math.round((acc.carbs + m.carbs) * 10) / 10,
                    fat: Math.round((acc.fat + m.fat) * 10) / 10,
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }, [selectedFoods]);

    // ── Save plan ───────────────────────────────────────────────────────────────

    const saveMutation = useMutation({
        mutationFn: (planData: any) => api.post('/api/saved-diet-plans', { planData }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedDietPlans'] });
            Alert.alert(
                isArabic ? 'تم الحفظ ✅' : 'Saved ✅',
                isArabic ? 'تم حفظ الجدول الغذائي بنجاح في جدولي الغذائي' : 'Diet plan saved successfully to My Diet Plans',
                [{
                    text: isArabic ? 'عرض الجداول' : 'View Plans',
                    onPress: () => {
                        setSelectedFoods([]);
                        navigation.navigate('DietTable');
                    },
                }, {
                    text: isArabic ? 'إضافة جدول آخر' : 'Add Another',
                    onPress: () => setSelectedFoods([]),
                }]
            );
        },
        onError: (err: any) => {
            Alert.alert(isArabic ? 'خطأ' : 'Error', err.message || 'Failed to save');
        },
    });

    const handleSave = () => {
        if (selectedFoods.length === 0) {
            Alert.alert(
                isArabic ? 'لا توجد أصناف' : 'No items',
                isArabic ? 'أضف بعض الأصناف أولاً' : 'Add some food items first'
            );
            return;
        }
        const planData = {
            source: 'manual',
            title: isArabic ? 'جدول غذائي يدوي' : 'Manual Diet Plan',
            createdAt: new Date().toISOString(),
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            items: selectedFoods.map(item => {
                const macros = calculateItemMacros(item);
                return {
                    nameEn: item.food.nameEn, nameAr: item.food.nameAr,
                    quantity: item.quantity,
                    unit: isArabic ? item.selectedUnit.labelAr : item.selectedUnit.labelEn,
                    unitKey: item.selectedUnit.unit,
                    gramsPerUnit: item.selectedUnit.grams,
                    ...macros,
                };
            }),
        };
        saveMutation.mutate(planData);
    };

    // ── Render helpers ──────────────────────────────────────────────────────────

    const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)';
    const inputBg = isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9';

    const hasItems = selectedFoods.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* ── Back button + Title bar ── */}
            <SafeAreaView style={{ backgroundColor: colors.card }}>
                <View style={[styles.headerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID="button-back">
                        <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {isArabic ? 'تصميم جدول غذائي' : 'Diet Builder'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* ── Search Bar ── */}
                <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.mutedText} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text, backgroundColor: inputBg }]}
                        placeholder={isArabic ? 'ابحث عن طعام... (مثال: دجاج، أرز، chicken)' : 'Search food... (e.g., chicken, rice, دجاج)'}
                        placeholderTextColor={colors.mutedText}
                        value={searchText}
                        onChangeText={setSearchText}
                        autoCorrect={false}
                        autoCapitalize="none"
                        textAlign={isArabic ? 'right' : 'left'}
                        testID="input-food-search"
                    />
                    {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchText(''); setShowResults(false); }} style={{ marginHorizontal: 4 }}>
                            <Ionicons name="close-circle" size={20} color={colors.mutedText} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => {
                            if (!permission?.granted) requestPermission();
                            setShowScanner(true);
                        }}
                        style={{ padding: 6, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderRadius: 8, marginLeft: 4 }}
                    >
                        <Ionicons name="barcode-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Search Results Dropdown ── */}
                {showResults && searchResults.length > 0 && (
                    <View style={[styles.resultsDropdown, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border }]}>
                        <FlatList
                            data={searchResults}
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            style={{ maxHeight: 280 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                                    onPress={() => addFood(item)}
                                >
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                                            {isArabic ? item.nameAr : item.nameEn}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 1 }} numberOfLines={1}>
                                            {isArabic ? item.nameEn : item.nameAr} · {item.calories} cal/100g
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle" size={26} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            ListFooterComponent={() => (
                                <TouchableOpacity
                                    style={[styles.resultItem, { borderBottomColor: colors.border, justifyContent: 'center', backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.05)' }]}
                                    onPress={() => performSearch(searchText, true)}
                                    disabled={isSearching}
                                >
                                    <Ionicons name="cloud-download-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.resultName, { color: colors.primary }]}>
                                        {isSearching ? (isArabic ? 'جاري البحث في القاعدة العالمية...' : 'Searching global database...') : (isArabic ? 'لم تجد الصنف؟ ابحث في القاعدة العالمية' : "Can't find it? Search global database")}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {showResults && searchResults.length === 0 && searchText.length >= 2 && (
                    <View style={[styles.resultsDropdown, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border, padding: 16 }]}>
                        <Text style={{ textAlign: 'center', color: colors.mutedText, fontSize: 14, marginBottom: 12 }}>
                            {isArabic ? 'لم يتم العثور على نتائج محلية' : 'No local results found'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.saveButton, { paddingVertical: 10, backgroundColor: isSearching ? colors.mutedText : '#3b82f6' }]}
                            onPress={() => performSearch(searchText, true)}
                            disabled={isSearching}
                        >
                            {isSearching ? (
                                <Text style={styles.saveButtonText}>{isArabic ? 'جاري البحث...' : 'Searching...'}</Text>
                            ) : (
                                <Text style={styles.saveButtonText}>{isArabic ? 'ابحث في القاعدة العالمية (USDA)' : 'Search Global Database (USDA)'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {/* ── Selected Foods List ── */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: hasItems ? 230 : 30, gap: 10 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {!hasItems && (
                        <View style={styles.emptyState}>
                            <Ionicons name="restaurant-outline" size={52} color={colors.mutedText} />
                            <Text style={{ fontSize: 16, color: colors.mutedText, textAlign: 'center', fontWeight: '600' }}>
                                {isArabic ? 'ابحث عن الأطعمة وأضفها هنا' : 'Search for foods and add them here'}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.mutedText, textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
                                {isArabic
                                    ? 'اكتب اسم الطعام بالعربي أو الإنجليزي\nمثال: دجاج، أرز، chicken، rice'
                                    : 'Type a food name in English or Arabic\ne.g., chicken, rice, دجاج، أرز'}
                            </Text>
                        </View>
                    )}

                    {selectedFoods.map(item => {
                        const macros = calculateItemMacros(item);
                        return (
                            <View key={item.key} style={[styles.foodCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
                                <View style={styles.foodCardHeader}>
                                    <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
                                        {isArabic ? item.food.nameAr : item.food.nameEn}
                                    </Text>
                                    <TouchableOpacity onPress={() => removeFood(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.quantityRow}>
                                    <TextInput
                                        style={[styles.quantityInput, { color: colors.text, backgroundColor: inputBg, borderColor: colors.border }]}
                                        value={item.quantity.toString()}
                                        onChangeText={val => updateQuantity(item.key, parseFloat(val) || 0)}
                                        keyboardType="numeric"
                                        selectTextOnFocus
                                        textAlign="center"
                                    />
                                    <TouchableOpacity
                                        style={[styles.unitButton, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderColor: colors.primary }]}
                                        onPress={() => openUnitSelector(item.key)}
                                    >
                                        <Text style={[styles.unitText, { color: colors.primary }]}>
                                            {isArabic ? item.selectedUnit.labelAr : item.selectedUnit.labelEn}
                                        </Text>
                                        <Ionicons name="chevron-down" size={14} color={colors.primary} />
                                    </TouchableOpacity>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>{macros.calories}</Text>
                                        <Text style={{ fontSize: 10, color: colors.mutedText, marginTop: -2 }}>{isArabic ? 'سعرة' : 'Cal'}</Text>
                                    </View>
                                </View>

                                <View style={styles.macrosRow}>
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#3b82f6' }}>{macros.protein}g</Text>
                                        <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'بروتين' : 'Protein'}</Text>
                                    </View>
                                    <View style={{ width: 1, height: 24, backgroundColor: colors.border, opacity: 0.4 }} />
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b' }}>{macros.carbs}g</Text>
                                        <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'كربوهيدرات' : 'Carbs'}</Text>
                                    </View>
                                    <View style={{ width: 1, height: 24, backgroundColor: colors.border, opacity: 0.4 }} />
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>{macros.fat}g</Text>
                                        <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'دهون' : 'Fat'}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* ── Total Bar + Save Button (always visible when items exist) ── */}
                {hasItems && (
                    <View style={[styles.totalBar, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                                {isArabic ? 'إجمالي السعرات' : 'Total Calories'}
                            </Text>
                            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
                                {totals.calories}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={[styles.totalMacroChip, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3b82f6' }}>{totals.protein}g</Text>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#3b82f6', marginTop: 1 }}>{isArabic ? 'بروتين' : 'Protein'}</Text>
                            </View>
                            <View style={[styles.totalMacroChip, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#f59e0b' }}>{totals.carbs}g</Text>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#f59e0b', marginTop: 1 }}>{isArabic ? 'كربوهيدرات' : 'Carbs'}</Text>
                            </View>
                            <View style={[styles.totalMacroChip, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>{totals.fat}g</Text>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#ef4444', marginTop: 1 }}>{isArabic ? 'دهون' : 'Fat'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { opacity: saveMutation.isPending ? 0.6 : 1 }]}
                            onPress={handleSave}
                            disabled={saveMutation.isPending}
                            testID="button-save-manual-plan"
                            activeOpacity={0.8}
                        >
                            {saveMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="bookmark" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                                    <Text style={styles.saveButtonText}>
                                        {isArabic ? 'حفظ في جدولي الغذائي' : 'Save to My Diet Plans'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* ── Unit Selection Modal ── */}
            <Modal
                visible={unitSelectionModalVisible}
                transparent={true}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setUnitSelectionModalVisible(false);
                        setActiveUnitSelectionKey(null);
                    }}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {isArabic ? 'اختر وحدة القياس' : 'Select Unit'}
                        </Text>
                        {activeUnitSelectionKey && selectedFoods.find(f => f.key === activeUnitSelectionKey)?.food.servingUnits.map((u, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                                onPress={() => selectUnit(u)}
                            >
                                <Text style={[styles.modalItemText, { color: colors.text }]}>
                                    {isArabic ? u.labelAr : u.labelEn}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Barcode Scanner Modal ── */}
            <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {showScanner && (
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e"] }}
                            onBarcodeScanned={handleBarcodeScanned}
                        >
                            <View style={{ flex: 1, justifyContent: 'space-between', padding: 40, paddingTop: 60 }}>
                                <TouchableOpacity
                                    onPress={() => setShowScanner(false)}
                                    style={{ alignSelf: 'flex-start', padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24 }}
                                >
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>

                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="scan-outline" size={250} color="rgba(255,255,255,0.4)" />
                                </View>

                                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 12, overflow: 'hidden' }}>
                                    {isArabic ? 'وجّه الكاميرا نحو الباركود الخاص بالمنتج' : 'Point camera at product barcode'}
                                </Text>
                            </View>
                        </CameraView>
                    )}
                </View>
            </Modal>

        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40, height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    resultsDropdown: {
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 10,
    },
    foodCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 10,
    },
    foodCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodName: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quantityInput: {
        width: 70, height: 40,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    unitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
    },
    unitText: {
        fontSize: 14,
        fontWeight: '600',
    },
    macrosRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(148,163,184,0.2)',
    },
    totalBar: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 32,
        borderTopWidth: 1,
        gap: 10,
    },
    totalMacroChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 15,
        borderRadius: 14,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 10,
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(148,163,184,0.3)',
    },
    modalItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalItemText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
