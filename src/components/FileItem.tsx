import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {useUploadStore} from '../store/uploadStore';
import {uploadService} from '../services/uploadService';
import {Colors} from '../styles/colors';
import type {FileMetadata} from '../types';

interface Props {
  file: FileMetadata;
}

export function FileItem({file}: Props) {
  const {updateFile, removeFile, addToHistory} = useUploadStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (file.status === 'uploading') {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - file.startTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [file.status, file.startTime]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const handleStart = async () => {
    updateFile(file.id, {status: 'uploading', error: undefined});

    await uploadService.uploadFile(
      file,
      (progress, uploadedChunks) => {
        updateFile(file.id, {progress, uploadedChunks});
      },
      error => {
        updateFile(file.id, {
          status: 'error',
          error,
          endTime: Date.now(),
        });
        addToHistory({
          id: file.id,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          status: 'failed',
          timestamp: Date.now(),
          duration: Date.now() - file.startTime,
        });
      },
      () => {
        const endTime = Date.now();
        updateFile(file.id, {
          status: 'completed',
          progress: 100,
          endTime,
        });
        addToHistory({
          id: file.id,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          status: 'completed',
          timestamp: endTime,
          duration: endTime - file.startTime,
        });
      },
    );
  };

  const handlePause = () => {
    uploadService.pauseUpload(file.id);
    updateFile(file.id, {status: 'paused'});
  };

  const handleCancel = () => {
    Alert.alert('Cancel Upload', 'Are you sure you want to cancel this upload?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          uploadService.cancelUpload(file.id, file.uploadId);
          removeFile(file.id);
        },
      },
    ]);
  };

  const handleRetry = () => {
    updateFile(file.id, {
      status: 'pending',
      progress: 0,
      uploadedChunks: [],
      error: undefined,
      startTime: Date.now(),
    });
    handleStart();
  };

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        {file.mimeType.startsWith('image/') && file.uri ? (
          <Image source={{uri: file.uri}} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewIcon}>
            {file.mimeType.startsWith('video/') ? '🎬' : '📄'}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.filename} numberOfLines={1}>
          {file.filename}
        </Text>
        <Text style={styles.meta}>
          {formatSize(file.size)}
          {file.status === 'uploading' && ` • ${formatDuration(elapsedTime)}`}
          {file.endTime &&
            ` • ${formatDuration(file.endTime - file.startTime)}`}
        </Text>

        {file.status !== 'completed' && file.status !== 'error' && (
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, {width: `${file.progress}%`}]}
            />
            <Text style={styles.progressText}>
              {Math.round(file.progress)}%
            </Text>
          </View>
        )}

        {file.error && (
          <Text style={styles.error} numberOfLines={2}>
            {file.error}
          </Text>
        )}

        {file.status === 'completed' && (
          <Text style={styles.success}>✓ Upload completed</Text>
        )}
      </View>

      <View style={styles.actions}>
        {file.status === 'pending' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleStart}>
            <Text style={styles.actionIcon}>▶️</Text>
          </TouchableOpacity>
        )}

        {file.status === 'uploading' && (
          <TouchableOpacity style={styles.actionButton} onPress={handlePause}>
            <Text style={styles.actionIcon}>⏸️</Text>
          </TouchableOpacity>
        )}

        {file.status === 'paused' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleStart}>
            <Text style={styles.actionIcon}>▶️</Text>
          </TouchableOpacity>
        )}

        {file.status === 'error' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
            <Text style={styles.actionIcon}>🔄</Text>
          </TouchableOpacity>
        )}

        {file.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}>
            <Text style={styles.actionIcon}>✖️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  preview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewIcon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    position: 'absolute',
    top: -18,
    right: 0,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  success: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionIcon: {
    fontSize: 18,
  },
});


