import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import TestsScreen from '../screens/TestsScreen';
import UploadScreen from '../screens/UploadScreen';
import DietScreen from '../screens/DietScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyDietPlansScreen from '../screens/MyDietPlansScreen';
import WorkoutPlansScreen from '../screens/WorkoutPlansScreen';
import WorkoutBuilderScreen from '../screens/WorkoutBuilderScreen';
import ManualDietBuilderScreen from '../screens/ManualDietBuilderScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { colors, isDark } = useAppTheme();
  const normalizedLanguage = (i18n.resolvedLanguage || i18n.language || '').toLowerCase();
  const isArabic = normalizedLanguage.startsWith('ar');
  const { width } = useWindowDimensions();
  const drawerWidth = isArabic ? Math.max(190, Math.round(width * 0.3)) : Math.max(240, Math.round(width * 0.36));
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const glassTint = isDark ? 'dark' : 'light';
  const glassOverlayColor = isDark ? 'rgba(8, 15, 30, 0.34)' : 'rgba(255, 255, 255, 0.28)';
  const menuDividerColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.24)';

  const navigateToCompare = () => {
    setIsMenuVisible(false);
    navigation.navigate('Compare');
  };

  const navigateToTab = (screenName: 'Diet' | 'WorkoutBuilder' | 'Profile') => {
    setIsMenuVisible(false);
    navigation.navigate({
      name: 'Main',
      params: { screen: screenName },
      merge: true,
    } as any);
  };

  const navigateToProfile = () => {
    navigateToTab('Profile');
  };

  const navigateToDietDesigner = () => {
    navigateToTab('Diet');
  };

  const navigateToManualDietBuilder = () => {
    navigateToTab('ManualDietBuilder' as any);
  };

  const navigateToExercisesDesigner = () => {
    navigateToTab('WorkoutBuilder');
  };

  const renderMenuTrigger = () => (
    <TouchableOpacity
      onPress={() => setIsMenuVisible(true)}
      style={styles.menuTrigger}
      testID="button-header-menu"
    >
      <Ionicons name="menu" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: isDark ? 'rgba(148,163,184,0.95)' : '#64748b',
          tabBarHideOnKeyboard: true,
          tabBarLabel: ({ color }) => {
            const labels: Record<string, string> = isArabic
              ? {
                Home: 'الرئيسية',
                Upload: 'رفع\nالملف',
                DietTable: 'جدولي\nالغذائي',
                WorkoutTable: 'جدول\nتماريني',
                Tests: 'الفحوصات',
              }
              : {
                Home: 'Home',
                Upload: 'Upload',
                DietTable: 'My\nDiet',
                WorkoutTable: 'My\nWorkout',
                Tests: 'Tests',
              };
            return (
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                allowFontScaling={false}
                style={[
                  styles.tabCustomLabel,
                  {
                    color,
                    fontSize: isArabic ? 9.5 : 9,
                    lineHeight: 11,
                  },
                ]}
              >
                {labels[route.name] || route.name}
              </Text>
            );
          },
          tabBarIconStyle: {
            marginTop: 2,
            marginBottom: 1,
          },
          tabBarBackground: () => (
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <BlurView
                intensity={70}
                tint={glassTint}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFillObject}
              />
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: glassOverlayColor,
                  },
                ]}
              />
            </View>
          ),
          tabBarStyle: {
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
            backgroundColor: 'transparent',
            borderTopColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.12)',
            borderTopWidth: 1,
            paddingBottom: 10,
            paddingTop: 8,
            paddingHorizontal: 4,
            height: 92,
            borderRadius: 38,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 14,
            overflow: 'hidden',
          },
          tabBarItemStyle: {
            flex: 1,
            minWidth: 0,
            marginHorizontal: 0,
            marginVertical: 2,
            borderRadius: 999,
            overflow: 'hidden',
          },
          tabBarActiveBackgroundColor: isDark ? 'rgba(51, 65, 85, 0.58)' : 'rgba(255, 255, 255, 0.62)',
          headerStyle: {
            backgroundColor: colors.card
          },
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          headerLeft: renderMenuTrigger,
          headerRight: undefined,
          headerLeftContainerStyle: {
            paddingHorizontal: 6,
          },
          headerRightContainerStyle: {
            paddingHorizontal: 6,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: t('home'),
            tabBarIcon: ({ color }: { color: string; size: number }) => (
              <Ionicons name="home" size={22} color={color} />
            )
          }}
        />
        <Tab.Screen
          name="Upload"
          component={UploadScreen}
          options={{
            title: t('upload'),
            tabBarIcon: ({ color }: { color: string; size: number }) => (
              <Ionicons name="cloud-upload" size={22} color={color} />
            )
          }}
        />
        <Tab.Screen
          name="ManualDietBuilder"
          component={ManualDietBuilderScreen}
          options={{
            title: isArabic ? 'تصميم جدول غذائي' : 'Diet Builder',
            headerShown: false,
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="Diet"
          component={DietScreen}
          options={{
            title: isArabic ? 'الغذاء' : 'Diet',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="DietTable"
          component={MyDietPlansScreen}
          options={{
            title: isArabic ? 'جدولي الغذائي' : 'My Diet',
            tabBarIcon: ({ color }: { color: string; size: number }) => (
              <Ionicons name="book" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="WorkoutBuilder"
          component={WorkoutBuilderScreen}
          options={{
            title: isArabic ? 'تصميم الجدول' : 'Workout Builder',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="WorkoutTable"
          component={WorkoutPlansScreen}
          options={{
            title: isArabic ? 'جدول تماريني' : 'My Workout',
            tabBarIcon: ({ color }: { color: string; size: number }) => (
              <Ionicons name="barbell" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tests"
          component={TestsScreen}
          options={{
            title: t('tests'),
            tabBarIcon: ({ color }: { color: string; size: number }) => (
              <Ionicons name="flask" size={22} color={color} />
            )
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: t('profileTab'),
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.backdropTapArea}
            activeOpacity={1}
            onPress={() => setIsMenuVisible(false)}
            testID="overlay-header-menu"
          />

          <View
            pointerEvents="box-none"
            style={[
              styles.menuPanelHost,
              {
                alignItems: 'flex-start',
              },
            ]}
          >
            <View
              style={[
                styles.menuPanel,
                {
                  width: drawerWidth,
                  borderColor: colors.border,
                  ...(isArabic
                    ? {
                      borderLeftWidth: 1,
                      borderRightWidth: 0,
                      borderTopLeftRadius: 30,
                      borderBottomLeftRadius: 30,
                    }
                    : {
                      borderRightWidth: 1,
                      borderLeftWidth: 0,
                      borderTopRightRadius: 30,
                      borderBottomRightRadius: 30,
                    }),
                },
              ]}
            >
              <BlurView
                intensity={70}
                tint={glassTint}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFillObject}
              />
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: glassOverlayColor },
                ]}
              />

              <ScrollView
                style={styles.menuScroll}
                contentContainerStyle={styles.menuPanelContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.menuHeader, { flexDirection: 'row' }]}>
                  <Text
                    style={[
                      styles.menuTitle,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'القائمة' : 'Menu'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsMenuVisible(false)}
                    style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}
                    testID="button-close-side-menu"
                  >
                    <Ionicons name="close" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: menuDividerColor,
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={navigateToCompare}
                  testID="button-menu-compare"
                >
                  <Ionicons name="git-compare" size={18} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'المقارنات' : 'Comparisons'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: menuDividerColor,
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={navigateToManualDietBuilder}
                  testID="button-menu-manual-diet"
                >
                  <Ionicons name="restaurant" size={18} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'تصميم جدول غذائي' : 'Diet Builder'}
                  </Text>
                  <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '700' }}>{isArabic ? 'مجاني' : 'FREE'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: menuDividerColor,
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={navigateToDietDesigner}
                  testID="button-menu-ai-diet"
                >
                  <Ionicons name="sparkles" size={18} color={colors.warning} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'تصميم جدول غذائي AI' : 'AI Diet Designer'}
                  </Text>
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '700' }}>{isArabic ? 'مدفوع' : 'PRO'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: menuDividerColor,
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={navigateToExercisesDesigner}
                  testID="button-menu-exercises-designer"
                >
                  <Ionicons name="barbell" size={18} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'تصميم جدول تمارين' : 'Workout Designer'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: menuDividerColor,
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={navigateToProfile}
                  testID="button-menu-profile"
                >
                  <Ionicons name="person" size={18} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {t('profileTab')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    {
                      borderBottomColor: 'transparent',
                      flexDirection: 'row',
                    },
                  ]}
                  onPress={() => {
                    setIsMenuVisible(false);
                    Alert.alert(
                      isArabic ? 'تسجيل الخروج' : 'Logout',
                      isArabic ? 'هل تريد تسجيل الخروج؟' : 'Are you sure you want to logout?',
                      [
                        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                        { text: isArabic ? 'خروج' : 'Logout', style: 'destructive', onPress: () => logout() },
                      ]
                    );
                  }}
                  testID="button-menu-logout"
                >
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.menuItemText,
                      {
                        color: '#ef4444',
                        textAlign: 'left',
                      },
                    ]}
                  >
                    {isArabic ? 'تسجيل الخروج' : 'Logout'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuTrigger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
  },
  menuPanelHost: {
    ...StyleSheet.absoluteFillObject,
  },
  menuPanel: {
    height: '100%',
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 56,
  },
  menuPanelContent: {
    paddingBottom: 24,
    gap: 0,
  },
  backdropTapArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  menuHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  tabCustomLabel: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
    textAlign: 'center',
    width: '100%',
    flexShrink: 1,
    includeFontPadding: false,
  },
});
