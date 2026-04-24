import React, { useEffect, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChat } from '../hooks/useChat';
import ChatView from '../components/ChatView';
import { api } from '../lib/api';
import { pickImageFromAlbum, takePhotoWithCamera } from '../lib/photoPicker';

/**
 * ClientChatScreen — Chat between trainee and their linked trainer (Shared Profile).
 * Uses the shared useChat hook and ChatView component.
 * Adds image attachment support (camera + gallery).
 */
export default function ClientChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isArabic = I18nManager.isRTL;

  const { connectionId, clientName } = route.params;
  const [isUploading, setIsUploading] = useState(false);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: clientName || (isArabic ? 'محادثة خاصة' : 'Private Chat'),
    });
  }, [clientName, isArabic, navigation]);

  const chat = useChat({
    queryKey: ['chat', connectionId],
    fetchEndpoint: `/api/subscriber-management/chat/${connectionId}`,
    sendEndpoint: `/api/subscriber-management/chat/${connectionId}`,
    supportsAttachments: true,
  });

  const handleAttachImage = async (useCamera: boolean) => {
    const file = useCamera ? await takePhotoWithCamera() : await pickImageFromAlbum();
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await (api as any).uploadImage(file);
      chat.sendMessage('', url, 'image');
    } catch (err: any) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        err.message || (isArabic ? 'فشل رفع الصورة' : 'Failed to upload image')
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ChatView
      messages={chat.messages}
      isLoading={chat.isLoading}
      isSending={chat.isSending}
      userId={chat.userId}
      onSend={(content, attachmentUrl, attachmentType) => chat.sendMessage(content, attachmentUrl, attachmentType)}
      showAttachmentButtons={true}
      onCameraPress={() => handleAttachImage(true)}
      onGalleryPress={() => handleAttachImage(false)}
      isUploading={isUploading}
    />
  );
}
