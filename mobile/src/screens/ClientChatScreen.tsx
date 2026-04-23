import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image, Alert, I18nManager } from 'react-native';
// Wait, react-native needs correct import
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../lib/api';
import { pickImageFromAlbum, takePhotoWithCamera } from '../lib/photoPicker';

export default function ClientChatScreen() {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const flatListRef = useRef<FlatList>(null);

  const { connectionId, clientName } = route.params;
  const isArabic = I18nManager.isRTL;

  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Set header dynamically
  useEffect(() => {
    navigation.setOptions({
      headerTitle: clientName || (isArabic ? 'محادثة خاصة' : 'Private Chat'),
    });
  }, [clientName, isArabic, navigation]);

  // Fetch Chat Data
  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ['chat', connectionId],
    queryFn: () => api.get(`/api/subscriber-management/chat/${connectionId}`),
    refetchInterval: 5000, // Poll every 5s for new messages
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; attachmentUrl?: string; attachmentType?: string }) =>
      api.post(`/api/subscriber-management/chat/${connectionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['chats-list'] });
      setMessageText('');
    },
    onError: (err: any) => {
      Alert.alert(isArabic ? 'خطأ' : 'Error', err.message || (isArabic ? 'فشل إرسال الرسالة' : 'Failed to send message'));
    }
  });

  const handleSendText = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText.trim() });
  };

  const handleAttachImage = async (useCamera = false) => {
    const file = useCamera ? await takePhotoWithCamera() : await pickImageFromAlbum();
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await (api as any).uploadImage(file);
      // Immediately send the image with empty/current text
      sendMessageMutation.mutate({ content: messageText.trim(), attachmentUrl: url, attachmentType: 'image' });
      setMessageText('');
    } catch (err: any) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', err.message || (isArabic ? 'فشل رفع الصورة' : 'Failed to upload image'));
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    // Current user's messages match user.id
    const isMine = item.senderId === user?.id;

    // Build the URL properly for the image
    let imageUrl = item.attachmentUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${API_BASE_URL}${imageUrl}`;
    }

    return (
      <View style={[styles.messageWrapper, isMine ? styles.messageMineRow : styles.messageTheirsRow]}>
        <View style={[
          styles.messageBubble,
          isMine 
            ? { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border }
        ]}>
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.messageImage} 
              resizeMode="cover"
            />
          )}
          {!!item.content && (
            <Text style={[styles.messageText, { color: isMine ? '#fff' : colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
              {item.content}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.mutedText, alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
            {new Date(item.createdAt).toLocaleTimeString(isArabic ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight + 10 : 0}
    >
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { 
        backgroundColor: colors.card, 
        borderTopColor: colors.border, 
        flexDirection: isArabic ? 'row-reverse' : 'row',
        paddingBottom: 8,
      }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleAttachImage(true)} disabled={isUploading || sendMessageMutation.isPending}>
          <Ionicons name="camera-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={() => handleAttachImage(false)} disabled={isUploading || sendMessageMutation.isPending}>
          <Ionicons name="image-outline" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[styles.input, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isUploading ? (isArabic ? 'جاري رفع الصورة...' : 'Uploading Image...') : (isArabic ? 'اكتب رسالة...' : 'Type a message...')}
            placeholderTextColor={colors.mutedText}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!isUploading && !sendMessageMutation.isPending}
          />
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: (!messageText.trim() || isUploading || sendMessageMutation.isPending) ? colors.border : colors.primary }]}
          onPress={handleSendText}
          disabled={!messageText.trim() || isUploading || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color={(!messageText.trim() || isUploading) ? colors.mutedText : '#fff'} style={{ marginLeft: isArabic ? 0 : 4, marginRight: isArabic ? 4 : 0, transform: [{ scaleX: isArabic ? -1 : 1 }] }} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageMineRow: {
    justifyContent: 'flex-end',
  },
  messageTheirsRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    marginHorizontal: 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
