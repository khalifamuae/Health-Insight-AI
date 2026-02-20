import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const handleLogin = () => {
    login(
      { id: 1, name: 'User', email: 'user@example.com', subscription: 'free' },
      'demo-token'
    );
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ presentation: 'modal' }}
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
