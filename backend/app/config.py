"""Buzzlit configuration."""

from pathlib import Path

# Directories
PROJECT_ROOT = Path(__file__).parent.parent.parent
UPLOAD_DIR = PROJECT_ROOT / "uploads"
OUTPUT_DIR = PROJECT_ROOT / "output"
BGM_DIR = PROJECT_ROOT / "bgm"

# Video output settings
SHORT_WIDTH = 1080
SHORT_HEIGHT = 1920
SHORT_FPS = 30

# Whisper
WHISPER_MODEL = "medium"
WHISPER_LANGUAGE = "ja"
WHISPER_DEVICE = "cuda"
WHISPER_COMPUTE_TYPE = "float16"

# AI
GEMINI_MODEL = "gemini-2.5-flash"

# Subtitle defaults
SUBTITLE_FONT_SIZE = 64
SUBTITLE_MAX_CHARS_PER_LINE = 14
SUBTITLE_BOTTOM_MARGIN = 140
SUBTITLE_STROKE_WIDTH = 5

# Business types
BUSINESS_TYPES = {
    "restaurant": {
        "name_ja": "飲食店",
        "name_en": "Restaurant",
        "bgm_mood": "upbeat",
        "hashtags_base": ["グルメ", "飲食店", "おいしい", "ランチ", "ディナー"],
        "telop_style": "variety",
    },
    "salon": {
        "name_ja": "美容室",
        "name_en": "Beauty Salon",
        "bgm_mood": "chill",
        "hashtags_base": ["美容室", "ヘアサロン", "髪型", "ヘアスタイル", "美容"],
        "telop_style": "drama",
    },
    "clinic": {
        "name_ja": "整体院",
        "name_en": "Clinic",
        "bgm_mood": "calm",
        "hashtags_base": ["整体", "マッサージ", "肩こり", "腰痛", "健康"],
        "telop_style": "news",
    },
}

# Upload limits
MAX_UPLOAD_SIZE_MB = 200
MAX_VIDEO_DURATION = 300  # 5 minutes
