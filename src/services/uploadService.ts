import RNFS from 'react-native-fs';
import BackgroundService from 'react-native-background-actions';
import {apiService} from './api';
import type {FileMetadata} from '../types';

const CHUNK_SIZE = 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

export class UploadService {
  private activeUploads = new Map<string, AbortController | boolean>();
  private backgroundTaskRunning = false;

  async uploadFile(
    fileMetadata: FileMetadata,
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    onFinalizing?: () => void,
    useBackground: boolean = false,
  ): Promise<void> {
    const {uri, filename, size, mimeType, id} = fileMetadata;
    let totalChunks = fileMetadata.totalChunks || Math.ceil(size / CHUNK_SIZE);

    if (useBackground && !this.backgroundTaskRunning) {
      await this.startBackgroundTask(
        fileMetadata,
        onProgress,
        onError,
        onComplete,
        onFinalizing,
      );
      return;
    }

    try {
      let upload_id = fileMetadata.uploadId;

      if (!upload_id) {
        const response = await apiService.initiateUpload({
          filename,
          file_size: size,
          mime_type: mimeType,
          total_chunks: totalChunks,
        });
        upload_id = response.upload_id;
        fileMetadata.uploadId = upload_id;
        fileMetadata.totalChunks = totalChunks;
      }

      const abortController = new AbortController();
      this.activeUploads.set(id, abortController as any);

      let uploadedChunks = fileMetadata.uploadedChunks || [];
      const existingProgress = fileMetadata.progress || 0;

      if (upload_id) {
        try {
          const status = await apiService.getUploadStatus(upload_id);
          const missingChunks = status.missing_chunks || [];
          const totalChunksFromBackend = status.total_chunks;

          // Use backend's total_chunks as the source of truth
          totalChunks = totalChunksFromBackend;
          fileMetadata.totalChunks = totalChunks;

          const backendUploadedChunks: number[] = [];
          for (let i = 0; i < totalChunksFromBackend; i++) {
            if (!missingChunks.includes(i)) {
              backendUploadedChunks.push(i);
            }
          }

          // Calculate progress from backend data
          const backendProgress =
            (backendUploadedChunks.length / totalChunksFromBackend) * 100;

          // Only use backend data if it shows equal or higher progress (prevents backward jumps)
          if (
            backendProgress >= existingProgress ||
            uploadedChunks.length === 0
          ) {
            uploadedChunks = backendUploadedChunks;
            fileMetadata.uploadedChunks = backendUploadedChunks;
          }
        } catch (error) {
          console.warn('Failed to verify chunks with backend', error);
        }
      }

      await this.uploadChunks(
        uri,
        upload_id!,
        totalChunks,
        uploadedChunks,
        onProgress,
        abortController.signal,
        fileMetadata,
      );

      try {
        const finalStatus = await apiService.getUploadStatus(upload_id!);
        const finalMissingChunks = finalStatus.missing_chunks || [];

        if (finalMissingChunks.length > 0) {
          for (const chunkIndex of finalMissingChunks) {
            if (abortController.signal.aborted) {
              throw new Error('Upload cancelled');
            }

            await this.uploadChunkWithRetry(uri, upload_id!, chunkIndex, size, abortController.signal);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.warn('Final verification failed', error);
      }

      // Notify that finalization is starting
      if (onFinalizing) {
        onFinalizing();
      }

      await apiService.finalizeUpload(upload_id!);

      this.activeUploads.delete(id);
      onComplete();
    } catch (error: any) {
      this.activeUploads.delete(id);

      if (
        error.name === 'AbortError' ||
        error.message === 'Upload cancelled'
      ) {
        onError('Upload cancelled');
      } else {
        onError(
          error.response?.data?.message || error.message || 'Upload failed',
        );
      }
    }
  }

  private async startBackgroundTask(
    fileMetadata: FileMetadata,
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    onFinalizing?: () => void,
  ): Promise<void> {
    const {uri, filename, size, mimeType, id} = fileMetadata;
    const totalChunks = Math.ceil(size / CHUNK_SIZE);

    const uploadTask = async (_taskData: any) => {
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
          if (!BackgroundService.isRunning() || !this.activeUploads.get(id)) {
            throw new Error('Upload cancelled');
          }

          // For background tasks, we don't use AbortController, just check the flag
          const fakeSignal = {aborted: false} as AbortSignal;
          await this.uploadChunkWithRetry(uri, upload_id, i, size, fakeSignal);

          uploadedChunks.push(i);
          const progress = ((i + 1) / totalChunks) * 100;

          await BackgroundService.updateNotification({
            taskDesc: `Uploading ${filename}: ${progress.toFixed(0)}%`,
          });

          onProgress(progress, uploadedChunks);
        }

        // Notify that finalization is starting
        if (onFinalizing) {
          onFinalizing();
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
      } finally {
        if (BackgroundService.isRunning()) {
          await BackgroundService.stop();
          this.backgroundTaskRunning = false;
        }
      }
    };

    const options = {
      taskName: 'FileUpload',
      taskTitle: `Uploading ${filename}`,
      taskDesc: 'Upload in progress...',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff00ff',
      linkingURI: 'mediauploadmobile://upload',
      parameters: {
        delay: 1000,
      },
    };

    try {
      await BackgroundService.start(uploadTask, options);
      this.backgroundTaskRunning = true;
    } catch (error: any) {
      onError(error.message || 'Failed to start background upload');
    }
  }

  private async uploadChunks(
    uri: string,
    uploadId: string,
    totalChunks: number,
    uploadedChunks: number[],
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    signal: AbortSignal,
    fileMetadata: FileMetadata,
  ): Promise<void> {
    const chunksToUpload = Array.from({length: totalChunks}, (_, i) => i).filter(
      i => !uploadedChunks.includes(i),
    );

    const uploaded = [...uploadedChunks].sort((a, b) => a - b);

    if (uploaded.length > 0) {
      const initialProgress = (uploaded.length / totalChunks) * 100;

      // Only update progress if it's higher than current progress (prevents backward jumps on resume)
      const currentProgress = fileMetadata.progress || 0;
      if (initialProgress >= currentProgress) {
        onProgress(initialProgress, uploaded);
      } else {
        // If calculated progress is lower, use the current progress to maintain the correct state
        onProgress(currentProgress, uploaded);
      }

      // Keep fileMetadata uploadedChunks updated
      fileMetadata.uploadedChunks = [...uploaded];
    }

    for (const chunkIndex of chunksToUpload) {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      const result = await this.uploadChunkWithRetry(
        uri,
        uploadId,
        chunkIndex,
        fileMetadata.size,
        signal,
      );

      if (result.success) {
        uploaded.push(result.chunkIndex);
        uploaded.sort((a, b) => a - b);
        const progress = (uploaded.length / totalChunks) * 100;

        // Update metadata chunk state every upload
        fileMetadata.uploadedChunks = [...uploaded];

        onProgress(progress, uploaded);
      } else {
        throw new Error(result.error || 'Chunk upload failed');
      }
    }
  }

  private async uploadChunkWithRetry(
    uri: string,
    uploadId: string,
    chunkIndex: number,
    fileSize: number,
    signal: AbortSignal,
    attempt: number = 0,
  ): Promise<{success: boolean; chunkIndex: number; progress: number; error?: string}> {
    try {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkData = await RNFS.read(uri, end - start, start, 'base64');

      const result = await apiService.uploadChunk(uploadId, chunkIndex, chunkData);

      return {
        success: true,
        chunkIndex,
        progress: result.progress,
      };
    } catch (error: any) {
      if (signal.aborted || error.message === 'Upload cancelled') {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.uploadChunkWithRetry(
          uri,
          uploadId,
          chunkIndex,
          fileSize,
          signal,
          attempt + 1,
        );
      }

      return {
        success: false,
        chunkIndex,
        progress: 0,
        error: error?.message || 'Chunk upload failed',
      };
    }
  }

  pauseUpload(fileId: string): void {
    const controller = this.activeUploads.get(fileId) as AbortController | undefined;
    if (controller) {
      controller.abort();
      this.activeUploads.delete(fileId);
    }
  }

  cancelUpload(fileId: string, uploadId?: string): void {
    this.pauseUpload(fileId);

    if (uploadId) {
      apiService.cancelUpload(uploadId).catch(console.error);
    }

    if (this.backgroundTaskRunning && BackgroundService.isRunning()) {
      BackgroundService.stop().catch(console.error);
      this.backgroundTaskRunning = false;
    }
  }

  async stopBackgroundTask(): Promise<void> {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      this.backgroundTaskRunning = false;
    }
  }

  async resumeUpload(
    fileMetadata: FileMetadata,
  ): Promise<{uploadedChunks: number[]; totalChunks: number}> {
    if (!fileMetadata.uploadId) {
      throw new Error('No upload ID found');
    }

    try {
      const status = await apiService.getUploadStatus(fileMetadata.uploadId);
      const missingChunks = status.missing_chunks || [];
      const totalChunks = status.total_chunks;

      const uploadedChunks: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!missingChunks.includes(i)) {
          uploadedChunks.push(i);
        }
      }

      return {uploadedChunks, totalChunks};
    } catch (error: any) {
      console.error('resumeUpload: Failed to fetch upload status', error);
      throw new Error(
        `Failed to resume upload: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}

export const uploadService = new UploadService();


