import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {FileItem} from './FileItem';
import {useUploadStore} from '../store/uploadStore';
import {Colors} from '../styles/colors';

export function FileList() {
  const {files, clearCompleted} = useUploadStore();

  const hasCompleted = files.some(
    file => file.status === 'completed' || file.status === 'error',
  );

  const completedCount = files.filter(f => f.status === 'completed').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const pendingCount = files.filter(
    f => f.status === 'pending' || f.status === 'paused',
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Queue ({files.length})</Text>
        {hasCompleted && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearCompleted}>
            <Text style={styles.clearButtonText}>🗑️ Clear Completed</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.list}>
        {files.map(file => (
          <FileItem key={file.id} file={file} />
        ))}
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>✓</Text>
          <Text style={styles.statText}>{completedCount} completed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statText}>{uploadingCount} uploading</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statText}>{pendingCount} pending</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.error,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 16,
    color: Colors.success,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

