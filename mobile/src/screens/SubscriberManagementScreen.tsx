import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { api } from '../lib/api';

export default function SubscriberManagementScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const queryClient = useQueryClient();

  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkCode, setLinkCode] = useState('');

  const { data: clients, isLoading } = useQuery<any[]>({
    queryKey: ['/api/subscriber-management/clients'],
    queryFn: () => api.get('/api/subscriber-management/clients'),
  });

  const consumeCodeMutation = useMutation({
    mutationFn: (code: string) => api.post<any>('/api/subscriber-management/verify-link', { code }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriber-management/clients'] });
      
      if (res.status === 'pending') {
         Alert.alert(isArabic ? 'تم الإرسال' : 'Sent', isArabic ? 'تم إرسال طلب ربط للمتدرب، بانتظار موافقته.' : 'Link request sent, waiting for trainee approval.');
      } else {
         Alert.alert(isArabic ? 'نجاح' : 'Success', isArabic ? 'تم ربط الحساب بنجاح!' : 'Account linked successfully!');
      }
      
      setLinkCode('');
      setLinkModalVisible(false);
    },
    onError: (err: any) => {
      Alert.alert(isArabic ? 'خطأ' : 'Error', err.message || (isArabic ? 'فشل الربط، تأكد من الرقم' : 'Linking failed, check the code'));
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.headerHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people" size={48} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isArabic ? 'إدارة المشتركين' : 'Subscriber Management'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedText }]}>
            {isArabic 
              ? 'تطبيق الهاتف يعرض المشتركين فقط حالياً. لإنشاء الجداول والاستعراض الكامل يرجى استخدام متصفح الويب.' 
              : 'Mobile app shows your clients footprint. Please use the Web Dashboard for creating schedules and full features.'}
          </Text>

          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: colors.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
            onPress={() => setLinkModalVisible(true)}
          >
            <Ionicons name="link" size={20} color="#fff" />
            <Text style={styles.linkButtonText}>
              {isArabic ? 'ربط حساب مشترك برقم' : 'Link Client Profile'}
            </Text>
          </TouchableOpacity>
        </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {!clients || clients.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              {isArabic ? 'لا يوجد مشتركين حالياً.' : 'No clients found.'}
            </Text>
          ) : (
            clients.map((conn: any) => (
              <TouchableOpacity 
                key={conn.id} 
                style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                onPress={() => navigation.navigate('ClientProfile', { 
                  clientId: conn.clientId || conn.client?.id,
                  connectionId: conn.id,
                  clientFirstName: conn.client?.firstName,
                  clientLastName: conn.client?.lastName,
                  clientProfileImage: conn.client?.profileImagePath,
                  subscriptionStartDate: conn.subscriptionStartDate,
                  subscriptionEndDate: conn.subscriptionEndDate,
                  traineeGoal: conn.traineeGoal
                })}
              >
                <View style={[styles.clientInfo, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {conn.client?.firstName?.[0] || 'U'}
                    </Text>
                  </View>
                  <View style={{ alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.clientName, { color: colors.text }]}>
                      {conn.client?.firstName} {conn.client?.lastName}
                    </Text>
                    <Text style={[styles.statusText, { color: conn.client?.isShadowAccount ? colors.mutedText : '#22c55e' }]}>
                      {conn.client?.isShadowAccount 
                        ? (isArabic ? 'ملف غير مربوط' : 'Unlinked Profile') 
                        : (isArabic ? 'مربوط نشط' : 'Active Linked')}
                    </Text>
                  </View>
                </View>
                <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={20} color={colors.mutedText} />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      </ScrollView>

      <Modal
        visible={linkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isArabic ? 'أدخل رقم الربط' : 'Enter Link Code'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>
              {isArabic ? 'أدخل كود الربط المكون من 6 أرقام والمقدم من المشترك' : 'Enter the 6-digit link code provided by the client'}
            </Text>

            <TextInput
              style={[styles.codeInput, { backgroundColor: colors.cardAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="000000"
              placeholderTextColor={colors.mutedText}
              value={linkCode}
              onChangeText={(t) => setLinkCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              autoCapitalize="characters"
            />

            <View style={[styles.modalActions, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setLinkModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{isArabic ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => consumeCodeMutation.mutate(linkCode)}
                disabled={linkCode.length < 6 || consumeCodeMutation.isPending}
              >
                {consumeCodeMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>{isArabic ? 'تأكيد' : 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  headerHero: { padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  heroTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  linkButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { gap: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  clientCard: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'space-between' },
  clientInfo: { alignItems: 'center', gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24, borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  codeInput: { borderWidth: 1, borderRadius: 12, fontSize: 32, letterSpacing: 8, textAlign: 'center', paddingVertical: 16, marginBottom: 24, fontWeight: '600', fontFamily: 'monospace' },
  modalActions: { gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' }
});
