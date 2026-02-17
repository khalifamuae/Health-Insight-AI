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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  SUBSCRIPTION_PRODUCTS,
  FREE_TRIAL_DAYS,
  purchaseSubscription,
  restorePurchases,
  type SubscriptionProduct,
} from '../services/IAPService';

interface Props {
  navigation: any;
  route?: { params?: { currentPlan?: string; trialEndsAt?: string; isTrialActive?: boolean } };
}

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
        Alert.alert(
          isArabic ? 'خطأ' : 'Error',
          isArabic ? 'فشل في إتمام عملية الشراء' : 'Failed to complete purchase'
        );
      }
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'حدث خطأ أثناء عملية الشراء' : 'An error occurred during purchase'
      );
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
        Alert.alert(
          isArabic ? 'لا توجد مشتريات' : 'No Purchases',
          isArabic ? 'لم يتم العثور على مشتريات سابقة' : 'No previous purchases found'
        );
      }
    } catch {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'فشل في استعادة المشتريات' : 'Failed to restore purchases'
      );
    }
    setRestoring(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="button-back"
        >
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isArabic ? 'الاشتراك' : 'Subscribe'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isTrialActive && trialDaysLeft > 0 && (
        <View style={styles.trialBanner}>
          <Ionicons name="time-outline" size={22} color="#f59e0b" />
          <View style={styles.trialTextContainer}>
            <Text style={styles.trialTitle}>
              {isArabic ? 'الفترة التجريبية المجانية' : 'Free Trial Period'}
            </Text>
            <Text style={styles.trialSubtitle}>
              {isArabic
                ? `متبقي ${trialDaysLeft} يوم - اشترك قبل انتهاء الفترة التجريبية`
                : `${trialDaysLeft} days remaining - Subscribe before your trial ends`}
            </Text>
          </View>
        </View>
      )}

      {!isTrialActive && currentPlan === 'free' && (
        <View style={[styles.trialBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Ionicons name="alert-circle" size={22} color="#ef4444" />
          <View style={styles.trialTextContainer}>
            <Text style={[styles.trialTitle, { color: '#dc2626' }]}>
              {isArabic ? 'انتهت الفترة التجريبية' : 'Trial Expired'}
            </Text>
            <Text style={[styles.trialSubtitle, { color: '#b91c1c' }]}>
              {isArabic
                ? 'اشترك الآن للاستمرار في استخدام التطبيق'
                : 'Subscribe now to continue using the app'}
            </Text>
          </View>
        </View>
      )}

      {currentPlan === 'pro' && (
        <View style={[styles.trialBanner, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
          <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
          <View style={styles.trialTextContainer}>
            <Text style={[styles.trialTitle, { color: '#16a34a' }]}>
              {isArabic ? 'اشتراكك فعّال' : 'Subscription Active'}
            </Text>
            <Text style={[styles.trialSubtitle, { color: '#15803d' }]}>
              {isArabic
                ? 'أنت مشترك حالياً وتتمتع بجميع المميزات'
                : 'You are currently subscribed with full access'}
            </Text>
          </View>
        </View>
      )}

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
            {isArabic ? '١٤.٩٩$' : '$14.99'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodOption, selectedPeriod === 'yearly' && styles.periodOptionActive]}
          onPress={() => setSelectedPeriod('yearly')}
          testID="button-period-yearly"
        >
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              {isArabic ? 'خصم ٢٣٪' : '23% OFF'}
            </Text>
          </View>
          <Text style={[styles.periodText, selectedPeriod === 'yearly' && styles.periodTextActive]}>
            {isArabic ? 'سنوي' : 'Yearly'}
          </Text>
          <Text style={[styles.periodPrice, selectedPeriod === 'yearly' && styles.periodPriceActive]}>
            {isArabic ? '١٣٩$' : '$139'}
          </Text>
          <Text style={[styles.periodSub, selectedPeriod === 'yearly' && styles.periodSubActive]}>
            {isArabic ? '≈ ١١.٥٨$/شهرياً' : '≈ $11.58/mo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planIconContainer}>
            <Ionicons name="diamond" size={28} color="#7c3aed" />
          </View>
          <View style={styles.planTitleGroup}>
            <Text style={styles.planTitle}>
              {isArabic ? 'BioTrack Pro' : 'BioTrack Pro'}
            </Text>
            <Text style={styles.planPrice}>
              {isArabic ? selectedProduct.priceAr : selectedProduct.price}
            </Text>
          </View>
        </View>

        <View style={styles.featuresList}>
          {(isArabic ? selectedProduct.featuresAr : selectedProduct.features).map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#7c3aed" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            currentPlan === 'pro' && { backgroundColor: '#94a3b8' },
          ]}
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
      </View>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
        testID="button-restore-purchases"
      >
        {restoring ? (
          <ActivityIndicator color="#3b82f6" size="small" />
        ) : (
          <Text style={styles.restoreText}>
            {isArabic ? 'استعادة المشتريات السابقة' : 'Restore Previous Purchases'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.freeTrialInfo}>
          <Ionicons name="gift-outline" size={18} color="#22c55e" />
          <Text style={styles.freeTrialInfoText}>
            {isArabic
              ? `أسبوع واحد مجاني عند التسجيل لأول مرة (${FREE_TRIAL_DAYS} يوم)`
              : `${FREE_TRIAL_DAYS}-day free trial for new users`}
          </Text>
        </View>
        <Text style={styles.footerText}>
          {isArabic
            ? 'يتم الدفع عبر حساب Apple أو Google الخاص بك. يتجدد الاشتراك تلقائياً ما لم يتم إلغاؤه قبل ٢٤ ساعة من نهاية الفترة الحالية.'
            : 'Payment is charged to your Apple or Google account. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.'}
        </Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity testID="link-terms">
            <Text style={styles.footerLink}>
              {isArabic ? 'شروط الاستخدام' : 'Terms of Use'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity testID="link-privacy">
            <Text style={styles.footerLink}>
              {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const BRAND_COLOR = '#7c3aed';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
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
  trialTextContainer: {
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  trialTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 2,
  },
  trialSubtitle: {
    fontSize: 13,
    color: '#92400e',
  },
  periodToggle: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  periodOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#1e293b',
  },
  periodPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
  },
  periodPriceActive: {
    color: BRAND_COLOR,
  },
  periodSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  periodSubActive: {
    color: '#64748b',
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  planHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  planIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLOR + '15',
  },
  planTitleGroup: {
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLOR,
  },
  featuresList: {
    marginBottom: 16,
    gap: 10,
  },
  featureRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  purchaseButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  restoreText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
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
  freeTrialInfoText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  footerDivider: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
