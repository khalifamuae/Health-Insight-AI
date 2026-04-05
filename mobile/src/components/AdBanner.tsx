import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { Ionicons } from '@expo/vector-icons';

interface AdBannerProps {
  position?: 'top' | 'bottom';
}

/**
 * AdBanner — Shows a placeholder ad banner for free accounts.
 * Placed globally in App.tsx (outside NavigationContainer) so it
 * stays fixed at the very top/bottom of the screen across all pages.
 * 
 * When AdMob is configured, replace the placeholder View with:
 * <BannerAd unitId={AD_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 */
export default function AdBanner({ position = 'bottom' }: AdBannerProps) {
  const { shouldShowAds } = useSubscription();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isArabic = isArabicLanguage();

  // Don't show ads for paid users
  if (!shouldShowAds()) return null;

  const isTop = position === 'top';

  // Extra padding after safe area to push content below Dynamic Island
  const extraTopPadding = Platform.OS === 'ios' ? 4 : 0;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? '#0f172a' : '#e8edf3',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        // Safe area + extra padding for Dynamic Island / notch
        paddingTop: isTop ? insets.top + extraTopPadding : 0,
        paddingBottom: !isTop ? insets.bottom : 0,
        borderBottomWidth: isTop ? 1 : 0,
        borderTopWidth: !isTop ? 1 : 0,
      }
    ]}>
      {/* 
        TODO: Replace with real AdMob banner:
        <BannerAd
          unitId={position === 'top' ? TOP_AD_UNIT_ID : BOTTOM_AD_UNIT_ID}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      */}
      <View style={[styles.placeholder, { backgroundColor: isDark ? '#1e293b' : '#dfe6ee' }]}>
        <Ionicons name="megaphone-outline" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
        <Text style={[styles.placeholderText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
          {isArabic ? 'مساحة إعلانية — اشترك لإزالة الإعلانات' : 'Ad Space — Subscribe to remove ads'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
