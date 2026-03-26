import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../context/ThemeContext';
import { getSessionCookie } from '../lib/api';

const API_BASE_URL = 'https://health-insight-ai.replit.app';

export default function ClientProfileWebScreen({ route }: any) {
  const { clientId } = route.params;
  const { colors } = useAppTheme();
  const [cookie, setCookie] = useState<string | null>(null);

  useEffect(() => {
    getSessionCookie().then(c => {
      setCookie(c || '');
    });
  }, []);

  if (cookie === null) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Inject session cookie into Webview
  const INJECTED_JAVASCRIPT = `
    if ("${cookie}") {
      document.cookie = "${cookie}; path=/; max-age=31536000";
    }
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView 
        source={{ 
          uri: `${API_BASE_URL}/subscriber-management/${clientId}`,
          ...(cookie ? { headers: { Cookie: cookie } } : {})
        }}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        sharedCookiesEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
           <ActivityIndicator 
              color={colors.primary} 
              size="large" 
              style={[styles.webViewLoader]} 
           />
        )}
        style={{ flex: 1, backgroundColor: colors.background }}
        allowsBackForwardNavigationGestures
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webViewLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9 }
});
