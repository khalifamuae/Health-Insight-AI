import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image, Alert, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../lib/api';
import { pickImageFromAlbum, takePhotoWithCamera } from '../lib/photoPicker';

interface ChatMsg {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  createdAt: string;
}

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
  // Track pending messages that haven't been confirmed by the server yet
  const [pendingMessages, setPendingMessages] = useState<ChatMsg[]>([]);

  // Set header dynamically
  useEffect(() => {
    navigation.setOptions({
      headerTitle: clientName || (isArabic ? 'محادثة خاصة' : 'Private Chat'),
    });
  }, [clientName, isArabic, navigation]);

  // Fetch Chat Data
  const { data: serverMessages = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['chat', connectionId],
    queryFn: () => api.get(`/api/subscriber-management/chat/${connectionId}`),
    refetchInterval: 5000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Merge server messages with pending (unconfirmed) messages
  const messages = useMemo(() => {
    const server = serverMessages || [];
    // Remove pending messages that already exist in server data
    const stillPending = pendingMessages.filter(pm => {
      const confirmed = server.some((sm: any) =>
        sm.senderId === pm.senderId &&
        sm.content === pm.content &&
        Math.abs(new Date(sm.createdAt).getTime() - new Date(pm.createdAt).getTime()) < 30000
      );
      return !confirmed;
    });
    return [...server, ...stillPending];
  }, [serverMessages, pendingMessages]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; attachmentUrl?: string; attachmentType?: string }) =>
      api.post(`/api/subscriber-management/chat/${connectionId}`, data),
    onMutate: async (data) => {
      // Add to pending messages
      const pendingMsg: ChatMsg = {
        id: `pending-${Date.now()}`,
        connectionId,
        senderId: user?.id || '',
        content: data.content || '',
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setPendingMessages(prev => [...prev, pendingMsg]);
      setMessageText('');
      return { pendingMsg };
    },
    onSuccess: (_result, _data, context) => {
      // Remove from pending since server confirmed it
      if (context?.pendingMsg) {
        setPendingMessages(prev => prev.filter(m => m.id !== context.pendingMsg.id));
      }
      // Refetch to get the real data
      queryClient.invalidateQueries({ queryKey: ['chat', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['chats-list'] });
    },
    onError: (_err: any, _data, context) => {
      // Remove failed pending message
      if (context?.pendingMsg) {
        setPendingMessages(prev => prev.filter(m => m.id !== context.pendingMsg.id));
      }
      Alert.alert(isArabic ? 'خطأ' : 'Error', _err.message || (isArabic ? 'فشل إرسال الرسالة' : 'Failed to send message'));
    }
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

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
      sendMessageMutation.mutate({ content: messageText.trim(), attachmentUrl: url, attachmentType: 'image' });
      setMessageText('');
    } catch (err: any) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', err.message || (isArabic ? 'فشل رفع الصورة' : 'Failed to upload image'));
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === user?.id;
    const isPending = item.id?.startsWith('pending-');

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
            : { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
          isPending ? { opacity: 0.7 } : {},
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
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.mutedText }]}>
              {new Date(item.createdAt).toLocaleTimeString(isArabic ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && (
              <Ionicons
                name={isPending ? 'time-outline' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                size={14}
                color="rgba(255,255,255,0.7)"
              />
            )}
          </View>
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
          keyboardDismissMode="interactive"
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
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
