// トランジションの種類
export type TransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'none';

// 画像フィット方法
export type FitMode = 'cover' | 'contain' | 'stretch';

// 解像度設定
export type Resolution = '1920x1080' | '1280x720' | '640x480';

// 処理状態
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

// アップロード画像情報
export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  order: number;
  uploadedPath?: string;
}

// スライドショー設定パラメータ
export interface SlideshowConfig {
  displayDuration: number; // 各画像の表示時間（秒）
  transitionType: TransitionType;
  transitionDuration: number; // トランジション時間（秒）
  resolution: Resolution;
  fitMode: FitMode;
  backgroundColor: string;
  bgm?: {
    file: File;
    volume: number; // 0-100
  };
}

// 動画生成リクエスト
export interface VideoGenerationRequest {
  sessionId: string;
  images: Array<{
    id: string;
    path: string;
    order: number;
  }>;
  config: SlideshowConfig;
}

// 動画生成レスポンス
export interface VideoGenerationResponse {
  success: boolean;
  videoId?: string;
  message?: string;
  error?: string;
}

// 進捗状況
export interface ProcessProgress {
  status: ProcessingStatus;
  progress: number; // 0-100
  message: string;
  currentImage?: number;
  totalImages?: number;
  estimatedTimeRemaining?: number; // 秒
}

// アップロードレスポンス
export interface UploadResponse {
  success: boolean;
  sessionId?: string;
  uploadedImages?: Array<{
    id: string;
    path: string;
    name: string;
    size: number;
  }>;
  error?: string;
}

// エラーレスポンス
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
