import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries } from '../lib/api';

interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  color: string;
}

const StatsCard = ({ icon, title, value, color }: StatsCardProps) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsTitle}>{title}</Text>
  </View>
);

interface TrustBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}

const TrustBadge = ({ icon, text, color }: TrustBadgeProps) => (
  <View style={styles.trustBadge}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.trustBadgeText, { color }]}>{text}</Text>
  </View>
);

export default function HomeScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { data: userTests } = useQuery({
    queryKey: ['userTests'],
    queryFn: queries.allTests
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: queries.reminders
  });

  const tests = userTests as any[] || [];
  const remindersList = reminders as any[] || [];
  
  const abnormalCount = tests.filter((t: any) => t.status === 'abnormal').length;
  const normalCount = tests.filter((t: any) => t.status === 'normal').length;
  const pendingReminders = remindersList.filter((r: any) => !r.isCompleted).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
        <Text style={styles.disclaimerSmallText}>{t('disclaimer.text')}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      <View style={styles.trustBadgesRow}>
        <TrustBadge
          icon="shield-checkmark"
          text={isArabic ? 'آمن وخاص' : 'Secure & Private'}
          color="#16a34a"
        />
        <TrustBadge
          icon="flask"
          text={isArabic ? '+50 مؤشر حيوي' : '50+ Biomarkers'}
          color="#3b82f6"
        />
        <TrustBadge
          icon="sparkles"
          text={isArabic ? 'تحليل ذكي' : 'AI Insights'}
          color="#7c3aed"
        />
      </View>

      <View style={styles.statsGrid}>
        <StatsCard
          icon="checkmark-circle"
          title={t('normal')}
          value={normalCount}
          color="#22c55e"
        />
        <StatsCard
          icon="alert-circle"
          title={t('abnormal')}
          value={abnormalCount}
          color="#dc2626"
        />
        <StatsCard
          icon="notifications"
          title={t('reminders.title')}
          value={pendingReminders}
          color="#f59e0b"
        />
      </View>

      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('Diet')}
          testID="card-diet-shortcut"
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="nutrition" size={22} color="#22c55e" />
          </View>
          <View style={styles.shortcutTextContainer}>
            <Text style={styles.shortcutTitle}>{isArabic ? 'خطة غذائية' : 'Diet Plan'}</Text>
            <Text style={styles.shortcutDesc} numberOfLines={1}>{isArabic ? 'تغذية مخصصة بالذكاء الاصطناعي' : 'AI-powered nutrition plan'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('Compare')}
          testID="card-compare-shortcut"
        >
          <View style={[styles.shortcutIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="git-compare" size={22} color="#3b82f6" />
          </View>
          <View style={styles.shortcutTextContainer}>
            <Text style={styles.shortcutTitle}>{isArabic ? 'مقارنة النتائج' : 'Compare Results'}</Text>
            <Text style={styles.shortcutDesc} numberOfLines={1}>{isArabic ? 'قارن فحوصاتك القديمة والجديدة' : 'Compare old vs new results'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => navigation.navigate('Upload')}
        testID="button-upload-home"
      >
        <Ionicons name="cloud-upload" size={24} color="#fff" />
        <Text style={styles.uploadButtonText}>{t('uploadPdf')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.viewTestsButton}
        onPress={() => navigation.navigate('Tests')}
        testID="button-view-tests"
      >
        <Ionicons name="list" size={24} color="#3b82f6" />
        <Text style={styles.viewTestsButtonText}>{t('myTests')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16
  },
  header: {
    marginBottom: 16,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  trustBadgesRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  trustBadge: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8
  },
  statsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  shortcutsRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 10,
    marginBottom: 16,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  shortcutDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8
  },
  viewTestsButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
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
    marginHorizontal: 8
  },
  disclaimerSmall: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    gap: 6,
  },
  disclaimerSmallText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});
