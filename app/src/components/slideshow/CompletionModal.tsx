'use client';

import { useSlideshowStore } from '@/store/slideshowStore';

interface CompletionModalProps {
  onClose: () => void;
  onNewSlideshow: () => void;
}

export function CompletionModal({ onClose, onNewSlideshow }: CompletionModalProps) {
  const status = useSlideshowStore((state) => state.status);
  const videoId = useSlideshowStore((state) => state.videoId);

  if (status !== 'completed' || !videoId) {
    return null;
  }

  const downloadUrl = `/api/slideshow/download/${videoId}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-2xl font-semibold mb-2">動画生成完了!</h3>
          <p className="text-gray-600 mb-6">
            スライドショー動画の生成が完了しました
          </p>

          {/* 動画プレビュー */}
          <div className="mb-6 bg-black rounded-lg overflow-hidden">
            <video
              controls
              className="w-full"
              src={downloadUrl}
            >
              お使いのブラウザは動画タグに対応していません。
            </video>
          </div>

          {/* ボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={downloadUrl}
              download
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              動画をダウンロード
            </a>

            <button
              onClick={onNewSlideshow}
              className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              新しいスライドショーを作成
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
