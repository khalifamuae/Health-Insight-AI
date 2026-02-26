import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';

export default function UploadScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isArabic = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const uploadTitleText = isArabic ? 'رفع الملف او الصوره' : 'Upload File or Image';
  const uploadSupportText = isArabic
    ? 'ملاحظة: يمكن رفع صورة أو ملف PDF للتحليل أو فحص InBody'
    : 'Note: You can upload an image or PDF file for analysis or InBody';

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => api.uploadPdf(file),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['userTests'] });
      queryClient.invalidateQueries({ queryKey: ['allTests'] });
      queryClient.invalidateQueries({ queryKey: ['testsHistory'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      const isInBodyMode = response?.mode === 'inbody';
      Alert.alert(
        isArabic ? 'تم التحليل بنجاح' : 'Analysis Completed',
        isInBodyMode
          ? (isArabic ? 'تمت إضافة قياسات InBody إلى فحوصاتي.' : 'InBody metrics were added to My Tests.')
          : (isArabic ? 'تمت إضافة نتائج التحليل إلى فحوصاتي.' : 'Your lab results were added to My Tests.'),
        [{ text: t('disclaimer.understand'), onPress: () => navigation.navigate('Tests') }]
      );
    },
    onError: (error: any) => {
      Alert.alert(t('errors.uploadFailed'), error.message);
    },
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch {
      Alert.alert(t('errors.uploadFailed'));
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
          <Ionicons name="document-text" size={80} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{uploadTitleText}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{uploadSupportText}</Text>

        <View style={[styles.securityBadge, { backgroundColor: isDark ? '#14532d' : '#f0fdf4' }]}>
          <Ionicons name="lock-closed" size={16} color="#16a34a" />
          <Text style={styles.securityBadgeText}>{isArabic ? 'مشفر و امن' : 'Encrypted and Secure'}</Text>
        </View>

        <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={pickDocument} testID="button-select-file">
          <Ionicons name="folder-open" size={24} color={colors.primary} />
          <Text style={[styles.selectButtonText, { color: colors.primary }]}>{isArabic ? 'اختر الملف' : 'Choose File'}</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document" size={24} color={colors.mutedText} />
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadButton, (!selectedFile || uploadMutation.isPending) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          testID="button-upload-file"
        >
          {uploadMutation.isPending ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadButtonText}>{t('analyzing')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>{isArabic ? 'رفع الملف او الصوره' : 'Upload File or Image'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  securityBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  securityBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  selectButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  fileCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    marginHorizontal: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  uploadButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  uploadButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  uploadButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 8,
  },
});
