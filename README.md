# Buzzlit

撮るだけで、お店がバズる。AIショート動画生成SaaS。

## What is Buzzlit?

飲食店・美容室・整体院のオーナーが、スマホで動画を撮るだけで、
プロ品質のSNSショート動画が自動で完成するツールです。

- AI が音声からテロップを自動生成（日本TV風3スタイル）
- 業種に合わせたキャプション・ハッシュタグを自動生成
- BGMを自動で付与
- Instagram Reels / TikTok / YouTube Shorts に最適化（9:16縦型）

## Quick Start

```bash
cd H:/dev/buzzlit

# Install
uv venv && uv pip install fastapi uvicorn python-dotenv google-genai faster-whisper python-multipart nvidia-cublas-cu12 nvidia-cudnn-cu12

# Set API key
echo "GEMINI_API_KEY=your-key" > .env

# Start
bash start.sh
# App:  http://localhost:3000
# API:  http://localhost:8000/docs
```

## Pipeline

```
スマホ動画アップロード
 → faster-whisper (日本語文字起こし, GPU)
 → Gemini API (業種別キャプション・ハッシュタグ生成)
 → FFmpeg (9:16縦型 + 日本TV風テロップ + BGM)
 → SNS-ready MP4
```

## Tech Stack

- Backend: FastAPI (Python)
- Frontend: Next.js + Tailwind CSS
- AI: Gemini API (caption) + faster-whisper (transcription)
- Video: FFmpeg + ASS subtitles
- GPU: CUDA (RTX 3070)

## Pricing (Planned)

| Plan | Price | Videos |
|------|-------|--------|
| Starter | 4,980 yen/mo | 10/month |
| Pro | 9,800 yen/mo | 30/month |
| Business | 19,800 yen/mo | Unlimited |

## Target Market

- Restaurants (67万店)
- Beauty salons (26万店)
- Clinics (5万店)
- Total: ~100万 businesses in Japan
