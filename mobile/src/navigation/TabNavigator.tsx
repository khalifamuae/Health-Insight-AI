import React from 'react';
import { I18nManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import TestsScreen from '../screens/TestsScreen';
import UploadScreen from '../screens/UploadScreen';
import DietScreen from '../screens/DietScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500'
        },
        headerStyle: {
          backgroundColor: '#fff'
        },
        headerTitleStyle: {
          color: '#1e293b',
          fontWeight: '600'
        },
        headerTitleAlign: 'center'
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          title: t('upload'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="cloud-upload" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Diet"
        component={DietScreen}
        options={{
          title: isArabic ? 'الغذاء' : 'Diet',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="nutrition" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Tests"
        component={TestsScreen}
        options={{
          title: t('tests'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="flask" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('profileTab'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}
