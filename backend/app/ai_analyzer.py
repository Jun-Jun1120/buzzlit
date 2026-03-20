"""AI-powered content analysis: genre detection, highlight selection, caption generation."""

import json
import os
import re
from dataclasses import dataclass

from .config import GEMINI_MODEL


@dataclass(frozen=True)
class AnalysisResult:
    genre: str
    genre_ja: str
    highlights: tuple[dict, ...]  # [{start, end, reason}]
    title: str
    hook: str
    description: str
    hashtags: tuple[str, ...]
    telop_style: str


ANALYSIS_PROMPT = """あなたはSNSショート動画のプロデューサーです。

以下の動画のトランスクリプトを分析して、バズるショート動画を作るための情報を出力してください。

## トランスクリプト
{transcript}

## 動画の長さ
{duration}秒

{custom_prompt}

## 出力形式（JSONのみ）
{{
  "genre": "動画のジャンル（英語、例: food, beauty, fitness, gaming, education, tech, music, vlog, comedy, business）",
  "genre_ja": "ジャンル（日本語）",
  "highlights": [
    {{
      "start": 開始秒数,
      "end": 終了秒数,
      "reason": "この区間を選んだ理由"
    }}
  ],
  "title": "ショート動画のタイトル（15文字以内）",
  "hook": "冒頭フック（10文字以内、視聴者の目を止める一言）",
  "description": "SNS投稿キャプション（100文字以内）",
  "hashtags": ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5", "タグ6"],
  "telop_style": "variety または news または drama（動画の雰囲気に合うもの）"
}}

## ハイライト選定ルール
- 動画が60秒以下: 動画全体を1つのハイライトとして使う
- 動画が60秒以上: バズりやすい30〜60秒の区間を最大3つ選ぶ
- 感情的インパクト（驚き、感動、笑い、共感）がある場面を優先
- 単体で見ても面白い・価値がある区間を選ぶ
- フックが強い（最初の3秒で惹きつける）区間を優先

## キャプションルール
- ジャンルに合ったトーンで書く
- ハッシュタグはジャンル特化 + トレンド系を混ぜる
- 行動喚起を含める（フォロー、保存、コメント等）
- テロップスタイルは動画の雰囲気で判断:
  - variety: 明るい・楽しい・エンタメ系
  - news: 情報・解説・ビジネス系
  - drama: 感動・美しい・アート系"""


def _parse_json(text: str) -> dict:
    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    fixed = re.sub(r',\s*([}\]])', r'\1', cleaned)
    return json.loads(fixed)


def analyze_content(
    transcript: str,
    duration: float,
    custom_prompt: str = "",
) -> AnalysisResult:
    """Analyze video content: detect genre, select highlights, generate caption."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    custom_section = ""
    if custom_prompt.strip():
        custom_section = f"## ユーザーからの追加指示\n{custom_prompt.strip()}"

    prompt = ANALYSIS_PROMPT.format(
        transcript=transcript,
        duration=duration,
        custom_prompt=custom_section,
    )

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    data = _parse_json(response.text)

    # Validate highlights
    highlights = []
    for h in data.get("highlights", []):
        start = max(0, float(h.get("start", 0)))
        end = min(duration, float(h.get("end", duration)))
        if end - start >= 10:  # minimum 10 seconds
            highlights.append({"start": start, "end": end, "reason": h.get("reason", "")})

    # If no valid highlights, use the whole video (capped at 60s)
    if not highlights:
        highlights = [{"start": 0, "end": min(60, duration), "reason": "full video"}]

    return AnalysisResult(
        genre=data.get("genre", "general"),
        genre_ja=data.get("genre_ja", "一般"),
        highlights=tuple(highlights),
        title=data.get("title", ""),
        hook=data.get("hook", ""),
        description=data.get("description", ""),
        hashtags=tuple(data.get("hashtags", [])),
        telop_style=data.get("telop_style", "variety"),
    )
