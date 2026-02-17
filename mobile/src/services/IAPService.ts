import { Platform } from 'react-native';
import { api } from '../lib/api';

// PRODUCTION NOTE: Replace this stub with real IAP SDK integration
// For iOS: Use StoreKit 2 via react-native-iap or expo-in-app-purchases
// For Android: Use Google Play Billing via react-native-iap
// The real SDK will handle payment UI and return receipts/tokens
// that must be sent to the server for verification before activating subscription

export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.alshira.biotrack.basic.monthly',
  BASIC_YEARLY: 'com.alshira.biotrack.basic.yearly',
  PREMIUM_MONTHLY: 'com.alshira.biotrack.premium.monthly',
  PREMIUM_YEARLY: 'com.alshira.biotrack.premium.yearly',
};

export interface SubscriptionProduct {
  productId: string;
  plan: 'basic' | 'premium';
  period: 'monthly' | 'yearly';
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
    title: 'Basic Monthly',
    titleAr: 'الأساسي - شهري',
    price: '$4.99/mo',
    priceAr: '٤.٩٩$/شهرياً',
    features: ['20 PDF uploads', 'Detailed analysis', 'Priority support'],
    featuresAr: ['٢٠ ملف PDF', 'تحليل تفصيلي', 'دعم متقدم'],
  },
  {
    productId: PRODUCT_IDS.BASIC_YEARLY,
    plan: 'basic',
    period: 'yearly',
    title: 'Basic Yearly',
    titleAr: 'الأساسي - سنوي',
    price: '$39.99/yr',
    priceAr: '٣٩.٩٩$/سنوياً',
    features: ['20 PDF uploads', 'Detailed analysis', 'Priority support', 'Save 33%'],
    featuresAr: ['٢٠ ملف PDF', 'تحليل تفصيلي', 'دعم متقدم', 'وفّر ٣٣٪'],
  },
  {
    productId: PRODUCT_IDS.PREMIUM_MONTHLY,
    plan: 'premium',
    period: 'monthly',
    title: 'Premium Monthly',
    titleAr: 'المتقدم - شهري',
    price: '$9.99/mo',
    priceAr: '٩.٩٩$/شهرياً',
    features: ['Unlimited uploads', 'AI diet plans', 'AI recommendations', 'Phone reminders', 'Data export'],
    featuresAr: ['رفع غير محدود', 'خطط غذائية بالذكاء الاصطناعي', 'توصيات ذكية', 'تذكيرات هاتفية', 'تصدير البيانات'],
  },
  {
    productId: PRODUCT_IDS.PREMIUM_YEARLY,
    plan: 'premium',
    period: 'yearly',
    title: 'Premium Yearly',
    titleAr: 'المتقدم - سنوي',
    price: '$79.99/yr',
    priceAr: '٧٩.٩٩$/سنوياً',
    features: ['Unlimited uploads', 'AI diet plans', 'AI recommendations', 'Phone reminders', 'Data export', 'Save 33%'],
    featuresAr: ['رفع غير محدود', 'خطط غذائية بالذكاء الاصطناعي', 'توصيات ذكية', 'تذكيرات هاتفية', 'تصدير البيانات', 'وفّر ٣٣٪'],
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
}> {
  try {
    return await api.get('/api/subscription/status');
  } catch {
    return { plan: 'free', expiresAt: null, isActive: false };
  }
}
