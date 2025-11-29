import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FileMetadata, UploadHistoryItem} from '../types';

interface UploadStore {
  files: FileMetadata[];
  history: UploadHistoryItem[];
  addFiles: (files: FileMetadata[]) => void;
  updateFile: (id: string, updates: Partial<FileMetadata>) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  addToHistory: (item: UploadHistoryItem) => void;
  clearHistory: () => void;
  loadHistory: () => Promise<void>;
  saveHistory: () => Promise<void>;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: [],
  history: [],

  addFiles: newFiles =>
    set(state => ({
      files: [...state.files, ...newFiles],
    })),

  updateFile: (id, updates) =>
    set(state => ({
      files: state.files.map(file =>
        file.id === id ? {...file, ...updates} : file,
      ),
    })),

  removeFile: id =>
    set(state => ({
      files: state.files.filter(file => file.id !== id),
    })),

  clearCompleted: () =>
    set(state => ({
      files: state.files.filter(
        file => file.status !== 'completed' && file.status !== 'error',
      ),
    })),

  addToHistory: item => {
    set(state => ({
      history: [item, ...state.history].slice(0, 100),
    }));
    get().saveHistory();
  },

  clearHistory: () => {
    set({history: []});
    AsyncStorage.removeItem('upload-history');
  },

  loadHistory: async () => {
    try {
      const data = await AsyncStorage.getItem('upload-history');
      if (data) {
        const history = JSON.parse(data);
        set({history});
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  },

  saveHistory: async () => {
    try {
      const {history} = get();
      await AsyncStorage.setItem('upload-history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  },
}));

useUploadStore.getState().loadHistory();


