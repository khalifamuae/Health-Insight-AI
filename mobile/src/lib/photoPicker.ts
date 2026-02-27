import { requireOptionalNativeModule } from 'expo-modules-core';

type PermissionResponse = {
  granted?: boolean;
  status?: string;
};

type PickerAsset = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  type?: string;
};

type PickerResponse = {
  canceled?: boolean;
  cancelled?: boolean;
  assets?: PickerAsset[];
  uri?: string;
  type?: string;
};

interface NativeImagePickerModule {
  getMediaLibraryPermissionsAsync?: () => Promise<PermissionResponse>;
  requestMediaLibraryPermissionsAsync?: () => Promise<PermissionResponse>;
  getCameraPermissionsAsync?: () => Promise<PermissionResponse>;
  requestCameraPermissionsAsync?: () => Promise<PermissionResponse>;
  launchImageLibraryAsync?: (options?: Record<string, unknown>) => Promise<PickerResponse>;
  launchCameraAsync?: (options?: Record<string, unknown>) => Promise<PickerResponse>;
}

const imagePickerModule: NativeImagePickerModule | null =
  requireOptionalNativeModule<NativeImagePickerModule>('ExpoImagePicker') ||
  requireOptionalNativeModule<NativeImagePickerModule>('ExponentImagePicker');

export async function pickImageFromAlbum(): Promise<{ uri: string; name: string; type: string } | null> {
  if (!imagePickerModule?.launchImageLibraryAsync) {
    return null;
  }

  const currentPermission = await imagePickerModule.getMediaLibraryPermissionsAsync?.();
  const hasPermission = currentPermission?.granted || currentPermission?.status === 'granted';

  if (!hasPermission) {
    const requested = await imagePickerModule.requestMediaLibraryPermissionsAsync?.();
    const grantedNow = requested?.granted || requested?.status === 'granted';
    if (!grantedNow) {
      return null;
    }
  }

  const result = await imagePickerModule.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.9,
  });

  const cancelled = result?.canceled ?? result?.cancelled;
  if (cancelled) {
    return null;
  }

  const firstAsset = result?.assets?.[0];
  if (firstAsset?.uri) {
    const name = firstAsset.fileName || `profile-${Date.now()}.jpg`;
    const type = firstAsset.mimeType || (firstAsset.type ? `image/${firstAsset.type}` : 'image/jpeg');
    return { uri: firstAsset.uri, name, type };
  }

  if (result?.uri) {
    return { uri: result.uri, name: `profile-${Date.now()}.jpg`, type: result.type || 'image/jpeg' };
  }

  return null;
}

export async function takePhotoWithCamera(): Promise<{ uri: string; name: string; type: string } | null> {
  if (!imagePickerModule?.launchCameraAsync) {
    return null;
  }

  const currentPermission = await imagePickerModule.getCameraPermissionsAsync?.();
  const hasPermission = currentPermission?.granted || currentPermission?.status === 'granted';

  if (!hasPermission) {
    const requested = await imagePickerModule.requestCameraPermissionsAsync?.();
    const grantedNow = requested?.granted || requested?.status === 'granted';
    if (!grantedNow) {
      return null;
    }
  }

  const result = await imagePickerModule.launchCameraAsync({
    allowsEditing: true,
    quality: 0.9,
  });

  const cancelled = result?.canceled ?? result?.cancelled;
  if (cancelled) {
    return null;
  }

  const firstAsset = result?.assets?.[0];
  if (firstAsset?.uri) {
    const name = firstAsset.fileName || `camera-${Date.now()}.jpg`;
    const type = firstAsset.mimeType || (firstAsset.type ? `image/${firstAsset.type}` : 'image/jpeg');
    return { uri: firstAsset.uri, name, type };
  }

  if (result?.uri) {
    return { uri: result.uri, name: `camera-${Date.now()}.jpg`, type: result.type || 'image/jpeg' };
  }

  return null;
}
