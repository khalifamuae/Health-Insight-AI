import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function StandaloneChatScreen({ route, navigation }: any) {
  const { otherUserId, otherUserName } = route.params;
  const { colors, isDark } = useAppTheme();
  const isArabic = I18nManager.isRTL;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');

  const { data: messages, isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ['standalone-chat', otherUserId],
    queryFn: () => api.get<ChatMessage[]>(`/api/standalone-chat/${otherUserId}`),
    refetchInterval: 5000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post<ChatMessage>(`/api/standalone-chat/${otherUserId}`, { content }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['standalone-chat', otherUserId] });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
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

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prev = (messages || [])[index - 1];
    const showDate = !prev || new Date(prev.createdAt).toDateString() !== new Date(item.createdAt).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: colors.mutedText }]}>
              {formatDateSeparator(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage,
          { backgroundColor: isMe ? '#3b82f6' : (isDark ? '#334155' : '#e2e8f0') }
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.mutedText }]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
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
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight + 10 : 0}
    >
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
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        flexDirection: isArabic ? 'row-reverse' : 'row',
        paddingBottom: 8,
      }]}>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[styles.input, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'اكتب رسالتك...' : 'Type a message...'}
            placeholderTextColor={colors.mutedText}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            testID="input-chat-message"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: (!message.trim() || sendMutation.isPending) ? colors.border : '#3b82f6' }]}
          onPress={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          testID="button-send-message"
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color={!message.trim() ? colors.mutedText : '#fff'} style={{ marginLeft: isArabic ? 0 : 4, marginRight: isArabic ? 4 : 0, transform: [{ scaleX: isArabic ? -1 : 1 }] }} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 16, paddingBottom: 24 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
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
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  timeText: { fontSize: 10 },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
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
