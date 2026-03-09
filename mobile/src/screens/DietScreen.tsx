import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api, queries } from '../lib/api';
import { useAIConsent } from '../context/AIConsentContext';
import { useAppTheme } from '../context/ThemeContext';
import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';
import DietPlanDisplay from '../components/DietPlanDisplay';

type Step = 'intro' | 'disclaimer' | 'activity' | 'allergy' | 'allergySelect' | 'proteinPref' | 'carbPref' | 'preference' | 'mealDistribution' | 'generating' | 'streaming' | 'result';

interface SavedPlan {
  id: string;
  planData: string | unknown;
  createdAt: string;
}

const ALLERGY_OPTIONS = [
  { key: 'eggs', labelKey: 'allergyEggs' },
  { key: 'dairy', labelKey: 'allergyDairy' },
  { key: 'peanuts', labelKey: 'allergyPeanuts' },
  { key: 'nuts', labelKey: 'allergyNuts' },
  { key: 'seafood', labelKey: 'allergySeafood' },
  { key: 'soy', labelKey: 'allergySoy' },
  { key: 'sesame', labelKey: 'allergySesame' },
  { key: 'wheat', labelKey: 'allergyWheat' },
  { key: 'fish', labelKey: 'allergyFish' },
];

const ACTIVITY_OPTIONS = [
  { key: 'sedentary', labelKey: 'activitySedentary', descKey: 'activitySedentaryDesc', icon: 'bed' as const },
  { key: 'lightly_active', labelKey: 'activityLight', descKey: 'activityLightDesc', icon: 'walk' as const },
  { key: 'very_active', labelKey: 'activityVery', descKey: 'activityVeryDesc', icon: 'bicycle' as const },
  { key: 'extremely_active', labelKey: 'activityExtreme', descKey: 'activityExtremeDesc', icon: 'barbell' as const },
];

const PROTEIN_OPTIONS = [
  { key: 'fish', labelKey: 'proteinFish', icon: 'fish' as const },
  { key: 'chicken', labelKey: 'proteinChicken', icon: 'restaurant' as const },
  { key: 'meat', labelKey: 'proteinMeat', icon: 'flame' as const },
  { key: 'vegetarian', labelKey: 'proteinVegetarian', icon: 'leaf' as const },
];

const CARB_OPTIONS = [
  { key: 'rice', labelKey: 'carbRice' },
  { key: 'bread', labelKey: 'carbBread' },
  { key: 'pasta', labelKey: 'carbPasta' },
  { key: 'oats', labelKey: 'carbOats' },
  { key: 'potato', labelKey: 'carbPotato' },
  { key: 'sweet_potato', labelKey: 'carbSweetPotato' },
  { key: 'quinoa', labelKey: 'carbQuinoa' },
  { key: 'bulgur', labelKey: 'carbBulgur' },
  { key: 'keto', labelKey: 'carbKeto' },
  { key: 'corn', labelKey: 'carbCorn' },
  { key: 'beans', labelKey: 'carbBeans' },
  { key: 'fruits', labelKey: 'carbFruits' },
];

const PREFERENCE_OPTIONS = [
  { key: 'high_protein', labelKey: 'prefHighProtein', descKey: 'prefHighProteinDesc', icon: 'barbell' as const, recommended: true, macros: 'P: 40-50% | C: 35-40% | F: 10-25%' },
  { key: 'balanced', labelKey: 'prefBalanced', descKey: 'prefBalancedDesc', icon: 'scale' as const, macros: 'P: 25-35% | C: 40-50% | F: 20-30%' },
  { key: 'low_carb', labelKey: 'prefLowCarb', descKey: 'prefLowCarbDesc', icon: 'leaf' as const, macros: 'P: 30-40% | C: 10-25% | F: 30-45%' },
  { key: 'keto', labelKey: 'prefKeto', descKey: 'prefKetoDesc', icon: 'flame' as const, macros: 'P: 20-25% | C: 5-10% | F: 65-75%' },
  { key: 'vegetarian', labelKey: 'prefVegetarian', descKey: 'prefVegetarianDesc', icon: 'nutrition' as const, macros: 'P: 20-30% | C: 45-55% | F: 20-30%' },
  { key: 'custom_macros', labelKey: 'prefCustomMacros', descKey: 'prefCustomMacrosDesc', icon: 'stats-chart' as const, macros: '' },
];

const isArabic = I18nManager.isRTL;

export default function DietScreen({ navigation, route }: any) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isAccepted, accept } = useAIConsent();
  const isArabic = isArabicLanguage();
  const queryClient = useQueryClient();
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');

  const [step, setStep] = useState<Step>('intro');
  const [activityLevel, setActivityLevel] = useState('');
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [selectedCarbs, setSelectedCarbs] = useState<string[]>([]);
  const [mealPreference, setMealPreference] = useState('');
  const [mealDistributionChoice, setMealDistributionChoice] = useState('auto');
  const [customTargetCalories, setCustomTargetCalories] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamingData, setStreamingData] = useState<{ completedSections: string[]; mealPlan: Record<string, any[]> } | null>(null);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: queries.profile });
  const { data: savedPlans } = useQuery<SavedPlan[]>({
    queryKey: ['savedDietPlans'],
    queryFn: async () => (await queries.savedDietPlans()) as SavedPlan[],
  });
  const savedPlansList: SavedPlan[] = Array.isArray(savedPlans) ? savedPlans : [];

  const openMyDietPlansScreen = useCallback(() => {
    navigation.navigate('DietTable');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));

      if (step === 'intro' && !jobId) {
        api.get<any>('/api/diet-plan/pending').then((res) => {
          if (res?.hasPending && res.jobId) {
            setJobId(res.jobId);
            setStep('generating');
          }
        }).catch(() => { });
      }
    }, [])
  );

  useEffect(() => {
    if (profile) {
      if ((profile as any).activityLevel) setActivityLevel((profile as any).activityLevel);
      if ((profile as any).mealPreference) setMealPreference((profile as any).mealPreference);
      if ((profile as any).hasAllergies != null) setHasAllergies((profile as any).hasAllergies);
      if ((profile as any).allergies) setSelectedAllergies((profile as any).allergies);
      if ((profile as any).proteinPreferences) setSelectedProteins((profile as any).proteinPreferences);
      if ((profile as any).carbPreferences) setSelectedCarbs((profile as any).carbPreferences);
    }
  }, [profile]);

  useEffect(() => {
    const incomingPlan = route?.params?.openPlanData;
    const planNonce = route?.params?.openPlanNonce;
    if (!incomingPlan || !planNonce) {
      return;
    }

    try {
      const parsed = typeof incomingPlan === 'string' ? JSON.parse(incomingPlan) : incomingPlan;
      setPlan(parsed);
      setStep('result');
    } catch {
      Alert.alert(
        isArabic ? 'تعذر فتح الخطة' : 'Unable to open plan',
        isArabic ? 'حدث خطأ أثناء فتح الخطة الغذائية المحفوظة.' : 'There was an error opening the saved diet plan.'
      );
    } finally {
      navigation.setParams?.({ openPlanData: undefined, openPlanNonce: undefined });
    }
  }, [isArabic, navigation, route?.params?.openPlanData, route?.params?.openPlanNonce]);

  useEffect(() => {
    if (jobId && (step === 'generating' || step === 'streaming')) {
      pollingRef.current = setInterval(async () => {
        try {
          const result = await api.get<any>(`/api/diet-plan/job/${jobId}`);
          if (result.status === 'completed' && result.planData) {
            const parsed = typeof result.planData === 'string' ? JSON.parse(result.planData) : result.planData;
            setPlan(parsed);
            setStreamingData(null);
            setStep('result');
            setJobId(null);
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (result.status === 'partial' && result.planData) {
            const partial = typeof result.planData === 'string' ? JSON.parse(result.planData) : result.planData;
            setStreamingData(partial);
            if (step !== 'streaming') setStep('streaming');
          } else if (result.status === 'failed') {
            Alert.alert(t('errors.dietPlanError'), result.error || '');
            setStep('intro');
            setStreamingData(null);
            setJobId(null);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch (e) { }
      }, 2000);
      return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }
  }, [jobId, step]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const customCaloriesNumber = mealPreference === 'custom_macros'
        ? Number.parseInt(customTargetCalories, 10)
        : null;

      await api.patch('/api/user', {
        activityLevel,
        mealPreference,
        mealDistribution: mealDistributionChoice,
        hasAllergies: hasAllergies || false,
        allergies: hasAllergies ? selectedAllergies : [],
        proteinPreferences: mealPreference === 'vegetarian' ? [] : selectedProteins,
        carbPreferences: mealPreference === 'keto' ? [] : selectedCarbs,
      });
      const result = await api.post<any>('/api/diet-plan', {
        language: i18n.language,
        customTargetCalories: Number.isFinite(customCaloriesNumber as number) ? customCaloriesNumber : null,
      });
      return result;
    },
    onSuccess: (data: any) => {
      setJobId(data.jobId);
      setStep('generating');
    },
    onError: (error: any) => {
      const msg = error.message || t('errors.dietPlanError');
      if (msg.includes('MISSING_PROFILE_DATA')) {
        Alert.alert(t('errors.missingProfile'), '', [
          { text: 'OK', onPress: () => navigation.navigate('Profile') }
        ]);
      } else if (msg.includes('SUBSCRIPTION_REQUIRED')) {
        Alert.alert(t('errors.subscriptionRequired'), '', [
          { text: 'OK', onPress: () => navigation.navigate('Subscription') }
        ]);
      } else {
        Alert.alert(t('errors.dietPlanError'), msg);
      }
      setStep('intro');
    },
  });

  const persistPlan = async () => api.post('/api/saved-diet-plans', { planData: JSON.stringify(plan) });

  const saveMutation = useMutation({
    mutationFn: persistPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans'] });
      Alert.alert(t('savePlan'), isArabic ? 'تم حفظ الخطة الغذائية بنجاح.' : 'Diet plan saved successfully.');
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'فشل الحفظ' : 'Save failed',
        isArabic ? 'تعذر حفظ الخطة الغذائية حالياً.' : 'Unable to save your diet plan right now.'
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: persistPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans'] });
      openMyDietPlansScreen();
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'فشل التصدير' : 'Export failed',
        isArabic ? 'تعذر تصدير الخطة إلى صفحة جدولي الغذائي.' : 'Unable to export this plan to My Diet Plans.'
      );
    },
  });

  const startQuestionnaire = () => setStep('disclaimer');

  const handleFinish = () => {
    if (!isAccepted) {
      Alert.alert(
        isArabic ? 'موافقة الذكاء الاصطناعي مطلوبة' : 'AI Consent Required',
        isArabic
          ? 'لا يمكن إنشاء الخطة الغذائية بالذكاء الاصطناعي إلا بعد الموافقة على معالجة البيانات.'
          : 'AI diet plan generation is blocked until you agree to AI data processing.',
        [
          { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: isArabic ? 'موافقة' : 'Agree', onPress: () => accept() },
        ]
      );
      return;
    }

    if (mealPreference === 'custom_macros') {
      const calories = Number.parseInt(customTargetCalories, 10);
      if (!Number.isFinite(calories) || calories < 800 || calories > 6000) {
        Alert.alert(
          isArabic ? 'ادخل سعرات صحيحة' : 'Enter valid calories',
          isArabic ? 'أدخل رقم سعرات بين 800 و 6000' : 'Please enter calories between 800 and 6000'
        );
        return;
      }
    }
    setStep('generating');
    generateMutation.mutate();
  };

  const getStepNumber = (): number => {
    const steps: Step[] = ['activity', 'allergy', 'allergySelect', 'proteinPref', 'carbPref', 'preference', 'mealDistribution'];
    const idx = steps.indexOf(step);
    return idx >= 0 ? idx + 1 : 0;
  };



  const renderStepHeader = (backStep: Step, totalSteps = 5) => (
    <View style={styles.stepHeader}>
      <TouchableOpacity onPress={() => setStep(backStep)} testID="button-quest-back">
        <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={24} color="#3b82f6" />
      </TouchableOpacity>
      <Text style={styles.stepCounter}>{t('questStep')} {getStepNumber()} {t('questOf')} {totalSteps}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (step === 'generating') {
    return (
      <View style={[styles.generatingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={[styles.generatingTitle, { color: colors.text }]}>{t('generating')}</Text>
        <Text style={[styles.generatingDesc, { color: colors.mutedText }]}>{t('generatingDesc')}</Text>
      </View>
    );
  }

  if (step === 'streaming' && streamingData) {
    const allSections = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const completed = streamingData.completedSections || [];
    const mealIcons: Record<string, string> = { breakfast: 'sunny', lunch: 'restaurant', dinner: 'moon', snacks: 'cafe' };
    const sectionLabels: Record<string, { ar: string; en: string }> = {
      breakfast: { ar: 'الفطور', en: 'Breakfast' },
      lunch: { ar: 'الغداء', en: 'Lunch' },
      dinner: { ar: 'العشاء', en: 'Dinner' },
      snacks: { ar: 'وجبات خفيفة', en: 'Snacks' },
    };
    return (
      <View style={styles.container}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: 80 }]}>
          <View style={styles.streamingHeader}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={[styles.streamingTitle, { color: colors.text }]}>
              {isArabic ? 'جاري إنشاء خطتك الغذائية...' : 'Building your diet plan...'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed.length / 4) * 100}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedText }]}>
            {completed.length}/4 {isArabic ? 'أقسام مكتملة' : 'sections complete'}
          </Text>

          {allSections.map((section) => {
            const isCompleted = completed.includes(section);
            const meals = streamingData.mealPlan?.[section];

            if (!isCompleted) {
              return (
                <View key={section} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name={mealIcons[section] as any} size={20} color="#9ca3af" />
                    <Text style={[styles.cardTitle, { color: colors.mutedText }]}>
                      {isArabic ? sectionLabels[section].ar : sectionLabels[section].en}
                    </Text>
                    <ActivityIndicator size="small" color="#f59e0b" style={{ marginLeft: 8 }} />
                  </View>
                  <View style={styles.skeletonContainer}>
                    <View style={[styles.skeletonLine, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
                    <View style={[styles.skeletonLine, { backgroundColor: isDark ? '#374151' : '#e5e7eb', width: '60%' }]} />
                  </View>
                </View>
              );
            }

            return (
              <View key={section} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name={mealIcons[section] as any} size={20} color="#f59e0b" />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {isArabic ? sectionLabels[section].ar : sectionLabels[section].en}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 8 }} />
                </View>
                {meals && meals.map((meal: any, idx: number) => (
                  <View key={idx} style={styles.mealItem}>
                    <View style={styles.mealHeaderRow}>
                      <Text style={styles.mealOptionLabel}>{t('mealOption')} {idx + 1}</Text>
                    </View>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={[styles.mealDesc, { color: colors.text }]}>{meal.description}</Text>
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacroText}>{meal.calories} kcal</Text>
                      <Text style={styles.mealMacroText}>P:{meal.protein}g</Text>
                      <Text style={styles.mealMacroText}>C:{meal.carbs}g</Text>
                      <Text style={styles.mealMacroText}>F:{meal.fats}g</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (step === 'result' && plan) {
    return (
      <View style={styles.container}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: 220 }]}>
          <Text style={[styles.resultTitle, { color: colors.text, marginBottom: 16 }]}>{t('dietPlanReady')}</Text>

          <DietPlanDisplay
            plan={plan}
            colors={colors}
            isDark={isDark}
            t={t}
            isArabicSystem={isArabic}
          />

        </ScrollView>

        <View style={[styles.calculatorBar, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopColor: colors.border }]}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={() => saveMutation.mutate()} testID="button-save-plan">
              <Ionicons name="save" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, exportMutation.isPending && { opacity: 0.7 }]}
              onPress={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              testID="button-export-plan"
            >
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.exportButtonText}>
                {isArabic ? 'تصدير' : 'Export'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newPlanButton} onPress={() => { setPlan(null); setStep('intro'); }} testID="button-new-plan">
              <Ionicons name="refresh" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (step === 'disclaimer') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={48} color="#f59e0b" />
          <Text style={[styles.disclaimerTitle, { color: colors.text }]}>{isArabic ? 'تنبيه مهم' : 'Important Notice'}</Text>
          <Text style={[styles.disclaimerText, { color: colors.mutedText }]}>{t('nutritionDisclaimer')}</Text>
          <TouchableOpacity style={styles.continueButton} onPress={() => setStep('activity')} testID="button-accept-disclaimer">
            <Text style={styles.continueButtonText}>{t('questContinue')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'activity') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('disclaimer')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questActivityTitle')}</Text>
        <Text style={[styles.questSubtitle, { color: colors.mutedText }]}>{t('questActivitySubtitle')}</Text>
        {ACTIVITY_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }, activityLevel === opt.key && styles.optionCardSelected]}
            onPress={() => setActivityLevel(opt.key)}
            testID={`button-activity-${opt.key}`}
          >
            <Ionicons name={opt.icon} size={24} color={activityLevel === opt.key ? '#fff' : '#3b82f6'} />
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }, activityLevel === opt.key && styles.optionTitleSelected]}>{t(opt.labelKey)}</Text>
              <Text style={[styles.optionDesc, { color: colors.mutedText }, activityLevel === opt.key && styles.optionDescSelected]}>{t(opt.descKey)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {activityLevel ? (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep('allergy')} testID="button-next-activity">
            <Text style={styles.nextButtonText}>{t('questNext')}</Text>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }

  if (step === 'allergy') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('activity')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questAllergyTitle')}</Text>
        <View style={styles.allergyButtons}>
          <TouchableOpacity
            style={[styles.allergyChoice, { backgroundColor: colors.card, borderColor: colors.border }, hasAllergies === true && styles.allergyChoiceSelected]}
            onPress={() => { setHasAllergies(true); setStep('allergySelect'); }}
            testID="button-allergy-yes"
          >
            <Ionicons name="alert-circle" size={24} color={hasAllergies === true ? '#fff' : '#ef4444'} />
            <Text style={[styles.allergyChoiceText, hasAllergies === true && styles.allergyChoiceTextSelected]}>{t('questAllergyYes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.allergyChoice, { backgroundColor: colors.card, borderColor: colors.border }, hasAllergies === false && styles.allergyChoiceSelectedGreen]}
            onPress={() => { setHasAllergies(false); setSelectedAllergies([]); setStep(mealPreference === 'vegetarian' ? 'preference' : 'proteinPref'); }}
            testID="button-allergy-no"
          >
            <Ionicons name="checkmark-circle" size={24} color={hasAllergies === false ? '#fff' : '#22c55e'} />
            <Text style={[styles.allergyChoiceText, hasAllergies === false && styles.allergyChoiceTextSelected]}>{t('questAllergyNo')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'allergySelect') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('allergy')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questAllergyWhich')}</Text>
        <View style={styles.chipGrid}>
          {ALLERGY_OPTIONS.map(opt => {
            const selected = selectedAllergies.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selected && styles.chipSelected]}
                onPress={() => setSelectedAllergies(prev => selected ? prev.filter(a => a !== opt.key) : [...prev, opt.key])}
                testID={`chip-allergy-${opt.key}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep('proteinPref')} testID="button-next-allergy">
          <Text style={styles.nextButtonText}>{t('questNext')}</Text>
          <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'proteinPref') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('allergy')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questProteinTitle')}</Text>
        <Text style={[styles.questSubtitle, { color: colors.mutedText }]}>{t('questProteinSubtitle')}</Text>
        <View style={styles.chipGrid}>
          {PROTEIN_OPTIONS.map(opt => {
            const selected = selectedProteins.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.proteinCard, { backgroundColor: colors.card, borderColor: colors.border }, selected && styles.proteinCardSelected]}
                onPress={() => setSelectedProteins(prev => selected ? prev.filter(p => p !== opt.key) : [...prev, opt.key])}
                testID={`chip-protein-${opt.key}`}
              >
                <Ionicons name={opt.icon} size={24} color={selected ? '#fff' : '#3b82f6'} />
                <Text style={[styles.proteinText, { color: colors.text }, selected && styles.proteinTextSelected]}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedProteins.length > 0 && (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep('carbPref')} testID="button-next-protein">
            <Text style={styles.nextButtonText}>{t('questNext')}</Text>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  if (step === 'carbPref') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('proteinPref')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questCarbTitle')}</Text>
        <Text style={[styles.questSubtitle, { color: colors.mutedText }]}>{t('questCarbSubtitle')}</Text>
        <View style={styles.chipGrid}>
          {CARB_OPTIONS.map(opt => {
            const selected = selectedCarbs.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, selected && styles.chipSelected]}
                onPress={() => setSelectedCarbs(prev => selected ? prev.filter(c => c !== opt.key) : [...prev, opt.key])}
                testID={`chip-carb-${opt.key}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedCarbs.length > 0 && (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep('preference')} testID="button-next-carb">
            <Text style={styles.nextButtonText}>{t('questNext')}</Text>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  if (step === 'preference') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('carbPref')}
        <Text style={[styles.questTitle, { color: colors.text }]}>{t('questPreferenceTitle')}</Text>
        {PREFERENCE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }, mealPreference === opt.key && styles.optionCardSelected]}
            onPress={() => setMealPreference(opt.key)}
            testID={`button-pref-${opt.key}`}
          >
            <Ionicons name={opt.icon} size={24} color={mealPreference === opt.key ? '#fff' : '#3b82f6'} />
            <View style={styles.optionTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.optionTitle, { color: colors.text }, mealPreference === opt.key && styles.optionTitleSelected]}>{t(opt.labelKey)}</Text>
                {opt.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{t('recommended')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.optionDesc, { color: colors.mutedText }, mealPreference === opt.key && styles.optionDescSelected]}>{t(opt.descKey)}</Text>
              {opt.macros ? <Text style={[styles.macroRangeText, mealPreference === opt.key && { color: '#dbeafe' }]}>{opt.macros}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
        {mealPreference === 'custom_macros' && (
          <View style={[styles.customCaloriesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.customCaloriesLabel, { color: colors.text }]}>
              {isArabic ? 'حدد السعرات اليومية المطلوبة' : 'Set your daily target calories'}
            </Text>
            <TextInput
              value={customTargetCalories}
              onChangeText={(text) => setCustomTargetCalories(text.replace(/[^0-9]/g, ''))}
              placeholder={isArabic ? 'مثال: 1000' : 'Example: 1000'}
              keyboardType="numeric"
              style={[styles.customCaloriesInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              maxLength={4}
              testID="input-custom-calories"
            />
            <Text style={[styles.customCaloriesHint, { color: colors.mutedText }]}>
              {isArabic
                ? 'سيتم إنشاء النظام بحيث لا يتجاوز هذا الرقم يوميًا.'
                : 'The plan will be generated to not exceed this number per day.'}
            </Text>
          </View>
        )}
        {mealPreference ? (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep('mealDistribution')} testID="button-next-distribution">
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.nextButtonText}>{t('next')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }

  const DISTRIBUTION_OPTIONS = [
    { key: 'auto', icon: 'sparkles' as const, labelAr: 'تلقائي (حسب السعرات)', labelEn: 'Auto (based on calories)', descAr: 'النظام يحدد عدد الوجبات تلقائياً:\n• أقل من 1800 سعرة → 3 وجبات\n• 1800-2500 سعرة → 3 وجبات + سناك\n• أكثر من 2500 → 4 وجبات + سناكين', descEn: 'System auto-selects meal count:\n• Under 1800 kcal → 3 meals\n• 1800-2500 kcal → 3 meals + snack\n• Over 2500 → 4 meals + 2 snacks' },
    { key: '3_meals', icon: 'restaurant' as const, labelAr: '3 وجبات فقط (بدون سناك)', labelEn: '3 Meals Only (no snack)', descAr: 'فطور 30% | غداء 40% | عشاء 30%', descEn: 'Breakfast 30% | Lunch 40% | Dinner 30%' },
    { key: '3_meals_snack', icon: 'cafe' as const, labelAr: '3 وجبات + سناك', labelEn: '3 Meals + Snack', descAr: 'فطور 25% | غداء 35% | عشاء 30% | سناك 10%', descEn: 'Breakfast 25% | Lunch 35% | Dinner 30% | Snack 10%' },
    { key: '4_meals_snack', icon: 'fast-food' as const, labelAr: '4 وجبات + سناكين', labelEn: '4 Meals + 2 Snacks', descAr: 'فطور 20% | غداء 30% | سناك 10% | عشاء 25% | سناك مسائي 15%', descEn: 'Breakfast 20% | Lunch 30% | Snack 10% | Dinner 25% | Evening 15%' },
    { key: 'equal', icon: 'grid' as const, labelAr: 'توزيع متساوي (4 وجبات)', labelEn: 'Equal Split (4 meals)', descAr: 'كل وجبة = 25% من السعرات', descEn: 'Each meal = 25% of calories' },
  ];

  if (step === 'mealDistribution') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {renderStepHeader('preference', 7)}
        <Text style={[styles.questTitle, { color: colors.text }]}>
          {isArabic ? 'كيف تريد توزيع الوجبات؟' : 'How do you want to distribute meals?'}
        </Text>
        <Text style={[styles.questSubtitle, { color: colors.mutedText }]}>
          {isArabic ? 'اختر طريقة توزيع السعرات والماكرو على وجباتك اليومية' : 'Choose how to distribute calories and macros across your daily meals'}
        </Text>
        {DISTRIBUTION_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }, mealDistributionChoice === opt.key && styles.optionCardSelected]}
            onPress={() => setMealDistributionChoice(opt.key)}
            testID={`button-dist-${opt.key}`}
          >
            <Ionicons name={opt.icon} size={24} color={mealDistributionChoice === opt.key ? '#fff' : '#3b82f6'} />
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }, mealDistributionChoice === opt.key && styles.optionTitleSelected]}>
                {isArabic ? opt.labelAr : opt.labelEn}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.mutedText }, mealDistributionChoice === opt.key && styles.optionDescSelected]}>
                {isArabic ? opt.descAr : opt.descEn}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#22c55e' }]} onPress={handleFinish} testID="button-generate">
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.nextButtonText}>{isArabic ? 'إنشاء خطتي الغذائية' : 'Generate My Diet Plan'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="nutrition" size={48} color="#f59e0b" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{isArabic ? 'خطتك الغذائية الذكية' : 'Your AI Diet Plan'}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedText }]}>
          {isArabic ? 'خطة غذائية مخصصة بناءً على نتائج فحوصاتك وبيانات جسمك' : 'Personalized nutrition plan based on your lab results and body data'}
        </Text>
      </View>

      <View style={styles.howItWorksSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{isArabic ? 'كيف تعمل الخطة؟' : 'How It Works'}</Text>
        {[
          { icon: 'document-text' as const, bg: '#eff6ff', color: '#3b82f6', title: isArabic ? 'تحليل فحوصاتك' : 'Analyze Your Labs', desc: isArabic ? 'نحلل نتائج فحوصاتك لمعرفة النقص' : 'We analyze your lab results for deficiencies' },
          { icon: 'calculator' as const, bg: '#fef3c7', color: '#f59e0b', title: isArabic ? 'حساب احتياجاتك' : 'Calculate Your Needs', desc: isArabic ? 'BMR و TDEE بناءً على وزنك وطولك ونشاطك' : 'BMR & TDEE based on your profile' },
          { icon: 'leaf' as const, bg: '#f0fdf4', color: '#22c55e', title: isArabic ? 'خطة مخصصة لك' : 'Your Custom Plan', desc: isArabic ? '5 وجبات يومية مع مكملات وتوصيات' : '5 daily meals with supplements & tips' },
        ].map((item, idx) => (
          <View key={idx} style={[styles.stepItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stepIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedText }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={startQuestionnaire} testID="button-generate-diet">
        <Ionicons name="sparkles" size={22} color="#fff" />
        <Text style={styles.generateButtonText}>{isArabic ? 'ابدأ خطتك الغذائية' : 'Start Your Diet Plan'}</Text>
      </TouchableOpacity>

      {savedPlansList.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('savedPlans')}</Text>
          {savedPlansList.map((sp) => (
            <TouchableOpacity
              key={sp.id}
              style={[styles.savedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                const parsed = typeof sp.planData === 'string' ? JSON.parse(sp.planData) : sp.planData;
                setPlan(parsed);
                setStep('result');
              }}
              testID={`card-saved-plan-${sp.id}`}
            >
              <Ionicons name="document-text" size={20} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedCardTitle}>{t('viewPlan')}</Text>
                <Text style={styles.savedCardDate}>
                  {t('savedOn')}: {formatAppDate(sp.createdAt, i18n.language, dateCalendar)}
                </Text>
              </View>
              <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 110 },
  heroCard: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#fde68a' },
  heroIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#92400e', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#a16207', textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  howItWorksSection: { marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  stepIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepTextContainer: { flex: 1, alignItems: 'flex-start' },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  stepDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  generateButton: { flexDirection: 'row', backgroundColor: '#f59e0b', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  generateButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  generatingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
  generatingTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 20, textAlign: 'center' },
  generatingDesc: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  streamingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  streamingTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  progressText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  skeletonContainer: { padding: 12, gap: 8 },
  skeletonLine: { height: 14, borderRadius: 4, width: '80%' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  stepCounter: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  questTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  questSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, marginBottom: 10, borderWidth: 2, borderColor: '#e2e8f0' },
  optionCardSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  optionTextContainer: { flex: 1, alignItems: 'flex-start' },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  optionTitleSelected: { color: '#fff' },
  optionDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  optionDescSelected: { color: '#dbeafe' },
  nextButton: { flexDirection: 'row', backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  continueButton: { backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20, width: '100%', alignItems: 'center' },
  continueButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  allergyButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  allergyChoice: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff', gap: 8 },
  allergyChoiceSelected: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  allergyChoiceSelectedGreen: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  allergyChoiceText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  allergyChoiceTextSelected: { color: '#fff' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#475569' },
  chipTextSelected: { color: '#fff' },
  proteinCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', minWidth: '45%' },
  proteinCardSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  proteinText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  proteinTextSelected: { color: '#fff' },
  recommendedBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  recommendedText: { fontSize: 10, fontWeight: '600', color: '#d97706' },

  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  referencesList: {
    paddingLeft: 4,
  },
  referenceText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  calculatorBar: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calculatorTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calculatorCalText: {
    fontSize: 16,
    fontWeight: '800',
  },
  calculatorMacros: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  disclaimerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
  disclaimerTitle: { fontSize: 20, fontWeight: '700', color: '#92400e', marginTop: 12, marginBottom: 12 },
  disclaimerText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  calorieStat: { alignItems: 'center' },
  calorieValue: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  calorieLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  macroRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  macroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  macroText: { fontSize: 12, fontWeight: '600' },
  mealItem: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginTop: 8 },
  mealOptionLabel: { fontSize: 11, fontWeight: '600', color: '#f59e0b', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  mealDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 6 },
  mealMacros: { flexDirection: 'row', gap: 10 },
  mealMacroText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  mealBenefits: { fontSize: 12, color: '#22c55e', marginTop: 4, fontStyle: 'italic' },
  supplementItem: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 8 },
  supplementName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  supplementDetail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  supplementFoods: { fontSize: 12, color: '#22c55e', marginTop: 4 },
  targetLabRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  targetLabText: { fontSize: 12, color: '#6366f1', fontWeight: '500' },
  scientificRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  scientificText: { fontSize: 11, color: '#8b5cf6', lineHeight: 16, flex: 1 },
  macroRangeText: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  customCaloriesCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 6 },
  customCaloriesLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  customCaloriesInput: { borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#0f172a', backgroundColor: '#f8fafc' },
  customCaloriesHint: { fontSize: 12, color: '#64748b', marginTop: 8 },
  tipItem: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 8 },
  tipCondition: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  tipAdvice: { fontSize: 13, color: '#475569', marginBottom: 2 },
  tipAvoid: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  tipText: { fontSize: 13, color: '#475569', marginBottom: 4 },
  refText: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  actionButtons: { gap: 10, marginTop: 8 },
  saveButton: { flexDirection: 'row', backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  exportButton: { flexDirection: 'row', backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  newPlanButton: { flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  newPlanButtonText: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
  monthlyNote: { fontSize: 12, marginTop: 10 },
  savedSection: { marginTop: 16 },
  savedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  savedCardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  savedCardDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
