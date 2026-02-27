import React, { useCallback, useMemo, useState } from 'react';
import { Alert, I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useFocusEffect } from '@react-navigation/native';

import { queries } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';
import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';

interface SavedPlan {
  id: string;
  planData: string | unknown;
  createdAt: string;
}

const isArabic = I18nManager.isRTL;

export default function MyDietPlansScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const { colors } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');

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

  const openSavedPlan = (planData: string | unknown) => {
    try {
      const parsed = typeof planData === 'string' ? JSON.parse(planData) : planData;
      navigation.navigate('Diet', { openPlanData: parsed, openPlanNonce: Date.now() });
    } catch {
      Alert.alert(
        isArabic ? 'تعذر فتح الخطة' : 'Unable to open plan',
        isArabic ? 'هذا الجدول الغذائي غير صالح أو تالف.' : 'This saved plan is invalid or corrupted.'
      );
    }
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
        savedPlansList.map((plan, index) => (
          <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: colors.text }]}>
                {isArabic ? `الخطة رقم ${index + 1}` : `Plan #${index + 1}`}
              </Text>
              <Text style={[styles.planDate, { color: colors.mutedText }]}>
                {formatAppDate(plan.createdAt, i18n.language, dateCalendar)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openButton}
              onPress={() => openSavedPlan(plan.planData)}
              testID={`button-open-saved-plan-${plan.id}`}
            >
              <Ionicons name="open-outline" size={18} color="#ffffff" />
              <Text style={styles.openButtonText}>{isArabic ? 'فتح الجدول' : 'Open Plan'}</Text>
            </TouchableOpacity>
          </View>
        ))
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: isArabic ? 'right' : 'left',
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
  planHeader: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDate: {
    fontSize: 12,
  },
  openButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
