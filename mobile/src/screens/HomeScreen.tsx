import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
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
}

const StatsCard = ({ icon, title, value, color }: StatsCardProps) => {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statsCard, { borderLeftColor: color, backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: colors.mutedText }]}>{title}</Text>
    </View>
  );
};

interface TrustBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}

const TrustBadge = ({ icon, text, color }: TrustBadgeProps) => {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.trustBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.trustBadgeText, { color }]}>{text}</Text>
    </View>
  );
};

const isArabic = I18nManager.isRTL;

export default function HomeScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();

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
        <TrustBadge icon="shield-checkmark" text={isArabic ? 'آمن وخاص' : 'Secure & Private'} color="#16a34a" />
        <TrustBadge icon="flask" text={isArabic ? '+50 مؤشر حيوي' : '50+ Biomarkers'} color="#3b82f6" />
        <TrustBadge icon="sparkles" text={isArabic ? 'تحليل ذكي' : 'AI Insights'} color="#7c3aed" />
      </View>

      <View style={styles.statsGrid}>
        <StatsCard icon="checkmark-circle" title={t('normal')} value={normalCount} color="#22c55e" />
        <StatsCard icon="alert-circle" title={t('abnormal')} value={abnormalCount} color="#dc2626" />
        <StatsCard icon="notifications" title={t('reminders.title')} value={pendingReminders} color="#f59e0b" />
        <StatsCard icon="pause-circle" title={t('frozenTests')} value={frozenCount} color="#64748b" />
      </View>

      <View style={styles.shortcutsRow}>
        <TouchableOpacity style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Diet')} testID="card-diet-shortcut">
          <View style={[styles.shortcutIcon, { backgroundColor: isDark ? '#14532d' : '#f0fdf4' }]}>
            <Ionicons name="nutrition" size={22} color="#22c55e" />
          </View>
          <View style={styles.shortcutTextContainer}>
            <Text style={[styles.shortcutTitle, { color: colors.text }]}>{isArabic ? 'خطة غذائية' : 'Diet Plan'}</Text>
            <Text style={[styles.shortcutDesc, { color: colors.mutedText }]} numberOfLines={1}>{isArabic ? 'تغذية مخصصة بالذكاء الاصطناعي' : 'AI-powered nutrition plan'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Compare')} testID="card-compare-shortcut">
          <View style={[styles.shortcutIcon, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
            <Ionicons name="git-compare" size={22} color="#3b82f6" />
          </View>
          <View style={styles.shortcutTextContainer}>
            <Text style={[styles.shortcutTitle, { color: colors.text }]}>{isArabic ? 'مقارنة النتائج' : 'Compare Results'}</Text>
            <Text style={[styles.shortcutDesc, { color: colors.mutedText }]} numberOfLines={1}>{isArabic ? 'قارن فحوصاتك القديمة والجديدة' : 'Compare old vs new results'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={() => navigation.navigate('Upload')} testID="button-upload-home">
        <Ionicons name="cloud-upload" size={24} color="#fff" />
        <Text style={styles.uploadButtonText}>{t('uploadPdf')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.viewTestsButton, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Tests')} testID="button-view-tests">
        <Ionicons name="list" size={24} color={colors.primary} />
        <Text style={[styles.viewTestsButtonText, { color: colors.primary }]}>{t('myTests')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: isArabic ? 'flex-end' : 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: isArabic ? 'right' : 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    textAlign: isArabic ? 'right' : 'left',
  },
  trustBadgesRow: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  trustBadge: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statsCard: {
    width: '48%' as any,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#e2e8f0',
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
    gap: 10,
    marginBottom: 16,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    alignItems: isArabic ? 'flex-end' : 'flex-start',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: isArabic ? 'right' : 'left',
  },
  shortcutDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    textAlign: isArabic ? 'right' : 'left',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  viewTestsButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  viewTestsButtonText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  disclaimerSmall: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    gap: 6,
  },
  disclaimerSmallText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: isArabic ? 'right' : 'left',
  },
});
