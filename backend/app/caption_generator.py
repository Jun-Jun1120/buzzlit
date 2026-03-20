"""AI-powered caption, hashtag, and title generation for local businesses."""

import json
import os
import re
from dataclasses import dataclass

from .config import BUSINESS_TYPES, GEMINI_MODEL


@dataclass(frozen=True)
class Caption:
    title: str
    description: str
    hashtags: tuple[str, ...]
    hook: str  # First line to grab attention


PROMPT_TEMPLATE = """あなたは日本のSNSマーケティングの専門家です。

以下の{business_type_ja}の動画の音声内容を元に、Instagram Reels / TikTok / YouTube Shorts 向けの投稿を作成してください。

## 音声内容
{transcript}

## 業種
{business_type_ja}

## 出力形式（JSONのみ、他のテキスト不要）
{{
  "title": "動画タイトル（15文字以内、キャッチーに）",
  "hook": "最初の1行フック（視聴者の目を止める一言、10文字以内）",
  "description": "投稿キャプション（100文字以内、絵文字あり、行動喚起含む）",
  "hashtags": ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5"]
}}

## ルール
- {business_type_ja}に来たくなるような内容にする
- 地域名や店名が音声にあれば活用する
- ハッシュタグは業種関連 + トレンド系を混ぜる
- 絵文字は2-3個まで（使いすぎない）
- フックは短く衝撃的に"""


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


def generate_caption(transcript: str, business_type: str) -> Caption:
    """Generate caption, hashtags, and title using Gemini API."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    biz = BUSINESS_TYPES.get(business_type, BUSINESS_TYPES["restaurant"])

    prompt = PROMPT_TEMPLATE.format(
        business_type_ja=biz["name_ja"],
        transcript=transcript,
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

    base_tags = list(biz["hashtags_base"])
    ai_tags = data.get("hashtags", [])
    all_tags = list(dict.fromkeys(ai_tags + base_tags))[:8]

    return Caption(
        title=data.get("title", ""),
        description=data.get("description", ""),
        hashtags=tuple(all_tags),
        hook=data.get("hook", ""),
    )
