/**
 * 動画生成処理のキュー管理
 * 最大3件まで同時処理可能
 */

interface QueueItem {
  id: string;
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

class ProcessingQueue {
  private queue: QueueItem[] = [];
  private processing = 0;
  private readonly maxConcurrent = 3;

  /**
   * キューに処理を追加
   */
  async add<T>(id: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        id,
        execute: async () => {
          try {
            const result = await execute();
            resolve(result);
          } catch (error) {
            reject(error as Error);
          }
        },
        resolve: () => resolve(undefined as T),
        reject,
      };

      this.queue.push(item);
      this.processNext();
    });
  }

  /**
   * 次の処理を実行
   */
  private async processNext(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.processing++;

    try {
      await item.execute();
    } finally {
      this.processing--;
      this.processNext();
    }
  }

  /**
   * 現在の処理中の数を取得
   */
  getProcessingCount(): number {
    return this.processing;
  }

  /**
   * キューの長さを取得
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

export const videoProcessingQueue = new ProcessingQueue();
