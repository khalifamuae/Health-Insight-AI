import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { api } from '../lib/api';

interface UploadedFile {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  status: string;
  errorMessage: string | null;
  processedAt: string | null;
  testsExtracted: number;
  createdAt: string;
}

export default function ClientFilesScreen({ route, navigation }: any) {
  const { clientId } = route?.params || {};
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={28} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 17, marginHorizontal: 4 }}>
            {isArabic ? 'ملف المشترك' : 'Client Profile'}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: undefined,
    });
  }, [navigation, isArabic, colors.primary]);

  const { data: files, isLoading } = useQuery<UploadedFile[]>({
    queryKey: ['clientFiles', clientId],
    queryFn: () => api.get(`/api/client-files/${clientId}`),
    enabled: !!clientId,
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: 'checkmark-circle' as const, color: '#22c55e', labelAr: 'تم التحليل', labelEn: 'Analyzed' };
      case 'processing':
        return { icon: 'hourglass' as const, color: '#f59e0b', labelAr: 'قيد المعالجة', labelEn: 'Processing' };
      case 'failed':
        return { icon: 'close-circle' as const, color: '#ef4444', labelAr: 'فشل', labelEn: 'Failed' };
      default:
        return { icon: 'time' as const, color: '#64748b', labelAr: 'معلق', labelEn: 'Pending' };
    }
  };

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'document-text';
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return 'image';
    return 'document';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isArabic ? 'ar-AE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedText, marginTop: 16 }}>
          {isArabic ? 'جاري تحميل الملفات...' : 'Loading files...'}
        </Text>
      </View>
    );
  }

  if (!files || files.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="folder-open-outline" size={64} color={colors.mutedText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isArabic ? 'لا توجد ملفات' : 'No Files'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
            {isArabic
              ? 'الصفحة خالية من الملفات والتحاليل.\nلم يقم المتدرب بتحميل أي ملفات بعد.'
              : 'This page is empty.\nThe trainee has not uploaded any files yet.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe' }]}>
        <Ionicons name="folder" size={24} color={colors.primary} />
        <Text style={[styles.summaryText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
          {isArabic
            ? `إجمالي الملفات: ${files.length}`
            : `Total Files: ${files.length}`}
        </Text>
      </View>

      <View style={[styles.warningCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a' }]}>
        <Ionicons name="eye-outline" size={20} color="#f59e0b" />
        <Text style={[styles.warningText, { color: isDark ? '#fbbf24' : '#92400e', textAlign: isArabic ? 'right' : 'left' }]}>
          {isArabic
            ? 'وضع المعاينة فقط - لا يمكن تحميل أو مشاركة ملفات المتدرب'
            : 'View-only mode — You cannot download or share trainee files'}
        </Text>
      </View>

      {files.map((file) => {
        const statusInfo = getStatusInfo(file.status);
        const fileIcon = getFileIcon(file.fileName);
        return (
          <View key={file.id} style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.fileRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
                <Ionicons name={fileIcon as any} size={28} color={colors.primary} />
              </View>

              <View style={[styles.fileInfo, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.fileName, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={2}>
                  {file.fileName}
                </Text>
                <Text style={[styles.fileDate, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                  {formatDate(file.createdAt)}
                </Text>
              </View>
            </View>

            <View style={[styles.fileFooter, { borderTopColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '18' }]}>
                <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {isArabic ? statusInfo.labelAr : statusInfo.labelEn}
                </Text>
              </View>

              {file.testsExtracted > 0 && (
                <View style={[styles.testsCountBadge, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4' }]}>
                  <Ionicons name="flask" size={14} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '600' }}>
                    {isArabic ? `${file.testsExtracted} فحص` : `${file.testsExtracted} tests`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  fileRow: {
    alignItems: 'center',
    gap: 14,
  },
  fileIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  fileDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  testsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
});
