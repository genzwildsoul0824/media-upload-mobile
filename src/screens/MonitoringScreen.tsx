import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {apiService} from '../services/api';
import {formatFileSize} from '../utils/fileUtils';
import {Colors} from '../styles/colors';
import type {MonitoringStats} from '../types';

export function MonitoringScreen() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMonitoringStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Failed to Load Stats</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Monitoring</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchStats}
          disabled={loading}>
          <Text style={styles.refreshButtonText}>
            {loading ? '↻' : '🔄'} Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>💾</Text>
          <Text style={styles.cardTitle}>Storage</Text>
          <Text style={styles.cardValue}>
            {formatFileSize(stats.storage.total_size)}
          </Text>
          <Text style={styles.cardLabel}>
            {stats.storage.file_count.toLocaleString()} files
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📤</Text>
          <Text style={styles.cardTitle}>Active Uploads</Text>
          <Text style={styles.cardValue}>{stats.active_uploads}</Text>
          <Text style={styles.cardLabel}>Currently uploading</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📊</Text>
          <Text style={styles.cardTitle}>Success Rate</Text>
          <Text style={styles.cardValue}>
            {stats.metrics &&
            typeof stats.metrics.total_uploads === 'number' &&
            stats.metrics.total_uploads > 0
              ? `${Number(stats.metrics.success_rate || 0).toFixed(1)}%`
              : '0.0%'}
          </Text>
          <Text style={styles.cardLabel}>
            {stats.metrics?.successful_uploads ?? 0} /{' '}
            {stats.metrics?.total_uploads ?? 0} uploads
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📈</Text>
          <Text style={styles.cardTitle}>Total Uploads</Text>
          <Text style={styles.cardValue}>
            {Number(stats.metrics?.total_uploads ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.cardLabel}>All time</Text>
        </View>
      </View>

      {stats.upload_details && stats.upload_details.length > 0 && (
        <View style={styles.activeUploads}>
          <Text style={styles.activeUploadsTitle}>Active Upload Details</Text>
          <View style={styles.uploadList}>
            {stats.upload_details.map(upload => (
              <View key={upload.upload_id} style={styles.uploadItem}>
                <View style={styles.uploadInfo}>
                  <Text style={styles.uploadFilename}>{upload.filename}</Text>
                  <Text style={styles.uploadId}>{upload.upload_id}</Text>
                </View>
                <View style={styles.uploadProgress}>
                  <View style={styles.uploadProgressBar}>
                    <View
                      style={[
                        styles.uploadProgressFill,
                        {width: `${upload.progress}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.uploadProgressText}>
                    {upload.progress.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  card: {
    width: '47%',
    margin: '1.5%',
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activeUploads: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  activeUploadsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  uploadList: {
    gap: 12,
  },
  uploadItem: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  uploadInfo: {
    marginBottom: 8,
  },
  uploadFilename: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  uploadId: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  uploadProgressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
});


