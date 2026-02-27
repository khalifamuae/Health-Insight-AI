import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries, api } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';

interface Reminder {
  id: number;
  testName: string;
  testNameAr: string;
  dueDate: string;
  isCompleted: boolean;
}

const isArabic = I18nManager.isRTL;

export default function RemindersScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const isArabic = isArabicLanguage();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: queries.reminders
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/reminders/${id}`, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const remindersList = (reminders as Reminder[]) || [];
  const pendingReminders = remindersList.filter(r => !r.isCompleted);
  const completedReminders = remindersList.filter(r => r.isCompleted);

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const testName = isArabic ? item.testNameAr : item.testName;
    const daysUntil = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntil < 0;

    return (
      <View 
        style={[
          styles.reminderCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          item.isCompleted && styles.completedCard
        ]} 
        testID={`card-reminder-${item.id}`}
      >
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Ionicons 
              name={item.isCompleted ? 'checkmark-circle' : 'notifications'} 
              size={24} 
              color={item.isCompleted ? '#22c55e' : isOverdue ? '#dc2626' : '#f59e0b'} 
            />
            <Text style={[styles.testName, { color: colors.text }]}>{testName}</Text>
          </View>
          <View style={styles.reminderDetails}>
            <Text style={[
              styles.dueText,
              { color: colors.mutedText },
              isOverdue && !item.isCompleted && styles.overdueText
            ]}>
              {item.isCompleted 
                ? t('normal')
                : isOverdue 
                  ? t('reminders.overdue')
                  : `${t('reminders.dueIn')} ${daysUntil} ${t('reminders.days')}`
              }
            </Text>
          </View>
        </View>
        {!item.isCompleted && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => completeMutation.mutate(item.id)}
            testID={`button-complete-${item.id}`}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color={colors.mutedText} />
        <Text style={[styles.disclaimerSmallText, { color: colors.mutedText }]}>{t('disclaimer.text')}</Text>
      </View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('reminders.title')}</Text>
        <Text style={styles.count}>{pendingReminders.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('analyzing')}</Text>
        </View>
      ) : (
        <FlatList
          data={[...pendingReminders, ...completedReminders]}
          keyExtractor={item => item.id.toString()}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={64} color="#cbd5e1" />
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>{t('reminders.title')}</Text>
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  count: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  listContent: {
    padding: 16
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  completedCard: {
    opacity: 0.6
  },
  reminderContent: {
    flex: 1
  },
  reminderHeader: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 8,
    textAlign: isArabic ? 'right' : 'left'
  },
  reminderDetails: {
    marginLeft: isArabic ? 0 : 32,
    marginRight: isArabic ? 32 : 0
  },
  dueText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: isArabic ? 'right' : 'left'
  },
  overdueText: {
    color: '#dc2626',
    fontWeight: '600'
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center'
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
