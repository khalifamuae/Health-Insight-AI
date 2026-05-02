import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ChatConversation {
  id: string;
  chatType: 'standalone' | 'subscriber';
  otherUserId: string;
  otherUserName: string;
  connectionId?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ChatsListScreen({ navigation }: any) {
  const { colors, isDark } = useAppTheme();
  const isArabic = I18nManager.isRTL;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useQuery<ChatConversation[]>({
    queryKey: ['chats-list'],
    queryFn: () => api.get<ChatConversation[]>('/api/chats'),
    refetchInterval: 10000, // Poll every 10s
  });

  // Refresh chats list when returning to this screen (clears read badges)
  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chats-list'] });
  }, [queryClient]));

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return isArabic ? 'أمس' : 'Yesterday';
    }
    return d.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const handleChatPress = (chat: ChatConversation) => {
    // Optimistically clear unread count immediately so badge disappears
    queryClient.setQueryData<ChatConversation[]>(['chats-list'], (old) =>
      (old || []).map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c)
    );

    if (chat.chatType === 'standalone') {
      navigation.navigate('StandaloneChat', {
        otherUserId: chat.otherUserId,
        otherUserName: chat.otherUserName,
      });
    } else if (chat.chatType === 'subscriber' && chat.connectionId) {
      navigation.navigate('ClientChat', {
        connectionId: chat.connectionId,
        clientName: chat.otherUserName,
      });
    }
  };

  const renderConversation = ({ item }: { item: ChatConversation }) => {
    const initial = item.otherUserName.charAt(0).toUpperCase();
    const hasUnread = item.unreadCount > 0;
    const typeIcon = item.chatType === 'subscriber' ? 'link' : 'chatbubble';
    const typeColor = item.chatType === 'subscriber' ? '#8b5cf6' : '#3b82f6';

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          {
            backgroundColor: hasUnread
              ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)')
              : 'transparent',
            flexDirection: isArabic ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.65}
      >
        {/* Avatar */}
        <View style={[
          styles.avatar,
          { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
        ]}>
          <Text style={[styles.avatarText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {initial}
          </Text>
          {/* Type indicator */}
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Ionicons name={typeIcon as any} size={8} color="#fff" />
          </View>
        </View>

        {/* Content */}
        <View style={[styles.chatContent, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.chatTopRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.chatName,
                {
                  color: colors.text,
                  fontWeight: hasUnread ? '800' : '600',
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {item.otherUserName}
            </Text>
            <Text style={[styles.chatTime, { color: hasUnread ? '#3b82f6' : colors.mutedText }]}>
              {item.lastMessageTime ? formatTime(item.lastMessageTime) : ''}
            </Text>
          </View>

          <View style={[styles.chatBottomRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.chatPreview,
                {
                  color: hasUnread ? colors.text : colors.mutedText,
                  fontWeight: hasUnread ? '600' : '400',
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || (isArabic ? 'لا توجد رسائل بعد' : 'No messages yet')}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations || []}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedText} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isArabic ? 'لا توجد دردشات بعد' : 'No chats yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              {isArabic
                ? 'ابدأ محادثة جديدة من صفحة المدربين المعتمدين أو من ملف المشترك'
                : 'Start a new chat from Certified Trainers or from a subscriber profile'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 8 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatName: {
    fontSize: 16,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    marginLeft: 8,
    marginRight: 8,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatPreview: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
    marginRight: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 82,
    marginRight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
