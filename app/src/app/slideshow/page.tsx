'use client';

import { useState, useEffect } from 'react';
import { useSlideshowStore } from '@/store/slideshowStore';
import { ImageUploader } from '@/components/slideshow/ImageUploader';
import { ImageGallery } from '@/components/slideshow/ImageGallery';
import { SettingsPanel } from '@/components/slideshow/SettingsPanel';
import { ProcessingModal } from '@/components/slideshow/ProcessingModal';
import { CompletionModal } from '@/components/slideshow/CompletionModal';
import type { UploadResponse, VideoGenerationResponse, ProcessProgress } from '@/types/slideshow';

export default function SlideshowPage() {
  const images = useSlideshowStore((state) => state.images);
  const config = useSlideshowStore((state) => state.config);
  const sessionId = useSlideshowStore((state) => state.sessionId);
  const status = useSlideshowStore((state) => state.status);
  const videoId = useSlideshowStore((state) => state.videoId);

  const setSessionId = useSlideshowStore((state) => state.setSessionId);
  const setStatus = useSlideshowStore((state) => state.setStatus);
  const setProgress = useSlideshowStore((state) => state.setProgress);
  const setVideoId = useSlideshowStore((state) => state.setVideoId);
  const setError = useSlideshowStore((state) => state.setError);
  const reset = useSlideshowStore((state) => state.reset);

  const [isGenerating, setIsGenerating] = useState(false);

  // 進捗をポーリング
  useEffect(() => {
    if (!videoId || status !== 'processing') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/slideshow/progress/${videoId}`);
        const data: ProcessProgress = await response.json();

        setProgress(data.progress, data.message);

        if (data.status === 'completed') {
          setStatus('completed');
          clearInterval(interval);
        } else if (data.status === 'error') {
          setError(data.message);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoId, status, setProgress, setStatus, setError]);

  const handleGenerate = async () => {
    if (images.length < 2) {
      alert('画像を2枚以上選択してください');
      return;
    }

    setIsGenerating(true);
    setStatus('uploading');

    try {
      // 1. 画像をアップロード
      const formData = new FormData();
      images.forEach((img) => {
        formData.append('images', img.file);
      });

      const uploadResponse = await fetch('/api/slideshow/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData: UploadResponse = await uploadResponse.json();

      if (!uploadData.success || !uploadData.sessionId || !uploadData.uploadedImages) {
        throw new Error(uploadData.error || 'アップロードに失敗しました');
      }

      setSessionId(uploadData.sessionId);

      // 2. 動画生成をリクエスト
      setStatus('processing');
      setProgress(0, '動画生成を開始しています...');

      const generateResponse = await fetch('/api/slideshow/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: uploadData.sessionId,
          images: uploadData.uploadedImages.map((img, index) => ({
            id: img.id,
            path: img.path,
            order: index,
          })),
          config,
        }),
      });

      const generateData: VideoGenerationResponse = await generateResponse.json();

      if (!generateData.success || !generateData.videoId) {
        throw new Error(generateData.error || '動画生成に失敗しました');
      }

      setVideoId(generateData.videoId);
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : '動画生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewSlideshow = () => {
    reset();
  };

  const handleCloseModal = () => {
    setStatus('idle');
  };

  const canGenerate = images.length >= 2 && !isGenerating && status === 'idle';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            画像スライドショー動画生成
          </h1>
          <p className="text-gray-600">
            複数の画像をアップロードして、自動的にスライドショー動画を作成します
          </p>
        </div>

        {/* アップロードエリア */}
        <ImageUploader />

        {/* 画像ギャラリー */}
        <ImageGallery />

        {/* 設定パネル */}
        {images.length >= 2 && <SettingsPanel />}

        {/* 生成ボタン */}
        {images.length >= 2 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`
                px-8 py-4 text-lg font-semibold rounded-lg transition-colors
                ${
                  canGenerate
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? '処理中...' : '動画を生成'}
            </button>
          </div>
        )}

        {/* エラー表示 */}
        {status === 'error' && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">エラーが発生しました</p>
            <p className="text-red-700 text-sm mt-1">
              {useSlideshowStore.getState().error}
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* モーダル */}
      <ProcessingModal />
      <CompletionModal onClose={handleCloseModal} onNewSlideshow={handleNewSlideshow} />
    </div>
  );
}
