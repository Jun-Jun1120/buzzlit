"""FFmpeg video processing with telop and BGM."""

import subprocess
import re
from pathlib import Path

from .config import (
    OUTPUT_DIR,
    BGM_DIR,
    SHORT_FPS,
    SHORT_HEIGHT,
    SHORT_WIDTH,
    SUBTITLE_MAX_CHARS_PER_LINE,
    BUSINESS_TYPES,
)
from .transcriber import Transcription, Segment


def _fmt_time(secs: float) -> str:
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    cs = int((secs % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _get_video_info(path: str) -> dict:
    """Get video width, height, duration."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-show_entries", "format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    import json
    data = json.loads(result.stdout)
    stream = data.get("streams", [{}])[0]
    fmt = data.get("format", {})
    return {
        "width": int(stream.get("width", 1920)),
        "height": int(stream.get("height", 1080)),
        "duration": float(fmt.get("duration", 0)),
    }


def _build_crop_filter(src_w: int, src_h: int) -> str:
    target_ratio = SHORT_WIDTH / SHORT_HEIGHT
    src_ratio = src_w / src_h
    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        x_offset = (src_w - new_w) // 2
        return f"crop={new_w}:{src_h}:{x_offset}:0"
    else:
        new_h = int(src_w / target_ratio)
        y_offset = (src_h - new_h) // 2
        return f"crop={src_w}:{new_h}:0:{y_offset}"


def _wrap_text(text: str, max_chars: int) -> list[str]:
    lines, current = [], ""
    for char in text:
        current += char
        if len(current) >= max_chars:
            lines.append(current)
            current = ""
    if current:
        lines.append(current)
    return lines


def _escape_ass(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def _generate_ass(
    segments: list[Segment],
    style: str = "variety",
    font: str = "Noto Sans JP",
    hook_text: str = "",
) -> str:
    """Generate ASS subtitle content with business-appropriate style."""
    styles_map = {
        "variety": {
            "styles": (
                f"Style: Outer,{font},64,&H00000050,&H000000FF,&H001040A0,&H00000000,-1,0,0,0,100,100,2,0,1,9,0,2,50,50,140,1\n"
                f"Style: Main,{font},64,&H0000FFFF,&H000000FF,&H00000050,&H80000000,-1,0,0,0,100,100,2,0,1,5,3,2,50,50,140,1\n"
                f"Style: Hook,{font},80,&H0000FFFF,&H000000FF,&H00000050,&H80000000,-1,0,0,0,100,100,2,0,1,6,3,5,50,50,140,1"
            ),
            "layers": ["Outer", "Main"],
        },
        "news": {
            "styles": (
                f"Style: Main,{font},56,&H00FFFFFF,&H000000FF,&H00FFFFFF,&HA0522800,0,0,0,0,100,100,1,0,3,0,2,2,60,60,100,1\n"
                f"Style: Hook,{font},72,&H00FFFFFF,&H000000FF,&H00FFFFFF,&HA0522800,-1,0,0,0,100,100,1,0,3,0,2,2,60,60,100,1"
            ),
            "layers": ["Main"],
        },
        "drama": {
            "styles": (
                f"Style: Glow,{font},72,&H6000CFFF,&H000000FF,&H6000CFFF,&H00000000,0,0,0,0,100,100,3,0,1,8,0,2,30,30,120,1\n"
                f"Style: Main,{font},72,&H00FFFFFF,&H000000FF,&H50000000,&H00000000,-1,0,0,0,100,100,3,0,1,3,2,2,30,30,120,1\n"
                f"Style: Hook,{font},90,&H00FFFFFF,&H000000FF,&H50000000,&H00000000,-1,0,0,0,100,100,3,0,1,3,2,5,30,30,120,1"
            ),
            "layers": ["Glow", "Main"],
        },
    }

    cfg = styles_map.get(style, styles_map["variety"])

    header = f"""[Script Info]
Title: Buzzlit Subtitles
ScriptType: v4.00+
PlayResX: {SHORT_WIDTH}
PlayResY: {SHORT_HEIGHT}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{cfg['styles']}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []

    # Hook text at the beginning (first 3 seconds)
    if hook_text:
        for layer_idx, layer_name in enumerate(["Hook"]):
            events.append(
                f"Dialogue: {layer_idx + 10},{_fmt_time(0)},{_fmt_time(2.5)},Hook,,0,0,0,,"
                f"{{\\fad(200,300)}}{{\\an5\\pos(540,400)}}{_escape_ass(hook_text)}"
            )

    # Regular subtitles
    for seg in segments:
        lines = _wrap_text(seg.text, SUBTITLE_MAX_CHARS_PER_LINE)
        text = "\\N".join(_escape_ass(line) for line in lines)
        fade = "{\\fad(200,150)}"

        for layer_idx, layer_name in enumerate(cfg["layers"]):
            blur = "{\\blur5}" if layer_name == "Glow" else ""
            events.append(
                f"Dialogue: {layer_idx},{_fmt_time(seg.start)},{_fmt_time(seg.end)},"
                f"{layer_name},,0,0,0,,{fade}{blur}{text}"
            )

    return header + "\n".join(events) + "\n"


def _find_bgm(business_type: str) -> Path | None:
    """Find a BGM file matching the business type."""
    biz = BUSINESS_TYPES.get(business_type, {})
    mood = biz.get("bgm_mood", "upbeat")

    # Look for BGM files
    for pattern in [f"{mood}*.mp3", f"{mood}*.wav", "*.mp3", "*.wav"]:
        matches = list(BGM_DIR.glob(pattern))
        if matches:
            return matches[0]
    return None


def process_video(
    input_path: str,
    output_path: str,
    transcription: Transcription,
    business_type: str = "restaurant",
    hook_text: str = "",
) -> Path:
    """Process uploaded video into SNS-ready short with telop and BGM."""
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    info = _get_video_info(input_path)
    src_w, src_h = info["width"], info["height"]

    biz = BUSINESS_TYPES.get(business_type, BUSINESS_TYPES["restaurant"])
    telop_style = biz.get("telop_style", "variety")

    # Generate ASS
    ass_content = _generate_ass(
        list(transcription.segments),
        style=telop_style,
        hook_text=hook_text,
    )
    ass_path = out_path.with_suffix(".ass")
    ass_path.write_text(ass_content, encoding="utf-8")

    # Build filter
    crop = _build_crop_filter(src_w, src_h)
    ass_escaped = str(ass_path).replace("\\", "/").replace(":", "\\:")

    vf = f"{crop},scale={SHORT_WIDTH}:{SHORT_HEIGHT}:flags=lanczos,ass='{ass_escaped}'"

    # Build FFmpeg command
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
    ]

    # Add BGM if available
    bgm_path = _find_bgm(business_type)
    if bgm_path:
        cmd.extend(["-i", str(bgm_path)])

    cmd.extend(["-vf", vf])

    if bgm_path:
        # Mix original audio with BGM (BGM at 15% volume)
        cmd.extend([
            "-filter_complex",
            "[0:a]volume=1.0[a1];[1:a]volume=0.15[a2];[a1][a2]amix=inputs=2:duration=first[aout]",
            "-map", "0:v", "-map", "[aout]",
        ])

    cmd.extend([
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-r", str(SHORT_FPS),
        "-movflags", "+faststart",
        "-shortest",
        str(out_path),
    ])

    subprocess.run(cmd, check=True, capture_output=True)

    # Cleanup
    ass_path.unlink(missing_ok=True)

    return out_path
