import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { api } from '../lib/api';

interface VersionInfo {
  latestVersion: string;
  forceUpdate: boolean;
  updateUrl: {
    ios: string;
    android: string;
  };
}

/**
 * Compares two semver strings (e.g. "1.0.11" vs "1.0.12").
 * Returns true if `current` is older than `latest`.
 */
function isOlderVersion(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (cv < lv) return true;
    if (cv > lv) return false;
  }
  return false;
}

export default function UpdateChecker() {
  const [visible, setVisible] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const data = await api.get<VersionInfo>('/api/app/version');
      const currentVersion = Constants.expoConfig?.version || '0.0.0';
      if (isOlderVersion(currentVersion, data.latestVersion)) {
        setVersionInfo(data);
        setVisible(true);
      }
    } catch {
      // Silently fail — don't block the app
    }
  };

  const handleUpdate = () => {
    if (!versionInfo) return;
    const url = Platform.OS === 'ios' ? versionInfo.updateUrl.ios : versionInfo.updateUrl.android;
    Linking.openURL(url);
  };

  if (!visible || !versionInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !versionInfo.forceUpdate && setVisible(false)}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
            <Ionicons name="cloud-download-outline" size={36} color={isDark ? '#60a5fa' : '#2563eb'} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isArabic ? 'تحديث جديد متاح!' : 'New Update Available!'}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {isArabic
              ? `يتوفر إصدار جديد (${versionInfo.latestVersion}). قم بالتحديث للحصول على أحدث الميزات والإصلاحات.`
              : `A new version (${versionInfo.latestVersion}) is available. Update now to get the latest features and fixes.`}
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            onPress={handleUpdate}
            style={[styles.updateBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.updateBtnText}>
              {isArabic ? 'تحديث الآن' : 'Update Now'}
            </Text>
          </TouchableOpacity>

          {!versionInfo.forceUpdate && (
            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={styles.laterBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.laterBtnText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {isArabic ? 'لاحقاً' : 'Later'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
