import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Keyboard, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import './src/lib/i18n';
import { AuthProvider } from './src/context/AuthContext';
import { AIConsentProvider, useAIConsent } from './src/context/AIConsentContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import RootNavigator from './src/navigation/RootNavigator';
import AdBanner from './src/components/AdBanner';
import { initIAP, endIAP } from './src/services/IAPService';
import { initializeReminderNotifications } from './src/services/ReminderNotificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000
    }
  }
});

export default function App() {
  useEffect(() => {
    initIAP().then((connected) => {
      if (connected) {
        console.log('[IAP] Connection established');
      }
    });
    initializeReminderNotifications();
    return () => {
      endIAP();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AIConsentProvider>
          <ThemeProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <AppNavigator />
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </AIConsentProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isDark, colors } = useAppTheme();
  const [keyboardUp, setKeyboardUp] = React.useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardUp(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardUp(false)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const navTheme = isDark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed top ad banner — always visible for free accounts */}
      <AdBanner position="top" />

      {/* Main app content */}
      <View style={{ flex: 1 }}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
          <AIConsentModal />
        </NavigationContainer>
      </View>

      {/* Fixed bottom ad banner — hide when keyboard is open to avoid squeezing input */}
      {!keyboardUp && <AdBanner position="bottom" />}
    </View>
  );
}

function AIConsentModal() {
  const { status, isReady, hidePrompt, accept, decline, hidePromptForever } = useAIConsent();
  const { i18n } = useTranslation();
  const isArabic = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('ar');
  const visible = isReady && status === 'unknown' && !hidePrompt;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={() => { }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title]}>
            {isArabic ? '🔒 الموافقة على معالجة البيانات بالذكاء الاصطناعي' : '🔒 AI Data Processing Consent'}
          </Text>
          <Text style={[styles.body]}>
            {isArabic
              ? 'يستخدم هذا التطبيق خدمات الذكاء الاصطناعي التابعة لجهات خارجية (OpenAI و Google Cloud) لتحليل التقارير الصحية المرفوعة وإنشاء إرشادات غذائية.\n\nقد يتم إرسال البيانات التالية بشكل آمن:\n• تقارير الفحوصات المرفوعة (PDF أو صور)\n• القيم الصحية المستخرجة\n• المعلومات الصحية التي يدخلها المستخدم\n\nلا يتم بيع البيانات أو مشاركتها لأغراض تسويقية.\n\nبالمتابعة، أنت توافق على هذه المعالجة.'
              : 'This app uses third-party AI services (OpenAI, Google Cloud) to analyze uploaded health reports and generate nutritional guidance.\n\nThe following data may be sent securely:\n• Uploaded lab reports (PDF or images)\n• Extracted health values\n• User-input health information\n\nNo data is sold or shared for marketing purposes.\n\nBy continuing, you agree to this processing.'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={decline} testID="button-ai-consent-decline">
              <Text style={styles.declineText}>{isArabic ? 'رفض' : 'Decline'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hidePromptBtn}
              onPress={hidePromptForever}
              testID="button-ai-consent-hide-forever"
            >
              <Text style={styles.hidePromptText}>{isArabic ? 'عدم الإظهار مرة أخرى' : "Don't ask me again"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.agreeBtn} onPress={accept} testID="button-ai-consent-agree">
              <Text style={styles.agreeText}>{isArabic ? 'موافقة' : 'Agree'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'left',
  },
  body: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  declineBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  declineText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  agreeBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  agreeText: {
    color: '#fff',
    fontWeight: '700',
  },
  hidePromptBtn: {
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hidePromptText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
});
