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

    const styles = React.useMemo(() => getStyles(), []);

    const mealKeys = plan?.mealSlots?.map((s: any) => s.key) || Object.keys(plan?.mealPlan || {}).filter(k => (plan.mealPlan[k] as any[])?.length > 0);
    const defaultMealKeys = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const activeMealKeys = mealKeys.length > 0 ? mealKeys : defaultMealKeys;

    useEffect(() => {
        const initialSelection: Record<string, boolean> = {};
        if (plan && plan.mealPlan) {
            activeMealKeys.forEach((type: string) => {
                if (plan.mealPlan[type]?.length > 0) {
                    initialSelection[`${type}-0`] = true;
                }
            });
        }
        setSelectedMeals(initialSelection);
    }, [plan]);

    const realCalFromMacros = (p: number, c: number, f: number) => Math.round((p * 4) + (c * 4) + (f * 9));

    useEffect(() => {
        if (!plan?.mealPlan) return;
        let totalP = 0, totalC = 0, totalF = 0;
        activeMealKeys.forEach((type: string) => {
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
                    totalP += (m.protein || 0);
                    totalC += (m.carbs || 0);
                    totalF += (m.fats || 0);
                }
            }
        });
        const totalCal = realCalFromMacros(totalP, totalC, totalF);
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
        <View style={styles.container}>
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
                                <Text style={[styles.macroText, { color: '#1e3a5f' }]}>{t('protein')} {plan.macros.protein?.grams}g</Text>
                            </View>
                            <View style={[styles.macroBadge, { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.macroText, { color: '#78350f' }]}>{t('carbs')} {plan.macros.carbs?.grams}g</Text>
                            </View>
                            <View style={[styles.macroBadge, { backgroundColor: '#fce7f3' }]}>
                                <Text style={[styles.macroText, { color: '#831843' }]}>{t('fats')} {plan.macros.fats?.grams}g</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {plan.intakeAlignment && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="analytics" size={20} color="#6366f1" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('intakeAlignment') || (isArabicSystem ? 'مدى توافق الأكل مع الهدف' : 'Intake Alignment with Your Goal')}</Text>
                    </View>
                    <Text style={[styles.cardText, { color: colors.mutedText }]}>{plan.intakeAlignment}</Text>
                </View>
            )}

            {plan.mealPlan && (
                <View style={[styles.card, { backgroundColor: isDark ? '#1a1a2e' : '#f0f4ff', borderColor: '#6366f1', borderWidth: 1 }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={20} color="#6366f1" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {isArabicSystem ? 'دليل قراءة الخطة الغذائية' : 'How to Read Your Meal Plan'}
                        </Text>
                    </View>
                    <Text style={[styles.cardText, { color: colors.mutedText, marginBottom: 10 }]}>
                        {isArabicSystem
                            ? 'كل وجبة تعرض لك معلومتين مهمتين: السعرات الحقيقية والسعرات المستهدفة. اختر خياراً واحداً من كل وجبة (فطور + غداء + عشاء + سناك) وسيحسب لك التطبيق المجموع تلقائياً.'
                            : 'Each meal shows two important values: actual calories and target calories. Pick one option from each meal (breakfast + lunch + dinner + snack) and the app calculates your daily total automatically.'}
                    </Text>
                    <View style={{ gap: 8 }}>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendBadge, { backgroundColor: '#6366f1' }]}>
                                <Text style={styles.legendBadgeText}>550 kcal</Text>
                            </View>
                            <Text style={[styles.legendLabel, { color: colors.text }]}>
                                {isArabicSystem
                                    ? 'السعرات الحقيقية — محسوبة من (بروتين×4 + كارب×4 + دهون×9)'
                                    : 'Actual calories — calculated from (protein×4 + carbs×4 + fats×9)'}
                            </Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendBadge, { backgroundColor: '#ef4444' }]}>
                                <Text style={styles.legendBadgeText}>{isArabicSystem ? 'المستهدف' : 'Target'}: 600 kcal</Text>
                            </View>
                            <Text style={[styles.legendLabel, { color: colors.text }]}>
                                {isArabicSystem
                                    ? 'السعرات المستهدفة — الحد الأقصى المخصص لهذه الوجبة من خطتك'
                                    : 'Target calories — the maximum allocated for this meal from your plan'}
                            </Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendBadge, { backgroundColor: '#22c55e' }]}>
                                <Text style={styles.legendBadgeText}>{isArabicSystem ? 'ضمن الهدف ✓' : 'Within target ✓'}</Text>
                            </View>
                            <Text style={[styles.legendLabel, { color: colors.text }]}>
                                {isArabicSystem
                                    ? 'السعرات الحقيقية أقل من أو تساوي المستهدف — ممتاز!'
                                    : 'Actual calories are at or below target — great!'}
                            </Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendBadge, { backgroundColor: '#f59e0b' }]}>
                                <Text style={styles.legendBadgeText}>{isArabicSystem ? 'أعلى من الهدف ⚠' : 'Above target ⚠'}</Text>
                            </View>
                            <Text style={[styles.legendLabel, { color: colors.text }]}>
                                {isArabicSystem
                                    ? 'السعرات الحقيقية أعلى قليلاً من المستهدف — يمكنك تقليل الكمية'
                                    : 'Actual calories slightly exceed target — you may reduce portion size'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.legendDivider, { borderColor: colors.border }]} />
                    <View style={styles.legendRow}>
                        <Ionicons name="calculator" size={16} color="#3b82f6" />
                        <Text style={[styles.legendLabel, { color: colors.mutedText, fontStyle: 'italic' }]}>
                            {isArabicSystem
                                ? 'P = بروتين (جرام) | C = كارب (جرام) | F = دهون (جرام)'
                                : 'P = Protein (g) | C = Carbs (g) | F = Fats (g)'}
                        </Text>

                    </View>
                </View>
            )}

            {plan.mealPlan && activeMealKeys.map((mealType: string) => {
                const meals = plan.mealPlan[mealType];
                if (!meals || meals.length === 0) return null;
                const defaultIcons: Record<string, string> = { breakfast: 'sunny', lunch: 'restaurant', dinner: 'moon', snacks: 'cafe' };
                const slotInfo = plan.mealSlots?.find((s: any) => s.key === mealType);
                const mealIcon = slotInfo?.icon || defaultIcons[mealType] || 'restaurant';
                const mealLabel = slotInfo
                    ? (isArabicSystem ? slotInfo.labelAr : slotInfo.labelEn)
                    : t(mealType);
                return (
                    <View key={mealType} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name={mealIcon as any} size={20} color="#f59e0b" />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{mealLabel}</Text>
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
                                        <Text style={[styles.mealMacroText, { backgroundColor: '#6366f1', color: '#000' }]}>{realCalFromMacros(meal.protein || 0, meal.carbs || 0, meal.fats || 0)} kcal</Text>
                                        <Text style={[styles.mealMacroText, { backgroundColor: '#dbeafe', color: '#000' }]}>P:{meal.protein}g</Text>
                                        <Text style={[styles.mealMacroText, { backgroundColor: '#fef3c7', color: '#000' }]}>C:{meal.carbs}g</Text>
                                        <Text style={[styles.mealMacroText, { backgroundColor: '#fce7f3', color: '#000' }]}>F:{meal.fats}g</Text>
                                    </View>
                                    {meal.targetCalories > 0 && (
                                        <View style={[styles.mealMacros, { marginTop: 4 }]}>
                                            <Text style={[styles.mealMacroText, { backgroundColor: '#ef4444', color: '#000' }]}>
                                                {isArabicSystem ? 'المستهدف' : 'Target'}: {meal.targetCalories} kcal
                                            </Text>
                                            <Text style={[styles.mealMacroText, { backgroundColor: meal.calories <= meal.targetCalories ? '#22c55e' : '#f59e0b', color: '#000' }]}>
                                                {meal.calories <= meal.targetCalories
                                                    ? (isArabicSystem ? 'ضمن الهدف' : 'Within target')
                                                    : (isArabicSystem ? 'أعلى من الهدف' : 'Above target')
                                                }
                                            </Text>
                                        </View>
                                    )}
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
                                    <Text style={[styles.targetLabText, { color: colors.text }]}>{isArabicSystem ? 'القيمة المستهدفة' : 'Target'}: {sup.targetLabValue}</Text>
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
                <Text style={[styles.calculatorTitle, { color: colors.text, textAlign: 'center', marginBottom: 12 }]}>
                    {isArabicSystem ? 'مجموع الوجبات المحددة' : 'Selected Meals Total'}
                </Text>

                <View style={styles.calculatorCalRow}>
                    <View style={styles.calculatorCalItem}>
                        <Ionicons name="flag" size={16} color="#ef4444" />
                        <Text style={[styles.calculatorCalValue, { color: '#ef4444' }]}>{plan.calories?.target || 0}</Text>
                        <Text style={[styles.calculatorCalLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'المستهدف' : 'Target'}
                        </Text>
                    </View>
                    <View style={styles.calculatorCalItem}>
                        <Ionicons name="flame" size={16} color="#6366f1" />
                        <Text style={[styles.calculatorCalValue, { color: '#6366f1' }]}>{calculatorTotals.calories}</Text>
                        <Text style={[styles.calculatorCalLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'الوجبات المحددة' : 'Selected Meals'}
                        </Text>
                    </View>
                    <View style={styles.calculatorCalItem}>
                        <Ionicons
                            name={calculatorTotals.calories <= (plan.calories?.target || 0) ? "checkmark-circle" : "warning"}
                            size={16}
                            color={calculatorTotals.calories <= (plan.calories?.target || 0) ? "#22c55e" : "#f59e0b"}
                        />
                        <Text style={[styles.calculatorCalValue, { color: calculatorTotals.calories <= (plan.calories?.target || 0) ? '#22c55e' : '#f59e0b' }]}>
                            {calculatorTotals.calories - (plan.calories?.target || 0)}
                        </Text>
                        <Text style={[styles.calculatorCalLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'الفرق' : 'Difference'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.calculatorDivider, { borderColor: colors.border }]} />

                <View style={styles.calculatorMacroComparison}>
                    <View style={styles.calculatorMacroItem}>
                        <Text style={[styles.calculatorMacroLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'بروتين' : 'Protein'}
                        </Text>
                        <Text style={[styles.calculatorMacroValue, { color: '#1e3a5f' }]}>
                            {calculatorTotals.protein}g / {plan.macros?.protein?.grams || 0}g
                        </Text>
                        <View style={styles.calculatorMacroBar}>
                            <View style={[styles.calculatorMacroBarFill, { backgroundColor: '#3b82f6', width: `${Math.min(100, Math.round((calculatorTotals.protein / (plan.macros?.protein?.grams || 1)) * 100))}%` as any }]} />
                        </View>
                    </View>
                    <View style={styles.calculatorMacroItem}>
                        <Text style={[styles.calculatorMacroLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'كربوهيدرات' : 'Carbs'}
                        </Text>
                        <Text style={[styles.calculatorMacroValue, { color: '#78350f' }]}>
                            {calculatorTotals.carbs}g / {plan.macros?.carbs?.grams || 0}g
                        </Text>
                        <View style={styles.calculatorMacroBar}>
                            <View style={[styles.calculatorMacroBarFill, { backgroundColor: '#f59e0b', width: `${Math.min(100, Math.round((calculatorTotals.carbs / (plan.macros?.carbs?.grams || 1)) * 100))}%` as any }]} />
                        </View>
                    </View>
                    <View style={styles.calculatorMacroItem}>
                        <Text style={[styles.calculatorMacroLabel, { color: colors.mutedText }]}>
                            {isArabicSystem ? 'دهون' : 'Fats'}
                        </Text>
                        <Text style={[styles.calculatorMacroValue, { color: '#831843' }]}>
                            {calculatorTotals.fats}g / {plan.macros?.fats?.grams || 0}g
                        </Text>
                        <View style={styles.calculatorMacroBar}>
                            <View style={[styles.calculatorMacroBarFill, { backgroundColor: '#ec4899', width: `${Math.min(100, Math.round((calculatorTotals.fats / (plan.macros?.fats?.grams || 1)) * 100))}%` as any }]} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const getStyles = () => StyleSheet.create({
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
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'left',
    },
    cardText: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'left',
    },
    calorieRow: {
        flexDirection: 'row',
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
        flexDirection: 'row',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    mealOptionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: 'left',
    },
    mealName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'left',
    },
    mealDesc: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 8,
        textAlign: 'left',
    },
    mealMacros: {
        flexDirection: 'row',
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
        textAlign: 'left',
    },
    supplementItem: {
        marginBottom: 16,
    },
    supplementName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'left',
    },
    supplementDetail: {
        fontSize: 13,
        marginBottom: 2,
        textAlign: 'left',
    },
    targetLabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    targetLabText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'left',
    },
    scientificRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 4,
    },
    scientificText: {
        fontSize: 12,
        flex: 1,
        textAlign: 'left',
    },
    supplementFoods: {
        fontSize: 12,
        marginTop: 6,
        fontStyle: 'italic',
        textAlign: 'left',
    },
    tipItem: {
        marginBottom: 12,
    },
    tipCondition: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'left',
    },
    tipAdvice: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 4,
        textAlign: 'left',
    },
    tipAvoid: {
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
        textAlign: 'left',
    },
    tipText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 8,
        textAlign: 'left',
    },
    referencesList: {
        gap: 6,
    },
    referenceText: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'left',
    },
    calculatorBox: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    calculatorTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'left',
    },
    calculatorCalRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 12,
    },
    calculatorCalItem: {
        alignItems: 'center',
        gap: 4,
    },
    calculatorCalValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    calculatorCalLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    calculatorDivider: {
        borderTopWidth: 1,
        marginVertical: 10,
    },
    calculatorMacroComparison: {
        gap: 10,
    },
    calculatorMacroItem: {
        gap: 4,
    },
    calculatorMacroLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    calculatorMacroValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    calculatorMacroBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#e5e7eb',
        overflow: 'hidden' as const,
    },
    calculatorMacroBarFill: {
        height: '100%' as any,
        borderRadius: 3,
    },
    legendRow: {
        alignItems: 'center',
        gap: 8,
    },
    legendBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    legendBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    legendLabel: {
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    legendDivider: {
        borderTopWidth: 1,
        marginVertical: 10,
    },
});
