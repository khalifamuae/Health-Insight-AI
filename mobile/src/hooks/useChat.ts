import { useState, useMemo, useCallback } from 'react';
import { Alert, I18nManager } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  createdAt: string;
  // Extra fields depending on chat type
  receiverId?: string;
  connectionId?: string;
}

interface UseChatOptions {
  /** Query key for TanStack Query cache */
  queryKey: string[];
  /** GET endpoint to fetch messages */
  fetchEndpoint: string;
  /** POST endpoint to send messages */
  sendEndpoint: string;
  /** Whether the chat supports image attachments */
  supportsAttachments?: boolean;
}

/**
 * Unified chat hook used by both StandaloneChatScreen and ClientChatScreen.
 * Any change here automatically applies to both chat types.
 *
 * Handles:
 * - Fetching messages with polling (every 5s)
 * - Sending messages with pending state (prevents polling race condition)
 * - Optimistic UI with status indicators
 * - Error handling with alerts
 * - Auto-refresh on screen focus
 * - Updating chats-list on send
 */
export function useChat({ queryKey, fetchEndpoint, sendEndpoint, supportsAttachments = false }: UseChatOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isArabic = I18nManager.isRTL;

  // Pending messages that haven't been confirmed by the server
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);

  // Fetch messages from server with polling
  const { data: serverMessages, isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey,
    queryFn: () => api.get<ChatMessage[]>(fetchEndpoint),
    refetchInterval: 5000,
  });

  // Auto-refresh on focus
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Merge server messages with pending (unconfirmed) messages
  const messages = useMemo(() => {
    const server = serverMessages || [];
    // Keep pending messages that haven't been confirmed yet
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

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (data: { content: string; attachmentUrl?: string; attachmentType?: string }) =>
      api.post<any>(sendEndpoint, data),
    onMutate: async (data) => {
      const pendingMsg: ChatMessage = {
        id: `pending-${Date.now()}`,
        senderId: user?.id || '',
        content: data.content || '',
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setPendingMessages(prev => [...prev, pendingMsg]);
      return { pendingMsg };
    },
    onSuccess: (_result, _data, context) => {
      // Remove from pending since server confirmed
      if (context?.pendingMsg) {
        setPendingMessages(prev => prev.filter(m => m.id !== context.pendingMsg.id));
      }
      // Refetch messages and update chats list
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['chats-list'] });
    },
    onError: (_err: any, _data, context) => {
      // Remove failed pending message
      if (context?.pendingMsg) {
        setPendingMessages(prev => prev.filter(m => m.id !== context.pendingMsg.id));
      }
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        _err?.message || (isArabic ? 'فشل إرسال الرسالة. حاول مرة أخرى.' : 'Failed to send message. Please try again.')
      );
    },
  });

  const sendMessage = useCallback((content: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!content.trim() && !attachmentUrl) return;
    sendMutation.mutate({ content: content.trim(), attachmentUrl, attachmentType });
  }, [sendMutation]);

  return {
    messages,
    isLoading,
    sendMessage,
    isSending: sendMutation.isPending,
    userId: user?.id || '',
    refetch,
  };
}
