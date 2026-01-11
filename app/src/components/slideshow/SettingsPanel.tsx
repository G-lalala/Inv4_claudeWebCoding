'use client';

import { useSlideshowStore } from '@/store/slideshowStore';
import type { TransitionType, FitMode, Resolution } from '@/types/slideshow';

export function SettingsPanel() {
  const config = useSlideshowStore((state) => state.config);
  const updateConfig = useSlideshowStore((state) => state.updateConfig);

  return (
    <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-6">スライドショー設定</h2>

      <div className="space-y-6">
        {/* 表示時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            各画像の表示時間: {config.displayDuration}秒
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={config.displayDuration}
            onChange={(e) =>
              updateConfig({ displayDuration: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1秒</span>
            <span>10秒</span>
          </div>
        </div>

        {/* トランジション効果 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            トランジション効果
          </label>
          <select
            value={config.transitionType}
            onChange={(e) =>
              updateConfig({ transitionType: e.target.value as TransitionType })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="fade">フェード</option>
            <option value="slide-left">スライド（左→右）</option>
            <option value="slide-right">スライド（右→左）</option>
            <option value="slide-up">スライド（上→下）</option>
            <option value="slide-down">スライド（下→上）</option>
            <option value="zoom-in">ズームイン</option>
            <option value="zoom-out">ズームアウト</option>
            <option value="none">なし</option>
          </select>
        </div>

        {/* トランジション時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            トランジション時間: {config.transitionDuration}秒
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={config.transitionDuration}
            onChange={(e) =>
              updateConfig({ transitionDuration: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5秒</span>
            <span>3秒</span>
          </div>
        </div>

        {/* 解像度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            動画解像度
          </label>
          <div className="space-y-2">
            {[
              { value: '1920x1080', label: 'Full HD (1920x1080)' },
              { value: '1280x720', label: 'HD (1280x720)' },
              { value: '640x480', label: 'SD (640x480)' },
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  value={option.value}
                  checked={config.resolution === option.value}
                  onChange={(e) =>
                    updateConfig({ resolution: e.target.value as Resolution })
                  }
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 画像フィット方法 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            画像のフィット方法
          </label>
          <div className="space-y-2">
            {[
              { value: 'cover', label: 'カバー（画像をトリミング）' },
              { value: 'contain', label: 'コンテイン（余白あり）' },
              { value: 'stretch', label: 'ストレッチ（引き伸ばし）' },
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  value={option.value}
                  checked={config.fitMode === option.value}
                  onChange={(e) =>
                    updateConfig({ fitMode: e.target.value as FitMode })
                  }
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 背景色 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            背景色（コンテインモード時）
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
              className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={config.backgroundColor}
              onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
