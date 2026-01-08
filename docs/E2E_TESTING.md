# E2Eテストセットアップガイド

## 概要
このドキュメントは、Playwrightを使用したフロントエンドE2Eテストのセットアップと実行方法を説明します。LocalStackありなしの両方の環境に対応しています。

## テスト戦略

### 2つのテストモード

#### 1. 高速モード（MSWモック）
- **用途**: 開発中の頻繁なテスト実行
- **特徴**: LocalStack不要、高速実行
- **実行時間**: 数秒
- **対象**: UIの動作、基本的なフロー

#### 2. フルモード（LocalStack使用）
- **用途**: CI/CD、リリース前の重要なテスト
- **特徴**: 本番環境に近い、S3互換環境
- **実行時間**: 数十秒
- **対象**: 実際のS3連携、エンドツーエンドのフロー

## セットアップ

### 1. 依存パッケージのインストール

```bash
# Playwright本体
npm install -D @playwright/test

# ブラウザのインストール
npx playwright install

# MSW（モック用）
npm install -D msw@latest

# テストユーティリティ
npm install -D @faker-js/faker
```

### 2. package.json にスクリプト追加

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:fast": "USE_MOCK=true playwright test",
    "test:e2e:full": "USE_LOCALSTACK=true playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

## ディレクトリ構成

```
tests/
├── e2e/
│   ├── upload.spec.ts              # 画像アップロードテスト
│   ├── slideshow.spec.ts           # スライドショー生成テスト
│   ├── download.spec.ts            # 動画ダウンロードテスト
│   └── fixtures/
│       ├── test-image-1.jpg        # テスト用画像
│       ├── test-image-2.jpg
│       └── test-image-3.jpg
├── mocks/
│   ├── handlers.ts                 # MSWハンドラー
│   ├── server.ts                   # MSWサーバー設定
│   └── s3-mock.ts                  # S3モック
├── utils/
│   ├── test-helpers.ts             # テストヘルパー関数
│   └── localstack.ts               # LocalStack起動・停止
├── global-setup.ts                 # グローバルセットアップ
└── global-teardown.ts              # グローバルティアダウン
playwright.config.ts                # Playwright設定
```

## 設定ファイル

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

const USE_MOCK = process.env.USE_MOCK === 'true';
const USE_LOCALSTACK = process.env.USE_LOCALSTACK === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },

  // グローバルセットアップ・ティアダウン
  globalSetup: USE_LOCALSTACK
    ? './tests/global-setup-localstack.ts'
    : USE_MOCK
      ? './tests/global-setup-mock.ts'
      : undefined,
  globalTeardown: USE_LOCALSTACK
    ? './tests/global-teardown.ts'
    : undefined,

  // Webサーバー自動起動
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

## テスト実行方法

### 高速モード（MSWモック）

```bash
# デフォルト（モック使用）
npm run test:e2e:fast

# 特定のテストのみ
npm run test:e2e:fast -- upload.spec.ts

# ヘッドレスモードオフ（ブラウザ表示）- ユーザー環境のみ
npm run test:e2e:headed
```

### フルモード（LocalStack使用）

```bash
# LocalStackを自動起動してテスト
npm run test:e2e:full

# または手動でLocalStackを起動してからテスト
docker-compose up -d localstack
npm run test:e2e
```

### CI/CD環境

```bash
# CI環境では自動的にLocalStackを起動・停止
USE_LOCALSTACK=true npm run test:e2e
```

## グローバルセットアップ

### global-setup-localstack.ts（LocalStack使用）

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Starting LocalStack...');

  try {
    // LocalStackを起動
    await execAsync('docker-compose up -d localstack');

    // LocalStackの起動を待機
    await waitForLocalStack();

    // S3バケットの確認
    await verifyS3Bucket();

    console.log('✅ LocalStack is ready!');
  } catch (error) {
    console.error('❌ LocalStack setup failed:', error);
    throw error;
  }
}

async function waitForLocalStack(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:4566/_localstack/health');
      if (response.ok) {
        const health = await response.json();
        if (health.services?.s3 === 'available') {
          return;
        }
      }
    } catch (e) {
      // まだ起動していない
    }

    console.log(`⏳ Waiting for LocalStack... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('LocalStack failed to start within 30 seconds');
}

async function verifyS3Bucket(): Promise<void> {
  try {
    const { stdout } = await execAsync(
      'docker-compose exec -T app sh -c "aws --endpoint-url=http://localstack:4566 s3 ls"'
    );

    if (!stdout.includes('slideshow-uploads')) {
      throw new Error('S3 bucket "slideshow-uploads" not found');
    }

    console.log('✅ S3 bucket verified');
  } catch (error) {
    console.error('❌ S3 bucket verification failed:', error);
    throw error;
  }
}
```

### global-setup-mock.ts（MSW使用）

```typescript
export default async function globalSetup() {
  console.log('🚀 Starting with MSW mocks...');

  // MSWは各テストで個別にセットアップ
  // ここでは何もしない

  console.log('✅ Mock mode enabled');
}
```

### global-teardown.ts

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  if (process.env.USE_LOCALSTACK === 'true') {
    console.log('🛑 Stopping LocalStack...');

    try {
      await execAsync('docker-compose down localstack');
      console.log('✅ LocalStack stopped');
    } catch (error) {
      console.error('❌ Failed to stop LocalStack:', error);
    }
  }
}
```

## MSWモック設定

### tests/mocks/handlers.ts

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // 署名付きURL生成API
  http.post('http://localhost:3000/api/upload/presigned-urls', async ({ request }) => {
    const body = await request.json();
    const { count, fileNames } = body as { count: number; fileNames: string[] };

    return HttpResponse.json({
      sessionId: 'test-session-' + Date.now(),
      uploadUrls: fileNames.map((name, i) => ({
        id: `img-${i}`,
        url: `http://mock-s3.local/upload/${i}`,
        key: `test-session/img-${i}.jpg`,
      })),
    });
  }),

  // S3アップロード（モック）
  http.put('http://mock-s3.local/upload/:id', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // アップロード完了通知
  http.post('http://localhost:3000/api/upload/complete', () => {
    return HttpResponse.json({ success: true });
  }),

  // 動画生成API
  http.post('http://localhost:3000/api/generate', () => {
    return HttpResponse.json({
      sessionId: 'test-session-' + Date.now(),
      status: 'processing',
    });
  }),

  // 動画ダウンロード
  http.get('http://localhost:3000/api/download/:sessionId', () => {
    // モックの動画データ（小さなバイナリ）
    const mockVideo = new Uint8Array([0x00, 0x00, 0x00, 0x20]);
    return new HttpResponse(mockVideo, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="slideshow_test.mp4"',
      },
    });
  }),
];
```

### tests/mocks/server.ts

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## テストケース例

### tests/e2e/upload.spec.ts

```typescript
import { test, expect } from '@playwright/test';
import { server } from '../mocks/server';
import path from 'path';

const USE_MOCK = process.env.USE_MOCK === 'true';

// MSWモックのセットアップ
if (USE_MOCK) {
  test.beforeAll(() => server.listen());
  test.afterEach(() => server.resetHandlers());
  test.afterAll(() => server.close());
}

test.describe('画像アップロード機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正常系: 3枚の画像をアップロードできる', async ({ page }) => {
    // 「画像をアップロード」ボタンをクリック
    await page.click('button:has-text("画像をアップロード")');

    // ファイル選択
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.jpg'),
      path.join(__dirname, '../fixtures/test-image-3.jpg'),
    ]);

    // アップロード処理の待機
    await page.waitForSelector('text=アップロード完了', { timeout: 10000 });

    // 確認画面の表示確認
    await expect(page.locator('text=3枚')).toBeVisible();

    // サムネイルの表示確認
    const thumbnails = page.locator('img[alt*="サムネイル"]');
    await expect(thumbnails).toHaveCount(3);
  });

  test('異常系: 2枚以下の場合エラー', async ({ page }) => {
    await page.click('button:has-text("画像をアップロード")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
    ]);

    // エラーメッセージの表示確認
    await expect(page.locator('text=3枚以上50枚以下')).toBeVisible();
  });

  test('異常系: 51枚以上の場合エラー', async ({ page }) => {
    // テスト用に大量の画像ファイルパスを生成（実際には同じファイルを複数回指定）
    const files = Array(51).fill(path.join(__dirname, '../fixtures/test-image-1.jpg'));

    await page.click('button:has-text("画像をアップロード")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);

    await expect(page.locator('text=50枚以下')).toBeVisible();
  });

  test('画像の並び替えができる', async ({ page }) => {
    // 3枚の画像をアップロード
    await page.click('button:has-text("画像をアップロード")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.jpg'),
      path.join(__dirname, '../fixtures/test-image-3.jpg'),
    ]);

    await page.waitForSelector('text=アップロード完了');

    // 最初の画像のファイル名を記録
    const firstImageName = await page.locator('[data-testid="image-0"]').getAttribute('data-filename');

    // ドラッグ&ドロップで並び替え
    await page.locator('[data-testid="image-0"]').dragTo(page.locator('[data-testid="image-2"]'));

    // 並び替え後の確認
    const newFirstImageName = await page.locator('[data-testid="image-0"]').getAttribute('data-filename');
    expect(newFirstImageName).not.toBe(firstImageName);
  });

  test('個別削除ができる', async ({ page }) => {
    // 3枚の画像をアップロード
    await page.click('button:has-text("画像をアップロード")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.jpg'),
      path.join(__dirname, '../fixtures/test-image-3.jpg'),
    ]);

    await page.waitForSelector('text=アップロード完了');

    // 最初の画像を削除
    await page.locator('[data-testid="delete-image-0"]').click();

    // 枚数が2枚になることを確認
    await expect(page.locator('text=2枚')).toBeVisible();

    const thumbnails = page.locator('img[alt*="サムネイル"]');
    await expect(thumbnails).toHaveCount(2);
  });

  test('圧縮処理のプログレスバーが表示される', async ({ page }) => {
    await page.click('button:has-text("画像をアップロード")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures/test-image-1.jpg'),
      path.join(__dirname, '../fixtures/test-image-2.jpg'),
      path.join(__dirname, '../fixtures/test-image-3.jpg'),
    ]);

    // 圧縮中のプログレスバー表示確認
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // 完了後は非表示
    await page.waitForSelector('text=アップロード完了');
    await expect(page.locator('[role="progressbar"]')).not.toBeVisible();
  });
});
```

## テストヘルパー関数

### tests/utils/test-helpers.ts

```typescript
import { Page } from '@playwright/test';
import path from 'path';

/**
 * 画像をアップロードするヘルパー関数
 */
export async function uploadImages(page: Page, count: number) {
  await page.click('button:has-text("画像をアップロード")');

  const files = Array(count)
    .fill(null)
    .map((_, i) => path.join(__dirname, `../fixtures/test-image-${(i % 3) + 1}.jpg`));

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(files);

  await page.waitForSelector('text=アップロード完了', { timeout: 10000 });
}

/**
 * LocalStackのヘルスチェック
 */
export async function waitForLocalStack(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch('http://localhost:4566/_localstack/health');
      if (response.ok) {
        return;
      }
    } catch (e) {
      // 待機
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('LocalStack not available');
}
```

## CI/CD統合

### GitHub Actions例

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Start LocalStack
        run: docker-compose up -d localstack

      - name: Run E2E tests
        run: USE_LOCALSTACK=true npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Stop LocalStack
        if: always()
        run: docker-compose down
```

## トラブルシューティング

### LocalStackが起動しない
```bash
# ログ確認
docker-compose logs localstack

# 手動起動
docker-compose up localstack

# ヘルスチェック
curl http://localhost:4566/_localstack/health
```

### テストが失敗する
```bash
# デバッグモード（ブラウザ表示）
npm run test:e2e:headed

# UIモード
npm run test:e2e:ui

# トレース確認
npx playwright show-trace trace.zip
```

### スクリーンショット・動画の確認
```bash
# test-results/ ディレクトリを確認
ls -la test-results/

# HTMLレポート
npm run test:e2e:report
```

---

**作成日**: 2026-01-07
**対象**: Playwright E2E Testing
**環境**: Node.js 18+, Docker
