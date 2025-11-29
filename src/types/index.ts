export interface FileMetadata {
  id: string;
  uri: string;
  filename: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number;
  uploadId?: string;
  error?: string;
  startTime: number;
  endTime?: number;
}

export interface UploadHistoryItem {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  status: 'completed' | 'failed';
  timestamp: number;
  duration: number;
}

export interface MonitoringStats {
  storage: {
    total_size: number;
    total_size_mb: number;
    file_count: number;
  };
  active_uploads: number;
  metrics: {
    total_uploads: number;
    successful_uploads: number;
    success_rate: number;
  };
}


