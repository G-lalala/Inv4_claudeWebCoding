import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { VideoGenerator } from '@/lib/ffmpeg/generator';
import { videoProcessingQueue } from '@/lib/queue';
import { rateLimiter, getClientIp } from '@/lib/rateLimit';
import type { VideoGenerationRequest, VideoGenerationResponse } from '@/types/slideshow';

const VIDEO_DIR = '/tmp/videos';
const TIMEOUT_MS = 5 * 60 * 1000; // 5分

// 進捗状況を保存するためのメモリストア
const progressStore = new Map<string, { progress: number; message: string }>();

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const ip = getClientIp(request);
    const rateLimit = rateLimiter.check(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json<VideoGenerationResponse>(
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

    const body: VideoGenerationRequest = await request.json();

    // リクエストパラメータの検証
    if (!body.sessionId || !body.images || body.images.length < 2) {
      return NextResponse.json<VideoGenerationResponse>(
        {
          success: false,
          error: '無効なリクエストです',
        },
        { status: 400 }
      );
    }

    // 動画IDを生成
    const videoId = randomUUID();

    // 動画ディレクトリを作成
    await mkdir(VIDEO_DIR, { recursive: true });

    // 出力パスを設定
    const outputPath = join(VIDEO_DIR, `${videoId}.mp4`);
    const tempDir = join('/tmp/uploads', body.sessionId);

    // 初期進捗を設定
    progressStore.set(videoId, { progress: 0, message: 'キューに追加されました' });

    // キューに処理を追加（非同期）
    videoProcessingQueue
      .add(videoId, async () => {
        const generator = new VideoGenerator(outputPath, tempDir);

        // タイムアウト処理
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('処理時間が上限を超えました'));
          }, TIMEOUT_MS);
        });

        // 動画生成処理
        const generatePromise = generator.generate(
          body.images,
          body.config,
          (progress, message) => {
            progressStore.set(videoId, { progress, message });
          }
        );

        // タイムアウトまたは生成完了を待つ
        await Promise.race([generatePromise, timeoutPromise]);

        // 進捗を完了に設定
        progressStore.set(videoId, { progress: 100, message: '完了' });
      })
      .catch((error) => {
        console.error(`Video generation error for ${videoId}:`, error);
        progressStore.set(videoId, {
          progress: -1,
          message: error instanceof Error ? error.message : '動画生成中にエラーが発生しました',
        });
      });

    // すぐにvideoIdを返す（処理は非同期で継続）
    return NextResponse.json<VideoGenerationResponse>({
      success: true,
      videoId,
      message: '動画生成を開始しました',
    });
  } catch (error) {
    console.error('Generate API error:', error);

    return NextResponse.json<VideoGenerationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '動画生成中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

export { progressStore };
