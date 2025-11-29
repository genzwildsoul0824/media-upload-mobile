import {Platform, Alert} from 'react-native';
import {
  PERMISSIONS,
  request,
  check,
  RESULTS,
  openSettings,
} from 'react-native-permissions';

export class PermissionService {
  async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.CAMERA,
        android: PERMISSIONS.ANDROID.CAMERA,
      });

      if (!permission) {
        return false;
      }

      const result = await check(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      }

      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      }

      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos and videos.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => openSettings()},
          ],
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  async requestGalleryPermission(): Promise<boolean> {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android:
          Platform.Version >= 33
            ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
            : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      });

      if (!permission) {
        return false;
      }

      const result = await check(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      }

      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      }

      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Gallery Permission Required',
          'Please enable gallery access in your device settings to select photos and videos.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => openSettings()},
          ],
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error('Gallery permission error:', error);
      return false;
    }
  }
}

export const permissionService = new PermissionService();


