import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries } from '../lib/api';

interface TestResult {
  id: number;
  testName: string;
  testNameAr: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  status: 'normal' | 'abnormal';
  category: string;
  testDate: string;
}

const StatusBadge = ({ status, isHigh }: { status: string; isHigh?: boolean }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  if (status === 'normal') {
    return (
      <View style={[styles.badge, styles.normalBadge]}>
        <Text style={styles.normalBadgeText}>{t('normal')}</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.badge, styles.abnormalBadge]}>
      <Text style={styles.abnormalBadgeText}>
        {isHigh ? t('high') : t('low')}
      </Text>
    </View>
  );
};

export default function TestsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: userTests, isLoading } = useQuery({
    queryKey: ['userTests'],
    queryFn: queries.userTests
  });

  const tests = (userTests as TestResult[]) || [];
  
  const categories = [...new Set(tests.map(t => t.category))];
  
  const filteredTests = selectedCategory
    ? tests.filter(t => t.category === selectedCategory)
    : tests;

  const renderTest = ({ item }: { item: TestResult }) => {
    const isHigh = item.value > item.normalMax;
    const testName = isArabic ? item.testNameAr : item.testName;
    
    return (
      <View style={styles.testCard} testID={`card-test-${item.id}`}>
        <View style={styles.testHeader}>
          <Text style={styles.testName}>{testName}</Text>
          <StatusBadge status={item.status} isHigh={isHigh} />
        </View>
        <View style={styles.testDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('value')}:</Text>
            <Text style={[
              styles.detailValue,
              item.status === 'abnormal' && styles.abnormalValue
            ]}>
              {item.value} {item.unit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('normalRange')}:</Text>
            <Text style={styles.detailValue}>
              {item.normalMin} - {item.normalMax} {item.unit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('date')}:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.testDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getCategoryName = (cat: string) => {
    const key = `categories.${cat}` as const;
    return t(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('myTests')}</Text>
        <Text style={styles.count}>{filteredTests.length} {t('tests')}</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={item => item}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        inverted={isArabic}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(selectedCategory === item ? null : item)}
            testID={`chip-category-${item}`}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === item && styles.categoryChipTextSelected
            ]}>
              {getCategoryName(item)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('analyzing')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTests}
          keyExtractor={item => item.id.toString()}
          renderItem={renderTest}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('myTests')}</Text>
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
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  count: {
    fontSize: 14,
    color: '#64748b'
  },
  categoryList: {
    maxHeight: 50,
    marginBottom: 8
  },
  categoryContent: {
    paddingHorizontal: 16
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  categoryChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748b'
  },
  categoryChipTextSelected: {
    color: '#fff'
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
    elevation: 2
  },
  testHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  normalBadge: {
    backgroundColor: '#dcfce7'
  },
  normalBadgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600'
  },
  abnormalBadge: {
    backgroundColor: '#fee2e2'
  },
  abnormalBadgeText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600'
  },
  testDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  detailRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b'
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500'
  },
  abnormalValue: {
    color: '#dc2626'
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
  }
});
