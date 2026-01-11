'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSlideshowStore } from '@/store/slideshowStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

export function ImageUploader() {
  const addImages = useSlideshowStore((state) => state.addImages);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        addImages(acceptedFiles);
      }
    },
    [addImages]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p className="font-semibold">ファイルをドロップしてください</p>
            ) : (
              <>
                <p className="font-semibold">
                  ドラッグ&ドロップまたはクリックして画像を選択
                </p>
                <p className="mt-2">JPEG, PNG, GIF, WebP (最大10MB/枚)</p>
                <p className="mt-1">2〜100枚まで</p>
              </>
            )}
          </div>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-800 mb-2">
            以下のファイルはアップロードできませんでした:
          </p>
          <ul className="text-sm text-red-700 space-y-1">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                {file.name} -{' '}
                {errors.map((e) => {
                  if (e.code === 'file-too-large') {
                    return 'ファイルサイズが大きすぎます（最大10MB）';
                  }
                  if (e.code === 'file-invalid-type') {
                    return '対応していないファイル形式です';
                  }
                  return e.message;
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
