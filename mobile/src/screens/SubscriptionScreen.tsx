import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  SUBSCRIPTION_PRODUCTS,
  FREE_TRIAL_DAYS,
  purchaseSubscription,
  restorePurchases,
} from '../services/IAPService';

interface Props {
  navigation: any;
  route?: { params?: { currentPlan?: string; trialEndsAt?: string; isTrialActive?: boolean } };
}

const BASE_URL = 'https://health-insight-ai.replit.app';

export default function SubscriptionScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isArabic = i18n.language === 'ar';
  const currentPlan = route?.params?.currentPlan || 'free';
  const trialEndsAt = route?.params?.trialEndsAt;
  const isTrialActive = route?.params?.isTrialActive || false;

  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const getTrialDaysRemaining = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDaysLeft = getTrialDaysRemaining();
  const selectedProduct = SUBSCRIPTION_PRODUCTS.find(p => p.period === selectedPeriod)!;

  const handlePurchase = async () => {
    if (currentPlan === 'pro') return;
    setPurchasing(true);
    try {
      const success = await purchaseSubscription(selectedProduct.productId);
      if (success) {
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

  const freeFeatures = isArabic
    ? ['7 أيام تجربة مجانية', 'عرض الفحوصات الأساسية', 'وصول محدود']
    : ['7-day free trial', 'View basic tests', 'Limited access'];

  const proFeatures = isArabic
    ? [
        'رفع تقارير تحاليل PDF بلا حدود',
        'تحليل نتائج التحاليل بالذكاء الاصطناعي',
        'خطط غذائية مخصصة بالذكاء الاصطناعي',
        'تتبع أكثر من 50 مؤشر حيوي',
        'مقارنة النتائج القديمة بالجديدة مع الاتجاهات',
        'تذكيرات إعادة الفحص التلقائية',
        'رؤى صحية مفصلة وتوصيات',
        'دعم عملاء ذو أولوية',
        'دعم كامل للعربية والإنجليزية',
        'واجهة الوضع الداكن',
      ]
    : [
        'Unlimited PDF lab report uploads',
        'AI-powered lab result analysis',
        'Personalized AI diet plans',
        'Track 50+ medical biomarkers',
        'Compare old vs new results with trends',
        'Automated recheck reminders',
        'Detailed health insights & recommendations',
        'Priority customer support',
        'Full Arabic & English support',
        'Dark mode interface',
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} testID="button-back">
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isArabic ? 'الاشتراك' : 'Subscribe'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isTrialActive && trialDaysLeft > 0 && (
        <View style={styles.trialBanner}>
          <Ionicons name="time-outline" size={22} color="#f59e0b" />
          <View style={styles.trialTextContainer}>
            <Text style={styles.trialTitle}>{isArabic ? 'الفترة التجريبية المجانية' : 'Free Trial Period'}</Text>
            <Text style={styles.trialSubtitle}>
              {isArabic ? `متبقي ${trialDaysLeft} يوم` : `${trialDaysLeft} days remaining`}
            </Text>
          </View>
        </View>
      )}

      {!isTrialActive && currentPlan === 'free' && (
        <View style={[styles.trialBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Ionicons name="alert-circle" size={22} color="#ef4444" />
          <View style={styles.trialTextContainer}>
            <Text style={[styles.trialTitle, { color: '#dc2626' }]}>{isArabic ? 'انتهت الفترة التجريبية' : 'Trial Expired'}</Text>
            <Text style={[styles.trialSubtitle, { color: '#b91c1c' }]}>{isArabic ? 'اشترك الآن للاستمرار' : 'Subscribe now to continue'}</Text>
          </View>
        </View>
      )}

      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>{isArabic ? 'مجاني' : 'Free'}</Text>
          <Text style={styles.comparisonPrice}>{isArabic ? '$0' : '$0'}</Text>
          {freeFeatures.map((f, i) => (
            <View key={i} style={styles.comparisonRow}>
              <Ionicons name="remove-circle-outline" size={16} color="#94a3b8" />
              <Text style={styles.comparisonFeatureGray}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.comparisonCard, styles.comparisonCardPro]}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>
              {isArabic ? 'الأفضل' : 'BEST'}
            </Text>
          </View>
          <Text style={[styles.comparisonTitle, { color: '#7c3aed' }]}>Pro</Text>
          <Text style={[styles.comparisonPrice, { color: '#7c3aed' }]}>
            {selectedPeriod === 'yearly'
              ? (isArabic ? '$11.58/شهر' : '$11.58/mo')
              : (isArabic ? '$14.99/شهر' : '$14.99/mo')}
          </Text>
          {proFeatures.map((f, i) => (
            <View key={i} style={styles.comparisonRow}>
              <Ionicons name="checkmark-circle" size={16} color="#7c3aed" />
              <Text style={styles.comparisonFeature}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.periodToggle}>
        <TouchableOpacity
          style={[styles.periodOption, selectedPeriod === 'monthly' && styles.periodOptionActive]}
          onPress={() => setSelectedPeriod('monthly')}
          testID="button-period-monthly"
        >
          <Text style={[styles.periodText, selectedPeriod === 'monthly' && styles.periodTextActive]}>
            {isArabic ? 'شهري' : 'Monthly'}
          </Text>
          <Text style={[styles.periodPrice, selectedPeriod === 'monthly' && styles.periodPriceActive]}>
            {isArabic ? '$14.99/شهر' : '$14.99/month'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodOption, selectedPeriod === 'yearly' && styles.periodOptionActive]}
          onPress={() => setSelectedPeriod('yearly')}
          testID="button-period-yearly"
        >
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{isArabic ? 'خصم 23%' : '23% OFF'}</Text>
          </View>
          <Text style={[styles.periodText, selectedPeriod === 'yearly' && styles.periodTextActive]}>
            {isArabic ? 'سنوي' : 'Yearly'}
          </Text>
          <Text style={[styles.periodPrice, selectedPeriod === 'yearly' && styles.periodPriceActive]}>
            {isArabic ? '$139/سنة' : '$139/year'}
          </Text>
          <Text style={[styles.periodSub, selectedPeriod === 'yearly' && styles.periodSubActive]}>
            {isArabic ? '≈ $11.58/شهرياً' : '≈ $11.58/mo'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.purchaseButton, currentPlan === 'pro' && { backgroundColor: '#94a3b8' }]}
        onPress={handlePurchase}
        disabled={currentPlan === 'pro' || purchasing}
        testID="button-purchase-pro"
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {currentPlan === 'pro'
              ? (isArabic ? 'مشترك حالياً' : 'Currently Subscribed')
              : (isArabic ? 'اشترك الآن' : 'Subscribe Now')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
        testID="button-restore-purchases"
      >
        {restoring ? (
          <ActivityIndicator color="#3b82f6" size="small" />
        ) : (
          <Text style={styles.restoreText}>{isArabic ? 'استعادة المشتريات السابقة' : 'Restore Previous Purchases'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.freeTrialInfo}>
          <Ionicons name="gift-outline" size={18} color="#22c55e" />
          <Text style={styles.freeTrialInfoText}>
            {isArabic ? `${FREE_TRIAL_DAYS} أيام تجربة مجانية للمستخدمين الجدد` : `${FREE_TRIAL_DAYS}-day free trial for new users`}
          </Text>
        </View>
        <Text style={styles.footerText}>
          {isArabic
            ? 'الاشتراك يتجدد تلقائياً ما لم يتم إلغاؤه قبل 24 ساعة على الأقل من نهاية الفترة الحالية. يتم خصم المبلغ من حساب iTunes/Google Play عند تأكيد الشراء. يمكنك إدارة وإلغاء اشتراكك من إعدادات حسابك في المتجر.'
            : 'Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your iTunes/Google Play account at confirmation of purchase. You can manage and cancel your subscription in your account settings in the App Store or Google Play.'}
        </Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/terms`)} testID="link-terms">
            <Text style={styles.footerLink}>{isArabic ? 'شروط الاستخدام' : 'Terms of Use'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/privacy`)} testID="link-privacy">
            <Text style={styles.footerLink}>{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/support`)} testID="link-support">
            <Text style={styles.footerLink}>{isArabic ? 'الدعم' : 'Support'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const BRAND_COLOR = '#7c3aed';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  trialBanner: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  trialTextContainer: { flex: 1, alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' },
  trialTitle: { fontSize: 15, fontWeight: '700', color: '#b45309', marginBottom: 2 },
  trialSubtitle: { fontSize: 13, color: '#92400e' },
  comparisonContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 10,
    marginBottom: 20,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  comparisonCardPro: {
    borderColor: BRAND_COLOR,
    borderWidth: 2,
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    left: '30%',
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  comparisonTitle: { fontSize: 18, fontWeight: '700', color: '#64748b', textAlign: 'center', marginTop: 4 },
  comparisonPrice: { fontSize: 14, fontWeight: '600', color: '#94a3b8', textAlign: 'center', marginBottom: 6 },
  comparisonRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
  },
  comparisonFeature: { fontSize: 12, color: '#475569', flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  comparisonFeatureGray: { fontSize: 12, color: '#94a3b8', flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  periodToggle: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, position: 'relative' },
  periodOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  periodText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  periodTextActive: { color: '#1e293b' },
  periodPrice: { fontSize: 18, fontWeight: '800', color: '#94a3b8', marginTop: 2 },
  periodPriceActive: { color: BRAND_COLOR },
  periodSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  periodSubActive: { color: '#64748b' },
  savingsBadge: { position: 'absolute', top: -6, right: 8, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  savingsText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
    marginBottom: 8,
  },
  purchaseButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreButton: { paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  restoreText: { color: '#3b82f6', fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  footer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  freeTrialInfo: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  freeTrialInfoText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  footerText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  footerLink: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  footerDivider: { fontSize: 12, color: '#94a3b8' },
});
