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

  const { data: savedPlans, isLoading } = useQuery<SavedPlan[]>({
    queryKey: ['savedDietPlans'],
    queryFn: async () => (await queries.savedDietPlans()) as SavedPlan[],
  });

  const savedPlansList = useMemo(() => (Array.isArray(savedPlans) ? savedPlans : []), [savedPlans]);

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));
    }, [])
  );

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
      const planStr = JSON.stringify(parsedPlan);
      const isPlanContentArabic = /[\u0600-\u06FF]/.test(planStr);

      const needsTranslation = (isArabic && !isPlanContentArabic) || (!isArabic && isPlanContentArabic);

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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
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
              ? 'أنشئ جدولًا غذائيًا من صفحة الغذاء ثم اضغط "تصدير إلى جدولي الغذائي".'
              : 'Generate a diet plan, then tap "Export to My Diet Plans".'}
          </Text>
        </View>
      ) : (
        savedPlansList.map((plan, index) => {
          const isExpanded = expandedId === plan.id;
          let parsedPlan = null;
          if (isExpanded) {
            try {
              parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData) : plan.planData;
            } catch (e) { }
          }

          return (
            <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.planHeaderContainer}>
                <TouchableOpacity activeOpacity={0.7} style={styles.planHeader} onPress={() => toggleExpand(plan.id, plan.planData)}>
                  <View>
                    <Text style={[styles.planTitle, { color: colors.text }]}>
                      {isArabic ? `الخطة رقم ${savedPlansList.length - index}` : `Plan #${savedPlansList.length - index}`}
                    </Text>
                    <Text style={[styles.planDate, { color: colors.mutedText }]}>
                      {formatAppDate(plan.createdAt, i18n.language, dateCalendar)}
                    </Text>
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
                  {translatingId === plan.id ? (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
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
});
