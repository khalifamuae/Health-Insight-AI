import React, { useMemo, useState } from 'react';
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';

import { useAppTheme } from '../context/ThemeContext';
import { saveWorkoutPlan, type WorkoutPlan, type WorkoutDayPlan } from '../lib/workoutPlans';

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AR_GOAL_FOCUS: Record<string, string[]> = {
  'خسارة الدهون': ['كارديو + جسم كامل', 'صدر + ترايسبس', 'ظهر + بايسبس', 'أرجل + بطن', 'كتف + كارديو'],
  'بناء العضلات': ['صدر + ترايسبس', 'ظهر + بايسبس', 'أرجل', 'كتف + بطن', 'جسم علوي متكامل'],
  'اللياقة العامة': ['جسم كامل', 'كارديو + بطن', 'قوة علوي', 'قوة سفلي', 'تمارين مرونة + كارديو'],
};

const EN_GOAL_FOCUS: Record<string, string[]> = {
  'Fat Loss': ['Cardio + Full Body', 'Chest + Triceps', 'Back + Biceps', 'Legs + Core', 'Shoulders + Cardio'],
  'Muscle Gain': ['Chest + Triceps', 'Back + Biceps', 'Legs', 'Shoulders + Core', 'Upper Body Mix'],
  'General Fitness': ['Full Body', 'Cardio + Core', 'Upper Strength', 'Lower Strength', 'Mobility + Cardio'],
};

const isArabic = I18nManager.isRTL;

export default function ExercisesScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [goal, setGoal] = useState(isArabic ? 'اللياقة العامة' : 'General Fitness');
  const [level, setLevel] = useState(isArabic ? 'مبتدئ' : 'Beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [generatedPlan, setGeneratedPlan] = useState<WorkoutPlan | null>(null);

  const goalOptions = isArabic ? ['خسارة الدهون', 'بناء العضلات', 'اللياقة العامة'] : ['Fat Loss', 'Muscle Gain', 'General Fitness'];
  const levelOptions = isArabic ? ['مبتدئ', 'متوسط', 'متقدم'] : ['Beginner', 'Intermediate', 'Advanced'];

  const generateDays = (): WorkoutDayPlan[] => {
    const focusList = isArabic ? AR_GOAL_FOCUS[goal] : EN_GOAL_FOCUS[goal];
    const daysNames = isArabic ? DAYS_AR : DAYS_EN;
    const planDays: WorkoutDayPlan[] = [];

    for (let i = 0; i < daysPerWeek; i += 1) {
      const focus = focusList[i % focusList.length];
      const exercises =
        isArabic
          ? [
              `إحماء 8 دقائق`,
              `${focus} - 4 تمارين`,
              `3 مجموعات × 10-12 تكرار`,
              'تبريد وتمدد 5 دقائق',
            ]
          : [
              'Warm-up 8 min',
              `${focus} - 4 exercises`,
              '3 sets x 10-12 reps',
              'Cool-down stretch 5 min',
            ];

      planDays.push({
        day: daysNames[i % daysNames.length],
        focus,
        exercises,
      });
    }

    return planDays;
  };

  const computedPlan = useMemo(() => {
    const title = isArabic ? `جدول تمارين - ${goal}` : `Workout Plan - ${goal}`;
    return {
      id: `${Date.now()}`,
      title,
      goal,
      level,
      daysPerWeek,
      createdAt: new Date().toISOString(),
      days: generateDays(),
    } as WorkoutPlan;
  }, [daysPerWeek, goal, level, isArabic]);

  const handleGenerate = () => {
    setGeneratedPlan(computedPlan);
  };

  const handleExport = async () => {
    const plan = generatedPlan || computedPlan;
    await saveWorkoutPlan(plan);
    navigation.navigate('WorkoutTable');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
          <Ionicons name="body" size={58} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {isArabic ? 'التمارين' : 'Exercises'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          {isArabic
            ? 'صمّم جدول تمارينك ثم صدّره إلى صفحة جدول تماريني.'
            : 'Design your workout plan, then export it to Workout Table.'}
        </Text>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{isArabic ? 'الهدف' : 'Goal'}</Text>
        <View style={styles.optionsRow}>
          {goalOptions.map((g) => {
            const selected = goal === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGoal(g)}
                style={[
                  styles.optionChip,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt },
                  selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.optionChipText, { color: selected ? '#fff' : colors.text }]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{isArabic ? 'المستوى' : 'Level'}</Text>
        <View style={styles.optionsRow}>
          {levelOptions.map((l) => {
            const selected = level === l;
            return (
              <TouchableOpacity
                key={l}
                onPress={() => setLevel(l)}
                style={[
                  styles.optionChip,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt },
                  selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.optionChipText, { color: selected ? '#fff' : colors.text }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{isArabic ? 'عدد أيام التمرين أسبوعيًا' : 'Workout Days / Week'}</Text>
        <View style={styles.optionsRow}>
          {[3, 4, 5].map((d) => {
            const selected = daysPerWeek === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDaysPerWeek(d)}
                style={[
                  styles.dayChip,
                  { borderColor: colors.border, backgroundColor: colors.cardAlt },
                  selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.optionChipText, { color: selected ? '#fff' : colors.text }]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.btnText}>{isArabic ? 'تصميم جدول تمارين' : 'Design Workout Plan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.btnText}>{isArabic ? 'تصدير إلى جدول تماريني' : 'Export to Workout Table'}</Text>
          </TouchableOpacity>
        </View>

        {generatedPlan && (
          <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>{generatedPlan.title}</Text>
            {generatedPlan.days.slice(0, 2).map((d, idx) => (
              <Text key={idx} style={[styles.previewLine, { color: colors.mutedText }]}>• {d.day}: {d.focus}</Text>
            ))}
          </View>
        )}
      </View>
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
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: isArabic ? 'right' : 'left',
    marginBottom: 12,
  },
  fieldLabel: { alignSelf: 'stretch', fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 6, textAlign: isArabic ? 'right' : 'left' },
  optionsRow: { flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  optionChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  dayChip: { borderWidth: 1, borderRadius: 20, minWidth: 48, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 14 },
  generateBtn: { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12 },
  exportBtn: { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  previewCard: { alignSelf: 'stretch', marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  previewTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, textAlign: isArabic ? 'right' : 'left' },
  previewLine: { fontSize: 12, marginBottom: 3, textAlign: isArabic ? 'right' : 'left' },
});
