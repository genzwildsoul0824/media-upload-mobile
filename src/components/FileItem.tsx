import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useUploadStore} from '../store/uploadStore';
import {uploadQueueManager} from '../services/uploadQueueManager';
import {formatFileSize, formatDuration} from '../utils/fileUtils';
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
      // Calculate initial elapsed time immediately
      const pausedDuration = file.pausedDuration || 0;
      setElapsedTime(Date.now() - file.startTime - pausedDuration);

      // Then update every second
      const interval = setInterval(() => {
        const pausedDuration = file.pausedDuration || 0;
        setElapsedTime(Date.now() - file.startTime - pausedDuration);
      }, 1000);
      return () => clearInterval(interval);
    } else if (file.status === 'paused' && file.endTime) {
      // Show paused duration when paused
      const pausedDuration = file.pausedDuration || 0;
      setElapsedTime(file.endTime - file.startTime - pausedDuration);
    } else {
      // Reset elapsed time when not uploading or paused
      setElapsedTime(0);
    }
  }, [file.status, file.startTime, file.pausedDuration, file.endTime]);

  const handleStart = () => {
    // Resume upload through queue manager
    uploadQueueManager.resumeUpload(file);
  };

  const handlePause = () => {
    uploadQueueManager.pauseUpload(file.id);
    // Status will be updated by queue manager after pause completes
  };

  const handleResume = () => {
    // Resume upload through queue manager
    uploadQueueManager.resumeUpload(file);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Upload', 'Are you sure you want to cancel this upload?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          uploadQueueManager.cancelUpload(file.id, file.uploadId);
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
      pausedDuration: 0,
      pausedAt: undefined,
      endTime: undefined,
    });
    // Add to queue for retry
    uploadQueueManager.resumeUpload(file);
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <Text style={styles.statusIcon}>✓</Text>;
      case 'error':
        return <Text style={styles.statusIconError}>✗</Text>;
      case 'uploading':
      case 'finalizing':
        return <ActivityIndicator size="small" color={Colors.primary} />;
      default:
        return (
          <Text style={styles.previewIcon}>
            {file.mimeType.startsWith('image/') ? '🖼️' : '🎬'}
          </Text>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        {file.mimeType.startsWith('image/') && file.uri ? (
          <Image source={{uri: file.uri}} style={styles.previewImage} />
        ) : (
          getStatusIcon()
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.filename} numberOfLines={1}>
            {file.filename}
          </Text>
          <Text style={styles.size}>{formatFileSize(file.size)}</Text>
          {file.status === 'uploading' && (
            <Text style={styles.time}>{formatDuration(elapsedTime)}</Text>
          )}
          {file.status === 'finalizing' && (
            <Text style={[styles.time, styles.finalizingText]}>
              Finalizing...
            </Text>
          )}
          {(file.status === 'paused' ||
            file.status === 'completed' ||
            file.status === 'error') &&
            file.endTime && (
              <Text style={styles.time}>
                {formatDuration(
                  Math.max(
                    0,
                    file.endTime - file.startTime - (file.pausedDuration || 0),
                  ),
                )}
              </Text>
            )}
        </View>

        {file.status !== 'completed' && (
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, {width: `${file.progress}%`}]}
            />
            <Text style={styles.progressText}>
              {file.status === 'finalizing' ? (
                <Text style={styles.finalizingProgressText}>
                  Finalizing...
                </Text>
              ) : (
                `${Math.round(file.progress)}%`
              )}
            </Text>
          </View>
        )}

        {file.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.error} numberOfLines={2}>
              {file.error}
            </Text>
          </View>
        )}

        {file.status === 'completed' && (
          <Text style={styles.success}>Upload completed successfully!</Text>
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResume}>
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
  statusIcon: {
    fontSize: 24,
    color: Colors.success,
    fontWeight: 'bold',
  },
  statusIconError: {
    fontSize: 24,
    color: Colors.error,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  info: {
    marginBottom: 8,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  size: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  finalizingText: {
    color: Colors.primary,
    fontWeight: '500',
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
  finalizingProgressText: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  error: {
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  success: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 4,
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


