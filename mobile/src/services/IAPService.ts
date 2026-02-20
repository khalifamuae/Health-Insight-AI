import { Platform } from 'react-native';
import { api } from '../lib/api';

export const PRODUCT_IDS = {
  PRO_MONTHLY: 'com.biotrack.ai.pro.monthly',
  PRO_YEARLY: 'com.biotrack.ai.pro.yearly',
};

export const FREE_TRIAL_DAYS = 7;

export interface SubscriptionProduct {
  productId: string;
  plan: 'pro';
  period: 'monthly' | 'yearly';
  title: string;
  titleAr: string;
  price: string;
  priceAr: string;
  savings?: string;
  savingsAr?: string;
  features: string[];
  featuresAr: string[];
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    productId: PRODUCT_IDS.PRO_MONTHLY,
    plan: 'pro',
    period: 'monthly',
    title: 'Monthly',
    titleAr: 'شهري',
    price: '$14.99/mo',
    priceAr: '$14.99/شهرياً',
    features: [
      'Unlimited PDF uploads',
      'Unlimited AI diet plans',
      'AI-powered lab analysis',
      'Personalized health insights',
      'Test tracking & comparison',
      'Recheck reminders',
      'Priority support',
    ],
    featuresAr: [
      'رفع غير محدود للملفات',
      'خطط غذائية غير محدودة بالذكاء الاصطناعي',
      'تحليل ذكي لنتائج المختبر',
      'رؤى صحية مخصصة',
      'متابعة ومقارنة الفحوصات',
      'تذكيرات إعادة الفحص',
      'دعم أولوية',
    ],
  },
  {
    productId: PRODUCT_IDS.PRO_YEARLY,
    plan: 'pro',
    period: 'yearly',
    title: 'Yearly',
    titleAr: 'سنوي',
    price: '$139/year',
    priceAr: '$139/سنوياً',
    savings: 'Save $40.88 (23% off)',
    savingsAr: 'وفّر $40.88 (خصم 23%)',
    features: [
      'Unlimited PDF uploads',
      'Unlimited AI diet plans',
      'AI-powered lab analysis',
      'Personalized health insights',
      'Test tracking & comparison',
      'Recheck reminders',
      'Priority support',
    ],
    featuresAr: [
      'رفع غير محدود للملفات',
      'خطط غذائية غير محدودة بالذكاء الاصطناعي',
      'تحليل ذكي لنتائج المختبر',
      'رؤى صحية مخصصة',
      'متابعة ومقارنة الفحوصات',
      'تذكيرات إعادة الفحص',
      'دعم أولوية',
    ],
  },
];

let iapModule: any = null;
let purchaseUpdateSubscription: any = null;
let purchaseErrorSubscription: any = null;
let cachedSubscriptions: any[] = [];

async function getIAP() {
  if (!iapModule) {
    try {
      iapModule = await import('react-native-iap');
    } catch (e) {
      console.warn('[IAP] react-native-iap not available - using server-only mode');
      return null;
    }
  }
  return iapModule;
}

export async function initIAP(): Promise<boolean> {
  try {
    const RNIap = await getIAP();
    if (!RNIap) return false;

    await RNIap.initConnection();

    purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: any) => {
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            const product = SUBSCRIPTION_PRODUCTS.find(
              (p) => p.productId === purchase.productId
            );
            await api.post('/api/subscription/purchase', {
              productId: purchase.productId,
              plan: product?.plan || 'pro',
              period: product?.period || 'monthly',
              platform: Platform.OS,
              receiptData: receipt,
              transactionId: purchase.transactionId,
            });

            if (Platform.OS === 'ios') {
              await RNIap.finishTransaction({ purchase, isConsumable: false });
            } else {
              await RNIap.acknowledgePurchaseAndroid({
                token: purchase.purchaseToken,
              });
            }
          } catch (err) {
            console.error('[IAP] Error processing purchase:', err);
          }
        }
      }
    );

    purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error: any) => {
        console.warn('[IAP] Purchase error:', error);
      }
    );

    return true;
  } catch (err) {
    console.error('[IAP] Init error:', err);
    return false;
  }
}

export async function endIAP(): Promise<void> {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
  try {
    const RNIap = await getIAP();
    if (RNIap) await RNIap.endConnection();
  } catch (e) {
    console.warn('[IAP] End connection error:', e);
  }
}

export async function getAvailableProducts(): Promise<any[]> {
  try {
    const RNIap = await getIAP();
    if (!RNIap) return [];
    const subscriptions = await RNIap.getSubscriptions({
      skus: [PRODUCT_IDS.PRO_MONTHLY, PRODUCT_IDS.PRO_YEARLY],
    });
    cachedSubscriptions = subscriptions;
    return subscriptions;
  } catch (err) {
    console.error('[IAP] Get products error:', err);
    return [];
  }
}

export async function purchaseSubscription(
  productId: string
): Promise<boolean> {
  try {
    const RNIap = await getIAP();
    if (RNIap) {
      if (Platform.OS === 'android') {
        if (cachedSubscriptions.length === 0) {
          await getAvailableProducts();
        }
        const sub = cachedSubscriptions.find(
          (s: any) => s.productId === productId
        );
        const offerToken =
          sub?.subscriptionOfferDetails?.[0]?.offerToken || '';
        await RNIap.requestSubscription({
          sku: productId,
          subscriptionOffers: [{ sku: productId, offerToken }],
        });
      } else {
        await RNIap.requestSubscription({ sku: productId });
      }
      return true;
    }

    const product = SUBSCRIPTION_PRODUCTS.find(
      (p) => p.productId === productId
    );
    if (!product) throw new Error('Product not found');

    const result = await api.post<{ success: boolean; plan: string }>(
      '/api/subscription/purchase',
      {
        productId,
        plan: product.plan,
        period: product.period,
        platform: Platform.OS,
        receiptData: `${Platform.OS}_receipt_${Date.now()}`,
      }
    );
    return result.success;
  } catch (error) {
    console.error('[IAP] Purchase error:', error);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const RNIap = await getIAP();
    if (RNIap) {
      const purchases = await RNIap.getAvailablePurchases();
      if (purchases && purchases.length > 0) {
        const latestPurchase = purchases.sort(
          (a: any, b: any) =>
            (b.transactionDate || 0) - (a.transactionDate || 0)
        )[0];
        const result = await api.post<{ success: boolean; plan: string }>(
          '/api/subscription/restore',
          {
            platform: Platform.OS,
            receiptData: latestPurchase.transactionReceipt,
            productId: latestPurchase.productId,
          }
        );
        return result.success;
      }
      return false;
    }

    const result = await api.post<{ success: boolean; plan: string }>(
      '/api/subscription/restore',
      { platform: Platform.OS }
    );
    return result.success;
  } catch (error) {
    console.error('[IAP] Restore error:', error);
    return false;
  }
}

export async function getSubscriptionStatus(): Promise<{
  plan: 'free' | 'pro';
  expiresAt: string | null;
  isActive: boolean;
  trialEndsAt: string | null;
  isTrialActive: boolean;
}> {
  try {
    return await api.get('/api/subscription/status');
  } catch {
    return {
      plan: 'free',
      expiresAt: null,
      isActive: false,
      trialEndsAt: null,
      isTrialActive: false,
    };
  }
}
