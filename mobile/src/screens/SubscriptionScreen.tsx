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

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const getTrialDaysRemaining = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDaysLeft = getTrialDaysRemaining();

  const handlePurchase = async (product: SubscriptionProduct) => {
    if (currentPlan === product.plan) return;

    setPurchasing(true);
    try {
      const success = await purchaseSubscription(product.productId);
      if (success) {
        await queryClient.invalidateQueries({ queryKey: ['user'] });
        Alert.alert(
          isArabic ? 'تم بنجاح' : 'Success',
          isArabic ? 'تم ترقية اشتراكك بنجاح!' : 'Your subscription has been upgraded!',
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

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'basic': return 'star';
      case 'premium': return 'diamond';
      default: return 'document-text';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return '#3b82f6';
      case 'premium': return '#a855f7';
      default: return '#64748b';
    }
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
          {isArabic ? 'خطط الاشتراك' : 'Subscription Plans'}
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

      <View style={styles.currentPlanBadge}>
        <Ionicons name={getPlanIcon(currentPlan)} size={20} color={getPlanColor(currentPlan)} />
        <Text style={[styles.currentPlanText, { color: getPlanColor(currentPlan) }]}>
          {isArabic ? 'خطتك الحالية: ' : 'Current Plan: '}
          {t(`subscription.${currentPlan}`)}
        </Text>
      </View>

      {SUBSCRIPTION_PRODUCTS.map((product) => {
        const isCurrent = currentPlan === product.plan;
        const isUpgrade = (currentPlan === 'free') ||
          (currentPlan === 'basic' && product.plan === 'premium');

        return (
          <View
            key={product.productId}
            style={[
              styles.planCard,
              product.plan === 'premium' && styles.premiumCard,
              isCurrent && styles.currentCard,
            ]}
          >
            {product.plan === 'premium' && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>
                  {isArabic ? 'الأكثر شعبية' : 'Most Popular'}
                </Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View style={[styles.planIconContainer, { backgroundColor: getPlanColor(product.plan) + '20' }]}>
                <Ionicons name={getPlanIcon(product.plan)} size={28} color={getPlanColor(product.plan)} />
              </View>
              <View style={styles.planTitleGroup}>
                <Text style={styles.planTitle}>
                  {isArabic ? product.titleAr : product.title}
                </Text>
                <Text style={[styles.planPrice, { color: getPlanColor(product.plan) }]}>
                  {isArabic ? product.priceAr : product.price}
                </Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              {(isArabic ? product.featuresAr : product.features).map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={getPlanColor(product.plan)} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                { backgroundColor: isCurrent ? '#94a3b8' : getPlanColor(product.plan) },
              ]}
              onPress={() => handlePurchase(product)}
              disabled={isCurrent || purchasing || !isUpgrade}
              testID={`button-purchase-${product.plan}`}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {isCurrent
                    ? (isArabic ? 'خطتك الحالية' : 'Current Plan')
                    : isUpgrade
                      ? (isArabic ? 'اشترك الآن' : 'Subscribe Now')
                      : (isArabic ? 'غير متاح' : 'Not Available')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

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
              ? `شهر واحد مجاني عند التسجيل لأول مرة (${FREE_TRIAL_DAYS} يوم)`
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
  currentPlanBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentPlanText: {
    fontSize: 15,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumCard: {
    borderColor: '#a855f7',
    backgroundColor: '#faf5ff',
  },
  currentCard: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  recommendedBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  },
  planTitleGroup: {
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 16,
    gap: 8,
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
