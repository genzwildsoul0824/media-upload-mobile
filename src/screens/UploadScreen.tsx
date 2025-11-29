import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import DocumentPicker, {
  DocumentPickerResponse,
} from 'react-native-document-picker';
import {permissionService} from '../services/permissionService';
import {FileList} from '../components/FileList';
import {useUploadStore} from '../store/uploadStore';
import {uploadQueueManager} from '../services/uploadQueueManager';
import {Colors} from '../styles/colors';
import type {FileMetadata} from '../types';

const CHUNK_SIZE = 1024 * 1024;
const MAX_FILES = 10;

export function UploadScreen() {
  const {files, addFiles, updateFile, addToHistory} = useUploadStore();
  const [loading, setLoading] = useState(false);

  // Initialize queue manager callbacks
  React.useEffect(() => {
    uploadQueueManager.setCallbacks(updateFile, addToHistory);
  }, [updateFile, addToHistory]);

  const handleCamera = async () => {
    setLoading(true);
    try {
      const hasPermission = await permissionService.requestCameraPermission();

      if (!hasPermission) {
        console.log('Camera permission denied, cannot open camera');
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos and videos.',
        );
        return;
      }

      console.log('Opening camera...');
      const result = await launchCamera({
        mediaType: 'mixed',
        quality: 1,
        saveToPhotos: true,
        includeBase64: false,
      });

      console.log('Camera result:', result);

      if (result.didCancel) {
        console.log('User cancelled camera');
        return;
      }

      if (result.errorCode) {
        console.error('Camera error:', result.errorCode, result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Failed to open camera');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        processAssets(result.assets);
      } else {
        console.log('No assets returned from camera');
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', `Failed to open camera: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGallery = async () => {
    const hasPermission = await permissionService.requestGalleryPermission();

    if (!hasPermission) {
      return;
    }

    setLoading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 1,
        selectionLimit: MAX_FILES - files.length,
      });

      if (result.assets && result.assets.length > 0) {
        processAssets(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDocuments = async () => {
    setLoading(true);
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.video],
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });

      processDocuments(results);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to pick documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const processAssets = (assets: Asset[]) => {
    const newFiles: FileMetadata[] = [];

    for (const asset of assets) {
      if (!asset.uri || !asset.fileSize || !asset.type) {
        continue;
      }

      const totalChunks = Math.ceil(asset.fileSize / CHUNK_SIZE);

      const metadata: FileMetadata = {
        id: `${asset.fileName}-${Date.now()}-${Math.random()}`,
        uri: asset.uri,
        filename: asset.fileName || 'unknown',
        size: asset.fileSize,
        mimeType: asset.type,
        totalChunks,
        uploadedChunks: [],
        status: 'pending',
        progress: 0,
        startTime: Date.now(),
      };

      newFiles.push(metadata);
    }

    if (newFiles.length > 0) {
      addFiles(newFiles);
      uploadQueueManager.addToQueue(newFiles);
      Alert.alert('Success', `${newFiles.length} file(s) added to queue`);
    }
  };

  const processDocuments = (documents: DocumentPickerResponse[]) => {
    const newFiles: FileMetadata[] = [];

    for (const doc of documents) {
      if (!doc.uri || !doc.size || !doc.type) {
        continue;
      }

      const totalChunks = Math.ceil(doc.size / CHUNK_SIZE);

      const metadata: FileMetadata = {
        id: `${doc.name}-${Date.now()}-${Math.random()}`,
        uri: doc.uri,
        filename: doc.name || 'unknown',
        size: doc.size,
        mimeType: doc.type,
        totalChunks,
        uploadedChunks: [],
        status: 'pending',
        progress: 0,
        startTime: Date.now(),
      };

      newFiles.push(metadata);
    }

    if (newFiles.length > 0) {
      addFiles(newFiles);
      uploadQueueManager.addToQueue(newFiles);
      Alert.alert('Success', `${newFiles.length} file(s) added to queue`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cameraButton]}
          onPress={handleCamera}
          disabled={loading || files.length >= MAX_FILES}>
          <Text style={styles.buttonText}>📷 Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.galleryButton]}
          onPress={handleGallery}
          disabled={loading || files.length >= MAX_FILES}>
          <Text style={styles.buttonText}>🖼️ Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.documentsButton]}
          onPress={handleDocuments}
          disabled={loading || files.length >= MAX_FILES}>
          <Text style={styles.buttonText}>📁 Files</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {files.length}/{MAX_FILES} files • Max 500MB each
      </Text>

      {files.length > 0 ? (
        <FileList />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📤</Text>
          <Text style={styles.emptyText}>No files selected</Text>
          <Text style={styles.emptySubtext}>
            Use the buttons above to add files
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
  },
  galleryButton: {
    backgroundColor: Colors.success,
  },
  documentsButton: {
    backgroundColor: Colors.warning,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});


