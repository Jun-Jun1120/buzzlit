# Buzzlit アーキテクチャ

## システム構成図

```
[ユーザー (スマホ/PC)]
        |
        v
[Next.js Frontend]  ← http://localhost:3000
  |  - 動画アップロード / YouTube URL 入力
  |  - 業種自動判定 (AI)
  |  - プレビュー + ダウンロード
  |  - 設定管理 (localStorage)
  |
  | /api/* → proxy
  v
[FastAPI Backend]   ← http://localhost:8000
  |
  ├── POST /api/generate         ← 動画ファイルアップロード
  ├── POST /api/generate-from-url ← YouTube URL
  ├── GET  /api/jobs/{id}        ← ジョブステータスポーリング
  └── GET  /api/videos/{id}/{fn} ← 生成動画ダウンロード
  |
  v
[Processing Pipeline]
  |
  ├── 1. yt-dlp (YouTube URLの場合のみ)
  |      └── 動画ダウンロード → uploads/
  |
  ├── 2. faster-whisper (サブプロセス)
  |      ├── GPU: RTX 3070 / CUDA / float16
  |      ├── CPU fallback: int8
  |      └── 出力: Transcription (segments + words + timestamps)
  |
  ├── 3. Gemini 2.5 Flash API
  |      ├── ジャンル自動判定
  |      ├── ハイライト区間選定 (30-60秒 × 最大3本)
  |      ├── キャプション生成
  |      ├── ハッシュタグ生成
  |      └── テロップスタイル自動選択
  |
  └── 4. FFmpeg
         ├── 縦型変換 (9:16, 1080x1920)
         |    ├── 縦動画: そのままスケール
         |    └── 横動画: ブラー背景 + センター配置
         ├── ASS テロップ焼き込み (3スタイル)
         ├── BGM ミキシング (業種別)
         └── 出力: output/{job_id}/buzzlit_{job_id}_{nn}.mp4
```

## ディレクトリ構成

```
H:/dev/buzzlit/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI エントリポイント
│   │   ├── config.py            # 設定定数
│   │   ├── pipeline.py          # メインパイプライン
│   │   ├── transcriber.py       # Whisper 文字起こし (サブプロセス呼び出し)
│   │   ├── _transcribe_worker.py # GPU サブプロセスワーカー
│   │   ├── ai_analyzer.py       # Gemini ジャンル判定 + ハイライト選定
│   │   ├── caption_generator.py # キャプション生成 (旧・業種特化版)
│   │   ├── video_processor.py   # FFmpeg 動画処理 + ASS テロップ
│   │   └── downloader.py        # yt-dlp YouTube ダウンロード
│   └── __init__.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # メインページ (入力 / 結果表示)
│   │   │   ├── layout.tsx       # ルートレイアウト
│   │   │   ├── globals.css      # グローバルスタイル + アニメーション
│   │   │   └── settings/
│   │   │       └── page.tsx     # 設定ページ
│   │   └── lib/
│   │       ├── settings.ts      # 設定型定義 + localStorage 永続化
│   │       └── i18n.ts          # 多言語テキスト (ja/en)
│   ├── package.json
│   ├── next.config.ts           # API proxy 設定
│   └── tsconfig.json
├── bgm/                          # BGM ファイル (業種別)
├── uploads/                      # アップロード一時保存
├── output/                       # 生成動画出力
├── docs/                         # ドキュメント
├── .env                          # API キー
├── pyproject.toml
└── start.sh                      # 一発起動スクリプト
```

## CUDA クラッシュ回避

CTranslate2 (faster-whisper の内部ライブラリ) が Python 終了時に CUDA コンテキストの
クリーンアップでクラッシュする問題がある (exit code 127)。

**回避策:** 文字起こしをサブプロセスで実行し、完了後 `os._exit(0)` で強制終了。
- `transcriber.py`: メインプロセスからサブプロセスを起動、JSON で結果を受け取る
- `_transcribe_worker.py`: GPU で文字起こし実行、stdout に JSON 出力、`os._exit(0)`

## 縦型変換ロジック

```python
src_ratio = src_w / src_h
target_ratio = 1080 / 1920  # = 0.5625

if ほぼ縦型 (差 < 0.1):
    単純スケール

else (横型 or 正方形):
    1. 元動画を拡大してブラー → 背景
    2. 元動画を幅フィットでスケール → 前景
    3. 前景を背景の中央にオーバーレイ
```

## テロップスタイル

| スタイル | 用途 | 特徴 |
|---------|------|------|
| variety | 明るい・エンタメ | 黄色テキスト、二重縁取り、影 |
| news | 情報・解説 | 白テキスト、半透明バナー背景 |
| drama | 感動・アート | 大文字、ゴールドグロー |
