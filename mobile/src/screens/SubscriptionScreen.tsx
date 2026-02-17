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
  purchaseSubscription,
  restorePurchases,
  type SubscriptionProduct,
} from '../services/IAPService';

interface Props {
  navigation: any;
  route?: { params?: { currentPlan?: string } };
}

export default function SubscriptionScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isArabic = i18n.language === 'ar';
  const currentPlan = route?.params?.currentPlan || 'free';

  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const filteredProducts = SUBSCRIPTION_PRODUCTS.filter(p => p.period === selectedPeriod);

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

      <View style={styles.currentPlanBadge}>
        <Ionicons name={getPlanIcon(currentPlan)} size={20} color={getPlanColor(currentPlan)} />
        <Text style={[styles.currentPlanText, { color: getPlanColor(currentPlan) }]}>
          {isArabic ? 'خطتك الحالية: ' : 'Current Plan: '}
          {t(`subscription.${currentPlan}`)}
        </Text>
      </View>

      <View style={styles.periodToggle}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('monthly')}
          testID="button-monthly"
        >
          <Text style={[styles.periodText, selectedPeriod === 'monthly' && styles.periodTextActive]}>
            {isArabic ? 'شهري' : 'Monthly'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('yearly')}
          testID="button-yearly"
        >
          <Text style={[styles.periodText, selectedPeriod === 'yearly' && styles.periodTextActive]}>
            {isArabic ? 'سنوي' : 'Yearly'}
          </Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>
              {isArabic ? 'وفّر ٣٣٪' : 'Save 33%'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {filteredProducts.map((product) => {
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
              testID={`button-purchase-${product.plan}-${product.period}`}
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
  periodToggle: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  periodButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
