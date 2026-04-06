import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  I18nManager,
} from 'react-native';
import { isArabicLanguage } from '../lib/isArabic';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import {
  TRAINEE_PRODUCTS,
  TRAINER_PRODUCTS,
  FREE_TRIAL_DAYS,
  purchaseSubscription,
  restorePurchases,
} from '../services/IAPService';
import { useSubscription } from '../context/SubscriptionContext';

interface Props {
  navigation: any;
  route?: { params?: { currentPlan?: string; trialEndsAt?: string; isTrialActive?: boolean } };
}

const BASE_URL = 'https://health-insight-ai.replit.app';

// ─── Feature definitions ────────────────────────────
interface Feature {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  free: boolean;
  trainee: boolean;
  trainer: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: 'barbell',
    color: '#3b82f6',
    titleEn: 'Manual Workout Plans',
    titleAr: 'جداول تدريبية يدوية',
    descEn: 'Create and save your own workout routines with the workout builder',
    descAr: 'أنشئ وأحفظ جداول التمارين الخاصة بك باستخدام محرر التمارين',
    free: true, trainee: true, trainer: true,
  },
  {
    icon: 'restaurant',
    color: '#22c55e',
    titleEn: 'Manual Diet Plans',
    titleAr: 'جداول غذائية يدوية',
    descEn: 'Design your own nutrition plans with food items, groups, and calorie tracking',
    descAr: 'صمم جداولك الغذائية الخاصة مع تتبع العناصر والسعرات الحرارية',
    free: true, trainee: true, trainer: true,
  },
  {
    icon: 'sparkles',
    color: '#8b5cf6',
    titleEn: 'AI Diet Plan Generation',
    titleAr: 'توليد جدول غذائي بالذكاء الاصطناعي',
    descEn: 'AI analyzes your lab results, body metrics, and fitness goal to create a personalized daily nutrition plan',
    descAr: 'الذكاء الاصطناعي يحلل نتائج تحاليلك وقياسات جسمك وهدفك ليصمم لك جدول غذائي يومي مخصص',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'document-text',
    color: '#ef4444',
    titleEn: 'Upload Lab Reports (PDF)',
    titleAr: 'رفع تقارير التحاليل (PDF)',
    descEn: 'Upload your blood test PDF files and our AI extracts all biomarkers automatically',
    descAr: 'ارفع ملفات تحاليل الدم PDF والذكاء الاصطناعي يستخرج جميع المؤشرات الحيوية تلقائياً',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'body',
    color: '#06b6d4',
    titleEn: 'Upload InBody Scans',
    titleAr: 'رفع فحوصات InBody',
    descEn: 'Upload InBody body composition scans to track muscle mass, body fat, and water percentage',
    descAr: 'ارفع فحوصات InBody لتتبع كتلة العضلات ونسبة الدهون والماء في الجسم',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'flask',
    color: '#f59e0b',
    titleEn: 'Track 50+ Biomarkers',
    titleAr: 'تتبع أكثر من 50 مؤشر حيوي',
    descEn: 'Monitor vitamins, minerals, hormones, organ functions, lipids, and more with visual tracking',
    descAr: 'تابع الفيتامينات والمعادن والهرمونات ووظائف الأعضاء والدهون وغيرها مع تتبع بصري',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'git-compare',
    color: '#6366f1',
    titleEn: 'Compare Results Over Time',
    titleAr: 'مقارنة النتائج عبر الزمن',
    descEn: 'See which biomarkers improved or worsened between your lab tests with percentage change',
    descAr: 'شاهد المؤشرات التي تحسنت أو تراجعت بين فحوصاتك مع نسبة التغيير',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'notifications',
    color: '#ec4899',
    titleEn: 'Automated Recheck Reminders',
    titleAr: 'تذكيرات إعادة الفحص التلقائية',
    descEn: 'Set reminders for abnormal lab results so you never forget to recheck',
    descAr: 'ضع تذكيرات للنتائج غير الطبيعية حتى لا تنسى إعادة الفحص',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'ban',
    color: '#16a34a',
    titleEn: 'Ad-Free Experience',
    titleAr: 'تجربة بدون إعلانات',
    descEn: 'No ads at the top or bottom of any screen — clean, distraction-free interface',
    descAr: 'بدون إعلانات في أعلى أو أسفل أي شاشة — واجهة نظيفة بدون تشتيت',
    free: false, trainee: true, trainer: true,
  },
  {
    icon: 'people',
    color: '#8b5cf6',
    titleEn: 'Trainee Management',
    titleAr: 'إدارة المتدربين',
    descEn: 'Add trainees to your roster, view their lab results, InBody, and track their progress remotely',
    descAr: 'أضف متدربين لقائمتك، واطلع على تحاليلهم وفحوصات InBody وتابع تقدمهم عن بعد',
    free: false, trainee: false, trainer: true,
  },
  {
    icon: 'clipboard',
    color: '#0ea5e9',
    titleEn: 'Send Plans to Trainees',
    titleAr: 'إرسال جداول للمتدربين',
    descEn: 'Create and assign workout plans and diet plans directly to your trainees',
    descAr: 'أنشئ وأرسل جداول تمارين وجداول غذائية مباشرة إلى متدربيك',
    free: false, trainee: false, trainer: true,
  },
  {
    icon: 'folder-open',
    color: '#f97316',
    titleEn: 'View Trainee Files',
    titleAr: 'عرض ملفات المتدربين',
    descEn: 'View lab reports and documents uploaded by your trainees for verification',
    descAr: 'اطلع على التحاليل والمستندات التي يرفعها متدربيك للتحقق منها',
    free: false, trainee: false, trainer: true,
  },
  {
    icon: 'chatbubbles',
    color: '#14b8a6',
    titleEn: 'In-App Messaging',
    titleAr: 'المراسلة داخل التطبيق',
    descEn: 'Chat with trainers to discuss services, plans, and pricing before subscribing',
    descAr: 'تواصل مع المدربين لمناقشة الخدمات والخطط والأسعار قبل الاشتراك',
    free: true, trainee: true, trainer: true,
  },
];

export default function SubscriptionScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const isArabic = I18nManager.isRTL;
  const { colors, isDark } = useAppTheme();
  const { plan: currentPlan, isActive, isTrialActive, trialEndsAt, refreshStatus } = useSubscription();
  const styles = getStyles(isArabic);

  const [activeTab, setActiveTab] = useState<'trainee' | 'trainer'>('trainee');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedTrainerTier, setSelectedTrainerTier] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const getTrialDaysRemaining = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDaysLeft = getTrialDaysRemaining();

  const handlePurchase = async () => {
    if (isActive && currentPlan !== 'free') return;
    setPurchasing(true);
    try {
      let productId: string;
      if (activeTab === 'trainee') {
        const product = TRAINEE_PRODUCTS.find(p => p.period === selectedPeriod);
        productId = product!.productId;
      } else {
        productId = TRAINER_PRODUCTS[selectedTrainerTier].productId;
      }

      const success = await purchaseSubscription(productId);
      if (success) {
        await refreshStatus();
        await queryClient.invalidateQueries({ queryKey: ['user'] });
        Alert.alert(
          isArabic ? 'تم بنجاح' : 'Success',
          isArabic ? 'تم تفعيل اشتراكك بنجاح!' : 'Your subscription has been activated!',
          [{ text: isArabic ? 'حسناً' : 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في إتمام عملية الشراء' : 'Failed to complete purchase');
      }
    } catch {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'حدث خطأ أثناء عملية الشراء' : 'An error occurred during purchase');
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        await refreshStatus();
        await queryClient.invalidateQueries({ queryKey: ['user'] });
        Alert.alert(
          isArabic ? 'تم الاستعادة' : 'Restored',
          isArabic ? 'تم استعادة مشترياتك بنجاح' : 'Your purchases have been restored',
          [{ text: isArabic ? 'حسناً' : 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(isArabic ? 'لا توجد مشتريات' : 'No Purchases', isArabic ? 'لم يتم العثور على مشتريات سابقة' : 'No previous purchases found');
      }
    } catch {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في استعادة المشتريات' : 'Failed to restore purchases');
    }
    setRestoring(false);
  };

  // Filter features based on active tab
  const relevantFeatures = FEATURES.filter(f => activeTab === 'trainee' ? f.trainee : f.trainer);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isArabic ? 'الاشتراكات' : 'Subscriptions'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Trial Banner */}
      {isTrialActive && trialDaysLeft > 0 && (
        <View style={[styles.trialBanner, { backgroundColor: isDark ? '#1e3a5f' : '#fffbeb', borderColor: isDark ? '#2563eb' : '#fcd34d' }]}>
          <Ionicons name="time-outline" size={22} color="#f59e0b" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.trialTitle, { color: isDark ? '#93c5fd' : '#b45309' }]}>
              {isArabic ? 'الفترة التجريبية المجانية' : 'Free Trial Period'}
            </Text>
            <Text style={[styles.trialSubtitle, { color: isDark ? '#60a5fa' : '#92400e' }]}>
              {isArabic ? `متبقي ${trialDaysLeft} ${trialDaysLeft === 1 ? 'يوم' : 'أيام'}` : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`}
            </Text>
          </View>
        </View>
      )}

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trainee' && [styles.activeTab, { backgroundColor: isDark ? '#334155' : '#fff' }]]}
          onPress={() => setActiveTab('trainee')}
          testID="tab-trainee"
        >
          <Ionicons name="person" size={18} color={activeTab === 'trainee' ? '#3b82f6' : colors.mutedText} />
          <Text style={[styles.tabText, { color: activeTab === 'trainee' ? '#3b82f6' : colors.mutedText }]}>
            {isArabic ? 'المتدرب' : 'Trainee'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trainer' && [styles.activeTab, { backgroundColor: isDark ? '#334155' : '#fff' }]]}
          onPress={() => setActiveTab('trainer')}
          testID="tab-trainer"
        >
          <Ionicons name="fitness" size={18} color={activeTab === 'trainer' ? '#8b5cf6' : colors.mutedText} />
          <Text style={[styles.tabText, { color: activeTab === 'trainer' ? '#8b5cf6' : colors.mutedText }]}>
            {isArabic ? 'المدرب' : 'Trainer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* =================== FEATURES SECTION =================== */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <Ionicons name="star" size={20} color={activeTab === 'trainee' ? '#3b82f6' : '#8b5cf6'} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {activeTab === 'trainee'
            ? (isArabic ? 'مميزات اشتراك المتدرب' : 'Trainee Subscription Benefits')
            : (isArabic ? 'مميزات اشتراك المدرب' : 'Trainer Subscription Benefits')}
        </Text>
      </View>

      {relevantFeatures.map((feature, i) => {
        const isIncludedFree = feature.free;
        const isExclusive = activeTab === 'trainer' && !feature.trainee && feature.trainer;
        return (
          <View
            key={`feat-${i}`}
            style={[
              styles.featureCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderColor: isExclusive ? '#8b5cf620' : colors.border,
                borderStartColor: isExclusive ? '#8b5cf6' : feature.color,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: feature.color + '18' }]}>
              <Ionicons name={feature.icon} size={22} color={feature.color} />
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureNameRow}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {isArabic ? feature.titleAr : feature.titleEn}
                </Text>
                {isIncludedFree && (
                  <View style={[styles.freeTag, { backgroundColor: isDark ? '#14532d' : '#f0fdf4' }]}>
                    <Text style={styles.freeTagText}>{isArabic ? 'مجاني' : 'FREE'}</Text>
                  </View>
                )}
                {isExclusive && (
                  <View style={[styles.exclusiveTag, { backgroundColor: isDark ? '#3b1764' : '#f5f3ff' }]}>
                    <Text style={styles.exclusiveTagText}>{isArabic ? 'حصري' : 'EXCLUSIVE'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                {isArabic ? feature.descAr : feature.descEn}
              </Text>
            </View>
          </View>
        );
      })}

      {/* =================== PRICING SECTION =================== */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: 24 }]}>
        <Ionicons name="pricetag" size={20} color={activeTab === 'trainee' ? '#3b82f6' : '#8b5cf6'} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isArabic ? 'اختر خطتك' : 'Choose Your Plan'}
        </Text>
      </View>

      {/* =================== TRAINEE TAB =================== */}
      {activeTab === 'trainee' && (
        <>
          {/* Period Toggle */}
          <View style={[styles.periodToggle, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <TouchableOpacity
              style={[styles.periodOption, selectedPeriod === 'monthly' && [styles.periodActive, { backgroundColor: isDark ? '#334155' : '#fff' }]]}
              onPress={() => setSelectedPeriod('monthly')}
              testID="button-period-monthly"
            >
              <Text style={[styles.periodText, { color: selectedPeriod === 'monthly' ? colors.text : colors.mutedText }]}>
                {isArabic ? 'شهري' : 'Monthly'}
              </Text>
              <Text style={[styles.periodPrice, { color: selectedPeriod === 'monthly' ? '#3b82f6' : colors.mutedText }]}>
                {isArabic ? '$9.99/شهر' : '$9.99/month'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodOption, selectedPeriod === 'yearly' && [styles.periodActive, { backgroundColor: isDark ? '#334155' : '#fff' }]]}
              onPress={() => setSelectedPeriod('yearly')}
              testID="button-period-yearly"
            >
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{isArabic ? 'خصم 17%' : '17% OFF'}</Text>
              </View>
              <Text style={[styles.periodText, { color: selectedPeriod === 'yearly' ? colors.text : colors.mutedText }]}>
                {isArabic ? 'سنوي' : 'Yearly'}
              </Text>
              <Text style={[styles.periodPrice, { color: selectedPeriod === 'yearly' ? '#3b82f6' : colors.mutedText }]}>
                {isArabic ? '$99.99/سنة' : '$99.99/year'}
              </Text>
              <Text style={[styles.periodSub, { color: colors.mutedText }]}>
                {isArabic ? '≈ $8.33/شهرياً' : '≈ $8.33/mo'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* =================== TRAINER TAB =================== */}
      {activeTab === 'trainer' && (
        <>
          <View style={[styles.trainerInfo, { backgroundColor: isDark ? '#1e293b' : '#f0f9ff', borderColor: isDark ? '#334155' : '#bae6fd' }]}>
            <Ionicons name="information-circle" size={20} color="#8b5cf6" />
            <Text style={[styles.trainerInfoText, { color: colors.text }]}>
              {isArabic
                ? 'اشتراك المدرب يشمل جميع مميزات المتدرب + إدارة المتدربين. اختر عدد المتدربين المناسب لك'
                : 'Trainer subscription includes all trainee features + trainee management. Choose the trainee count that fits you'}
            </Text>
          </View>

          {TRAINER_PRODUCTS.map((product, index) => (
            <TouchableOpacity
              key={product.productId}
              style={[
                styles.trainerCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedTrainerTier === index ? '#8b5cf6' : colors.border,
                  borderWidth: selectedTrainerTier === index ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedTrainerTier(index)}
              testID={`trainer-tier-${product.traineeLimit}`}
            >
              <View style={styles.trainerCardLeft}>
                <View style={[styles.trainerLimitBadge, { backgroundColor: selectedTrainerTier === index ? '#8b5cf6' : (isDark ? '#334155' : '#e2e8f0') }]}>
                  <Text style={[styles.trainerLimitText, { color: selectedTrainerTier === index ? '#fff' : colors.text }]}>
                    {product.traineeLimit}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.trainerCardTitle, { color: colors.text }]}>
                    {isArabic ? `${product.traineeLimit} متدربين` : `${product.traineeLimit} Trainees`}
                  </Text>
                  <Text style={[styles.trainerCardPrice, { color: '#8b5cf6' }]}>
                    {isArabic ? product.priceAr : product.price}
                  </Text>
                </View>
              </View>
              {selectedTrainerTier === index && (
                <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* =================== COMPARISON TABLE =================== */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: 20 }]}>
        <Ionicons name="grid" size={20} color={activeTab === 'trainee' ? '#3b82f6' : '#8b5cf6'} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isArabic ? 'مقارنة الخطط' : 'Plan Comparison'}
        </Text>
      </View>

      {/* Comparison table header */}
      <View style={[styles.compareRow, styles.compareHeader, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}>
        <Text style={[styles.compareLabel, { color: colors.text, fontWeight: '700' }]}>{isArabic ? 'الميزة' : 'Feature'}</Text>
        <Text style={[styles.compareCell, { color: '#64748b', fontWeight: '700' }]}>{isArabic ? 'مجاني' : 'Free'}</Text>
        <Text style={[styles.compareCell, { color: '#3b82f6', fontWeight: '700' }]}>{isArabic ? 'متدرب' : 'Trainee'}</Text>
        <Text style={[styles.compareCell, { color: '#8b5cf6', fontWeight: '700' }]}>{isArabic ? 'مدرب' : 'Trainer'}</Text>
      </View>

      {FEATURES.map((f, i) => (
        <View key={`comp-${i}`} style={[styles.compareRow, { borderColor: colors.border, backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? '#1e293b40' : '#f8fafc') }]}>
          <Text style={[styles.compareLabel, { color: colors.text }]} numberOfLines={2}>{isArabic ? f.titleAr : f.titleEn}</Text>
          <View style={styles.compareCellContainer}>
            <Ionicons name={f.free ? 'checkmark-circle' : 'close-circle'} size={18} color={f.free ? '#22c55e' : '#ef4444'} />
          </View>
          <View style={styles.compareCellContainer}>
            <Ionicons name={f.trainee ? 'checkmark-circle' : 'close-circle'} size={18} color={f.trainee ? '#22c55e' : '#ef4444'} />
          </View>
          <View style={styles.compareCellContainer}>
            <Ionicons name={f.trainer ? 'checkmark-circle' : 'close-circle'} size={18} color={f.trainer ? '#22c55e' : '#ef4444'} />
          </View>
        </View>
      ))}

      {/* Purchase Button */}
      <TouchableOpacity
        style={[
          styles.purchaseButton,
          {
            backgroundColor: activeTab === 'trainee' ? '#3b82f6' : '#8b5cf6',
            opacity: (isActive && currentPlan !== 'free') || purchasing ? 0.6 : 1,
          },
        ]}
        onPress={handlePurchase}
        disabled={(isActive && currentPlan !== 'free') || purchasing}
        testID="button-purchase"
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="diamond" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.purchaseButtonText}>
              {isActive && currentPlan !== 'free'
                ? (isArabic ? 'مشترك حالياً' : 'Currently Subscribed')
                : (isArabic ? 'اشترك الآن' : 'Subscribe Now')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
        testID="button-restore-purchases"
      >
        {restoring ? (
          <ActivityIndicator color="#3b82f6" size="small" />
        ) : (
          <Text style={[styles.restoreText, { color: '#3b82f6' }]}>{isArabic ? 'استعادة المشتريات السابقة' : 'Restore Previous Purchases'}</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={[styles.trialInfo, { backgroundColor: isDark ? '#1e3a2e' : '#f0fdf4' }]}>
          <Ionicons name="gift-outline" size={18} color="#22c55e" />
          <Text style={styles.trialInfoText}>
            {isArabic ? `${FREE_TRIAL_DAYS} أيام تجربة مجانية للمستخدمين الجدد` : `${FREE_TRIAL_DAYS}-day free trial for new users`}
          </Text>
        </View>
        <Text style={[styles.footerText, { color: colors.mutedText }]}>
          {isArabic
            ? 'الاشتراك يتجدد تلقائياً ما لم يتم إلغاؤه قبل 24 ساعة على الأقل من نهاية الفترة الحالية. يتم خصم المبلغ من حساب iTunes عند تأكيد الشراء. يمكنك إدارة وإلغاء اشتراكك من إعدادات حسابك في App Store.'
            : 'Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your iTunes account at confirmation of purchase. You can manage and cancel your subscription in your App Store account settings.'}
        </Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/terms`)} testID="link-terms">
            <Text style={styles.footerLink}>{isArabic ? 'شروط الاستخدام' : 'Terms of Use'}</Text>
          </TouchableOpacity>
          <Text style={[styles.footerDivider, { color: colors.mutedText }]}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/privacy`)} testID="link-privacy">
            <Text style={styles.footerLink}>{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
          </TouchableOpacity>
          <Text style={[styles.footerDivider, { color: colors.mutedText }]}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/support`)} testID="link-support">
            <Text style={styles.footerLink}>{isArabic ? 'الدعم' : 'Support'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  trialTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2, textAlign: 'left' },
  trialSubtitle: { fontSize: 13, textAlign: 'left' },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 15, fontWeight: '600' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', textAlign: 'left' },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderStartWidth: 4,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: { flex: 1 },
  featureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', textAlign: 'left' },
  featureDesc: { fontSize: 12, lineHeight: 18, textAlign: 'left' },
  freeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22c55e40',
  },
  freeTagText: { fontSize: 9, fontWeight: '800', color: '#16a34a' },
  exclusiveTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8b5cf640',
  },
  exclusiveTagText: { fontSize: 9, fontWeight: '800', color: '#8b5cf6' },

  // Pricing
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, position: 'relative' },
  periodActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  periodText: { fontSize: 15, fontWeight: '600' },
  periodPrice: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  periodSub: { fontSize: 12, marginTop: 2 },
  savingsBadge: { position: 'absolute', top: -6, end: 8, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  savingsText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Trainer
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trainerInfoText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500', textAlign: 'left' },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  trainerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainerLimitBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerLimitText: { fontSize: 16, fontWeight: '800' },
  trainerCardTitle: { fontSize: 15, fontWeight: '600', textAlign: 'left' },
  trainerCardPrice: { fontSize: 14, fontWeight: '700', marginTop: 2, textAlign: 'left' },

  // Comparison table
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  compareHeader: {
    borderRadius: 10,
    borderBottomWidth: 0,
    marginBottom: 2,
  },
  compareLabel: { flex: 2, fontSize: 11, lineHeight: 16, textAlign: 'left' },
  compareCell: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  compareCellContainer: { flex: 1, alignItems: 'center' },

  // Purchase
  purchaseButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  purchaseButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreButton: { paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  restoreText: { fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },

  // Footer
  footer: { paddingTop: 16, borderTopWidth: 1 },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  trialInfoText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  footerLink: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  footerDivider: { fontSize: 12 },
});

