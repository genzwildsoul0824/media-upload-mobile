import axios, {AxiosInstance} from 'axios';
import type {MonitoringStats} from '../types';

const API_BASE_URL = 'http://10.0.2.2:8000/api';

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
  }): Promise<{upload_id: string}> {
    const response = await this.client.post('/upload/initiate', metadata);
    return response.data;
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: string,
  ): Promise<{progress: number; uploaded_chunks: number; total_chunks: number}> {
    const formData = new FormData();
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('chunk', {
      uri: chunkData,
      type: 'application/octet-stream',
      name: 'chunk',
    } as any);

    const response = await this.client.post('/upload/chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Shorter timeout for chunk uploads to avoid long hangs
      timeout: 300,
    });
    return response.data;
  }

  async finalizeUpload(uploadId: string): Promise<{
    message: string;
    file_path: string;
    filename: string;
    md5: string;
  }> {
    const response = await this.client.post('/upload/finalize', {
      upload_id: uploadId,
    });
    return response.data;
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await this.client.delete(`/upload/cancel/${uploadId}`);
  }

  async getMonitoringStats(): Promise<MonitoringStats> {
    const response = await this.client.get('/monitoring/stats');
    return response.data;
  }
}

export const apiService = new ApiService();


