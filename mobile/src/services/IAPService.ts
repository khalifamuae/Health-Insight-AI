import { Platform } from 'react-native';
import { api } from '../lib/api';

// PRODUCTION NOTE: Replace this stub with real IAP SDK integration
// For iOS: Use StoreKit 2 via react-native-iap or expo-in-app-purchases
// For Android: Use Google Play Billing via react-native-iap
// The real SDK will handle payment UI and return receipts/tokens
// that must be sent to the server for verification before activating subscription

export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.alshira.biotrack.basic.monthly',
  PREMIUM_MONTHLY: 'com.alshira.biotrack.premium.monthly',
};

export const FREE_TRIAL_DAYS = 30;

export interface SubscriptionProduct {
  productId: string;
  plan: 'basic' | 'premium';
  period: 'monthly';
  title: string;
  titleAr: string;
  price: string;
  priceAr: string;
  features: string[];
  featuresAr: string[];
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    productId: PRODUCT_IDS.BASIC_MONTHLY,
    plan: 'basic',
    period: 'monthly',
    title: 'Basic',
    titleAr: 'الأساسي',
    price: '$4.99/mo',
    priceAr: '٤.٩٩$/شهرياً',
    features: ['20 PDF uploads/month', '4 AI diet plans/month', 'Detailed analysis', 'Test tracking'],
    featuresAr: ['٢٠ ملف PDF شهرياً', '٤ خطط غذائية بالذكاء الاصطناعي شهرياً', 'تحليل تفصيلي', 'متابعة الفحوصات'],
  },
  {
    productId: PRODUCT_IDS.PREMIUM_MONTHLY,
    plan: 'premium',
    period: 'monthly',
    title: 'Premium',
    titleAr: 'المتقدم',
    price: '$9.99/mo',
    priceAr: '٩.٩٩$/شهرياً',
    features: ['Unlimited PDF uploads', 'Unlimited AI diet plans', 'AI recommendations', 'Phone reminders', 'Data export', 'Priority support'],
    featuresAr: ['رفع غير محدود للملفات', 'خطط غذائية غير محدودة', 'توصيات ذكية', 'تذكيرات هاتفية', 'تصدير البيانات', 'دعم أولوية'],
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
  plan: 'free' | 'basic' | 'premium';
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
