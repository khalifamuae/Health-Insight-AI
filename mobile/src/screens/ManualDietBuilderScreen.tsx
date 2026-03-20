import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    ScrollView, ActivityIndicator, I18nManager, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
    key: string; // unique key per entry
    food: FoodResult;
    quantity: number;
    selectedUnit: ServingUnit;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManualDietBuilderScreen({ navigation }: any) {
    const { colors, isDark } = useAppTheme();
    const queryClient = useQueryClient();

    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextKeyRef = useRef(0);

    // ── Search ──────────────────────────────────────────────────────────────────

    const performSearch = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        setIsSearching(true);
        try {
            const data = await api.get<{ foods: FoodResult[] }>(`/api/food/search?q=${encodeURIComponent(query)}`);
            setSearchResults(data.foods || []);
            setShowResults(true);
        } catch (err) {
            console.error('Food search error:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (searchText.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => performSearch(searchText), 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchText, performSearch]);

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

    // ── Update quantity ─────────────────────────────────────────────────────────

    const updateQuantity = useCallback((key: string, qty: number) => {
        setSelectedFoods(prev =>
            prev.map(item => item.key === key ? { ...item, quantity: qty } : item)
        );
    }, []);

    // ── Update unit ─────────────────────────────────────────────────────────────

    const cycleUnit = useCallback((key: string) => {
        setSelectedFoods(prev =>
            prev.map(item => {
                if (item.key !== key) return item;
                const units = item.food.servingUnits;
                const currentIdx = units.findIndex(u => u.unit === item.selectedUnit.unit);
                const nextIdx = (currentIdx + 1) % units.length;
                return { ...item, selectedUnit: units[nextIdx] };
            })
        );
    }, []);

    // ── Remove food ─────────────────────────────────────────────────────────────

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
                isArabic ? 'تم الحفظ' : 'Saved',
                isArabic ? 'تم حفظ الجدول الغذائي بنجاح' : 'Diet plan saved successfully',
                [{
                    text: isArabic ? 'حسناً' : 'OK',
                    onPress: () => {
                        setSelectedFoods([]);
                        navigation.navigate({ name: 'Main', params: { screen: 'DietTable' }, merge: true } as any);
                    },
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
                    nameEn: item.food.nameEn,
                    nameAr: item.food.nameAr,
                    quantity: item.quantity,
                    unit: isArabic ? item.selectedUnit.labelAr : item.selectedUnit.labelEn,
                    unitKey: item.selectedUnit.unit,
                    gramsPerUnit: item.selectedUnit.grams,
                    calories: macros.calories,
                    protein: macros.protein,
                    carbs: macros.carbs,
                    fat: macros.fat,
                };
            }),
        };
        saveMutation.mutate(planData);
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)';
    const inputBg = isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9';

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.mutedText} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text, backgroundColor: inputBg }]}
                    placeholder={isArabic ? 'ابحث عن طعام... (مثال: دجاج، أرز)' : 'Search food... (e.g., chicken, rice)'}
                    placeholderTextColor={colors.mutedText}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                    textAlign={isArabic ? 'right' : 'left'}
                    testID="input-food-search"
                />
                {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchText(''); setShowResults(false); }}>
                        <Ionicons name="close-circle" size={20} color={colors.mutedText} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
                <View style={[styles.resultsContainer, { backgroundColor: cardBg, borderColor: colors.border }]}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={item => item.id}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 250 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                                onPress={() => addFood(item)}
                                testID={`result-${item.id}`}
                            >
                                <View style={styles.resultTextContainer}>
                                    <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                                        {isArabic ? item.nameAr : item.nameEn}
                                    </Text>
                                    <Text style={[styles.resultSub, { color: colors.mutedText }]} numberOfLines={1}>
                                        {isArabic ? item.nameEn : item.nameAr}
                                    </Text>
                                </View>
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {showResults && searchResults.length === 0 && !isSearching && searchText.length >= 2 && (
                <View style={[styles.resultsContainer, { backgroundColor: cardBg, borderColor: colors.border, padding: 16 }]}>
                    <Text style={[styles.noResults, { color: colors.mutedText }]}>
                        {isArabic ? 'لم يتم العثور على نتائج' : 'No results found'}
                    </Text>
                </View>
            )}

            {/* Selected Foods List */}
            <ScrollView
                style={styles.selectedList}
                contentContainerStyle={styles.selectedListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {selectedFoods.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="restaurant-outline" size={48} color={colors.mutedText} />
                        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                            {isArabic ? 'ابحث عن الأطعمة وأضفها هنا' : 'Search for foods and add them here'}
                        </Text>
                    </View>
                )}

                {selectedFoods.map(item => {
                    const macros = calculateItemMacros(item);
                    return (
                        <View key={item.key} style={[styles.foodCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
                            {/* Header row: name + delete */}
                            <View style={styles.foodCardHeader}>
                                <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
                                    {isArabic ? item.food.nameAr : item.food.nameEn}
                                </Text>
                                <TouchableOpacity onPress={() => removeFood(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </View>

                            {/* Quantity + Unit row */}
                            <View style={styles.quantityRow}>
                                <TextInput
                                    style={[styles.quantityInput, { color: colors.text, backgroundColor: inputBg, borderColor: colors.border }]}
                                    value={item.quantity.toString()}
                                    onChangeText={val => {
                                        const num = parseFloat(val) || 0;
                                        updateQuantity(item.key, num);
                                    }}
                                    keyboardType="numeric"
                                    selectTextOnFocus
                                    textAlign="center"
                                    testID={`qty-${item.key}`}
                                />
                                <TouchableOpacity
                                    style={[styles.unitButton, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderColor: colors.primary }]}
                                    onPress={() => cycleUnit(item.key)}
                                >
                                    <Text style={[styles.unitText, { color: colors.primary }]}>
                                        {isArabic ? item.selectedUnit.labelAr : item.selectedUnit.labelEn}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={colors.primary} />
                                </TouchableOpacity>

                                {/* Calories for this item */}
                                <View style={styles.itemCaloriesContainer}>
                                    <Text style={[styles.itemCalories, { color: colors.primary }]}>
                                        {macros.calories}
                                    </Text>
                                    <Text style={[styles.itemCaloriesLabel, { color: colors.mutedText }]}>
                                        {isArabic ? 'سعرة' : 'Cal'}
                                    </Text>
                                </View>
                            </View>

                            {/* Macros detail */}
                            <View style={styles.macrosRow}>
                                <View style={styles.macroItem}>
                                    <Text style={[styles.macroValue, { color: '#3b82f6' }]}>{macros.protein}g</Text>
                                    <Text style={[styles.macroLabel, { color: colors.mutedText }]}>{isArabic ? 'بروتين' : 'Protein'}</Text>
                                </View>
                                <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.macroItem}>
                                    <Text style={[styles.macroValue, { color: '#f59e0b' }]}>{macros.carbs}g</Text>
                                    <Text style={[styles.macroLabel, { color: colors.mutedText }]}>{isArabic ? 'كربوهيدرات' : 'Carbs'}</Text>
                                </View>
                                <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.macroItem}>
                                    <Text style={[styles.macroValue, { color: '#ef4444' }]}>{macros.fat}g</Text>
                                    <Text style={[styles.macroLabel, { color: colors.mutedText }]}>{isArabic ? 'دهون' : 'Fat'}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {/* Bottom spacer for total bar */}
                <View style={{ height: 200 }} />
            </ScrollView>

            {/* Total Bar + Save Button (Fixed at bottom) */}
            {selectedFoods.length > 0 && (
                <View style={[styles.totalBarContainer, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: colors.border }]}>
                    {/* Total Calories */}
                    <View style={styles.totalCaloriesRow}>
                        <Text style={[styles.totalCaloriesLabel, { color: colors.text }]}>
                            {isArabic ? 'إجمالي السعرات' : 'Total Calories'}
                        </Text>
                        <Text style={[styles.totalCaloriesValue, { color: colors.primary }]}>
                            {totals.calories}
                        </Text>
                    </View>

                    {/* Macro breakdown */}
                    <View style={styles.totalMacrosRow}>
                        <View style={[styles.totalMacroItem, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                            <Text style={[styles.totalMacroValue, { color: '#3b82f6' }]}>{totals.protein}g</Text>
                            <Text style={[styles.totalMacroLabel, { color: '#3b82f6' }]}>{isArabic ? 'بروتين' : 'Protein'}</Text>
                        </View>
                        <View style={[styles.totalMacroItem, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                            <Text style={[styles.totalMacroValue, { color: '#f59e0b' }]}>{totals.carbs}g</Text>
                            <Text style={[styles.totalMacroLabel, { color: '#f59e0b' }]}>{isArabic ? 'كربوهيدرات' : 'Carbs'}</Text>
                        </View>
                        <View style={[styles.totalMacroItem, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                            <Text style={[styles.totalMacroValue, { color: '#ef4444' }]}>{totals.fat}g</Text>
                            <Text style={[styles.totalMacroLabel, { color: '#ef4444' }]}>{isArabic ? 'دهون' : 'Fat'}</Text>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveButton, { opacity: saveMutation.isPending ? 0.6 : 1 }]}
                        onPress={handleSave}
                        disabled={saveMutation.isPending}
                        testID="button-save-manual-plan"
                    >
                        {saveMutation.isPending ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <>
                                <Ionicons name="bookmark" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveButtonText}>
                                    {isArabic ? 'حفظ في جدولي الغذائي' : 'Save to My Diet Plans'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    searchIcon: {
        marginRight: 4,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    resultsContainer: {
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        zIndex: 10,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    resultTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
    },
    resultSub: {
        fontSize: 12,
        marginTop: 2,
    },
    noResults: {
        textAlign: 'center',
        fontSize: 14,
    },
    selectedList: {
        flex: 1,
    },
    selectedListContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
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
        width: 70,
        height: 40,
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
    itemCaloriesContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    itemCalories: {
        fontSize: 22,
        fontWeight: '800',
    },
    itemCaloriesLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: -2,
    },
    macrosRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(148,163,184,0.2)',
    },
    macroItem: {
        alignItems: 'center',
        flex: 1,
    },
    macroValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    macroLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    macroDivider: {
        width: 1,
        height: 24,
        opacity: 0.4,
    },
    totalBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 36,
        borderTopWidth: 1,
        gap: 10,
    },
    totalCaloriesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalCaloriesLabel: {
        fontSize: 17,
        fontWeight: '700',
    },
    totalCaloriesValue: {
        fontSize: 26,
        fontWeight: '800',
    },
    totalMacrosRow: {
        flexDirection: 'row',
        gap: 8,
    },
    totalMacroItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
    },
    totalMacroValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    totalMacroLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#3b82f6',
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
});
