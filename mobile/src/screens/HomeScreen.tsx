import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';

interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  color: string;
  styles: any;
}

const StatsCard = ({ icon, title, value, color, styles }: StatsCardProps) => {
  const { colors, isDark } = useAppTheme();
  return (
    <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={[styles.statsCardContainer, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: colors.mutedText }]}>{title}</Text>
    </BlurView>
  );
};

interface TrustBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
  styles: any;
}

const TrustBadge = ({ icon, text, color, styles }: TrustBadgeProps) => {
  const { isDark } = useAppTheme();
  return (
    <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={[styles.trustBadgeContainer, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.trustBadgeText, { color }]}>{text}</Text>
    </BlurView>
  );
};


export default function HomeScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const styles = getStyles(isArabic);

  const { data: userTests } = useQuery({
    queryKey: ['userTests'],
    queryFn: queries.allTests,
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: queries.reminders,
  });

  const tests = (userTests as any[]) || [];
  const remindersList = (reminders as any[]) || [];
  const activeTests = tests.filter((t: any) => t.hasResult);

  const normalCount = activeTests.filter((t: any) => t.status === 'normal').length;
  const abnormalCount = activeTests.filter((t: any) => t.status === 'high' || t.status === 'low').length;
  const frozenCount = tests.filter((t: any) => !t.hasResult || t.status === 'pending').length;
  const pendingReminders = remindersList.filter((r: any) => !r.sent && (!r.dueDate || new Date(r.dueDate) > new Date())).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color={colors.mutedText} />
        <Text style={[styles.disclaimerSmallText, { color: colors.mutedText }]}>{t('disclaimer.text')}</Text>
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('welcome')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('subtitle')}</Text>
      </View>

      <View style={styles.trustBadgesRow}>
        <TrustBadge icon="shield-checkmark" text={isArabic ? 'آمن وخاص' : 'Secure & Private'} color="#16a34a" styles={styles} />
        <TrustBadge icon="flask" text={isArabic ? '+50 مؤشر حيوي' : '50+ Biomarkers'} color="#3b82f6" styles={styles} />
        <TrustBadge icon="sparkles" text={isArabic ? 'تحليل ذكي' : 'AI Insights'} color="#7c3aed" styles={styles} />
      </View>

      <View style={styles.statsGrid}>
        <StatsCard icon="checkmark-circle" title={t('normal')} value={normalCount} color={isDark ? "rgba(255,255,255,0.9)" : "#334155"} styles={styles} />
        <StatsCard icon="alert-circle" title={t('abnormal')} value={abnormalCount} color={isDark ? "rgba(255,255,255,0.9)" : "#dc2626"} styles={styles} />
        <StatsCard icon="notifications" title={t('reminders.title')} value={pendingReminders} color={isDark ? "rgba(255,255,255,0.9)" : "#f59e0b"} styles={styles} />
        <StatsCard icon="pause-circle" title={t('frozenTests')} value={frozenCount} color={isDark ? "rgba(255,255,255,0.9)" : "#64748b"} styles={styles} />
      </View>

      <View style={styles.shortcutsRow}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Diet')} testID="card-diet-shortcut">
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={[styles.shortcutCardContainer, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <View style={[styles.shortcutIcon, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)' }]}>
              <Ionicons name="nutrition" size={22} color="#4ade80" />
            </View>
            <View style={styles.shortcutTextContainer}>
              <Text style={[styles.shortcutTitle, { color: colors.text }]}>{isArabic ? 'خطة غذائية' : 'Diet Plan'}</Text>
              <Text style={[styles.shortcutDesc, { color: colors.mutedText }]} numberOfLines={1}>{isArabic ? 'تغذية مخصصة بالذكاء الاصطناعي' : 'AI-powered nutrition plan'}</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Compare')} testID="card-compare-shortcut">
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={[styles.shortcutCardContainer, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <View style={[styles.shortcutIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="git-compare" size={22} color="#60a5fa" />
            </View>
            <View style={styles.shortcutTextContainer}>
              <Text style={[styles.shortcutTitle, { color: colors.text }]}>{isArabic ? 'مقارنة النتائج' : 'Compare Results'}</Text>
              <Text style={[styles.shortcutDesc, { color: colors.mutedText }]} numberOfLines={1}>{isArabic ? 'قارن فحوصاتك القديمة والجديدة' : 'Compare old vs new results'}</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Upload')} testID="button-upload-home">
        <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={styles.uploadButtonContainer}>
          <Ionicons name="cloud-upload" size={24} color={isDark ? "#ffffff" : colors.primary} />
          <Text style={[styles.uploadButtonText, { color: isDark ? "#ffffff" : colors.primary }]}>{t('uploadPdf')}</Text>
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Tests')} testID="button-view-tests">
        <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={[styles.viewTestsButtonContainer, { borderColor: isDark ? 'rgba(96, 165, 250, 0.5)' : '#60a5fa' }]}>
          <Ionicons name="list" size={24} color="#60a5fa" />
          <Text style={[styles.viewTestsButtonText, { color: '#60a5fa' }]}>{t('myTests')}</Text>
        </BlurView>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'left',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  trustBadgeContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    overflow: 'hidden',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statsCardContainer: {
    width: '48%' as any,
    borderRadius: 20, // increased for rounded corners
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  shortcutCardContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left',
  },
  shortcutDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    textAlign: 'left',
  },
  uploadButtonContainer: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // light tint of primary blue
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  viewTestsButtonContainer: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.5)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  viewTestsButtonText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  disclaimerSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    gap: 6,
  },
  disclaimerSmallText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: 'left',
  },
});
