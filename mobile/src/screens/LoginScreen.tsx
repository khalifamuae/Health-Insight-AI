import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  I18nManager,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isLoading, setIsLoading] = useState(false);

  const handleReplitLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = 'https://health-insight-ai.replit.app/api/login';
      await Linking.openURL(authUrl);
      
      setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      Alert.alert(t('errors.loginRequired'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="flask" size={64} color="#3b82f6" />
        </View>

        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.tagline}>
          {isArabic ? 'تحليل ذكي لنتائج فحوصاتك الطبية' : 'Smart Analysis for Your Lab Results'}
        </Text>

        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={22} color="#16a34a" />
            <Text style={styles.trustBadgeLabel}>
              {isArabic ? 'آمن وخاص' : 'Secure & Private'}
            </Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="flask" size={22} color="#3b82f6" />
            <Text style={styles.trustBadgeLabel}>
              {isArabic ? '+50 مؤشر' : '50+ Biomarkers'}
            </Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="sparkles" size={22} color="#7c3aed" />
            <Text style={styles.trustBadgeLabel}>
              {isArabic ? 'تحليل بالذكاء الاصطناعي' : 'AI Medical Insights'}
            </Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={22} color="#22c55e" />
            <Text style={styles.featureText}>
              {isArabic ? 'رفع PDF وتحليل فوري' : 'Upload PDF & Instant Analysis'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="nutrition" size={22} color="#f59e0b" />
            <Text style={styles.featureText}>
              {isArabic ? 'خطة غذائية مخصصة بالذكاء الاصطناعي' : 'AI-Powered Personalized Diet Plan'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={22} color="#3b82f6" />
            <Text style={styles.featureText}>
              {isArabic ? 'تذكيرات إعادة الفحص' : 'Recheck Reminders & Tracking'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleReplitLogin}
          disabled={isLoading}
          testID="button-login"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in" size={24} color="#fff" />
              <Text style={styles.loginButtonText}>{t('login')}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.trialText}>
          {isArabic ? '7 أيام تجربة مجانية' : '7-day free trial'}
        </Text>

        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}
          testID="button-language-toggle"
        >
          <Ionicons name="language" size={20} color="#64748b" />
          <Text style={styles.languageButtonText}>
            {isArabic ? 'English' : 'العربية'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://health-insight-ai.replit.app/privacy')} testID="link-privacy-login">
            <Text style={styles.footerLink}>{isArabic ? 'الخصوصية' : 'Privacy'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://health-insight-ai.replit.app/terms')} testID="link-terms-login">
            <Text style={styles.footerLink}>{isArabic ? 'الشروط' : 'Terms'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center'
  },
  tagline: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  trustBadgesRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  trustBadge: {
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    maxWidth: 80,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 28,
    gap: 10,
  },
  featureItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  loginButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  trialText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 20,
  },
  languageButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  languageButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footerDivider: {
    fontSize: 12,
    color: '#d1d5db',
  },
});
