import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries } from '../lib/api';

interface AllTestData {
  id: string;
  testId: string;
  nameEn: string;
  nameAr: string;
  category: string;
  importance: number;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  recheckMonths: number | null;
  value: number;
  valueText: string | null;
  status: 'normal' | 'low' | 'high' | 'pending';
  testDate: string | null;
  pdfFileName: string | null;
  hasResult: boolean;
  order: number;
}

type SortMode = 'default' | 'bestToWorst' | 'worstToBest';

const StatusBadge = ({ status, hasResult }: { status: string; hasResult: boolean }) => {
  const { t } = useTranslation();
  
  if (!hasResult) {
    return (
      <View style={[styles.badge, styles.pendingBadge]}>
        <Ionicons name="time-outline" size={12} color="#64748b" />
        <Text style={styles.pendingBadgeText}>{t('pending')}</Text>
      </View>
    );
  }
  
  if (status === 'normal') {
    return (
      <View style={[styles.badge, styles.normalBadge]}>
        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
        <Text style={styles.normalBadgeText}>{t('normal')}</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.badge, styles.abnormalBadge]}>
      <Ionicons name="close-circle" size={12} color="#dc2626" />
      <Text style={styles.abnormalBadgeText}>
        {status === 'high' ? t('high') : t('low')}
      </Text>
    </View>
  );
};

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
    special: '#6366f1'
  };
  return colors[category] || '#64748b';
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    all: 'apps',
    vitamins: 'sunny',
    minerals: 'diamond',
    hormones: 'pulse',
    organ_functions: 'fitness',
    lipids: 'water',
    immunity: 'shield-checkmark',
    blood: 'color-fill',
    coagulation: 'bandage',
    special: 'star'
  };
  return icons[category] || 'ellipse';
};

function getStatusScore(test: AllTestData): number {
  if (!test.hasResult) return 1;
  if (test.status === 'normal') return 0;
  if (test.normalRangeMin !== null && test.normalRangeMax !== null && test.value !== 0) {
    const mid = (test.normalRangeMin + test.normalRangeMax) / 2;
    const range = test.normalRangeMax - test.normalRangeMin;
    if (range > 0) {
      return Math.abs(test.value - mid) / range;
    }
  }
  return 2;
}

export default function TestsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const { data: allTests, isLoading } = useQuery({
    queryKey: ['allTests'],
    queryFn: queries.allTests
  });

  const tests = (allTests as AllTestData[]) || [];
  
  const categories = ['all', 'vitamins', 'minerals', 'hormones', 'organ_functions', 'lipids', 'immunity', 'blood', 'coagulation', 'special'];

  const filteredAndSortedTests = useMemo(() => {
    let result = selectedCategory && selectedCategory !== 'all'
      ? tests.filter(test => test.category === selectedCategory)
      : tests;

    if (sortMode === 'bestToWorst') {
      result = [...result].sort((a, b) => getStatusScore(a) - getStatusScore(b));
    } else if (sortMode === 'worstToBest') {
      result = [...result].sort((a, b) => getStatusScore(b) - getStatusScore(a));
    }

    return result;
  }, [tests, selectedCategory, sortMode]);

  const testsWithResults = tests.filter(t => t.hasResult).length;
  const abnormalTests = tests.filter(t => t.status === 'high' || t.status === 'low').length;

  const cycleSortMode = () => {
    const modes: SortMode[] = ['default', 'worstToBest', 'bestToWorst'];
    const currentIndex = modes.indexOf(sortMode);
    setSortMode(modes[(currentIndex + 1) % modes.length]);
  };

  const getSortIcon = (): string => {
    if (sortMode === 'worstToBest') return 'arrow-down';
    if (sortMode === 'bestToWorst') return 'arrow-up';
    return 'swap-vertical';
  };

  const getSortLabel = (): string => {
    if (sortMode === 'worstToBest') return t('sortWorstToBest');
    if (sortMode === 'bestToWorst') return t('sortBestToWorst');
    return t('sortDefault');
  };

  const renderTest = ({ item, index }: { item: AllTestData; index: number }) => {
    const testName = isArabic ? item.nameAr : item.nameEn;
    const categoryColor = getCategoryColor(item.category);
    
    return (
      <View 
        style={[
          styles.testCard,
          !item.hasResult && styles.testCardPending,
          (item.status === 'high' || item.status === 'low') && styles.testCardAbnormal
        ]} 
        testID={`card-test-${item.testId}`}
      >
        <View style={styles.testHeader}>
          <View style={styles.testNumberContainer}>
            <Text style={styles.testNumber}>{index + 1}</Text>
          </View>
          <Text style={styles.testName}>{testName}</Text>
          <StatusBadge status={item.status} hasResult={item.hasResult} />
        </View>
        
        <View style={styles.testDetails}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={styles.categoryText}>{t(item.category)}</Text>
          </View>
          
          <View style={styles.valuesRow}>
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>{t('yourValue')}</Text>
              <Text style={[
                styles.valueText,
                !item.hasResult && styles.valueTextPending,
                (item.status === 'high' || item.status === 'low') && styles.valueTextAbnormal
              ]}>
                {item.hasResult ? `${item.value} ${item.unit || ''}` : '0'}
              </Text>
            </View>
            
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>{t('normalRange')}</Text>
              <Text style={styles.rangeText}>
                {item.normalRangeMin !== null && item.normalRangeMax !== null
                  ? `${item.normalRangeMin} - ${item.normalRangeMax} ${item.unit || ''}`
                  : '-'}
              </Text>
            </View>
          </View>
          
          {item.testDate && (
            <Text style={styles.dateText}>
              {t('testDate')}: {new Date(item.testDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
        <Text style={styles.disclaimerSmallText}>{t('disclaimer.text')}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{t('myTests')}</Text>
        <Text style={styles.count}>
          {testsWithResults}/50 {t('testsCompleted')} | {abnormalTests} {t('abnormal')}
        </Text>
      </View>

      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {(isArabic ? [...categories].reverse() : categories).map((item) => {
            const isAll = item === 'all';
            const isSelected = isAll ? !selectedCategory || selectedCategory === 'all' : selectedCategory === item;
            const chipColor = isAll ? '#3b82f6' : getCategoryColor(item);

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryChip,
                  { borderColor: chipColor },
                  isSelected && { backgroundColor: chipColor, borderColor: chipColor }
                ]}
                onPress={() => setSelectedCategory(isAll ? null : (selectedCategory === item ? null : item))}
                testID={`chip-category-${item}`}
              >
                <Ionicons
                  name={getCategoryIcon(item) as any}
                  size={14}
                  color={isSelected ? '#fff' : chipColor}
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: isSelected ? '#fff' : '#475569' }
                ]}>
                  {isAll ? t('all') : t(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sortBar}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={cycleSortMode}
          testID="button-sort-tests"
        >
          <Ionicons name={getSortIcon() as any} size={16} color="#3b82f6" />
          <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedTests}
          keyExtractor={item => item.id}
          renderItem={renderTest}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('noData')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  count: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  categorySection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    gap: 5,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600'
  },
  sortBar: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: I18nManager.isRTL ? 'flex-start' : 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  sortButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  listContent: {
    padding: 16
  },
  testCard: {
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
    borderColor: '#e2e8f0'
  },
  testCardPending: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0'
  },
  testCardAbnormal: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  testHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  testNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  testNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pendingBadge: {
    backgroundColor: '#f1f5f9'
  },
  pendingBadgeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  normalBadge: {
    backgroundColor: '#dcfce7'
  },
  normalBadgeText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600'
  },
  abnormalBadge: {
    backgroundColor: '#fee2e2'
  },
  abnormalBadgeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600'
  },
  testDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  categoryRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  valuesRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  valueBox: {
    flex: 1
  },
  valueLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  valueTextPending: {
    color: '#94a3b8'
  },
  valueTextAbnormal: {
    color: '#dc2626'
  },
  rangeText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16
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
