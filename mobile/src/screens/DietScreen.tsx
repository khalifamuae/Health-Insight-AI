import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function DietScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const sampleMeals = isArabic ? [
    { icon: 'sunny' as const, title: 'الفطور', desc: '3 بيضات مسلوقة + شوفان بالحليب + موزة', cal: '450 سعرة' },
    { icon: 'restaurant' as const, title: 'الغداء', desc: 'صدر دجاج مشوي + أرز بني + سلطة خضراء', cal: '600 سعرة' },
    { icon: 'moon' as const, title: 'العشاء', desc: 'سمك سلمون + خضروات مشوية + كينوا', cal: '500 سعرة' },
  ] : [
    { icon: 'sunny' as const, title: 'Breakfast', desc: '3 boiled eggs + oatmeal with milk + banana', cal: '450 kcal' },
    { icon: 'restaurant' as const, title: 'Lunch', desc: 'Grilled chicken breast + brown rice + green salad', cal: '600 kcal' },
    { icon: 'moon' as const, title: 'Dinner', desc: 'Salmon fillet + roasted vegetables + quinoa', cal: '500 kcal' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="nutrition" size={48} color="#f59e0b" />
        </View>
        <Text style={styles.heroTitle}>
          {isArabic ? 'خطتك الغذائية الذكية' : 'Your AI Diet Plan'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isArabic
            ? 'خطة غذائية مخصصة بناءً على نتائج فحوصاتك وبيانات جسمك'
            : 'Personalized nutrition plan based on your lab results and body data'}
        </Text>
      </View>

      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>
          {isArabic ? 'كيف تعمل الخطة؟' : 'How It Works'}
        </Text>
        <View style={styles.stepsList}>
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text" size={20} color="#3b82f6" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>
                {isArabic ? 'تحليل فحوصاتك' : 'Analyze Your Labs'}
              </Text>
              <Text style={styles.stepDesc}>
                {isArabic ? 'نحلل نتائج فحوصاتك لمعرفة النقص' : 'We analyze your lab results for deficiencies'}
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="calculator" size={20} color="#f59e0b" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>
                {isArabic ? 'حساب احتياجاتك' : 'Calculate Your Needs'}
              </Text>
              <Text style={styles.stepDesc}>
                {isArabic ? 'BMR و TDEE بناءً على وزنك وطولك ونشاطك' : 'BMR & TDEE based on weight, height, activity'}
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="leaf" size={20} color="#22c55e" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>
                {isArabic ? 'خطة مخصصة لك' : 'Your Custom Plan'}
              </Text>
              <Text style={styles.stepDesc}>
                {isArabic ? '5 وجبات يومية مع مكملات وتوصيات' : '5 daily meals with supplements & tips'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sampleSection}>
        <Text style={styles.sectionTitle}>
          {isArabic ? 'مثال على خطة يومية' : 'Sample Daily Plan'}
        </Text>
        <View style={styles.calorieSummary}>
          <Ionicons name="flame" size={18} color="#ef4444" />
          <Text style={styles.calorieSummaryText}>
            {isArabic ? '~1,550 سعرة حرارية/يوم' : '~1,550 kcal/day'}
          </Text>
        </View>
        {sampleMeals.map((meal, idx) => (
          <View key={idx} style={styles.mealCard}>
            <View style={styles.mealIconContainer}>
              <Ionicons name={meal.icon} size={22} color="#f59e0b" />
            </View>
            <View style={styles.mealContent}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{meal.title}</Text>
                <Text style={styles.mealCal}>{meal.cal}</Text>
              </View>
              <Text style={styles.mealDesc}>{meal.desc}</Text>
            </View>
          </View>
        ))}
        <View style={styles.sampleNote}>
          <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
          <Text style={styles.sampleNoteText}>
            {isArabic
              ? 'هذا مثال توضيحي فقط. خطتك الفعلية ستكون مخصصة بالكامل بناءً على فحوصاتك.'
              : 'This is just a sample. Your actual plan will be fully customized based on your lab results.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={() => navigation.navigate('Profile')}
        testID="button-generate-diet"
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
        <Text style={styles.generateButtonText}>
          {isArabic ? 'ابدأ خطتك الغذائية' : 'Start Your Diet Plan'}
        </Text>
      </TouchableOpacity>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
          <Text style={styles.trustItemText}>
            {isArabic ? 'مبني على أدلة علمية' : 'Evidence-Based'}
          </Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="medkit" size={16} color="#3b82f6" />
          <Text style={styles.trustItemText}>
            {isArabic ? 'مراجع علمية' : 'Scientific References'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#a16207',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  howItWorksSection: { marginBottom: 20 },
  stepsList: { gap: 10 },
  stepItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTextContainer: {
    flex: 1,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  sampleSection: { marginBottom: 20 },
  calorieSummary: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  calorieSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  mealCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealContent: { flex: 1 },
  mealHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  mealCal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  mealDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  sampleNote: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sampleNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  generateButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  trustRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    gap: 20,
  },
  trustItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustItemText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});
