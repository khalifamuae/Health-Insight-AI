import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  I18nManager,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';

interface AffiliateDashboard {
  referralCode: string;
  referralCount: number;
  totalEarnings: number;
  availableBalance: number;
  commissionRate: number;
  minimumWithdrawal: number;
  commissions: Array<{
    id: string;
    commissionAmount: number;
    subscriptionAmount: number;
    createdAt: string;
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    adminNote?: string;
  }>;
}

export default function AffiliateScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'bank'>('paypal');
  const [paymentDetails, setPaymentDetails] = useState('');

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));
    }, [])
  );

  const { data: dashboard, isLoading } = useQuery<AffiliateDashboard>({
    queryKey: ['affiliate-dashboard'],
    queryFn: () => api.get('/api/affiliate/dashboard'),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string; paymentDetails: string }) =>
      api.post('/api/affiliate/withdraw', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-dashboard'] });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setPaymentDetails('');
      Alert.alert(t('affiliate.withdrawTitle'), t('affiliate.withdrawSuccess'));
    },
    onError: () => {
      Alert.alert(t('affiliate.withdrawError'));
    },
  });

  const handleCopyCode = async () => {
    if (dashboard?.referralCode) {
      try {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(dashboard.referralCode);
      } catch {
        // Fallback - just show alert with code
      }
      Alert.alert(t('affiliate.codeCopied'));
    }
  };

  const handleShareCode = async () => {
    if (dashboard?.referralCode) {
      try {
        await Share.share({
          message: `${t('affiliate.shareMessage')}${dashboard.referralCode}`,
        });
      } catch (error) {}
    }
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 50) {
      Alert.alert(t('affiliate.minimumNotReached'));
      return;
    }
    if (amount > (dashboard?.availableBalance || 0)) {
      Alert.alert(t('affiliate.insufficientBalance'));
      return;
    }
    if (!paymentDetails.trim()) {
      Alert.alert(t('affiliate.paymentDetails'));
      return;
    }
    withdrawMutation.mutate({
      amount,
      paymentMethod,
      paymentDetails: paymentDetails.trim(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#3b82f6';
      case 'paid': return '#22c55e';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('affiliate.pending');
      case 'approved': return t('affiliate.approved');
      case 'paid': return t('affiliate.paid');
      case 'rejected': return t('affiliate.rejected');
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t('affiliate.yourReferralCode')}</Text>
        <Text style={styles.codeText} data-testid="text-referral-code">{dashboard?.referralCode}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode} data-testid="button-copy-code">
            <Ionicons name="copy" size={18} color="#fff" />
            <Text style={styles.codeButtonText}>{t('affiliate.copyCode')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeButton, styles.shareButton]} onPress={handleShareCode} data-testid="button-share-code">
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.codeButtonText}>{t('affiliate.shareCode')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{dashboard?.referralCount || 0}</Text>
          <Text style={styles.statLabel}>{t('affiliate.totalReferrals')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#22c55e" />
          <Text style={styles.statValue}>${dashboard?.totalEarnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>{t('affiliate.totalEarnings')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={24} color="#7c3aed" />
          <Text style={styles.statValue}>${dashboard?.availableBalance?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>{t('affiliate.availableBalance')}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('affiliate.commissionRate')}</Text>
          <Text style={styles.infoValue}>10% {t('affiliate.perSubscription')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('affiliate.minimumWithdrawal')}</Text>
          <Text style={styles.infoValue}>$50</Text>
        </View>
      </View>

      {(dashboard?.availableBalance || 0) >= 50 && (
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
          data-testid="button-request-withdrawal"
        >
          <Ionicons name="arrow-down-circle" size={20} color="#fff" />
          <Text style={styles.withdrawButtonText}>{t('affiliate.withdrawButton')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>{t('affiliate.howItWorks')}</Text>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step}</Text>
            </View>
            <Text style={styles.stepText}>{t(`affiliate.step${step}`)}</Text>
          </View>
        ))}
      </View>

      {dashboard?.commissions && dashboard.commissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('affiliate.recentCommissions')}</Text>
          {dashboard.commissions.slice(0, 10).map((commission) => (
            <View key={commission.id} style={styles.listItem}>
              <View>
                <Text style={styles.listAmount}>+${commission.commissionAmount.toFixed(2)}</Text>
                <Text style={styles.listDate}>
                  {formatAppDate(commission.createdAt, i18n.language, dateCalendar)}
                </Text>
              </View>
              <Text style={styles.listSubAmount}>
                ${commission.subscriptionAmount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {dashboard?.withdrawals && dashboard.withdrawals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('affiliate.withdrawalHistory')}</Text>
          {dashboard.withdrawals.map((withdrawal) => (
            <View key={withdrawal.id} style={styles.listItem}>
              <View>
                <Text style={styles.listAmount}>${withdrawal.amount.toFixed(2)}</Text>
                <Text style={styles.listDate}>
                  {formatAppDate(withdrawal.createdAt, i18n.language, dateCalendar)} - {withdrawal.paymentMethod}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(withdrawal.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(withdrawal.status) }]}>
                  {getStatusText(withdrawal.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('affiliate.withdrawTitle')}</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>{t('affiliate.amount')}</Text>
            <TextInput
              style={styles.modalInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="50.00"
              data-testid="input-withdraw-amount"
            />

            <Text style={styles.modalLabel}>{t('affiliate.paymentMethod')}</Text>
            <View style={styles.methodButtons}>
              <TouchableOpacity
                style={[styles.methodButton, paymentMethod === 'paypal' && styles.methodButtonSelected]}
                onPress={() => setPaymentMethod('paypal')}
              >
                <Text style={[styles.methodButtonText, paymentMethod === 'paypal' && styles.methodButtonTextSelected]}>
                  {t('affiliate.paypal')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodButton, paymentMethod === 'bank' && styles.methodButtonSelected]}
                onPress={() => setPaymentMethod('bank')}
              >
                <Text style={[styles.methodButtonText, paymentMethod === 'bank' && styles.methodButtonTextSelected]}>
                  {t('affiliate.bankTransfer')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>{t('affiliate.paymentDetails')}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={paymentDetails}
              onChangeText={setPaymentDetails}
              placeholder={paymentMethod === 'paypal' ? t('affiliate.paypalEmail') : t('affiliate.bankDetails')}
              multiline
              numberOfLines={3}
              data-testid="input-payment-details"
            />

            <TouchableOpacity
              style={[styles.submitButton, withdrawMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleWithdraw}
              disabled={withdrawMutation.isPending}
              data-testid="button-submit-withdrawal"
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('affiliate.submitWithdrawal')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  codeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 16,
  },
  codeActions: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 12,
  },
  codeButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  shareButton: {
    backgroundColor: '#22c55e',
  },
  codeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  withdrawButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  howItWorks: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  stepRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  listDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  listSubAmount: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    marginTop: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  modalInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  methodButtons: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  methodButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  methodButtonTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
