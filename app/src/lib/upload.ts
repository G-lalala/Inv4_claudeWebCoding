import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = '/tmp/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export interface UploadedFileInfo {
  id: string;
  path: string;
  name: string;
  size: number;
}

/**
 * セッションIDを生成
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * ファイルをアップロード
 */
export async function uploadFiles(
  files: File[],
  sessionId: string
): Promise<UploadedFileInfo[]> {
  // セッションディレクトリを作成
  const sessionDir = join(UPLOAD_DIR, sessionId);
  await mkdir(sessionDir, { recursive: true });

  const uploadedFiles: UploadedFileInfo[] = [];

  for (const file of files) {
    // ファイル検証
    validateFile(file);

    // ファイルIDを生成
    const fileId = randomUUID();
    const ext = getFileExtension(file.name);
    const fileName = `${fileId}${ext}`;
    const filePath = join(sessionDir, fileName);

    // ファイルを保存
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    uploadedFiles.push({
      id: fileId,
      path: filePath,
      name: file.name,
      size: file.size,
    });
  }

  return uploadedFiles;
}

/**
 * ファイルを検証
 */
function validateFile(file: File): void {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`ファイルサイズが大きすぎます（最大10MB）: ${file.name}`);
  }

  // MIMEタイプチェック
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`対応していないファイル形式です: ${file.name}`);
  }

  // 拡張子チェック
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`対応していないファイル拡張子です: ${file.name}`);
  }
}

/**
 * ファイル拡張子を取得
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * ファイル名をサニタイズ（パストラバーサル対策）
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
