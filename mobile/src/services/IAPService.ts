import { Platform } from 'react-native';
import { api } from '../lib/api';

// PRODUCTION NOTE: Replace this stub with real IAP SDK integration
// For iOS: Use StoreKit 2 via react-native-iap or expo-in-app-purchases
// For Android: Use Google Play Billing via react-native-iap
// The real SDK will handle payment UI and return receipts/tokens
// that must be sent to the server for verification before activating subscription

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
    priceAr: '١٤.٩٩$/شهرياً',
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
    priceAr: '١٣٩$/سنوياً',
    savings: 'Save $40.88 (23% off)',
    savingsAr: 'وفّر ٤٠.٨٨$ (خصم ٢٣٪)',
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

export async function purchaseSubscription(productId: string): Promise<boolean> {
  try {
    const product = SUBSCRIPTION_PRODUCTS.find(p => p.productId === productId);
    if (!product) throw new Error('Product not found');

    const result = await api.post<{ success: boolean; plan: string }>('/api/subscription/purchase', {
      productId,
      plan: product.plan,
      period: product.period,
      platform: Platform.OS,
      receiptData: `${Platform.OS}_receipt_${Date.now()}`,
    });

    return result.success;
  } catch (error) {
    console.error('Purchase error:', error);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const result = await api.post<{ success: boolean; plan: string }>('/api/subscription/restore', {
      platform: Platform.OS,
    });
    return result.success;
  } catch (error) {
    console.error('Restore error:', error);
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
    return { plan: 'free', expiresAt: null, isActive: false, trialEndsAt: null, isTrialActive: false };
  }
}
