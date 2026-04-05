import { Platform } from 'react-native';
import { api } from '../lib/api';

// =============================================
// Product IDs — Must match App Store Connect
// =============================================
export const PRODUCT_IDS = {
  // Trainee plans
  TRAINEE_MONTHLY: 'com.biotrack.ai.trainee.monthly',
  TRAINEE_YEARLY: 'com.biotrack.ai.trainee.yearly',
  // Trainer plans
  TRAINER_5: 'com.biotrack.ai.trainer.5',
  TRAINER_10: 'com.biotrack.ai.trainer.10',
  TRAINER_15: 'com.biotrack.ai.trainer.15',
  TRAINER_20: 'com.biotrack.ai.trainer.20',
  TRAINER_35: 'com.biotrack.ai.trainer.35',
  TRAINER_50: 'com.biotrack.ai.trainer.50',
  TRAINER_100: 'com.biotrack.ai.trainer.100',
};

export const FREE_TRIAL_DAYS = 3;

export type PlanType = 'trainee' | 'trainer';
export type BillingPeriod = 'monthly' | 'yearly';

export interface SubscriptionProduct {
  productId: string;
  plan: PlanType;
  period: BillingPeriod;
  title: string;
  titleAr: string;
  price: string;
  priceAr: string;
  priceValue: number;
  traineeLimit?: number;
  savings?: string;
  savingsAr?: string;
  features: string[];
  featuresAr: string[];
}

// =============================================
// Trainee Products
// =============================================
export const TRAINEE_PRODUCTS: SubscriptionProduct[] = [
  {
    productId: PRODUCT_IDS.TRAINEE_MONTHLY,
    plan: 'trainee',
    period: 'monthly',
    title: 'Monthly',
    titleAr: 'شهري',
    price: '$9.99/mo',
    priceAr: '$9.99/شهرياً',
    priceValue: 9.99,
    features: [
      'Upload unlimited PDF lab reports',
      'AI-powered lab result analysis',
      'AI-generated personalized diet plans',
      'Upload InBody scans',
      'Track 50+ medical biomarkers',
      'Compare old vs new results',
      'Automated recheck reminders',
      'No ads',
      'Priority support',
    ],
    featuresAr: [
      'رفع تقارير تحاليل PDF بلا حدود',
      'تحليل نتائج التحاليل بالذكاء الاصطناعي',
      'جداول غذائية مخصصة بالذكاء الاصطناعي',
      'رفع فحوصات InBody',
      'تتبع أكثر من 50 مؤشر حيوي',
      'مقارنة النتائج القديمة بالجديدة',
      'تذكيرات إعادة الفحص التلقائية',
      'بدون إعلانات',
      'دعم أولوية',
    ],
  },
  {
    productId: PRODUCT_IDS.TRAINEE_YEARLY,
    plan: 'trainee',
    period: 'yearly',
    title: 'Yearly',
    titleAr: 'سنوي',
    price: '$99.99/year',
    priceAr: '$99.99/سنوياً',
    priceValue: 99.99,
    savings: 'Save $19.89 (17% off)',
    savingsAr: 'وفّر $19.89 (خصم 17%)',
    features: [
      'Upload unlimited PDF lab reports',
      'AI-powered lab result analysis',
      'AI-generated personalized diet plans',
      'Upload InBody scans',
      'Track 50+ medical biomarkers',
      'Compare old vs new results',
      'Automated recheck reminders',
      'No ads',
      'Priority support',
    ],
    featuresAr: [
      'رفع تقارير تحاليل PDF بلا حدود',
      'تحليل نتائج التحاليل بالذكاء الاصطناعي',
      'جداول غذائية مخصصة بالذكاء الاصطناعي',
      'رفع فحوصات InBody',
      'تتبع أكثر من 50 مؤشر حيوي',
      'مقارنة النتائج القديمة بالجديدة',
      'تذكيرات إعادة الفحص التلقائية',
      'بدون إعلانات',
      'دعم أولوية',
    ],
  },
];

// =============================================
// Trainer Products
// =============================================
export const TRAINER_PRODUCTS: SubscriptionProduct[] = [
  {
    productId: PRODUCT_IDS.TRAINER_5,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 5',
    titleAr: 'مدرب 5',
    price: '$60/mo',
    priceAr: '$60/شهرياً',
    priceValue: 60,
    traineeLimit: 5,
    features: ['5 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['5 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_10,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 10',
    titleAr: 'مدرب 10',
    price: '$100/mo',
    priceAr: '$100/شهرياً',
    priceValue: 100,
    traineeLimit: 10,
    features: ['10 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['10 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_15,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 15',
    titleAr: 'مدرب 15',
    price: '$145/mo',
    priceAr: '$145/شهرياً',
    priceValue: 145,
    traineeLimit: 15,
    features: ['15 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['15 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_20,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 20',
    titleAr: 'مدرب 20',
    price: '$180/mo',
    priceAr: '$180/شهرياً',
    priceValue: 180,
    traineeLimit: 20,
    features: ['20 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['20 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_35,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 35',
    titleAr: 'مدرب 35',
    price: '$300/mo',
    priceAr: '$300/شهرياً',
    priceValue: 300,
    traineeLimit: 35,
    features: ['35 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['35 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_50,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 50',
    titleAr: 'مدرب 50',
    price: '$400/mo',
    priceAr: '$400/شهرياً',
    priceValue: 400,
    traineeLimit: 50,
    features: ['50 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['50 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
  {
    productId: PRODUCT_IDS.TRAINER_100,
    plan: 'trainer',
    period: 'monthly',
    title: 'Trainer 100',
    titleAr: 'مدرب 100',
    price: '$750/mo',
    priceAr: '$750/شهرياً',
    priceValue: 750,
    traineeLimit: 100,
    features: ['100 trainees', 'All trainee features', 'AI diet plans for trainees', 'Trainee file management'],
    featuresAr: ['100 متدربين', 'جميع مميزات المتدرب', 'جداول غذائية بالذكاء الاصطناعي للمتدربين', 'إدارة ملفات المتدربين'],
  },
];

export const ALL_SUBSCRIPTION_PRODUCTS = [...TRAINEE_PRODUCTS, ...TRAINER_PRODUCTS];

// Legacy compatibility
export const SUBSCRIPTION_PRODUCTS = TRAINEE_PRODUCTS;

// =============================================
// IAP Module
// =============================================
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
            const product = ALL_SUBSCRIPTION_PRODUCTS.find(
              (p) => p.productId === purchase.productId
            );
            await api.post('/api/subscription/purchase', {
              productId: purchase.productId,
              plan: product?.plan || 'trainee',
              period: product?.period || 'monthly',
              traineeLimit: product?.traineeLimit || 0,
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
    const allSkus = Object.values(PRODUCT_IDS);
    const subscriptions = await RNIap.getSubscriptions({ skus: allSkus });
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

    const product = ALL_SUBSCRIPTION_PRODUCTS.find(
      (p) => p.productId === productId
    );
    if (!product) throw new Error('Product not found');

    const result = await api.post<{ success: boolean; plan: string }>(
      '/api/subscription/purchase',
      {
        productId,
        plan: product.plan,
        period: product.period,
        traineeLimit: product.traineeLimit || 0,
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
  plan: 'free' | 'pro' | 'trainer';
  expiresAt: string | null;
  isActive: boolean;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  subscriberManagementActive: boolean;
  subscriberManagementLimit: number;
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
      subscriberManagementActive: false,
      subscriberManagementLimit: 0,
    };
  }
}
