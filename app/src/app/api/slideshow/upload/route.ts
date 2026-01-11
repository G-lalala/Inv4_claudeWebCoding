import { NextRequest, NextResponse } from 'next/server';
import { uploadFiles, generateSessionId } from '@/lib/upload';
import { rateLimiter, getClientIp } from '@/lib/rateLimit';
import type { UploadResponse } from '@/types/slideshow';

const MAX_IMAGES = 100;
const MIN_IMAGES = 2;

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const ip = getClientIp(request);
    const rateLimit = rateLimiter.check(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: 'リクエスト制限を超えました。しばらく待ってから再試行してください。',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    // 画像枚数チェック
    if (files.length < MIN_IMAGES) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: `画像を${MIN_IMAGES}枚以上選択してください`,
        },
        { status: 400 }
      );
    }

    if (files.length > MAX_IMAGES) {
      return NextResponse.json<UploadResponse>(
        {
          success: false,
          error: `画像は最大${MAX_IMAGES}枚までです`,
        },
        { status: 400 }
      );
    }

    // セッションIDを生成
    const sessionId = generateSessionId();

    // ファイルをアップロード
    const uploadedImages = await uploadFiles(files, sessionId);

    return NextResponse.json<UploadResponse>(
      {
        success: true,
        sessionId,
        uploadedImages,
      },
      {
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json<UploadResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'アップロード中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
