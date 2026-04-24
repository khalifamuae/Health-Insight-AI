import React from 'react';

interface AdBannerProps {
  position?: 'top' | 'bottom';
}

/**
 * AdBanner — DISABLED for Expo Go / development
 * Re-enable by restoring react-native-google-mobile-ads imports
 */
export default function AdBanner({ position = 'bottom' }: AdBannerProps) {
  return null;
}
