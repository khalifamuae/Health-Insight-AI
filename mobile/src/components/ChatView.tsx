import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  I18nManager,
  Image,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';
import type { ChatMessage } from '../hooks/useChat';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  userId: string;
  onSend: (content: string, attachmentUrl?: string, attachmentType?: string) => void;
  /** Show camera/gallery buttons for image attachments */
  showAttachmentButtons?: boolean;
  /** Called when user taps camera button */
  onCameraPress?: () => void;
  /** Called when user taps gallery button */
  onGalleryPress?: () => void;
  /** Whether an image is currently being uploaded */
  isUploading?: boolean;
}

/**
 * Shared ChatView component used by both StandaloneChatScreen and ClientChatScreen.
 * Any UI change here automatically applies to both chat types.
 *
 * Renders:
 * - Message list with date separators
 * - Message bubbles with status indicators (pending/sent/read)
 * - Input bar with send button
 * - Optional camera/gallery attachment buttons
 */
export default function ChatView({
  messages,
  isLoading,
  isSending,
  userId,
  onSend,
  showAttachmentButtons = false,
  onCameraPress,
  onGalleryPress,
  isUploading = false,
}: ChatViewProps) {
  const { colors, isDark } = useAppTheme();
  const isArabic = I18nManager.isRTL;
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Track keyboard height directly — much more reliable than KeyboardAvoidingView
  // which breaks with complex view hierarchies (ad banners, nested navigators)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 150,
        useNativeDriver: false,
      }).start();
      // Scroll to bottom when keyboard appears
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  const handleSend = () => {
    if (!message.trim() || isSending || isUploading) return;
    onSend(message.trim());
    setMessage('');
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return isArabic ? 'اليوم' : 'Today';
    if (d.toDateString() === yesterday.toDateString()) return isArabic ? 'أمس' : 'Yesterday';
    return d.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === userId;
    const isPending = item.id?.startsWith('pending-');
    const prev = messages[index - 1];
    const showDate = !prev || new Date(prev.createdAt).toDateString() !== new Date(item.createdAt).toDateString();
    const imageUrl = resolveImageUrl(item.attachmentUrl);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: colors.mutedText }]}>
              {formatDateSeparator(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.otherMessage,
          {
            backgroundColor: isMe ? '#3b82f6' : (isDark ? '#334155' : '#e2e8f0'),
            opacity: isPending ? 0.7 : 1,
          },
        ]}>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {!!item.content && (
            <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.mutedText }]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={isPending ? 'time-outline' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                size={14}
                color="rgba(255,255,255,0.7)"
              />
            )}
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages || []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        flexDirection: isArabic ? 'row-reverse' : 'row',
      }]}>
        {showAttachmentButtons && (
          <>
            <TouchableOpacity style={styles.iconButton} onPress={onCameraPress} disabled={isUploading || isSending}>
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={onGalleryPress} disabled={isUploading || isSending}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[styles.input, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={
              isUploading
                ? (isArabic ? 'جاري رفع الصورة...' : 'Uploading Image...')
                : (isArabic ? 'اكتب رسالتك...' : 'Type a message...')
            }
            placeholderTextColor={colors.mutedText}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            editable={!isUploading && !isSending}
            testID="input-chat-message"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, {
            backgroundColor: (!message.trim() || isSending || isUploading) ? colors.border : '#3b82f6',
          }]}
          onPress={handleSend}
          disabled={!message.trim() || isSending || isUploading}
          testID="button-send-message"
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={(!message.trim() || isUploading) ? colors.mutedText : '#fff'}
              style={{
                marginLeft: isArabic ? 0 : 4,
                marginRight: isArabic ? 4 : 0,
                transform: [{ scaleX: isArabic ? -1 : 1 }],
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Animated spacer that pushes content up when keyboard appears */}
      <Animated.View style={{ height: keyboardHeight }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 16, paddingBottom: 24 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: {
    fontSize: 12, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  myMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageImage: {
    width: 220, height: 220, borderRadius: 8, marginBottom: 8,
  },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 4, marginTop: 4,
  },
  timeText: { fontSize: 10 },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  iconButton: { padding: 10 },
  inputWrapper: {
    flex: 1,
    borderRadius: 22,
    marginHorizontal: 8,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
