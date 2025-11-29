import RNFS from 'react-native-fs';
import {apiService} from './api';
import type {FileMetadata} from '../types';

const CHUNK_SIZE = 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

export class UploadService {
  private activeUploads = new Map<string, boolean>();

  async uploadFile(
    fileMetadata: FileMetadata,
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    onError: (error: string) => void,
    onComplete: () => void,
  ): Promise<void> {
    const {uri, filename, size, mimeType, id} = fileMetadata;
    const totalChunks = Math.ceil(size / CHUNK_SIZE);

    try {
      const {upload_id} = await apiService.initiateUpload({
        filename,
        file_size: size,
        mime_type: mimeType,
        total_chunks: totalChunks,
      });

      fileMetadata.uploadId = upload_id;
      this.activeUploads.set(id, true);

      const uploadedChunks: number[] = [];

      for (let i = 0; i < totalChunks; i++) {
        if (!this.activeUploads.get(id)) {
          throw new Error('Upload cancelled');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, size);

        const chunkData = await RNFS.read(uri, end - start, start, 'base64');

        await this.uploadChunkWithRetry(upload_id, i, chunkData);

        uploadedChunks.push(i);
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress(progress, uploadedChunks);
      }

      await apiService.finalizeUpload(upload_id);
      this.activeUploads.delete(id);
      onComplete();
    } catch (error: any) {
      this.activeUploads.delete(id);

      if (error.message === 'Upload cancelled') {
        onError('Upload cancelled');
      } else {
        onError(error.message || 'Upload failed');
      }
    }
  }

  private async uploadChunkWithRetry(
    uploadId: string,
    chunkIndex: number,
    chunkData: string,
    attempt: number = 0,
  ): Promise<void> {
    try {
      await apiService.uploadChunk(uploadId, chunkIndex, chunkData);
    } catch (error: any) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.uploadChunkWithRetry(uploadId, chunkIndex, chunkData, attempt + 1);
      }
      throw error;
    }
  }

  pauseUpload(fileId: string): void {
    this.activeUploads.set(fileId, false);
  }

  cancelUpload(fileId: string, uploadId?: string): void {
    this.activeUploads.delete(fileId);

    if (uploadId) {
      apiService.cancelUpload(uploadId).catch(console.error);
    }
  }
}

export const uploadService = new UploadService();


