# LocalStack セットアップガイド

## 概要
このドキュメントは、開発環境でAWS S3をモックするためのLocalStackのセットアップ手順と考慮事項をまとめたものです。

## 前提条件
- Docker Desktop（または Docker Engine + Docker Compose）がインストール済み
- ホストマシンのポート4566が空いている

## セットアップ手順

### 1. LocalStackの起動

```bash
# プロジェクトルートから実行
docker-compose up -d localstack
```

### 2. LocalStackの動作確認

```bash
# ヘルスチェック
curl http://localhost:4566/_localstack/health

# S3バケットの確認
docker-compose exec app sh -c "aws --endpoint-url=http://localstack:4566 s3 ls"
```

期待される出力:
```
2026-01-07 12:34:56 slideshow-uploads
```

### 3. アプリケーションからの接続確認

アプリケーションコンテナ内から以下の環境変数が設定されています:
```
AWS_ENDPOINT_URL=http://localstack:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

## ディレクトリ構成

```
localstack/
├── init/                      # 初期化スクリプト
│   ├── setup-s3.sh           # S3セットアップスクリプト
│   ├── cors-config.json      # CORS設定
│   └── lifecycle-config.json # ライフサイクルルール
├── data/                      # LocalStackデータ（.gitignore対象）
└── .gitignore
```

## 初期化スクリプト

### setup-s3.sh
LocalStackコンテナ起動時に自動実行され、以下を設定:
1. `slideshow-uploads` バケットの作成
2. CORS設定の適用
3. ライフサイクルルール設定（24時間後に自動削除）

### CORS設定（cors-config.json）
- **許可オリジン**: `http://localhost:3000`
- **許可メソッド**: GET, PUT, POST, DELETE, HEAD
- **許可ヘッダー**: すべて（*）
- **公開ヘッダー**: ETag
- **キャッシュ時間**: 3000秒

### ライフサイクルルール（lifecycle-config.json）
- **ルールID**: DeleteAfter24Hours
- **有効期限**: 1日（24時間）
- **対象**: バケット内の全オブジェクト

## 実行時の考慮事項

### 1. Docker Socketのマウント

**設定内容**:
```yaml
volumes:
  - "/var/run/docker.sock:/var/run/docker.sock"
```

**考慮事項**:
- LocalStackが一部のサービス（Lambda等）でDockerを使用するため必要
- S3のみの使用では不要だが、将来的な拡張を考慮して設定
- **セキュリティリスク**: Docker socketへのアクセスはコンテナにホストの制御権を与える
  - 開発環境のみで使用し、本番環境では絶対に使用しない
  - 信頼できないコンテナイメージでは使用しない

**Windowsの場合**:
```yaml
volumes:
  - "//var/run/docker.sock:/var/run/docker.sock"  # スラッシュを2つに
```

**Macの場合**:
```yaml
volumes:
  - "/var/run/docker.sock:/var/run/docker.sock"  # 変更不要
```

### 2. ポートバインディング

**設定内容**:
```yaml
ports:
  - "4566:4566"            # LocalStack Gateway
  - "4510-4559:4510-4559"  # 外部サービス用ポート範囲
```

**考慮事項**:
- **4566**: LocalStackのメインゲートウェイ（必須）
- **4510-4559**: 将来的なサービス拡張用（オプション）
- ホストマシンでこれらのポートが使用されていないことを確認
- ポート競合時は`.env`ファイルで変更可能

### 3. データ永続化

**設定内容**:
```yaml
volumes:
  - "./localstack/data:/var/lib/localstack"
```

**考慮事項**:
- LocalStackのデータはコンテナ再起動後も保持される
- `.gitignore`に追加済み（一時データのため）
- 完全なクリーンスタートが必要な場合:
  ```bash
  rm -rf localstack/data/*
  docker-compose restart localstack
  ```

### 4. メモリ使用量

**考慮事項**:
- LocalStackは軽量だが、複数サービスを使用する場合はメモリを消費
- 推奨メモリ: 最低512MB、推奨1GB
- Docker Desktopのリソース設定で調整可能

### 5. ヘルスチェック

**設定内容**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**考慮事項**:
- LocalStackの起動完了を待ってからアプリケーションが接続
- `depends_on`だけでは不十分（起動順序のみ保証）
- ヘルスチェックで実際のサービス可用性を確認

### 6. 環境変数

**アプリケーション側の設定**:
```yaml
environment:
  - AWS_ENDPOINT_URL=http://localstack:4566
  - AWS_REGION=us-east-1
  - AWS_ACCESS_KEY_ID=test
  - AWS_SECRET_ACCESS_KEY=test
```

**考慮事項**:
- LocalStackは認証をバイパス（test/testで動作）
- 本番環境では実際のAWS認証情報を使用
- `AWS_ENDPOINT_URL`の有無で本番/開発を切り替え可能

## トラブルシューティング

### LocalStackが起動しない

**確認事項**:
1. Dockerが起動しているか
   ```bash
   docker ps
   ```
2. ポート4566が使用されていないか
   ```bash
   lsof -i :4566  # Mac/Linux
   netstat -ano | findstr :4566  # Windows
   ```
3. LocalStackのログを確認
   ```bash
   docker-compose logs localstack
   ```

### S3バケットが作成されない

**確認事項**:
1. 初期化スクリプトが実行されたか
   ```bash
   docker-compose logs localstack | grep "初期化"
   ```
2. 手動でバケット作成
   ```bash
   docker-compose exec app sh -c "aws --endpoint-url=http://localstack:4566 s3 mb s3://slideshow-uploads"
   ```

### アプリケーションから接続できない

**確認事項**:
1. 環境変数が正しく設定されているか
   ```bash
   docker-compose exec app env | grep AWS
   ```
2. LocalStackが正常に動作しているか
   ```bash
   curl http://localhost:4566/_localstack/health
   ```
3. ネットワーク接続を確認
   ```bash
   docker-compose exec app ping localstack
   ```

### Windows特有の問題

**Docker Socketのパス**:
- Git Bashを使用している場合、パスが正しく解釈されない場合がある
- PowerShellまたはCMDから実行を推奨

**改行コードの問題**:
- `.sh`スクリプトがCRLFになっている場合、実行エラーが発生
- `.gitattributes`で管理:
  ```
  *.sh text eol=lf
  ```

## パフォーマンス最適化

### 1. 不要なサービスを無効化
```yaml
environment:
  - SERVICES=s3  # S3のみ有効化
```

### 2. DEBUG無効化（本番に近い環境）
```yaml
environment:
  - DEBUG=0
```

### 3. データディレクトリのクリーンアップ
定期的に古いデータを削除:
```bash
docker-compose down localstack
rm -rf localstack/data/*
docker-compose up -d localstack
```

## 本番環境への移行

### AWS S3への切り替え

1. **環境変数の調整**:
   ```yaml
   # docker-compose.production.yml
   environment:
     # AWS_ENDPOINT_URL を削除（実際のS3を使用）
     - AWS_REGION=ap-northeast-1  # 本番リージョン
     # AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY は IAM Role を使用
   ```

2. **IAM Roleの設定**:
   - EC2/ECS/Fargate等でIAM Roleを使用
   - アクセスキーのハードコードは避ける

3. **S3バケットの作成**:
   - Terraformまたは手動で本番バケットを作成
   - バケット名は `slideshow-uploads-prod` 等に変更

4. **環境判定ロジック**:
   ```typescript
   const s3Config = process.env.AWS_ENDPOINT_URL
     ? { endpoint: process.env.AWS_ENDPOINT_URL } // LocalStack
     : {};  // 本番AWS S3

   const s3Client = new S3Client({
     region: process.env.AWS_REGION,
     ...s3Config
   });
   ```

## まとめ

### LocalStackを使用するメリット
- ✅ AWS S3と同等の機能を開発環境で使用可能
- ✅ インターネット接続不要
- ✅ AWSコスト削減
- ✅ 高速なテスト実行

### 注意点
- ⚠️ 完全な互換性ではない（一部機能に差異あり）
- ⚠️ Docker Socketのマウントはセキュリティリスク
- ⚠️ 本番環境では絶対に使用しない

### 推奨事項
- 📝 定期的にデータディレクトリをクリーンアップ
- 📝 本番環境との環境変数の違いを明確化
- 📝 CI/CDでもLocalStackを使用してテスト

---

**作成日**: 2026-01-07
**最終更新**: 2026-01-07
**対象バージョン**: LocalStack latest
