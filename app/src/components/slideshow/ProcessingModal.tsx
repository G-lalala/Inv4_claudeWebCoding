'use client';

import { useSlideshowStore } from '@/store/slideshowStore';

export function ProcessingModal() {
  const status = useSlideshowStore((state) => state.status);
  const progress = useSlideshowStore((state) => state.progress);
  const progressMessage = useSlideshowStore((state) => state.progressMessage);

  if (status !== 'processing') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>

          <h3 className="text-xl font-semibold mb-2">動画を生成中</h3>
          <p className="text-gray-600 mb-6">{progressMessage}</p>

          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">{progress}%</p>

          <p className="mt-6 text-xs text-gray-500">
            このウィンドウを閉じないでください
          </p>
        </div>
      </div>
    </div>
  );
}
