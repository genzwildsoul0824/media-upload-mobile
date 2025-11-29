import axios, {AxiosInstance} from 'axios';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import type {MonitoringStats} from '../types';

// API Base URL configuration
// - Android Emulator: 10.0.2.2 maps to host machine's localhost
// - iOS Simulator: localhost works directly
// - Physical devices: Use your computer's local IP address (e.g., 192.168.x.x)
// - Production: Replace with your actual backend URL
const getApiBaseUrl = (): string => {
  // You can override this with an environment variable or config
  const envUrl = process.env.API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default: Use localhost for iOS, 10.0.2.2 for Android emulator
  if (Platform.OS === 'ios') {
    return 'http://localhost:8000/api';
  } else {
    // Android - use 10.0.2.2 for emulator, or set your local IP for physical device
    return 'http://localhost:8000/api';
    // return 'http://10.0.2.2:8000/api';
    // return 'http://192.168.0.8:8000/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initiateUpload(metadata: {
    filename: string;
    file_size: number;
    mime_type: string;
    total_chunks: number;
    md5?: string;
  }): Promise<{upload_id: string}> {
    const response = await this.client.post('/upload/initiate', metadata);
    return response.data;
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: string, // base64 string from RNFS.read
  ): Promise<{progress: number; uploaded_chunks: number; total_chunks: number}> {
    const formData = new FormData();
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', chunkIndex.toString());

    // In React Native, we need to write base64 to a temp file first
    // Then use that file URI in FormData
    const tempPath = `${RNFS.CachesDirectoryPath}/chunk_${uploadId}_${chunkIndex}_${Date.now()}.tmp`;

    try {
      // Write base64 to temp file
      await RNFS.writeFile(tempPath, chunkData, 'base64');

      // Create file object for FormData
      const file = {
        uri: `file://${tempPath}`,
        type: 'application/octet-stream',
        name: 'chunk',
      };
      formData.append('chunk', file as any);

      const response = await this.client.post('/upload/chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clean up temp file
      RNFS.unlink(tempPath).catch(() => {});

      return response.data;
    } catch (error) {
      // Clean up temp file on error
      RNFS.unlink(tempPath).catch(() => {});
      throw error;
    }
  }

  async finalizeUpload(
    uploadId: string,
    userId?: string,
  ): Promise<{
    message: string;
    file_path: string;
    filename: string;
    file_size: number;
    md5: string;
    is_duplicate: boolean;
  }> {
    const response = await this.client.post('/upload/finalize', {
      upload_id: uploadId,
      user_id: userId,
    });
    return response.data;
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await this.client.delete(`/upload/cancel/${uploadId}`);
  }

  async getUploadStatus(uploadId: string): Promise<{
    upload_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    total_chunks: number;
    uploaded_chunks: number;
    missing_chunks: number[];
    progress: number;
    status: string;
    created_at: number;
  }> {
    const response = await this.client.get(`/upload/status/${uploadId}`);
    return response.data;
  }

  async getMonitoringStats(): Promise<MonitoringStats> {
    const response = await this.client.get('/monitoring/stats');
    return response.data;
  }

  async healthCheck(): Promise<{
    status: string;
    services: Record<string, string>;
  }> {
    const response = await this.client.get('/monitoring/health');
    return response.data;
  }
}

export const apiService = new ApiService();


