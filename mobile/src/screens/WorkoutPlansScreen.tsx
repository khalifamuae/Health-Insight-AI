import React, { useCallback, useState } from 'react';
import { Alert, I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';

import { useAppTheme } from '../context/ThemeContext';
import { deleteWorkoutPlan, getSavedWorkoutPlans, type WorkoutPlan } from '../lib/workoutPlans';
import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';

const isArabic = I18nManager.isRTL;

export default function WorkoutPlansScreen() {
  const { i18n } = useTranslation();
  const { colors } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');

  const loadData = useCallback(async () => {
    const [items, calendarType] = await Promise.all([
      getSavedWorkoutPlans(),
      getDateCalendarPreference().catch(() => 'gregorian' as CalendarType),
    ]);
    setPlans(items);
    setDateCalendar(calendarType);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
    }, [loadData])
  );

  const handleDelete = (planId: string) => {
    Alert.alert(
      isArabic ? 'حذف الجدول' : 'Delete Plan',
      isArabic ? 'هل تريد حذف هذا الجدول؟' : 'Do you want to delete this workout plan?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkoutPlan(planId);
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.note, { color: colors.mutedText }]}>
        {isArabic
          ? 'ملاحظة: يُفضّل تحديث جدول التمارين كل 4-6 أسابيع لتحسين النتائج.'
          : 'Note: Update your workout plan every 4-6 weeks for better results.'}
      </Text>

      {plans.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={42} color={colors.mutedText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isArabic ? 'لا توجد جداول تمارين محفوظة' : 'No saved workout plans'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
            {isArabic
              ? 'من القائمة الجانبية اختر "تصميم جدول تمارين" ثم صدّر الجدول إلى هذه الصفحة.'
              : 'Use the side menu to design a workout plan, then export it here.'}
          </Text>
        </View>
      ) : (
        plans.map((plan) => {
          const expanded = expandedPlanId === plan.id;
          return (
            <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.planHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                  <Text style={[styles.planMeta, { color: colors.mutedText }]}>
                    {formatAppDate(plan.createdAt, i18n.language, dateCalendar)} • {isArabic ? 'عدد الأيام' : 'Days'}: {plan.daysPerWeek}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(plan.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setExpandedPlanId(expanded ? null : plan.id)}
                style={[styles.expandBtn, { backgroundColor: colors.cardAlt }]}
              >
                <Text style={[styles.expandText, { color: colors.text }]}>
                  {expanded ? (isArabic ? 'إخفاء التفاصيل' : 'Hide Details') : (isArabic ? 'عرض التفاصيل' : 'View Details')}
                </Text>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.detailsWrap}>
                  {plan.days.map((d, idx) => (
                    <View key={`${plan.id}-${idx}`} style={[styles.dayCard, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                      <Text style={[styles.dayTitle, { color: colors.text }]}>{d.day} - {d.focus}</Text>
                      {d.exercises.map((exercise, exIdx) => (
                        <Text key={`${plan.id}-${idx}-${exIdx}`} style={[styles.exerciseText, { color: colors.mutedText }]}>
                          • {exercise}
                        </Text>
                      ))}
                    </View>
                  ))}
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
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  note: { fontSize: 12, textAlign: isArabic ? 'right' : 'left' },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { marginTop: 6, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  planCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  planHead: { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 15, fontWeight: '700', textAlign: isArabic ? 'right' : 'left' },
  planMeta: { marginTop: 3, fontSize: 12, textAlign: isArabic ? 'right' : 'left' },
  deleteBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  expandBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  expandText: { fontSize: 13, fontWeight: '600' },
  detailsWrap: { gap: 8, marginTop: 4 },
  dayCard: { borderWidth: 1, borderRadius: 10, padding: 10 },
  dayTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: isArabic ? 'right' : 'left' },
  exerciseText: { fontSize: 12, marginBottom: 2, textAlign: isArabic ? 'right' : 'left' },
});
