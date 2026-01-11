import { NextRequest, NextResponse } from 'next/server';
import { progressStore } from '../../generate/route';
import type { ProcessProgress } from '@/types/slideshow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: '動画IDが指定されていません' },
        { status: 400 }
      );
    }

    // 進捗状況を取得
    const progress = progressStore.get(videoId);

    if (!progress) {
      // 進捗情報が見つからない場合はデフォルト値を返す（処理開始直後の可能性）
      const response: ProcessProgress = {
        status: 'processing',
        progress: 0,
        message: '処理を開始しています...',
      };
      return NextResponse.json(response);
    }

    const response: ProcessProgress = {
      status: progress.progress === -1 ? 'error' : progress.progress === 100 ? 'completed' : 'processing',
      progress: progress.progress === -1 ? 0 : progress.progress,
      message: progress.message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Progress API error:', error);

    return NextResponse.json(
      { error: '進捗状況の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
