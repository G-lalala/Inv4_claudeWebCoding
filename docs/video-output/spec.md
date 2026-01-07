# 動画出力機能 仕様書

## 概要
生成されたスライドショー動画をMP4形式でエンコードし、ユーザーに自動ダウンロードさせる機能。ダウンロード完了後、サーバー上の一時ファイルを即座に削除する。

## 要件

### 動画フォーマット

#### 基本仕様
- **コンテナ**: MP4
- **映像コーデック**: H.264（libx264）
- **音声コーデック**: AAC
- **解像度**: 1920×1080（Full HD）
- **アスペクト比**: 16:9
- **フレームレート**: 30fps

#### エンコード設定
- **プリセット**: medium（品質と速度のバランス）
- **CRF（品質）**: 23（標準的な品質）
- **ピクセルフォーマット**: yuv420p（互換性重視）
- **音声ビットレート**: 192kbps（高音質）

### ダウンロード機能

#### 自動ダウンロード
- **動作**: 動画生成完了後、自動的にダウンロード開始
- **方法**: ブラウザのダウンロード機能を使用
- **実装**: `<a>` タグの `download` 属性 または Blob URL

#### ファイル名
- **形式**: `slideshow_YYYYMMDD_HHMMSS.mp4`
- **例**: `slideshow_20260107_143025.mp4`
- **タイムスタンプ**: 動画生成完了時刻

### ファイル管理

#### 一時ファイル保存
- **保存先**: `/tmp/videos/{session-id}/`
- **ファイル名**: `output.mp4`
- **権限**: 読み取り専用（644）

#### 削除タイミング
- **トリガー**: ダウンロード完了後
- **方法**:
  - フロントエンド: ダウンロード開始後、数秒待ってからAPIを呼び出し
  - バックエンド: 削除APIを受け取り、ファイルとディレクトリを削除
- **クリーンアップ**: 定期的なクリーンアップジョブで古いファイルも削除（24時間以上経過）

## 技術仕様

### API エンドポイント

#### 1. 動画ダウンロードAPI
- **エンドポイント**: `GET /api/download/{session-id}`
- **処理**:
  1. セッションIDの検証
  2. 動画ファイルの存在確認
  3. ファイルをストリーミング配信
  4. レスポンスヘッダーに `Content-Disposition: attachment` を設定
- **レスポンス**: 動画ファイル（application/octet-stream）

#### 2. ファイル削除API
- **エンドポイント**: `DELETE /api/cleanup/{session-id}`
- **処理**:
  1. セッションIDの検証
  2. 動画ファイルの削除
  3. 一時ディレクトリの削除
  4. 画像ファイルも削除（/tmp/uploads/{session-id}/）
- **レスポンス**: `{ success: true }`

### FFmpeg エンコード設定

```bash
ffmpeg -i input_with_bgm.mp4 \
       -c:v libx264 \
       -preset medium \
       -crf 23 \
       -pix_fmt yuv420p \
       -c:a aac \
       -b:a 192k \
       -movflags +faststart \
       output.mp4
```

- `-movflags +faststart`: ストリーミング再生に最適化（メタデータを先頭に配置）

### 実装ファイル
- `app/api/download/[sessionId]/route.ts`: ダウンロードAPI
- `app/api/cleanup/[sessionId]/route.ts`: 削除API
- `app/lib/fileManager.ts`: ファイル管理ユーティリティ
- `app/lib/videoEncoder.ts`: 動画エンコードロジック

### フロントエンド実装

#### ダウンロードトリガー
```typescript
// 動画生成完了後
const response = await fetch(`/api/download/${sessionId}`);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `slideshow_${timestamp}.mp4`;
a.click();
URL.revokeObjectURL(url);

// 数秒後にクリーンアップ
setTimeout(async () => {
  await fetch(`/api/cleanup/${sessionId}`, { method: 'DELETE' });
}, 5000);
```

## エラーハンドリング

### 想定エラー
- ファイルが存在しない（404）
- ファイル読み取り失敗（500）
- ディスク容量不足（507）
- 削除失敗（500）

### 対応
- 404エラー: ユーザーに「ファイルが見つかりません」と表示
- 500エラー: リトライを促すメッセージ
- 507エラー: サービス一時停止のメッセージ
- 削除失敗: ログに記録、クリーンアップジョブで後処理

## パフォーマンス

### エンコード時間
- 1分の動画: 約5〜10秒
- 2分の動画: 約10〜20秒
- 3分の動画: 約15〜30秒

### ダウンロード速度
- ファイルサイズ: 約10〜50MB（動画の長さによる）
- ストリーミング配信で大きなファイルも対応

## セキュリティ

### アクセス制御
- セッションIDの検証（UUIDv4形式チェック）
- パストラバーサル攻撃対策（`../` などの除去）
- ファイル名のサニタイズ

### データ保護
- 一時ファイルの適切な権限設定
- ダウンロード後の即時削除でプライバシー保護
- クリーンアップジョブで漏れがないよう徹底

## 制約事項
- ダウンロード中に接続が切れた場合、再ダウンロードが必要
- ブラウザによってダウンロードの挙動が異なる可能性
- 大きなファイル（100MB以上）は時間がかかる

## クリーンアップジョブ

### 定期実行
- **頻度**: 1時間ごと
- **処理**: `/tmp/uploads/` と `/tmp/videos/` 配下の24時間以上経過したディレクトリを削除
- **実装**: cron または Node.js の `node-cron`

---

**作成日**: 2026-01-07
**機能優先度**: High
**依存機能**: slideshow-generation, bgm-management
