import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DietPlanDisplayProps {
    plan: any;
    colors: any;
    isDark: boolean;
    t: (key: string) => string;
    isArabicSystem: boolean;
}

export default function DietPlanDisplay({ plan, colors, isDark, t, isArabicSystem }: DietPlanDisplayProps) {
    const [selectedMeals, setSelectedMeals] = useState<Record<string, boolean>>({});
    const [calculatorTotals, setCalculatorTotals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

    // Detect if the plan was generated in Arabic (based on content)
    const isPlanContentArabic = /[\u0600-\u06FF]/.test(plan.summary || plan.goalDescription || plan.healthSummary || '');
    const directionStyle = { direction: isPlanContentArabic ? 'rtl' : 'ltr' } as const;
    const tAlign = isPlanContentArabic ? 'right' : 'left';
    const flexDir = isPlanContentArabic ? 'row-reverse' : 'row';
    const styles = React.useMemo(() => getStyles(tAlign, flexDir), [tAlign, flexDir]);

    useEffect(() => {
        const initialSelection: Record<string, boolean> = {};
        if (plan && plan.mealPlan) {
            ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((type) => {
                if (plan.mealPlan[type]?.length > 0) {
                    initialSelection[`${type}-0`] = true;
                }
            });
        }
        setSelectedMeals(initialSelection);
    }, [plan]);

    useEffect(() => {
        if (!plan?.mealPlan) return;
        let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
        ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((type) => {
            const meals = plan.mealPlan[type];
            if (meals && meals.length > 0) {
                let selectedIdx = 0;
                for (let i = 0; i < meals.length; i++) {
                    if (selectedMeals[`${type}-${i}`]) {
                        selectedIdx = i;
                        break;
                    }
                }
                const m = meals[selectedIdx];
                if (m) {
                    totalCal += (m.calories || 0);
                    totalP += (m.protein || 0);
                    totalC += (m.carbs || 0);
                    totalF += (m.fats || 0);
                }
            }
        });
        setCalculatorTotals({ calories: totalCal, protein: totalP, carbs: totalC, fats: totalF });
    }, [selectedMeals, plan]);

    const toggleMealSelection = (type: string, index: number) => {
        setSelectedMeals(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
                if (k.startsWith(`${type}-`)) delete next[k];
            });
            next[`${type}-${index}`] = true;
            return next;
        });
    };

    if (!plan) return null;

    return (
        <View style={[styles.container, directionStyle]}>
            {plan.healthSummary && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="heart" size={20} color="#ef4444" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('healthSummary')}</Text>
                    </View>
                    <Text style={[styles.cardText, { color: colors.mutedText }]}>{plan.healthSummary}</Text>
                </View>
            )}

            {plan.calories && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="flame" size={20} color="#f59e0b" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('calories')}</Text>
                    </View>
                    <View style={styles.calorieRow}>
                        <View style={styles.calorieStat}>
                            <Text style={styles.calorieValue}>{plan.calories.bmr}</Text>
                            <Text style={[styles.calorieLabel, { textAlign: 'center' }]}>{t('bmr')}</Text>
                        </View>
                        <View style={styles.calorieStat}>
                            <Text style={styles.calorieValue}>{plan.calories.tdee}</Text>
                            <Text style={[styles.calorieLabel, { textAlign: 'center' }]}>{t('tdee')}</Text>
                        </View>
                        <View style={styles.calorieStat}>
                            <Text style={[styles.calorieValue, { color: '#22c55e' }]}>{plan.calories.target}</Text>
                            <Text style={[styles.calorieLabel, { textAlign: 'center' }]}>{t('target')}</Text>
                        </View>
                    </View>
                    {plan.macros && (
                        <View style={styles.macroRow}>
                            <View style={[styles.macroBadge, { backgroundColor: '#dbeafe' }]}>
                                <Text style={[styles.macroText, { color: '#2563eb' }]}>{t('protein')} {plan.macros.protein?.grams}g</Text>
                            </View>
                            <View style={[styles.macroBadge, { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.macroText, { color: '#d97706' }]}>{t('carbs')} {plan.macros.carbs?.grams}g</Text>
                            </View>
                            <View style={[styles.macroBadge, { backgroundColor: '#fce7f3' }]}>
                                <Text style={[styles.macroText, { color: '#db2777' }]}>{t('fats')} {plan.macros.fats?.grams}g</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {plan.intakeAlignment && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="analytics" size={20} color="#6366f1" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('intakeAlignment') || (isPlanContentArabic ? 'مدى توافق الأكل مع الهدف' : 'Intake Alignment with Your Goal')}</Text>
                    </View>
                    <Text style={[styles.cardText, { color: colors.mutedText }]}>{plan.intakeAlignment}</Text>
                </View>
            )}

            {plan.mealPlan && ['breakfast', 'lunch', 'dinner', 'snacks'].map((mealType) => {
                const meals = plan.mealPlan[mealType];
                if (!meals || meals.length === 0) return null;
                const mealIcons: Record<string, string> = { breakfast: 'sunny', lunch: 'restaurant', dinner: 'moon', snacks: 'cafe' };
                return (
                    <View key={mealType} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name={mealIcons[mealType] as any} size={20} color="#f59e0b" />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{t(mealType)}</Text>
                        </View>
                        {meals.map((meal: any, idx: number) => {
                            const isSelected = selectedMeals[`${mealType}-${idx}`];
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.mealItem,
                                        isSelected && { borderColor: '#3b82f6', backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderWidth: 1 }
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => toggleMealSelection(mealType, idx)}
                                >
                                    <View style={styles.mealHeaderRow}>
                                        <Text style={[styles.mealOptionLabel, isSelected && { color: '#3b82f6' }]}>
                                            {t('mealOption')} {idx + 1}
                                        </Text>
                                        <Ionicons
                                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                            size={22}
                                            color={isSelected ? "#3b82f6" : colors.mutedText}
                                        />
                                    </View>
                                    <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
                                    <Text style={[styles.mealDesc, { color: colors.text }]}>{meal.description}</Text>
                                    <View style={styles.mealMacros}>
                                        <Text style={styles.mealMacroText}>{meal.calories} kcal</Text>
                                        <Text style={styles.mealMacroText}>P:{meal.protein}g</Text>
                                        <Text style={styles.mealMacroText}>C:{meal.carbs}g</Text>
                                        <Text style={styles.mealMacroText}>F:{meal.fats}g</Text>
                                    </View>
                                    {meal.benefits && <Text style={[styles.mealBenefits, { color: colors.mutedText }]}>{meal.benefits}</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            })}

            {plan.supplements && plan.supplements.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="medkit" size={20} color="#8b5cf6" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('supplements')}</Text>
                    </View>
                    {plan.supplements.map((sup: any, idx: number) => (
                        <View key={idx} style={styles.supplementItem}>
                            <Text style={[styles.supplementName, { color: colors.text }]}>{sup.name}</Text>
                            <Text style={[styles.supplementDetail, { color: colors.mutedText }]}>{sup.dosage} - {sup.reason}</Text>
                            {sup.duration && <Text style={[styles.supplementDetail, { color: colors.mutedText }]}>{t('supplementDuration')}: {sup.duration}</Text>}
                            {sup.targetLabValue && (
                                <View style={styles.targetLabRow}>
                                    <Ionicons name="flask" size={12} color="#6366f1" />
                                    <Text style={[styles.targetLabText, { color: colors.text }]}>{isPlanContentArabic ? 'القيمة المستهدفة' : 'Target'}: {sup.targetLabValue}</Text>
                                </View>
                            )}
                            {sup.scientificBasis && (
                                <View style={styles.scientificRow}>
                                    <Ionicons name="school" size={12} color="#8b5cf6" />
                                    <Text style={[styles.scientificText, { color: colors.mutedText }]}>{sup.scientificBasis}</Text>
                                </View>
                            )}
                            {sup.foodSources && sup.foodSources.length > 0 && (
                                <Text style={[styles.supplementFoods, { color: colors.mutedText }]}>{t('supplementFoodSources')}: {sup.foodSources.join(', ')}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {plan.conditionTips && plan.conditionTips.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="bulb" size={20} color="#22c55e" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('conditionTips')}</Text>
                    </View>
                    {plan.conditionTips.map((tip: any, idx: number) => (
                        <View key={idx} style={styles.tipItem}>
                            <Text style={[styles.tipCondition, { color: colors.text }]}>{tip.condition}</Text>
                            {tip.advice?.map((a: string, i: number) => (
                                <Text key={i} style={[styles.tipAdvice, { color: colors.text }]}>• {a}</Text>
                            ))}
                            {tip.avoidFoods && tip.avoidFoods.length > 0 && (
                                <Text style={[styles.tipAvoid, { color: colors.mutedText }]}>{t('avoidFoods')}: {tip.avoidFoods.join(', ')}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {plan.tips && plan.tips.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={20} color="#3b82f6" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('tips')}</Text>
                    </View>
                    {plan.tips.map((tip: string, idx: number) => (
                        <Text key={idx} style={[styles.tipText, { color: colors.text }]}>• {tip}</Text>
                    ))}
                </View>
            )}

            {plan.references && plan.references.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="library" size={20} color="#6b7280" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('scientificReferences') || 'Scientific References'}</Text>
                    </View>
                    <View style={styles.referencesList}>
                        {plan.references.map((ref: string, idx: number) => (
                            <Text key={idx} style={[styles.referenceText, { color: colors.mutedText }]}>• {ref}</Text>
                        ))}
                    </View>
                </View>
            )}

            <View style={[styles.calculatorBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: colors.border }]}>
                <View style={styles.calculatorHeader}>
                    <Text style={[styles.calculatorTitle, { color: colors.text }]}>{isPlanContentArabic ? 'مجموع الوجبات المحددة' : 'Selected Meals Total'}</Text>
                    <Text style={[styles.calculatorCalText, { color: '#f59e0b' }]}>
                        <Ionicons name="flame" size={16} color="#f59e0b" /> {calculatorTotals.calories} {isPlanContentArabic ? 'سعرة' : 'kcal'}
                    </Text>
                </View>
                <View style={styles.calculatorMacros}>
                    <View style={[styles.macroBadge, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[styles.macroText, { color: '#2563eb' }]}>P {calculatorTotals.protein}g</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: '#fce7f3' }]}>
                        <Text style={[styles.macroText, { color: '#db2777' }]}>C {calculatorTotals.carbs}g</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.macroText, { color: '#d97706' }]}>F {calculatorTotals.fats}g</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const getStyles = (tAlign: 'left' | 'right', flexDir: 'row' | 'row-reverse') => StyleSheet.create({
    container: {
        width: '100%',
        gap: 16,
    },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 4,
    },
    cardHeader: {
        flexDirection: flexDir,
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: tAlign,
    },
    cardText: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: tAlign,
    },
    calorieRow: {
        flexDirection: flexDir,
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        marginTop: 12,
    },
    calorieStat: {
        alignItems: 'center',
    },
    calorieValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#3b82f6',
    },
    calorieLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    macroRow: {
        flexDirection: flexDir,
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
    },
    macroBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    macroText: {
        fontSize: 12,
        fontWeight: '700',
    },
    mealItem: {
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    mealHeaderRow: {
        flexDirection: flexDir,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    mealOptionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: tAlign,
    },
    mealName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: tAlign,
    },
    mealDesc: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 8,
        textAlign: tAlign,
    },
    mealMacros: {
        flexDirection: flexDir,
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    mealMacroText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3b82f6',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
    },
    mealBenefits: {
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18,
        textAlign: tAlign,
    },
    supplementItem: {
        marginBottom: 16,
    },
    supplementName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: tAlign,
    },
    supplementDetail: {
        fontSize: 13,
        marginBottom: 2,
        textAlign: tAlign,
    },
    targetLabRow: {
        flexDirection: flexDir,
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    targetLabText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: tAlign,
    },
    scientificRow: {
        flexDirection: flexDir,
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 4,
    },
    scientificText: {
        fontSize: 12,
        flex: 1,
        textAlign: tAlign,
    },
    supplementFoods: {
        fontSize: 12,
        marginTop: 6,
        fontStyle: 'italic',
        textAlign: tAlign,
    },
    tipItem: {
        marginBottom: 12,
    },
    tipCondition: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: tAlign,
    },
    tipAdvice: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 4,
        textAlign: tAlign,
    },
    tipAvoid: {
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
        textAlign: tAlign,
    },
    tipText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 8,
        textAlign: tAlign,
    },
    referencesList: {
        gap: 6,
    },
    referenceText: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: tAlign,
    },
    calculatorBox: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    calculatorHeader: {
        flexDirection: flexDir,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    calculatorTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: tAlign,
    },
    calculatorCalText: {
        flexDirection: flexDir,
        alignItems: 'center',
        fontSize: 16,
        fontWeight: '700',
    },
    calculatorMacros: {
        flexDirection: flexDir,
        justifyContent: 'flex-start',
        gap: 12,
    },
});
