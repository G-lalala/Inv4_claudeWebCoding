import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import type { SlideshowConfig, TransitionType, FitMode } from '@/types/slideshow';

export interface ImageInput {
  path: string;
  order: number;
}

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export class VideoGenerator {
  private outputPath: string;
  private tempDir: string;

  constructor(outputPath: string, tempDir: string) {
    this.outputPath = outputPath;
    this.tempDir = tempDir;
  }

  /**
   * スライドショー動画を生成
   */
  async generate(
    images: ImageInput[],
    config: SlideshowConfig,
    onProgress?: ProgressCallback
  ): Promise<string> {
    try {
      // 画像を順序通りにソート
      const sortedImages = [...images].sort((a, b) => a.order - b.order);

      onProgress?.(0, '動画生成を開始しています...');

      // フィルターコンプレックス文字列を構築
      const filterComplex = this.buildFilterComplex(sortedImages, config);

      // FFmpegコマンドを実行
      await this.executeFFmpeg(sortedImages, config, filterComplex, onProgress);

      onProgress?.(100, '動画生成が完了しました');
      return this.outputPath;
    } catch (error) {
      throw new Error(`動画生成中にエラーが発生しました: ${error}`);
    }
  }

  /**
   * FFmpegコマンドを実行
   */
  private executeFFmpeg(
    images: ImageInput[],
    config: SlideshowConfig,
    filterComplex: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { width, height } = this.parseResolution(config.resolution);

      let command = ffmpeg();

      // 各画像を入力として追加（-loop 1で静止画をループ）
      images.forEach((img) => {
        command = command
          .input(img.path)
          .inputOptions(['-loop', '1', '-t', config.displayDuration.toString()]);
      });

      // BGMがある場合は追加
      if (config.bgm) {
        command = command.input(config.bgm.file.path);
      }

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[outv]',
          ...(config.bgm ? ['-map', `${images.length}:a`] : []),
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          ...(config.bgm ? [
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-filter:a', `volume=${config.bgm.volume / 100}`
          ] : [])
        ])
        .output(this.outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            const percent = Math.min(Math.round(progress.percent), 99);
            onProgress(percent, `動画をエンコード中: ${percent}%`);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg error:', err);
          console.error('FFmpeg stderr:', stderr);
          reject(err);
        })
        .run();
    });
  }

  /**
   * フィルターコンプレックスを構築
   */
  private buildFilterComplex(images: ImageInput[], config: SlideshowConfig): string {
    const { width, height } = this.parseResolution(config.resolution);
    const filters: string[] = [];

    // 各画像のスケーリングとフォーマット変換
    images.forEach((img, index) => {
      const scaleFilter = this.buildScaleFilter(index, width, height, config.fitMode, config.backgroundColor);
      filters.push(scaleFilter);
    });

    // トランジションなしの場合
    if (config.transitionType === 'none') {
      const concatInputs = images.map((_, i) => `[v${i}]`).join('');
      filters.push(`${concatInputs}concat=n=${images.length}:v=1:a=0[outv]`);
      return filters.join(';');
    }

    // トランジションありの場合
    let currentLabel = '[v0]';
    let cumulativeOffset = config.displayDuration - config.transitionDuration;

    for (let i = 0; i < images.length - 1; i++) {
      const nextLabel = `[v${i + 1}]`;
      const outputLabel = i === images.length - 2 ? '[outv]' : `[vt${i}]`;

      const xfadeFilter = this.buildXfadeFilter(
        currentLabel,
        nextLabel,
        outputLabel,
        config.transitionType,
        config.transitionDuration,
        cumulativeOffset
      );

      filters.push(xfadeFilter);
      currentLabel = outputLabel;
      cumulativeOffset += config.displayDuration - config.transitionDuration;
    }

    return filters.join(';');
  }

  /**
   * スケールフィルターを構築
   */
  private buildScaleFilter(
    index: number,
    width: number,
    height: number,
    fitMode: FitMode,
    backgroundColor: string
  ): string {
    const bgColor = backgroundColor.replace('#', '0x');
    let scaleOpts = '';

    switch (fitMode) {
      case 'cover':
        scaleOpts = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
        break;
      case 'contain':
        scaleOpts = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`;
        break;
      case 'stretch':
        scaleOpts = `scale=${width}:${height}`;
        break;
      default:
        scaleOpts = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`;
    }

    return `[${index}:v]${scaleOpts},format=yuv420p,fps=30[v${index}]`;
  }

  /**
   * xfadeフィルターを構築
   */
  private buildXfadeFilter(
    input1: string,
    input2: string,
    output: string,
    transitionType: TransitionType,
    duration: number,
    offset: number
  ): string {
    const transitionName = this.getTransitionName(transitionType);
    return `${input1}${input2}xfade=transition=${transitionName}:duration=${duration}:offset=${offset}${output}`;
  }

  /**
   * トランジションタイプから対応するxfadeのトランジション名を取得
   */
  private getTransitionName(transitionType: TransitionType): string {
    const transitionMap: Record<TransitionType, string> = {
      'fade': 'fade',
      'slide-left': 'slideleft',
      'slide-right': 'slideright',
      'slide-up': 'slideup',
      'slide-down': 'slidedown',
      'zoom-in': 'zoomin',
      'zoom-out': 'fadeblack',
      'none': 'fade'
    };

    return transitionMap[transitionType] || 'fade';
  }

  /**
   * 解像度文字列をパース
   */
  private parseResolution(resolution: string): { width: number; height: number } {
    const [width, height] = resolution.split('x').map(Number);
    return { width, height };
  }

  /**
   * 一時ファイルをクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
