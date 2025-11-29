import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useUploadStore} from '../store/uploadStore';
import {formatFileSize, formatDuration} from '../utils/fileUtils';
import {Colors} from '../styles/colors';

export function HistoryScreen() {
  const {history, clearHistory} = useUploadStore();


  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Upload History</Text>
        <Text style={styles.emptyText}>
          Your completed uploads will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload History ({history.length})</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {history.map(item => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemIcon}>
              <Text style={styles.itemIconText}>
                {item.mimeType.startsWith('image/') ? '🖼️' : '🎬'}
              </Text>
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemFilename} numberOfLines={1}>
                {item.filename}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemMetaText}>
                  {formatFileSize(item.size)}
                </Text>
                <Text style={styles.itemMetaText}>•</Text>
                <Text style={styles.itemMetaText}>
                  {formatDuration(item.duration)}
                </Text>
                <Text style={styles.itemMetaText}>•</Text>
                <Text style={styles.itemMetaText}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.itemStatus}>
              <Text
                style={[
                  styles.statusText,
                  item.status === 'completed'
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}>
                {item.status === 'completed' ? '✓' : '✗'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.error,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemFilename: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  itemMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  itemStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: Colors.success,
  },
  statusError: {
    color: Colors.error,
  },
});


