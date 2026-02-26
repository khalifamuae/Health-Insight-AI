import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import CompareScreen from '../screens/CompareScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { i18n, t } = useTranslation();
  const { colors } = useAppTheme();
  const isArabic = i18n.language === 'ar';

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleLogin = async (userData: any, token: string) => {
    await login(userData, token);
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              presentation: 'modal',
              headerShown: true,
              headerTitle: t('subscription.plans'),
              headerTitleAlign: 'center',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.card },
              headerTitleStyle: { color: colors.text, fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="Compare"
            component={CompareScreen}
            options={{
              headerShown: true,
              headerTitle: isArabic ? 'المقارنة' : 'Compare',
              headerTitleAlign: 'center',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.card },
              headerTitleStyle: { color: colors.text, fontWeight: '700' },
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Login">
          {() => <LoginScreen onLogin={handleLogin} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
