/**
 * レート制限ミドルウェア
 * 1IPあたり1時間に10リクエストまで
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60 * 60 * 1000; // 1時間

  /**
   * リクエストがレート制限内かチェック
   */
  check(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(ip);

    // エントリがない、またはウィンドウが期限切れの場合
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.requests.set(ip, newEntry);

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // レート制限を超えている場合
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // カウントを増やす
    entry.count++;
    this.requests.set(ip, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * 古いエントリをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}

// グローバルインスタンス
export const rateLimiter = new RateLimiter();

// 定期的にクリーンアップ（1時間ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 60 * 60 * 1000);
}

/**
 * IPアドレスを取得
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
