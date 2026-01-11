import { NextRequest, NextResponse } from 'next/server';
import { stat, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';

const VIDEO_DIR = '/tmp/videos';

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

    // ビデオIDのサニタイズ（パストラバーサル対策）
    const sanitizedVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    const videoPath = join(VIDEO_DIR, `${sanitizedVideoId}.mp4`);

    // ファイルの存在確認
    try {
      await stat(videoPath);
    } catch {
      return NextResponse.json(
        { error: '動画ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // ファイルをストリーミング
    const stream = createReadStream(videoPath);
    const readableStream = new ReadableStream({
      async start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        stream.on('end', async () => {
          controller.close();

          // ストリーミング完了後、ファイルを削除
          try {
            await unlink(videoPath);
            console.log(`Deleted video file: ${videoPath}`);
          } catch (error) {
            console.error(`Failed to delete video file: ${videoPath}`, error);
          }
        });

        stream.on('error', (error) => {
          console.error('Stream error:', error);
          controller.error(error);
        });
      },
    });

    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="slideshow_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4"`);

    return new NextResponse(readableStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download API error:', error);

    return NextResponse.json(
      { error: 'ダウンロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
