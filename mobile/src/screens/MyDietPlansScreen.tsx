import React, { useCallback, useMemo, useState } from 'react';
import { Alert, I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useFocusEffect } from '@react-navigation/native';

import { api, queries } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';
import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';
import DietPlanDisplay from '../components/DietPlanDisplay';

interface SavedPlan {
  id: string;
  planData: string | unknown;
  createdAt: string;
}

const isArabic = I18nManager.isRTL;

export default function MyDietPlansScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: savedPlans, isLoading, refetch } = useQuery<SavedPlan[]>({
    queryKey: ['savedDietPlans'],
    queryFn: async () => (await queries.savedDietPlans()) as SavedPlan[],
  });

  const savedPlansList = useMemo(() => (Array.isArray(savedPlans) ? savedPlans : []), [savedPlans]);

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));
      refetch();
    }, [refetch])
  );
  const globalTotals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    savedPlansList.forEach(plan => {
      let parsedPlan: any = null;
      try {
        parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData as string) : plan.planData;
      } catch (e) { }

      if (parsedPlan?.source === 'manual') {
        calories += Number(parsedPlan.totalCalories) || 0;
        protein += Number(parsedPlan.totalProtein) || 0;
        carbs += Number(parsedPlan.totalCarbs) || 0;
        fat += Number(parsedPlan.totalFat) || 0;
      } else if (parsedPlan?.macros) { // AI plans fallback if available
        calories += Number(parsedPlan.macros.calories) || 0;
        protein += Number(parsedPlan.macros.protein) || 0;
        carbs += Number(parsedPlan.macros.carbs) || 0;
        fat += Number(parsedPlan.macros.fat) || 0;
      }
    });
    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [savedPlansList]);

  const translateMutation = useMutation({
    mutationFn: async ({ planId, targetLanguage }: { planId: string, targetLanguage: 'en' | 'ar' }) => {
      const res = await api.post('/api/diet-plan/translate', { planId, targetLanguage });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans'] });
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر ترجمة الخطة الغذائية' : 'Failed to translate diet plan'
      );
    }
  });

  const toggleExpand = async (id: string, planData: any) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    let parsedPlan = null;
    try {
      parsedPlan = typeof planData === 'string' ? JSON.parse(planData) : planData;
    } catch (e) { }

    if (parsedPlan) {
      const isManual = parsedPlan.source === 'manual';
      const planStr = JSON.stringify(parsedPlan);
      const isPlanContentArabic = /[\u0600-\u06FF]/.test(planStr);

      const needsTranslation = !isManual && ((isArabic && !isPlanContentArabic) || (!isArabic && isPlanContentArabic));

      if (needsTranslation) {
        setTranslatingId(id);
        setExpandedId(id);
        try {
          await translateMutation.mutateAsync({
            planId: id,
            targetLanguage: isArabic ? 'ar' : 'en'
          });
        } catch (err) {
          setExpandedId(null);
        } finally {
          setTranslatingId(null);
        }
        return;
      }
    }
    setExpandedId(id);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/saved-diet-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans'] });
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر حذف الخطة الغذائية' : 'Failed to delete diet plan'
      );
    }
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      isArabic ? 'حذف الخطة' : 'Delete Plan',
      isArabic ? 'هل أنت متأكد من حذف هذه الخطة الغذائية؟' : 'Are you sure you want to delete this diet plan?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.text }]}>
            {isArabic
              ? 'ملاحظة: يُفضّل تحديث الجدول الغذائي كل شهر للحصول على أفضل النتائج.'
              : 'Note: For best results, update your diet plan every month.'}
          </Text>
        </View>

        {isLoading ? (
          <Text style={[styles.infoText, { color: colors.mutedText }]}>
            {isArabic ? 'جاري تحميل الجداول...' : 'Loading plans...'}
          </Text>
        ) : savedPlansList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={42} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isArabic ? 'لا توجد جداول محفوظة بعد' : 'No saved plans yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
              {isArabic
                ? 'أنشئ جدولًا غذائيًا يدوياً أو بواسطة AI ثم احفظه هنا.'
                : 'Create a diet plan manually or with AI, then save it here.'}
            </Text>
          </View>
        ) : (
          savedPlansList.map((plan, index) => {
            const isExpanded = expandedId === plan.id;
            let parsedPlan: any = null;
            try {
              parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData as string) : plan.planData;
            } catch (e) { }

            const isManual = parsedPlan?.source === 'manual';

            return (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.planHeaderContainer}>
                  <TouchableOpacity activeOpacity={0.7} style={styles.planHeader} onPress={() => toggleExpand(plan.id, plan.planData)}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.planTitle, { color: colors.text }]}>
                          {isManual
                            ? (parsedPlan?.title || (isArabic ? 'جدول يدوي' : 'Manual Plan'))
                            : (isArabic ? `الخطة رقم ${savedPlansList.length - index}` : `Plan #${savedPlansList.length - index}`)}
                        </Text>
                        <View style={{ backgroundColor: isManual ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: isManual ? '#22c55e' : '#f59e0b', fontSize: 9, fontWeight: '700' }}>
                            {isManual ? (isArabic ? 'يدوي' : 'Manual') : 'AI'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.planDate, { color: colors.mutedText }]}>
                        {formatAppDate(plan.createdAt, i18n.language, dateCalendar)}
                      </Text>
                      {/* Show macros summary for manual plans */}
                      {isManual && parsedPlan && (
                        <View style={{ flexDirection: 'row', marginTop: 6, gap: 8 }}>
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{parsedPlan.totalCalories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                          <Text style={{ color: '#3b82f6', fontSize: 12 }}>P:{parsedPlan.totalProtein}g</Text>
                          <Text style={{ color: '#f59e0b', fontSize: 12 }}>C:{parsedPlan.totalCarbs}g</Text>
                          <Text style={{ color: '#ef4444', fontSize: 12 }}>F:{parsedPlan.totalFat}g</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(plan.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {isExpanded && (
                  <View style={[styles.planContentContainer, { borderTopColor: colors.border }]}>
                    {isManual && parsedPlan?.items ? (
                      <View style={{ gap: 8 }}>
                        {parsedPlan.items.map((item: any, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < parsedPlan.items.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {isArabic ? item.nameAr : item.nameEn}
                              </Text>
                              <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 2 }}>
                                {item.quantity} {item.unit}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{item.calories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                              <Text style={{ color: colors.mutedText, fontSize: 10, marginTop: 1 }}>P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
                            </View>
                          </View>
                        ))}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{isArabic ? 'الإجمالي' : 'Total'}</Text>
                          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '800' }}>{parsedPlan.totalCalories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                        </View>
                      </View>
                    ) : translatingId === plan.id ? (
                      <Text style={[styles.infoText, { color: colors.primary, marginVertical: 20 }]}>
                        {isArabic ? 'جاري ترجمة الخطة لتناسب لغة التطبيق...' : 'Translating plan to match app language...'}
                      </Text>
                    ) : parsedPlan ? (
                      <DietPlanDisplay
                        plan={parsedPlan}
                        colors={colors}
                        isDark={isDark}
                        t={t}
                        isArabicSystem={isArabic}
                      />
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {savedPlansList.length > 0 && (
        <View style={[styles.globalTotalsContainer, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: colors.border }]}>
          <Text style={{ fontSize: 13, color: colors.mutedText, marginBottom: 8, textAlign: 'center' }}>
            {isArabic ? 'إجمالي السعرات والماكروز لكل الجداول' : 'Total Macros Across All Plans'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{globalTotals.calories}</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'سعرة' : 'Cal'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#3b82f6' }}>{globalTotals.protein}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'بروتين' : 'Pro'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#f59e0b' }}>{globalTotals.carbs}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'كارب' : 'Carbs'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>{globalTotals.fat}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'دهون' : 'Fat'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  planHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDate: {
    fontSize: 12,
    marginTop: 4,
  },
  planContentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  globalTotalsContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});
