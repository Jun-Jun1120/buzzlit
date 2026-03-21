# Buzzlit 開発履歴

## 概要

Buzzlit は「ローカルビジネス向け AI ショート動画生成 SaaS」として 2026年3月に開発開始。
当初は「日本語ショート動画 AI（YouTube切り抜きツール）」として開発していたが、市場調査の結果ピボットした。

---

## Phase 0: 自律開発基盤の構築 (2026-03-19)

### auto-dev パイプライン

GitHub issue に `auto-dev` ラベルを付けるだけで、Claude Code が自動で実装 → テスト → PR 作成するパイプラインを構築。

**構成:** `H:/dev/auto-dev/`
- poll.sh: 5分間隔で GitHub issue を監視
- lib/: ロック管理、ブランチ作成、Claude Code 実行、テスト、PR 作成
- Windows Task Scheduler に登録済み

**監視リポジトリ:** buzzlit, short-video-ai, x-auto-poster, Ops-doc-generator, lol-AI, Techno-pool

**テスト結果:** x-auto-poster リポジトリで issue #1 → PR #2 の自動生成に成功（所要時間: 約4分）

---

## Phase 1: short-video-ai プロトタイプ (2026-03-19 ~ 03-20)

### プロジェクト概要
- **リポジトリ:** https://github.com/Jun-Jun1120/short-video-ai
- **コンセプト:** YouTube URL → 日本語ショート動画5本を自動生成
- **競合:** OpusClip ($19/月, 日本語弱い)

### Day 1: CLI プロトタイプ
- `4ddda1f` feat: initial CLI prototype for Japanese short video AI generator
  - yt-dlp で YouTube 動画ダウンロード
  - faster-whisper (large-v3) で日本語文字起こし
  - Claude API でハイライト5箇所選定 + タイトル/説明/ハッシュタグ生成
  - FFmpeg で 9:16 縦型クロップ + ASS 字幕生成
  - Click CLI + Rich プログレス表示

### Day 2: API & GPU 対応
- `0c6ebfe` feat: complete CLI prototype with Claude/Gemini dual API support
  - Gemini API フォールバック（Claude API クレジット不足時）
  - JSON パース堅牢化（正規表現フォールバック、トレーリングカンマ修正）
  - Whisper medium モデルに変更（CPU 高速化）
  - python-dotenv で .env 自動読み込み

- `470fc11` feat: GPU transcription, WebUI skeleton, CUDA crash workaround
  - nvidia-cublas-cu12 / nvidia-cudnn-cu12 インストールで GPU 有効化
  - CUDA DLL パス自動設定 (`_setup_cuda_dll_path`)
  - CTranslate2 の CUDA クリーンアップクラッシュ回避: サブプロセス + `os._exit(0)`
  - FastAPI バックエンド + Next.js フロントエンドのスケルトン
  - **速度改善:** CPU 10分以上 → GPU 1.5分（15分動画）

### Day 3: テロップ & Web UI
- `4a6c00e` feat: 3 Japanese TV-style telop designs + CLI style option
  - **Variety:** 黄色テキスト、二重縁取り（茶/黒）、太字、影
  - **News:** 白テキスト、半透明ダークバナー
  - **Drama:** 大文字、ゴールドグロー効果
  - 全スタイルにフェードイン/アウトアニメーション
  - CLI: `--style variety|news|drama` オプション

### Day 4: LP & 決済
- `5a37c62` feat: landing page, Stripe payments, dev start script
  - `/lp` にランディングページ（ヒーロー、機能紹介、料金表、FAQ）
  - Stripe checkout + webhook 連携
  - 3 プラン: Free (0円/3本) / Pro (1,480円/50本) / Team (4,980円/無制限)
  - `start.sh` で backend + frontend 一発起動

### テスト実績
- JBL イヤホンレビュー動画 (15分) → 5本のショート動画生成に成功
- 各動画: 9:16 縦型、日本語テロップ付き、タイトル/説明/ハッシュタグ自動生成

---

## Phase 2: 市場調査 & ピボット (2026-03-20)

### 調査結果
- **YouTube クリッピング市場はレッドオーシャン:** OpusClip, Klap, Vizard, WayinVideo, AI Video Cut, quso.ai 等が多言語対応済み
- **日本発ツールも存在:** Vrew, NoLang, Invideo AI
- **「日本語特化の競合がほぼゼロ」は古い情報だった**

### 有望な領域の発見
- **ローカルビジネス (飲食店/美容室/整体院) の SNS 動画:** 月10-50万円の運用代行費が中小企業には高すぎる
- **市場規模:** 日本だけで約100万事業所がターゲット
- **競合「トルダケ!!」:** プレリリース段階で、市場を証明している
- **グローバル展開可能:** 同じペインは海外にも存在

### ピボット決定
- **旧:** YouTube URL → ショート動画（クリエイター向け）
- **新:** スマホ動画 → SNS ショート動画（ローカルビジネス向け）
- **プロダクト名:** Buzzlit (Buzz + lit) — 日本発、グローバル展開を視野

---

## Phase 3: Buzzlit MVP 構築 (2026-03-20 ~ 03-21)

### プロジェクト概要
- **リポジトリ:** https://github.com/Jun-Jun1120/buzzlit
- **コンセプト:** 撮るだけで、お店がバズる。AI ショート動画生成 SaaS
- **ターゲット:** 飲食店・美容室・整体院 → 全ジャンルに拡大

### MVP 構築
- `b3aa750` feat: Buzzlit MVP - AI short video generator for local businesses
  - FastAPI バックエンド（動画アップロード、文字起こし、キャプション生成、動画処理）
  - GPU Whisper 文字起こし（サブプロセス分離）
  - Gemini API で業種別キャプション・ハッシュタグ生成
  - FFmpeg + テロップ 3 スタイル（業種自動選択）
  - Next.js フロントエンド（アップロード UI、業種選択、プレビュー）
  - BGM オーバーレイ対応

### YouTube URL 対応
- `04e1e0d` feat: add YouTube URL input mode
  - `/api/generate-from-url` エンドポイント追加
  - yt-dlp ダウンロード → パイプライン実行
  - フロントエンドにタブ切替（アップロード / YouTube URL）

### 大規模アップグレード
- `7492b30` feat: major upgrade - auto genre, highlight clips, blur background, prompt input
  - **AI 自動ジャンル判定:** カテゴリー手動選択を廃止、動画内容から自動判定
  - **ハイライト抽出:** 長い動画から 30-60秒のベスト区間を最大3本切り出し
  - **スマート縦型変換:** 横動画はブラー背景付きで自然に縦型化（無理なクロップ廃止）
  - **カスタムプロンプト:** ユーザーが追加指示を入力可能
  - **複数クリップ出力:** クリップセレクター UI
  - **デザイン刷新:** ミニマル＆プロフェッショナル、グラスモーフィズム

### 設定 & 多言語対応
- `6909c04` feat: settings page with i18n, language selection, video/telop/audio config
  - 設定ページ (`/settings`): 言語、動画出力、テロップ、オーディオ、エクスポート
  - 多言語文字起こし: 15言語 + 自動検出
  - UI 多言語: 日本語 / English
  - キャプション言語選択
  - 全設定 localStorage に永続化

- `cc94604` fix: i18n all UI text to Japanese, fix videos undefined error
  - 全 UI テキストを日本語化（ステップ、ボタン、ラベル、プレースホルダー）
  - `result.videos` undefined エラー修正

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 15 + Tailwind CSS 4 + TypeScript |
| Backend | FastAPI (Python) |
| AI (文字起こし) | faster-whisper (medium, GPU CUDA) |
| AI (分析) | Gemini 2.5 Flash API |
| AI (フォールバック) | Claude Sonnet 4.6 API |
| 動画処理 | FFmpeg + ASS 字幕 |
| GPU | NVIDIA RTX 3070 (8GB VRAM) |
| 決済 | Stripe |
| ホスティング (予定) | Vercel (FE) + Railway (BE) |

## 料金プラン

| プラン | 月額 | 内容 |
|--------|------|------|
| Starter | 4,980円 | 月10本、1アカウント |
| Pro | 9,800円 | 月30本、3アカウント |
| Business | 19,800円 | 無制限、複数店舗 |

---

## パフォーマンス実績

| 処理 | CPU | GPU |
|------|-----|-----|
| 15分動画の文字起こし | 10分以上 | **1.5分** |
| 全パイプライン (15分動画) | 15分以上 | **約3分** |

---

## 今後のロードマップ

### Week 2
- [ ] 実際のスマホ動画での E2E テスト
- [ ] BGM ライブラリ追加 (Pixabay Audio)
- [ ] LP ページ作成
- [ ] SNS 自動投稿 (Instagram / TikTok API)

### Week 3-4
- [ ] Stripe 決済フロー完成
- [ ] Vercel + Railway デプロイ
- [ ] β テスター募集 (X で実演動画投稿)

### Month 2
- [ ] 英語 UI 完全対応
- [ ] 海外市場展開
- [ ] テンプレートライブラリ
- [ ] 分析ダッシュボード
