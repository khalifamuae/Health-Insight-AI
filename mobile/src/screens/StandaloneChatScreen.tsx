import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
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
  const isArabic = isArabicLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');

  const { data: messages, isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ['standalone-chat', otherUserId],
    queryFn: () => api.get<ChatMessage[]>(`/api/standalone-chat/${otherUserId}`),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  const sendMessage = useMutation({
    mutationFn: (content: string) => api.post<ChatMessage>(`/api/standalone-chat/${otherUserId}`, { content }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['standalone-chat', otherUserId] });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate(message.trim());
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} testID="button-back">
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Ionicons name="person" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {otherUserName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedText} />
              <Text style={[styles.emptyTitle, { color: colors.mutedText }]}>
                {isArabic ? 'ابدأ المحادثة' : 'Start the conversation'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
                {isArabic
                  ? 'أرسل رسالة للمدرب للاستفسار عن الخدمات والأسعار'
                  : 'Send a message to ask about services and pricing'}
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
          placeholder={isArabic ? 'اكتب رسالتك...' : 'Type a message...'}
          placeholderTextColor={colors.mutedText}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          testID="input-chat-message"
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.4 }]}
          onPress={handleSend}
          disabled={!message.trim() || sendMessage.isPending}
          testID="button-send-message"
        >
          {sendMessage.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: { fontSize: 16, fontWeight: '700' },
  messageList: { padding: 16, paddingBottom: 8 },
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
  emptyChat: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
