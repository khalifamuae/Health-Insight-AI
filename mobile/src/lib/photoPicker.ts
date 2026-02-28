import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromAlbum(): Promise<{ uri: string; name: string; type: string } | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled) {
    return null;
  }

  const firstAsset = result.assets?.[0];
  if (firstAsset?.uri) {
    const name = firstAsset.fileName || `gallery-${Date.now()}.jpg`;
    const type = firstAsset.mimeType || (firstAsset.type ? `image/${firstAsset.type}` : 'image/jpeg');
    return { uri: firstAsset.uri, name, type };
  }

  return null;
}

export async function takePhotoWithCamera(): Promise<{ uri: string; name: string; type: string } | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled) {
    return null;
  }

  const firstAsset = result.assets?.[0];
  if (firstAsset?.uri) {
    const name = firstAsset.fileName || `camera-${Date.now()}.jpg`;
    const type = firstAsset.mimeType || (firstAsset.type ? `image/${firstAsset.type}` : 'image/jpeg');
    return { uri: firstAsset.uri, name, type };
  }

  return null;
}
