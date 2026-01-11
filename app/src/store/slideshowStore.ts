import { create } from 'zustand';
import type {
  UploadedImage,
  SlideshowConfig,
  ProcessingStatus,
  TransitionType,
  FitMode,
  Resolution,
} from '@/types/slideshow';

interface SlideshowState {
  // 画像関連
  images: UploadedImage[];
  sessionId: string | null;

  // 設定関連
  config: SlideshowConfig;

  // 処理状態
  status: ProcessingStatus;
  progress: number;
  progressMessage: string;
  videoId: string | null;
  error: string | null;

  // アクション
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  setSessionId: (sessionId: string) => void;
  updateConfig: (config: Partial<SlideshowConfig>) => void;
  setStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number, message: string) => void;
  setVideoId: (videoId: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultConfig: SlideshowConfig = {
  displayDuration: 3,
  transitionType: 'fade',
  transitionDuration: 1,
  resolution: '1920x1080',
  fitMode: 'contain',
  backgroundColor: '#000000',
};

export const useSlideshowStore = create<SlideshowState>((set) => ({
  // 初期状態
  images: [],
  sessionId: null,
  config: defaultConfig,
  status: 'idle',
  progress: 0,
  progressMessage: '',
  videoId: null,
  error: null,

  // アクション
  addImages: (files) =>
    set((state) => {
      const newImages: UploadedImage[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        order: state.images.length + index,
      }));

      return { images: [...state.images, ...newImages] };
    }),

  removeImage: (id) =>
    set((state) => ({
      images: state.images
        .filter((img) => img.id !== id)
        .map((img, index) => ({ ...img, order: index })),
    })),

  reorderImages: (fromIndex, toIndex) =>
    set((state) => {
      const newImages = [...state.images];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);

      return {
        images: newImages.map((img, index) => ({ ...img, order: index })),
      };
    }),

  setSessionId: (sessionId) => set({ sessionId }),

  updateConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  setStatus: (status) => set({ status }),

  setProgress: (progress, message) =>
    set({ progress, progressMessage: message }),

  setVideoId: (videoId) => set({ videoId }),

  setError: (error) => set({ error, status: 'error' }),

  reset: () =>
    set({
      images: [],
      sessionId: null,
      config: defaultConfig,
      status: 'idle',
      progress: 0,
      progressMessage: '',
      videoId: null,
      error: null,
    }),
}));
