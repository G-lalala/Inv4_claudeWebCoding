#!/bin/bash

# LocalStack S3 初期化スクリプト
# このスクリプトはLocalStackコンテナ起動時に自動実行されます

echo "LocalStack S3 初期化を開始します..."

# S3バケットを作成
awslocal s3 mb s3://slideshow-uploads

# CORS設定を適用
awslocal s3api put-bucket-cors --bucket slideshow-uploads --cors-configuration file:///etc/localstack/init/ready.d/cors-config.json

# バケットの有効期限ルール設定（24時間後に自動削除）
awslocal s3api put-bucket-lifecycle-configuration --bucket slideshow-uploads --lifecycle-configuration file:///etc/localstack/init/ready.d/lifecycle-config.json

echo "S3バケット 'slideshow-uploads' が作成されました"
echo "CORS設定が適用されました"
echo "ライフサイクルルールが設定されました（24時間後に自動削除）"

# バケット一覧を表示
echo "利用可能なバケット:"
awslocal s3 ls

echo "LocalStack S3 初期化が完了しました"
