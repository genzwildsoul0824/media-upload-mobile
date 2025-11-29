import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import {UploadScreen} from '../screens/UploadScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {MonitoringScreen} from '../screens/MonitoringScreen';
import {Colors} from '../styles/colors';

type Tab = 'upload' | 'history' | 'monitoring';

export function NavigationContainer() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Media Upload</Text>
        <Text style={styles.headerSubtitle}>Upload images and videos</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'upload' && <UploadScreen />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'monitoring' && <MonitoringScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
          onPress={() => setActiveTab('upload')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'upload' && styles.activeTabText,
            ]}>
            Upload
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'monitoring' && styles.activeTab]}
          onPress={() => setActiveTab('monitoring')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'monitoring' && styles.activeTabText,
            ]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});


