import React from 'react';
import { I18nManager } from 'react-native';
import { useChat } from '../hooks/useChat';
import ChatView from '../components/ChatView';

/**
 * StandaloneChatScreen — Chat with a trainer from the Certified Trainers section.
 * Uses the shared useChat hook and ChatView component.
 */
export default function StandaloneChatScreen({ route }: any) {
  const { otherUserId } = route.params;

  const chat = useChat({
    queryKey: ['standalone-chat', otherUserId],
    fetchEndpoint: `/api/standalone-chat/${otherUserId}`,
    sendEndpoint: `/api/standalone-chat/${otherUserId}`,
  });

  return (
    <ChatView
      messages={chat.messages}
      isLoading={chat.isLoading}
      isSending={chat.isSending}
      userId={chat.userId}
      onSend={(content) => chat.sendMessage(content)}
    />
  );
}
