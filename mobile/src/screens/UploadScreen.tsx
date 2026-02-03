import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

export default function UploadScreen({ navigation }: any) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => 
      api.uploadPdf(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTests'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      Alert.alert(
        t('normal'),
        t('subtitle'),
        [{ text: t('disclaimer.understand'), onPress: () => navigation.navigate('Tests') }]
      );
    },
    onError: (error: any) => {
      Alert.alert(t('errors.uploadFailed'), error.message);
    }
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert(t('errors.uploadFailed'));
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'application/pdf'
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={80} color="#3b82f6" />
        </View>

        <Text style={styles.title}>{t('uploadPdf')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={pickDocument}
          testID="button-select-file"
        >
          <Ionicons name="folder-open" size={24} color="#3b82f6" />
          <Text style={styles.selectButtonText}>{t('selectFile')}</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileCard}>
            <Ionicons name="document" size={24} color="#64748b" />
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!selectedFile || uploadMutation.isPending) && styles.uploadButtonDisabled
          ]}
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
              <Text style={styles.uploadButtonText}>{t('uploadPdf')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <Text style={styles.infoText}>{t('disclaimer.text')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32
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
    marginBottom: 16
  },
  selectButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginHorizontal: 8
  },
  fileCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    marginHorizontal: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  uploadButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24
  },
  uploadButtonDisabled: {
    backgroundColor: '#94a3b8'
  },
  uploadButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 8
  },
  infoCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    width: '100%'
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginHorizontal: 12,
    lineHeight: 20,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  }
});
