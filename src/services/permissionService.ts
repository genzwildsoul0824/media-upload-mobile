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
        console.error('Camera permission not available for platform:', Platform.OS);
        Alert.alert('Error', 'Camera permission is not available on this device.');
        return false;
      }

      console.log('Checking camera permission:', permission);
      const result = await check(permission);
      console.log('Camera permission check result:', result);

      if (result === RESULTS.GRANTED) {
        console.log('Camera permission already granted');
        return true;
      }

      if (result === RESULTS.DENIED || result === RESULTS.UNAVAILABLE) {
        console.log('Requesting camera permission...');
        const requestResult = await request(permission);
        console.log('Camera permission request result:', requestResult);

        if (requestResult === RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            'Permission Denied',
            'Camera permission is required to take photos and videos. Please grant permission when prompted.',
          );
          return false;
        }
      }

      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access has been blocked. Please enable camera access in your device settings to take photos and videos.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => openSettings()},
          ],
        );
        return false;
      }

      console.warn('Unexpected camera permission result:', result);
      return false;
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert('Error', `Failed to request camera permission: ${error}`);
      return false;
    }
  }

  async requestGalleryPermission(): Promise<boolean> {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android:
          Number(Platform.Version) >= 33
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


