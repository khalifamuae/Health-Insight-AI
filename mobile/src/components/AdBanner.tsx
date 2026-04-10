import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface AdBannerProps {
  position?: 'top' | 'bottom';
}

const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-1897992442343412/1743840045';
const AD_UNIT_ID = __DEV__ ? TestIds.BANNER : PRODUCTION_AD_UNIT_ID;

/**
 * AdBanner — Enabled for Production/Standalone
 */
export default function AdBanner({ position = 'bottom' }: AdBannerProps) {
  const { shouldShowAds } = useSubscription();
  const { isAuthenticated } = useAuth();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isArabic = isArabicLanguage();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  // Don't show ads on login screen or for paid/trial users
  if (!isAuthenticated || !shouldShowAds()) return null;

  const isTop = position === 'top';
  const extraTopPadding = Platform.OS === 'ios' ? 4 : 0;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? '#0f172a' : '#e8edf3',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        paddingTop: isTop ? insets.top + extraTopPadding : 0,
        paddingBottom: !isTop ? insets.bottom : 0,
        borderBottomWidth: isTop ? 1 : 0,
        borderTopWidth: !isTop ? 1 : 0,
        minHeight: isTop ? insets.top + 50 : insets.bottom + 50,
      }
    ]}>
      {!adLoaded && !adFailed && (
        <View style={[styles.placeholder, { backgroundColor: isDark ? '#1e293b' : '#dfe6ee', position: 'absolute', width: '100%', height: 50, top: isTop ? insets.top + extraTopPadding : 0 }]}>
          <Ionicons name="megaphone-outline" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
          <Text style={[styles.placeholderText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            {isArabic ? 'جاري تحميل الإعلان...' : 'Loading Ad...'}
          </Text>
        </View>
      )}

      {adFailed && (
        <View style={[styles.placeholder, { backgroundColor: isDark ? '#1e293b' : '#dfe6ee' }]}>
          <Ionicons name="megaphone-outline" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
          <Text style={[styles.placeholderText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            {isArabic ? 'مساحة إعلانية — اشترك لإزالة الإعلانات' : 'Ad Space — Subscribe to remove ads'}
          </Text>
        </View>
      )}

      <View style={[styles.adWrapper, { opacity: adLoaded ? 1 : 0 }]}>
        <BannerAd
          unitId={AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={(error) => {
            console.error('Ad failed to load: ', error);
            setAdFailed(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Dimensions.get('window').width,
  },
  placeholder: {
    height: 60,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
