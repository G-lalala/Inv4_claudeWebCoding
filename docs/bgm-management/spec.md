# BGM選定編集機能 仕様書

## 概要
スライドショー動画の長さに応じて、最適なBGMを自動的に選択し、動画の尺に合わせて調整（フェードアウト）する機能。

## 前提条件
- BGM素材（5曲）は事前にユーザーによって準備・配置済み
- BGMファイルは `app/assets/bgm/` に配置
- メタデータファイル `app/data/bgmMetadata.json` が作成済み

## 要件

### BGM自動選択ロジック

#### 選択基準
- **入力**: 動画の長さ（秒）= 画像枚数 × 表示時間（3〜5秒）
- **選択方法**: メタデータから動画の長さに最も近い長さのBGMを選択
- **選択例**:
  - 動画45秒 → duration=60のBGM
  - 動画90秒 → duration=90-120のBGM
  - 動画150秒 → duration=150-180のBGM

#### フォールバック
- 動画がすべてのBGMより長い場合: 最長のBGMを選択
  - Phase 1: フェードアウトで終了
  - Phase 2: ループ再生（将来対応）

### BGM編集処理

#### 動画尺とBGMの長さの関係

**ケース1: BGM > 動画**
- BGMが動画より長い場合
- 処理: 動画の長さに合わせてBGMをカット + フェードアウト
- フェードアウト: 最後の2〜3秒でフェードアウト

**ケース2: BGM ≒ 動画**
- ほぼ同じ長さ（±5秒程度）
- 処理: そのまま使用

**ケース3: BGM < 動画**（Phase 2対応）
- BGMが動画より短い場合
- Phase 1: BGMの長さで動画を終了（フェードアウト）
- Phase 2: BGMをループまたは別のBGMに切り替え

#### フェードアウト仕様
- **開始タイミング**: 動画終了の2〜3秒前
- **フェード時間**: 3秒
- **フェード曲線**: リニア（線形）
- **最終音量**: 0（無音）

## 技術仕様

### BGMメタデータ
- **ファイルパス**: `app/data/bgmMetadata.json`
- **スキーマ**:
```typescript
interface BGMMetadata {
  id: string;           // BGMの一意識別子
  filename: string;     // ファイル名（app/assets/bgm/配下）
  duration: number;     // 長さ（秒）
  title: string;        // 曲名
  mood: string;         // 雰囲気（calm, gentle等）
}
```
- **例**:
```json
[
  {
    "id": "bgm_01",
    "filename": "bgm_01_short.mp3",
    "duration": 60,
    "title": "Gentle Piano",
    "mood": "calm"
  }
]
```

### 実装ファイル
- `app/lib/bgmSelector.ts`: BGM選択ロジック
- `app/lib/audioProcessor.ts`: 音声処理（カット、フェードアウト）
- `app/data/bgmMetadata.json`: BGMメタデータ

### FFmpeg による音声処理

#### BGMカット + フェードアウト
```bash
ffmpeg -i bgm.mp3 -t 45 -af "afade=t=out:st=42:d=3" output.mp3
```
- `-t 45`: 45秒でカット
- `afade=t=out:st=42:d=3`: 42秒からフェードアウト開始、3秒かけてフェード

#### 動画とBGMの結合
```bash
ffmpeg -i video.mp4 -i bgm.mp3 -c:v copy -c:a aac -shortest output.mp4
```
- `-shortest`: 短い方の長さに合わせる
- `-c:a aac`: 音声をAACでエンコード

## エラーハンドリング

### 想定エラー
- BGMファイルが存在しない
- BGMファイルが破損している
- FFmpeg音声処理失敗

### 対応
- ファイル存在チェック: 起動時に全BGMの存在を確認
- 破損チェック: FFmpegでプローブして検証
- 処理失敗: デフォルトBGMを使用、またはBGMなしで動画生成

## パフォーマンス
- BGM処理は軽量（数秒で完了）
- 動画生成と並列化可能な部分は並列処理

## 制約事項
- ユーザーによるBGM選択機能はPhase 1では非対応
- BGM素材の準備はユーザー側の責任（実装範囲外）

## セキュリティ
- ファイルパスのサニタイズ（パストラバーサル対策）
- メタデータの検証（存在しないファイルへのアクセス防止）

---

**作成日**: 2026-01-07
**機能優先度**: High
**依存機能**: slideshow-generation
