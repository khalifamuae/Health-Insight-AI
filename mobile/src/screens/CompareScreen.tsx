import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries } from '../lib/api';

interface TestDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
}

interface TestResultWithDefinition {
  id: string;
  testId: string;
  value: number | null;
  status: string;
  testDate: string | null;
  testDefinition: TestDefinition;
}

interface ComparisonItem {
  testId: string;
  nameEn: string;
  nameAr: string;
  category: string;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  oldValue: number | null;
  oldStatus: string;
  oldDate: string;
  newValue: number | null;
  newStatus: string;
  newDate: string;
  change: 'improved' | 'worsened' | 'same' | 'unknown';
  changePercent: number | null;
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    vitamins: '#f59e0b',
    minerals: '#10b981',
    hormones: '#8b5cf6',
    organ_functions: '#3b82f6',
    lipids: '#ef4444',
    immunity: '#06b6d4',
    blood: '#ec4899',
    coagulation: '#f97316',
    special: '#6366f1',
  };
  return colors[category] || '#64748b';
};

export default function CompareScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: testsData, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: queries.tests,
  });

  const tests = (testsData as TestResultWithDefinition[]) || [];

  const comparisons: ComparisonItem[] = (() => {
    const grouped = new Map<string, TestResultWithDefinition[]>();
    for (const test of tests) {
      const existing = grouped.get(test.testId) || [];
      existing.push(test);
      grouped.set(test.testId, existing);
    }

    const items: ComparisonItem[] = [];
    for (const [testId, results] of Array.from(grouped.entries())) {
      if (results.length < 2) continue;

      const sorted = [...results].sort(
        (a, b) =>
          new Date(a.testDate || '').getTime() -
          new Date(b.testDate || '').getTime()
      );

      const oldResult = sorted[sorted.length - 2];
      const newResult = sorted[sorted.length - 1];
      const def = newResult.testDefinition;

      let change: ComparisonItem['change'] = 'unknown';
      let changePercent: number | null = null;

      if (
        oldResult.value != null &&
        newResult.value != null &&
        oldResult.value !== 0
      ) {
        changePercent =
          ((newResult.value - oldResult.value) / oldResult.value) * 100;

        if (Math.abs(changePercent) < 1) {
          change = 'same';
        } else {
          const oldWasAbnormal =
            oldResult.status === 'high' || oldResult.status === 'low';
          const newIsNormal = newResult.status === 'normal';
          const newIsAbnormal =
            newResult.status === 'high' || newResult.status === 'low';
          const oldWasNormal = oldResult.status === 'normal';

          if (oldWasAbnormal && newIsNormal) {
            change = 'improved';
          } else if (oldWasNormal && newIsAbnormal) {
            change = 'worsened';
          } else if (oldWasAbnormal && newIsAbnormal) {
            if (oldResult.status === newResult.status) {
              if (
                def.normalRangeMin != null &&
                def.normalRangeMax != null
              ) {
                const midRange =
                  (def.normalRangeMin + def.normalRangeMax) / 2;
                const oldDist = Math.abs(oldResult.value - midRange);
                const newDist = Math.abs(newResult.value - midRange);
                change = newDist < oldDist ? 'improved' : 'worsened';
              } else {
                change = 'same';
              }
            } else {
              change = 'worsened';
            }
          } else {
            change = 'same';
          }
        }
      }

      items.push({
        testId,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        category: def.category,
        unit: def.unit,
        normalRangeMin: def.normalRangeMin,
        normalRangeMax: def.normalRangeMax,
        oldValue: oldResult.value,
        oldStatus: oldResult.status || 'normal',
        oldDate: oldResult.testDate
          ? new Date(oldResult.testDate).toLocaleDateString(
              isArabic ? 'ar-SA' : 'en-US',
              { year: '2-digit', month: '2-digit', day: '2-digit' }
            )
          : '',
        newValue: newResult.value,
        newStatus: newResult.status || 'normal',
        newDate: newResult.testDate
          ? new Date(newResult.testDate).toLocaleDateString(
              isArabic ? 'ar-SA' : 'en-US',
              { year: '2-digit', month: '2-digit', day: '2-digit' }
            )
          : '',
        change,
        changePercent,
      });
    }

    return items;
  })();

  const getStatusColor = (status: string) => {
    if (status === 'normal') return '#16a34a';
    if (status === 'high' || status === 'low') return '#dc2626';
    return '#64748b';
  };

  const getStatusText = (status: string) => {
    if (status === 'normal') return t('normal');
    if (status === 'high') return t('high');
    if (status === 'low') return t('low');
    return status;
  };

  const getChangeIcon = (
    change: string
  ): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    if (change === 'improved')
      return { name: 'trending-up', color: '#22c55e' };
    if (change === 'worsened')
      return { name: 'trending-down', color: '#dc2626' };
    return { name: 'remove', color: '#94a3b8' };
  };

  const getChangeText = (change: string) => {
    if (change === 'improved') return isArabic ? 'تحسّن' : 'Improved';
    if (change === 'worsened') return isArabic ? 'تراجع' : 'Worsened';
    return isArabic ? 'ثابت' : 'No Change';
  };

  const renderComparison = ({ item }: { item: ComparisonItem }) => {
    const testName = isArabic ? item.nameAr : item.nameEn;
    const changeInfo = getChangeIcon(item.change);
    const categoryColor = getCategoryColor(item.category);

    return (
      <View style={styles.comparisonCard} testID={`card-compare-${item.testId}`}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={styles.testName}>{testName}</Text>
          </View>
          <View style={[styles.changeBadge, { backgroundColor: changeInfo.color + '20' }]}>
            <Ionicons name={changeInfo.name} size={14} color={changeInfo.color} />
            <Text style={[styles.changeBadgeText, { color: changeInfo.color }]}>
              {getChangeText(item.change)}
            </Text>
          </View>
        </View>

        <View style={styles.valuesGrid}>
          <View style={styles.valueColumn}>
            <Text style={styles.valueLabel}>
              {isArabic ? 'النتيجة السابقة' : 'Previous'}
            </Text>
            <Text style={[styles.valueNumber, { color: getStatusColor(item.oldStatus) }]}>
              {item.oldValue ?? '-'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.oldStatus) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(item.oldStatus) }]}>
                {getStatusText(item.oldStatus)}
              </Text>
            </View>
            <Text style={styles.dateText}>{item.oldDate}</Text>
          </View>

          <View style={styles.changeColumn}>
            {item.changePercent != null ? (
              <>
                <Ionicons
                  name={item.changePercent > 0 ? 'arrow-up' : item.changePercent < 0 ? 'arrow-down' : 'remove'}
                  size={18}
                  color={changeInfo.color}
                />
                <Text style={[styles.changePercent, { color: changeInfo.color }]}>
                  {Math.abs(item.changePercent).toFixed(1)}%
                </Text>
              </>
            ) : (
              <Ionicons name="remove" size={18} color="#94a3b8" />
            )}
          </View>

          <View style={styles.valueColumn}>
            <Text style={styles.valueLabel}>
              {isArabic ? 'النتيجة الأخيرة' : 'Latest'}
            </Text>
            <Text style={[styles.valueNumber, { color: getStatusColor(item.newStatus) }]}>
              {item.newValue ?? '-'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.newStatus) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(item.newStatus) }]}>
                {getStatusText(item.newStatus)}
              </Text>
            </View>
            <Text style={styles.dateText}>{item.newDate}</Text>
          </View>
        </View>

        {item.normalRangeMin != null && item.normalRangeMax != null && (
          <Text style={styles.rangeText}>
            {t('normalRange')}: {item.normalRangeMin} - {item.normalRangeMax}{' '}
            {item.unit || ''}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
        <Text style={styles.disclaimerSmallText}>{t('disclaimer.text')}</Text>
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="git-compare" size={22} color="#3b82f6" />
          <Text style={styles.title}>{isArabic ? 'مقارنة النتائج' : 'Compare Results'}</Text>
        </View>
      </View>

      {comparisons.length > 0 && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <Ionicons name="trending-up" size={14} color="#22c55e" />
            <Text style={styles.legendText}>{isArabic ? 'تحسّن' : 'Improved'}</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="trending-down" size={14} color="#dc2626" />
            <Text style={styles.legendText}>{isArabic ? 'تراجع' : 'Worsened'}</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="remove" size={14} color="#94a3b8" />
            <Text style={styles.legendText}>{isArabic ? 'ثابت' : 'No Change'}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={comparisons}
        keyExtractor={(item) => item.testId}
        renderItem={renderComparison}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="git-compare-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {isArabic ? 'لا توجد بيانات للمقارنة' : 'No comparison data'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isArabic
                ? 'ارفع نتائج فحوصات أكثر من مرة لرؤية المقارنة'
                : 'Upload lab results more than once to see comparison'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  legendRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  legendItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
  },
  comparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  testName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  changeBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  valuesGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  valueLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  changeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  changePercent: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  rangeText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  disclaimerSmall: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
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
