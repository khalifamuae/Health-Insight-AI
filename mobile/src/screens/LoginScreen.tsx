import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  I18nManager,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

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
      const authUrl = 'https://your-app-url.replit.app/api/login';
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
          <Ionicons name="flask" size={80} color="#3b82f6" />
        </View>

        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={24} color="#22c55e" />
            <Text style={styles.featureText}>{t('uploadPdf')}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={24} color="#3b82f6" />
            <Text style={styles.featureText}>{t('allTests')}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={24} color="#f59e0b" />
            <Text style={styles.featureText}>{t('reminders.title')}</Text>
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

        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
          <Text style={styles.disclaimerText}>
            {t('disclaimer.text')}
          </Text>
        </View>

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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32
  },
  featureItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  featureText: {
    fontSize: 16,
    color: '#1e293b',
    marginHorizontal: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  loginButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24
  },
  loginButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 8
  },
  disclaimerCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    marginHorizontal: 12,
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  languageButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: 12
  },
  languageButtonText: {
    fontSize: 16,
    color: '#64748b',
    marginHorizontal: 8
  }
});
