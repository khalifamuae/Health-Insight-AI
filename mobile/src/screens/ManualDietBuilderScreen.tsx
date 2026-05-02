import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    ScrollView, ActivityIndicator, I18nManager, Alert, KeyboardAvoidingView, Platform,
    SafeAreaView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { api, queries } from '../lib/api';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
    defaultAddQuantity?: number;
}


interface DietGroup {
    id: string;
    name: string;
    items: SelectedFood[];
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

    // ── Supplements ──
    { id: 'whey-protein', nameEn: 'Whey Protein', nameAr: 'مسحوق بروتين (وي بروتين)', calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'scoop', grams: 30, labelEn: 'scoop', labelAr: 'سكوب' }]) },
    { id: 'creatine', nameEn: 'Creatine', nameAr: 'كرياتين', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'scoop', grams: 5, labelEn: 'scoop (5g)', labelAr: 'سكوب (5غ)' }]) },
    { id: 'pre-workout', nameEn: 'Pre-Workout', nameAr: 'بري وورك أوت', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'scoop', grams: 10, labelEn: 'scoop', labelAr: 'سكوب' }]) },
    { id: 'bcaa', nameEn: 'BCAA / EAA', nameAr: 'أحماض أمينية BCAA', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'scoop', grams: 7, labelEn: 'scoop', labelAr: 'سكوب' }]) },
    { id: 'omega3', nameEn: 'Omega 3', nameAr: 'أوميغا 3', calories: 10, protein: 0, carbs: 0, fat: 1, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'pill', grams: 1, labelEn: 'pill', labelAr: 'حبة' }]) },
    { id: 'multivitamin', nameEn: 'Multivitamin', nameAr: 'فيتامينات متعددة', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, servingUnits: withUnits(WEIGHT_UNITS, [{ unit: 'pill', grams: 1, labelEn: 'pill', labelAr: 'حبة' }]) },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManualDietBuilderScreen({ navigation, route }: any) {
    const { colors, isDark } = useAppTheme();
    const isArabic = I18nManager.isRTL;
    const queryClient = useQueryClient();

    const { editPlanId, clientId } = route.params || {};

    useLayoutEffect(() => {
        const dynamicTitle = editPlanId ? (isArabic ? 'تعديل الجدول الغذائي' : 'Edit Diet Plan') : (isArabic ? 'تصميم جدول غذائي' : 'Diet Builder');
        if (clientId) {
            navigation.setOptions({
                title: dynamicTitle,
                headerLeft: () => (
                    <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={28} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 17, marginHorizontal: 4 }}>
                           {isArabic ? 'ملف المشترك' : 'Client Profile'}
                        </Text>
                    </TouchableOpacity>
                ),
                headerRight: undefined
            });
        } else {
            navigation.setOptions({ title: dynamicTitle });
        }
    }, [navigation, clientId, isArabic, colors.primary, editPlanId]);

    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [groups, setGroups] = useState<DietGroup[]>([]);
    const [planTitle, setPlanTitle] = useState('');
    const [targetFoodToAdd, setTargetFoodToAdd] = useState<FoodResult | null>(null);
    const [isGroupModalVisible, setGroupModalVisible] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');

    const [isCustomFoodModalVisible, setCustomFoodModalVisible] = useState(false);
    const [customFoodForm, setCustomFoodForm] = useState({
        nameEn: '', nameAr: '', calories: '', protein: '', carbs: '', fat: '', quantity: '1'
    });
    const SUPPLEMENT_UNITS = [
        { key: 'scoop', labelEn: 'Scoop', labelAr: 'سكوب', grams: 30 },
        { key: 'pill', labelEn: 'Pill', labelAr: 'حبة', grams: 1 },
        { key: 'capsule', labelEn: 'Capsule', labelAr: 'كبسولة', grams: 1 },
        { key: 'tablet', labelEn: 'Tablet', labelAr: 'قرص', grams: 1 },
        { key: 'serving', labelEn: 'Serving', labelAr: 'حصة', grams: 30 },
        { key: 'sachet', labelEn: 'Sachet', labelAr: 'كيس', grams: 10 },
        { key: 'ml', labelEn: 'ml', labelAr: 'مل', grams: 1 },
        { key: 'g', labelEn: 'Gram', labelAr: 'غرام', grams: 1 },
    ];
    const [selectedCustomUnit, setSelectedCustomUnit] = useState(SUPPLEMENT_UNITS[0]);

    // Barcode Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const isScanningRef = useRef(false);

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

    const { data: savedPlans } = useQuery<any[]>({
        queryKey: ['savedDietPlans', clientId],
        queryFn: async () => (await queries.savedDietPlans(clientId)) as any[],
    });

    const suggestedGroupNames = useMemo(() => {
        const defaults = isArabic ? ['الفطور', 'الغداء', 'العشاء', 'وجبة خفيفة'] : ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        const names = new Set<string>(defaults);
        if (savedPlans) {
            savedPlans.forEach(p => {
                try {
                    const data = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData;
                    if (data?.groups) {
                        data.groups.forEach((g: any) => {
                            if (g.name && g.name.trim()) {
                                names.add(g.name.trim());
                            }
                        });
                    }
                } catch {}
            });
        }
        return Array.from(names);
    }, [savedPlans, isArabic]);

    useEffect(() => {
        if (editPlanId && savedPlans) {
            const planToEdit = savedPlans.find(p => p.id === editPlanId);
            if (planToEdit) {
                try {
                    const parsed = typeof planToEdit.planData === 'string' ? JSON.parse(planToEdit.planData) : planToEdit.planData;
                    if (parsed.groups) {
                        const mappedGroups = parsed.groups.map((g: any) => ({
                            id: g.id,
                            name: g.name,
                            items: (g.items || []).map((item: any, idx: number) => ({
                                key: item.key || `loaded_${idx}_${Date.now()}`,
                                food: item.foodItem || item.food,
                                quantity: item.quantity || 1,
                                selectedUnit: item.servingUnit || item.selectedUnit || { unit: 'g', grams: 1, labelEn: 'g', labelAr: 'غرام' }
                            }))
                        }));
                        setGroups(mappedGroups);
                    }
                    if (parsed.title) setPlanTitle(parsed.title);
                } catch (e) {}
            }
        }
    }, [editPlanId, savedPlans]);

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
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setIsScanning(true);
        setShowScanner(false); // Close camera immediately for better UX

        try {
            const res = await queries.lookupBarcode(data) as any;
            if (res && res.food) {
                const newItem: FoodResult = res.food;
                handleAddFoodInit(newItem);
            }
        } catch (error) {
            console.error('Barcode Error:', error);
            Alert.alert(isArabic ? 'عذراً' : 'Sorry', isArabic ? 'لم نتمكن من التعرف على المنتج أو حدث خطأ في الاتصال' : 'We could not recognize this product or connection failed');
        } finally {
            setIsScanning(false);
            setTimeout(() => { isScanningRef.current = false; }, 2000);
        }
    };

    // ── Add food ────────────────────────────────────────────────────────────────

    const handleAddFoodInit = useCallback((food: FoodResult) => {
        setTargetFoodToAdd(food);
        setNewGroupName('');
        setSelectedGroupId(null);
        setGroupModalVisible(true);
        setSearchText('');
        setShowResults(false);
        setSearchResults([]);
    }, []);

    const processAddFoodToGroup = () => {
        if (!targetFoodToAdd) return;

        let groupIdToUse = selectedGroupId;
        let finalGroups = [...groups];

        if (groupIdToUse === 'NEW') {
            if (!newGroupName.trim()) {
                Alert.alert(isArabic ? '\u200Fخطأ' : 'Error', isArabic ? '\u200Fيرجى إدخال اسم المجموعة' : 'Please enter a group name');
                return;
            }
            const existingGroup = groups.find(g => g.name.trim().toLowerCase() === newGroupName.trim().toLowerCase());
            if (existingGroup) {
                groupIdToUse = existingGroup.id;
            } else {
                const newGroup: DietGroup = { id: Date.now().toString(), name: newGroupName.trim(), items: [] };
                finalGroups.push(newGroup);
                groupIdToUse = newGroup.id;
            }
        }

        if (!groupIdToUse) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'يرجى اختيار مجموعة' : 'Please select a group');
            return;
        }

        const defaultUnit = targetFoodToAdd.servingUnits[0] || { unit: 'g', grams: 1, labelEn: 'g', labelAr: 'غرام' };
        
        let defaultQty = 1;
        if (targetFoodToAdd.defaultAddQuantity !== undefined) {
            defaultQty = targetFoodToAdd.defaultAddQuantity;
        } else if (defaultUnit.unit === 'g' || defaultUnit.unit === 'ml') {
            defaultQty = 100;
        }

        const newKey = `item_${targetFoodToAdd.id}_${Date.now()}_${nextKeyRef.current++}`;

        const updatedGroups = finalGroups.map(g => {
            if (g.id !== groupIdToUse) return g;
            return {
                ...g,
                items: [
                    ...g.items,
                    { key: newKey, food: targetFoodToAdd, quantity: defaultQty, selectedUnit: defaultUnit }
                ]
            };
        });

        setGroups(updatedGroups);
        setGroupModalVisible(false);
        setTargetFoodToAdd(null);
        Alert.alert(
            isArabic ? '\u200F✅ تمت الإضافة' : 'Added ✅',
            isArabic ? '\u200Fتم إضافته للمجموعة بنجاح' : `Added to group successfully`
        );
    };

    const [unitSelectionModalVisible, setUnitSelectionModalVisible] = useState(false);
    const [activeUnitSelectionKey, setActiveUnitSelectionKey] = useState<string | null>(null);

    const updateQuantity = useCallback((key: string, qty: number) => {
        setGroups(prev => prev.map(g => ({
            ...g,
            items: g.items.map(item => item.key === key ? { ...item, quantity: qty } : item)
        })));
    }, []);

    const openUnitSelector = useCallback((key: string) => {
        setActiveUnitSelectionKey(key);
        setUnitSelectionModalVisible(true);
    }, []);

    const selectUnit = useCallback((unit: ServingUnit) => {
        if (activeUnitSelectionKey) {
            setGroups(prev => prev.map(g => ({
                ...g,
                items: g.items.map(item => item.key === activeUnitSelectionKey ? { ...item, selectedUnit: unit } : item)
            })));
        }
        setUnitSelectionModalVisible(false);
        setActiveUnitSelectionKey(null);
    }, [activeUnitSelectionKey]);

    const removeFood = useCallback((key: string) => {
        setGroups(prev => prev.map(g => ({
            ...g,
            items: g.items.filter(item => item.key !== key)
        })));
    }, []);

    const removeGroup = useCallback((groupId: string) => {
        Alert.alert(
            isArabic ? 'تأكيد الحذف' : 'Confirm Delete',
            isArabic ? 'هل تريد حذف هذه المجموعة؟' : 'Are you sure you want to delete this group?',
            [
                { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                { text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: () => {
                    setGroups(prev => prev.filter(g => g.id !== groupId));
                } }
            ]
        );
    }, [isArabic]);

    const handleAddCustomFood = () => {
        if (!customFoodForm.nameAr.trim() && !customFoodForm.nameEn.trim()) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'يرجى إدخال اسم الصنف/المكمل' : 'Please enter the item/supplement name');
            return;
        }

        const qty = Number(customFoodForm.quantity) || 1;
        const totalGrams = qty * selectedCustomUnit.grams;
        const normalize = (val: number) => totalGrams > 0 ? (val / totalGrams) * 100 : 0;

        const food: FoodResult = {
            id: `custom_${Date.now()}`,
            nameEn: customFoodForm.nameEn.trim() || customFoodForm.nameAr.trim(),
            nameAr: customFoodForm.nameAr.trim() || customFoodForm.nameEn.trim(),
            calories: normalize(Number(customFoodForm.calories) || 0),
            protein: normalize(Number(customFoodForm.protein) || 0),
            carbs: normalize(Number(customFoodForm.carbs) || 0),
            fat: normalize(Number(customFoodForm.fat) || 0),
            fiber: 0,
            defaultAddQuantity: qty,
            servingUnits: [
                {
                    unit: selectedCustomUnit.key,
                    grams: selectedCustomUnit.grams,
                    labelEn: selectedCustomUnit.labelEn,
                    labelAr: selectedCustomUnit.labelAr
                },
                ...WEIGHT_UNITS
            ]
        };
        
        setCustomFoodModalVisible(false);
        setCustomFoodForm({ nameEn: '', nameAr: '', calories: '', protein: '', carbs: '', fat: '', quantity: '1' });
        setSelectedCustomUnit(SUPPLEMENT_UNITS[0]);
        // Directly add to group modal with pre-set quantity
        setTargetFoodToAdd(food);
        setNewGroupName('');
        setSelectedGroupId(null);
        setGroupModalVisible(true);
        setSearchText('');
        setShowResults(false);
        setSearchResults([]);
    };

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
        return groups.reduce(
            (acc, group) => {
                const groupTotals = group.items.reduce(
                    (gAcc, item) => {
                        const m = calculateItemMacros(item);
                        return {
                            calories: gAcc.calories + m.calories,
                            protein: Math.round((gAcc.protein + m.protein) * 10) / 10,
                            carbs: Math.round((gAcc.carbs + m.carbs) * 10) / 10,
                            fat: Math.round((gAcc.fat + m.fat) * 10) / 10,
                        };
                    },
                    { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );
                return {
                    calories: acc.calories + groupTotals.calories,
                    protein: Math.round((acc.protein + groupTotals.protein) * 10) / 10,
                    carbs: Math.round((acc.carbs + groupTotals.carbs) * 10) / 10,
                    fat: Math.round((acc.fat + groupTotals.fat) * 10) / 10,
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }, [groups]);

    // ── External Actions (Save / Import / Share) ────────────────────────────────

    const getPlanData = (groupsToExport: DietGroup[], title: string) => {
        return {
            source: 'manual',
            title: title,
            createdAt: new Date().toISOString(),
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            groups: groupsToExport.map(g => ({
                id: g.id,
                name: g.name,
                items: g.items.map(item => {
                    const macros = calculateItemMacros(item);
                    return {
                        nameEn: item.food.nameEn, nameAr: item.food.nameAr,
                        quantity: item.quantity,
                        unit: isArabic ? item.selectedUnit.labelAr : item.selectedUnit.labelEn,
                        unitKey: item.selectedUnit.unit,
                        gramsPerUnit: item.selectedUnit.grams,
                        ...macros,
                        foodItem: item.food, // Retain original for re-importing
                        servingUnit: item.selectedUnit,
                    };
                })
            })),
        };
    };

    const saveMutation = useMutation({
        mutationFn: (planData: any) => api.post(clientId ? `/api/saved-diet-plans?targetClientId=${clientId}` : '/api/saved-diet-plans', { planData }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
            Alert.alert(
                isArabic ? '\u200F✅ تم الحفظ' : 'Saved ✅',
                clientId ? (isArabic ? '\u200Fتم حفظ الجدول في سجل المتدرب بنجاح' : "Diet plan saved successfully to Trainee's Plans") : (isArabic ? '\u200Fتم حفظ الجدول الغذائي بنجاح في جدولي الغذائي' : 'Diet plan saved successfully to My Diet Plans'),
                isArabic ? [
                    {
                        text: 'إضافة جدول آخر',
                        onPress: () => setGroups([]),
                    }, {
                        text: 'عرض الجداول',
                        onPress: () => {
                            setGroups([]);
                            navigation.navigate(clientId ? 'SharedDietTable' : 'DietTable', clientId ? { clientId } : undefined);
                        },
                    }
                ] : [
                    {
                        text: 'View Plans',
                        onPress: () => {
                            setGroups([]);
                            navigation.navigate(clientId ? 'SharedDietTable' : 'DietTable', clientId ? { clientId } : undefined);
                        },
                    }, {
                        text: 'Add Another',
                        onPress: () => setGroups([]),
                    }
                ]
            );
        },
        onError: (err: any) => Alert.alert(isArabic ? '\u200Fخطأ' : 'Error', isArabic ? `\u200F${err.message || 'فشل الحفظ'}` : (err.message || 'Failed to save')),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, planData }: { id: string, planData: any }) => api.put(clientId ? `/api/saved-diet-plans/${id}?targetClientId=${clientId}` : `/api/saved-diet-plans/${id}`, { planData }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
            Alert.alert(
                isArabic ? '\u200F✅ تم التعديل' : 'Updated ✅',
                isArabic ? '\u200Fتم تعديل الجدول الغذائي بنجاح' : 'Diet plan updated successfully',
                isArabic ? [
                    {
                        text: 'عرض الجداول',
                        onPress: () => navigation.navigate(clientId ? 'SharedDietTable' : 'DietTable', clientId ? { clientId } : undefined),
                    }, {
                        text: 'استمرار التعديل',
                        onPress: () => {},
                    }
                ] : [
                    {
                        text: 'Keep Editing',
                        onPress: () => {},
                    }, {
                        text: 'View Plans',
                        onPress: () => navigation.navigate(clientId ? 'SharedDietTable' : 'DietTable', clientId ? { clientId } : undefined),
                    }
                ]
            );
        },
        onError: (err: any) => Alert.alert(isArabic ? '\u200Fخطأ' : 'Error', isArabic ? `\u200F${err.message || 'فشل التعديل'}` : (err.message || 'Failed to update')),
    });

    const handleSave = () => {
        if (groups.every(g => g.items.length === 0)) {
            Alert.alert(isArabic ? '\u200Fلا توجد أصناف' : 'No items', isArabic ? '\u200Fأضف بعض الأصناف أولاً' : 'Add some food items first');
            return;
        }

        let baseTitle = planTitle.trim() || (groups.length > 0 ? groups[0].name : (isArabic ? 'جدول غذائي' : 'Diet Plan'));
        
        let existingMatchedPlanId: string | null = null;
        let existingMatchedPlanData: any = null;

        if (savedPlans && !editPlanId) {
            const matchedPlan = savedPlans.find(p => {
                try {
                    const pd = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData;
                    return pd?.title?.toLowerCase() === baseTitle.toLowerCase();
                } catch { return false; }
            });

            if (matchedPlan) {
                existingMatchedPlanId = matchedPlan.id;
                try {
                    existingMatchedPlanData = typeof matchedPlan.planData === 'string' ? JSON.parse(matchedPlan.planData) : matchedPlan.planData;
                } catch {}
            }
        }

        const localPlanData = getPlanData(groups, baseTitle);

        if (existingMatchedPlanId && existingMatchedPlanData && existingMatchedPlanData.groups) {
            // MERGE MODE
            const mergedGroups = [...existingMatchedPlanData.groups];
            localPlanData.groups.forEach((localGroup: any) => {
                const existingGroupIndex = mergedGroups.findIndex((g: any) => g.name && localGroup.name && g.name.trim().toLowerCase() === localGroup.name.trim().toLowerCase());
                if (existingGroupIndex >= 0) {
                    // Append items to existing group
                    mergedGroups[existingGroupIndex] = {
                        ...mergedGroups[existingGroupIndex],
                        items: [...(mergedGroups[existingGroupIndex].items || []), ...(localGroup.items || [])]
                    };
                } else {
                    // Add as a new group
                    mergedGroups.push({ ...localGroup, id: Date.now().toString() + Math.random().toString() });
                }
            });

            // Recalculate totals
            let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
            mergedGroups.forEach((g: any) => {
                g.items?.forEach((item: any) => {
                    totalCalories += Number(item.calories) || 0;
                    totalProtein += Number(item.protein) || 0;
                    totalCarbs += Number(item.carbs) || 0;
                    totalFat += Number(item.fat) || 0;
                });
            });

            const mergedPlanData = {
                ...existingMatchedPlanData,
                groups: mergedGroups,
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalCarbs: Math.round(totalCarbs * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10,
            };

            updateMutation.mutate({ id: existingMatchedPlanId, planData: mergedPlanData });
            return;
        }

        let finalTitle = baseTitle;

        if (savedPlans && !existingMatchedPlanId) {
            let attempt = 1;
            while (savedPlans.some(p => {
                if (editPlanId && p.id === editPlanId) return false;
                try {
                    const pd = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData;
                    return pd?.title?.toLowerCase() === finalTitle.toLowerCase();
                } catch { return false; }
            })) {
                attempt++;
                finalTitle = `${baseTitle} ${attempt}`;
            }
        }

        const finalPlanData = getPlanData(groups, finalTitle);
        if (editPlanId) {
            updateMutation.mutate({ id: editPlanId, planData: finalPlanData });
        } else {
            saveMutation.mutate(finalPlanData);
        }
    };


    // ── Render helpers ──────────────────────────────────────────────────────────

    const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)';
    const inputBg = isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9';

    const hasItems = groups.some(g => g.items.length > 0);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header omitted since it is now entirely handled natively by TabNavigator */}

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
                        style={{ padding: 6, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderRadius: 8, marginStart: 4 }}
                    >
                        <Ionicons name="barcode-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Quick Actions ── */}
                {!showResults && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'flex-start' }}>
                        <TouchableOpacity 
                            style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#10b981' }}
                            onPress={() => setCustomFoodModalVisible(true)}
                        >
                            <Ionicons name="add-circle" size={18} color="#10b981" style={{ marginEnd: 6 }} />
                            <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 13 }}>
                                {isArabic ? 'إضافة صنف مخصص / مكمل' : 'Add Custom / Supplement'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

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
                                    onPress={() => handleAddFoodInit(item)}
                                >
                                    <View style={{ flex: 1, marginEnd: 8 }}>
                                        <Text style={[styles.resultName, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                                            {isArabic ? item.nameAr : item.nameEn}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 1, textAlign: isArabic ? 'right' : 'left' }} numberOfLines={1}>
                                            {isArabic ? item.nameEn : item.nameAr} · {item.calories} cal/100g
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle" size={26} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            ListFooterComponent={() => (
                                <View>
                                    <TouchableOpacity
                                        style={[styles.resultItem, { borderBottomColor: colors.border, justifyContent: 'center', backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.05)' }]}
                                        onPress={() => performSearch(searchText, true)}
                                        disabled={isSearching}
                                    >
                                        <Ionicons name="cloud-download-outline" size={20} color={colors.primary} style={{ marginEnd: 8 }} />
                                        <Text style={[styles.resultName, { color: colors.primary }]}>
                                            {isSearching ? (isArabic ? 'جاري البحث في القاعدة العالمية...' : 'Searching global database...') : (isArabic ? 'لم تجد الصنف؟ ابحث في القاعدة العالمية' : "Can't find it? Search global database")}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[styles.resultItem, { borderBottomColor: 'transparent', justifyContent: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }]}
                                        onPress={() => { setCustomFoodModalVisible(true); setShowResults(false); }}
                                    >
                                        <Ionicons name="add-circle-outline" size={20} color="#10b981" style={{ marginEnd: 8 }} />
                                        <Text style={[styles.resultName, { color: '#10b981' }]}>
                                            {isArabic ? 'إضافة صنف مخصص / مكمل غذائي' : 'Add Custom Item / Supplement'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
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
                            style={[styles.saveButton, { paddingVertical: 10, backgroundColor: isSearching ? colors.mutedText : '#3b82f6', marginBottom: 12 }]}
                            onPress={() => performSearch(searchText, true)}
                            disabled={isSearching}
                        >
                            {isSearching ? (
                                <Text style={styles.saveButtonText}>{isArabic ? 'جاري البحث...' : 'Searching...'}</Text>
                            ) : (
                                <Text style={styles.saveButtonText}>{isArabic ? 'ابحث في القاعدة العالمية (USDA)' : 'Search Global Database (USDA)'}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, { paddingVertical: 10, backgroundColor: '#10b981' }]}
                            onPress={() => { setCustomFoodModalVisible(true); setShowResults(false); }}
                        >
                            <Text style={styles.saveButtonText}>{isArabic ? 'إضافة صنف مخصص / مكمل غذائي' : 'Add Custom Item / Supplement'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Groups & Foods List ── */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: hasItems ? 230 : 30, gap: 16 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {!hasItems && (
                        <View style={styles.emptyState}>
                            <Ionicons name="restaurant-outline" size={52} color={colors.mutedText} />
                            <Text style={{ fontSize: 16, color: colors.mutedText, textAlign: 'center', fontWeight: '600' }}>
                                {clientId ? (isArabic ? 'جدول المتدرب فارغ حالياً' : "Trainee's plan is currently empty") : (isArabic ? 'جدولك فارغ حالياً' : 'Your plan is currently empty')}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.mutedText, textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
                                {isArabic
                                    ? 'ابحث عن الأطعمة وأضفها في مجموعات (وجبات) لتكوين جدولك'
                                    : 'Search for foods and add them into groups (meals) to build your plan'}
                            </Text>
                        </View>
                    )}

                    {groups.map(group => {
                        const groupMacros = group.items.reduce((acc, item) => {
                            const m = calculateItemMacros(item);
                            return {
                                calories: acc.calories + m.calories,
                                protein: acc.protein + m.protein,
                                carbs: acc.carbs + m.carbs,
                                fat: acc.fat + m.fat,
                            };
                        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

                        return (
                            <View key={group.id} style={{ marginBottom: 16 }}>
                                {/* Group Header */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{group.name}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeGroup(group.id)} style={{ padding: 4 }}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>

                                {group.items.length === 0 && (
                                    <View style={{ padding: 16, backgroundColor: cardBg, borderRadius: 14, borderColor: colors.border, borderWidth: 1, alignItems: 'center' }}>
                                        <Text style={{ color: colors.mutedText }}>{isArabic ? 'لا توجد أطعمة في هذه المجموعة' : 'No foods currently in this group'}</Text>
                                    </View>
                                )}

                                <View style={{ gap: 10 }}>
                                    {group.items.map(item => {
                                        const macros = calculateItemMacros(item);
                                        return (
                                            <View key={item.key} style={[styles.foodCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
                                                <View style={styles.foodCardHeader}>
                                                    <View style={{ flex: 1, alignItems: 'flex-start', marginEnd: 8 }}>
                                                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                                                            {isArabic ? item.food.nameAr : item.food.nameEn}
                                                        </Text>
                                                    </View>
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
                                                        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, textAlign: 'right' }}>{macros.calories}</Text>
                                                        <Text style={{ fontSize: 10, color: colors.mutedText, marginTop: -2, textAlign: 'right' }}>{isArabic ? 'سعرة' : 'Cal'}</Text>
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
                                </View>

                                {/* Group Footer Totals */}
                                {group.items.length > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 8 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedText }}>{isArabic ? 'إجمالي المجموعة' : 'Group Total'}</Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>{groupMacros.calories} Cal | {Math.round(groupMacros.protein)}g P | {Math.round(groupMacros.carbs)}g C | {Math.round(groupMacros.fat)}g F</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* ── Total Bar + Save Button (always visible when items exist) ── */}
                {hasItems && (
                    <View style={[styles.totalBar, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: colors.border }]}>
                        
                        <TouchableOpacity
                            style={[styles.saveButton, { opacity: saveMutation.isPending || updateMutation.isPending ? 0.6 : 1, marginBottom: 12, marginTop: 4 }]}
                            onPress={handleSave}
                            disabled={saveMutation.isPending || updateMutation.isPending}
                            testID="button-save-manual-plan"
                            activeOpacity={0.8}
                        >
                            {saveMutation.isPending || updateMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="bookmark" size={20} color="#ffffff" style={{ marginHorizontal: 8 }} />
                                    <Text style={styles.saveButtonText}>
                                        {editPlanId ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (clientId ? (isArabic ? 'حفظ كجدول للمتدرب' : 'Save as Trainee Plan') : (isArabic ? 'حفظ في جدولي الغذائي' : 'Save to My Diet Plans'))}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

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
                        {activeUnitSelectionKey && groups.flatMap(g => g.items).find(f => f.key === activeUnitSelectionKey)?.food.servingUnits.map((u, i) => (
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

            {/* ── Custom Food / Supplement Modal ── */}
            <Modal visible={isCustomFoodModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border, padding: 16, maxWidth: 380 }]}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                                {isArabic ? 'إضافة صنف / مكمل غذائي' : 'Add Custom / Supplement'}
                            </Text>
                            <TouchableOpacity onPress={() => setCustomFoodModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={{ gap: 16 }}>
                                {/* ── Name ── */}
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                                        {isArabic ? 'اسم الصنف / المكمل' : 'Item / Supplement Name'}
                                    </Text>
                                    <TextInput
                                        style={[styles.quantityInput, { width: '100%', height: 44, backgroundColor: inputBg, color: colors.text, borderColor: colors.border, textAlign: isArabic ? 'right' : 'left', paddingHorizontal: 14 }]}
                                        placeholder={isArabic ? 'مثال: واي بروتين، كرياتين...' : 'e.g., Whey Protein, Creatine...'}
                                        placeholderTextColor={colors.mutedText}
                                        value={isArabic ? customFoodForm.nameAr : customFoodForm.nameEn}
                                        onChangeText={t => {
                                            if (isArabic) setCustomFoodForm({...customFoodForm, nameAr: t, nameEn: customFoodForm.nameEn || t});
                                            else setCustomFoodForm({...customFoodForm, nameEn: t, nameAr: customFoodForm.nameAr || t});
                                        }}
                                    />
                                </View>

                                {/* ── Unit Selection as List ── */}
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                                        {isArabic ? 'وحدة القياس' : 'Serving Unit'}
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row', paddingHorizontal: 2 }}>
                                        {SUPPLEMENT_UNITS.map(u => (
                                            <TouchableOpacity 
                                                key={u.key}
                                                onPress={() => setSelectedCustomUnit(u)}
                                                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: selectedCustomUnit.key === u.key ? '#10b981' : colors.border, backgroundColor: selectedCustomUnit.key === u.key ? (isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7') : 'transparent' }}
                                            >
                                                <Text style={{ fontSize: 13, fontWeight: selectedCustomUnit.key === u.key ? '700' : '500', color: selectedCustomUnit.key === u.key ? '#10b981' : colors.text }}>
                                                    {isArabic ? u.labelAr : u.labelEn}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* ── Quantity ── */}
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                                        {isArabic ? 'الكمية' : 'Quantity'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TextInput
                                            style={[styles.quantityInput, { width: 80, height: 44, backgroundColor: inputBg, color: colors.text, borderColor: colors.border, fontSize: 18, fontWeight: '700' }]}
                                            keyboardType="numeric"
                                            value={customFoodForm.quantity}
                                            onChangeText={t => setCustomFoodForm({...customFoodForm, quantity: t})}
                                            textAlign="center"
                                        />
                                        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>
                                            {isArabic ? selectedCustomUnit.labelAr : selectedCustomUnit.labelEn}
                                        </Text>
                                    </View>
                                </View>

                                {/* ── Optional Macros ── */}
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4, textAlign: isArabic ? 'right' : 'left' }}>
                                        {isArabic ? 'القيم الغذائية (اختياري)' : 'Macros (Optional)'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.mutedText, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                                        {isArabic ? 'لن تُحتسب إذا لم تُدخلها' : 'Will not count if left empty'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                        <View style={{ flex: 1, minWidth: 70 }}>
                                            <Text style={{ fontSize: 11, color: colors.mutedText, marginBottom: 4, textAlign: 'center' }}>{isArabic ? 'سعرات' : 'Cal'}</Text>
                                            <TextInput style={[styles.quantityInput, { width: '100%', backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="numeric" placeholder="-" placeholderTextColor={colors.mutedText} value={customFoodForm.calories} onChangeText={t => setCustomFoodForm({...customFoodForm, calories: t})} textAlign="center" />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 70 }}>
                                            <Text style={{ fontSize: 11, color: '#3b82f6', marginBottom: 4, textAlign: 'center' }}>{isArabic ? 'بروتين' : 'Protein'}</Text>
                                            <TextInput style={[styles.quantityInput, { width: '100%', backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="numeric" placeholder="-" placeholderTextColor={colors.mutedText} value={customFoodForm.protein} onChangeText={t => setCustomFoodForm({...customFoodForm, protein: t})} textAlign="center" />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 70 }}>
                                            <Text style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4, textAlign: 'center' }}>{isArabic ? 'كارب' : 'Carbs'}</Text>
                                            <TextInput style={[styles.quantityInput, { width: '100%', backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="numeric" placeholder="-" placeholderTextColor={colors.mutedText} value={customFoodForm.carbs} onChangeText={t => setCustomFoodForm({...customFoodForm, carbs: t})} textAlign="center" />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 70 }}>
                                            <Text style={{ fontSize: 11, color: '#ef4444', marginBottom: 4, textAlign: 'center' }}>{isArabic ? 'دهون' : 'Fat'}</Text>
                                            <TextInput style={[styles.quantityInput, { width: '100%', backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="numeric" placeholder="-" placeholderTextColor={colors.mutedText} value={customFoodForm.fat} onChangeText={t => setCustomFoodForm({...customFoodForm, fat: t})} textAlign="center" />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={handleAddCustomFood}>
                            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginEnd: 8 }} />
                            <Text style={styles.saveButtonText}>{isArabic ? 'إضافة للجدول' : 'Add to Plan'}</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
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

            {/* ── Group Selection Modal ── */}
            <Modal visible={isGroupModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                                {isArabic ? targetFoodToAdd?.nameAr : targetFoodToAdd?.nameEn}
                            </Text>
                            <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={{ marginStart: 12 }}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: colors.mutedText, marginBottom: 12, textAlign: 'left', paddingHorizontal: 16 }}>
                            {isArabic ? 'اختر مجموعة أو أضف مجموعة جديدة:' : 'Select a group or add a new one:'}
                        </Text>

                        <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                            {groups.map(g => (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[styles.groupSelector, { borderColor: selectedGroupId === g.id ? colors.primary : colors.border }]}
                                    onPress={() => setSelectedGroupId(g.id)}
                                >
                                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                        <Text style={{ color: selectedGroupId === g.id ? colors.primary : colors.text }}>{g.name}</Text>
                                    </View>
                                    {selectedGroupId === g.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginStart: 8 }} />}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.groupSelector, { borderColor: selectedGroupId === 'NEW' ? colors.primary : colors.border }]}
                                onPress={() => setSelectedGroupId('NEW')}
                            >
                                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                    <Text style={{ color: selectedGroupId === 'NEW' ? colors.primary : colors.text }}>
                                        {isArabic ? 'مجموعة جديدة (وجبة جديدة) +' : '+ New Group (Meal)'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        {selectedGroupId === 'NEW' && (
                            <View style={{ marginBottom: 20 }}>
                                <TextInput
                                    style={[{ fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, color: colors.text, borderColor: colors.border, borderWidth: 1, backgroundColor: inputBg, textAlign: isArabic ? 'right' : 'left' }]}
                                    value={newGroupName}
                                    onChangeText={setNewGroupName}
                                    placeholder={isArabic ? 'أدخل اسم المجموعة...' : 'Enter group name...'}
                                    placeholderTextColor={colors.mutedText}
                                />
                                {suggestedGroupNames.filter(n => !groups.some(g => g.name === n)).length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                                        {suggestedGroupNames.filter(n => !groups.some(g => g.name === n)).map(name => (
                                            <TouchableOpacity 
                                                key={`sugg_${name}`} 
                                                style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.primary }}
                                                onPress={() => setNewGroupName(name)}
                                            >
                                                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        <TouchableOpacity style={[styles.saveButton, { width: '100%', paddingVertical: 14 }]} onPress={processAddFoodToGroup}>
                            <Text style={[styles.saveButtonText, { textAlign: 'center', flex: 1 }]}>{isArabic ? 'إضافة' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
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
        marginEnd: 8,
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
        paddingBottom: 90,
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    groupSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
        marginHorizontal: 16,
    },
});
