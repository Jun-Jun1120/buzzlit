"""Main pipeline: upload -> transcribe -> AI analyze -> highlight clips -> output."""

import uuid
from pathlib import Path

from .config import OUTPUT_DIR
from .transcriber import transcribe, format_transcript
from .ai_analyzer import analyze_content, AnalysisResult
from .video_processor import process_video


def run_pipeline(
    input_path: str,
    business_type: str = "auto",
    job_id: str | None = None,
    custom_prompt: str = "",
) -> dict:
    """Run the full Buzzlit pipeline.

    1. Transcribe audio
    2. AI analysis (genre detection, highlight selection, caption)
    3. Generate short video(s) from highlights

    Returns dict with videos list, caption, hashtags, etc.
    """
    job_id = job_id or str(uuid.uuid4())[:8]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Transcribe
    transcription = transcribe(input_path)
    transcript_text = format_transcript(transcription)

    # Step 2: AI Analysis (genre, highlights, caption)
    analysis: AnalysisResult | None = None
    try:
        analysis = analyze_content(
            transcript=transcript_text,
            duration=transcription.duration,
            custom_prompt=custom_prompt,
        )
    except Exception as e:
        # Fallback: use whole video, max 60s
        from .ai_analyzer import AnalysisResult
        analysis = AnalysisResult(
            genre="general",
            genre_ja="一般",
            highlights=({"start": 0, "end": min(60, transcription.duration), "reason": "fallback"},),
            title="",
            hook="",
            description="",
            hashtags=(),
            telop_style="variety",
        )

    # Step 3: Generate shorts from highlights
    videos = []
    for i, highlight in enumerate(analysis.highlights):
        start = highlight["start"]
        end = highlight["end"]
        idx = i + 1

        output_filename = f"buzzlit_{job_id}_{idx:02d}.mp4"
        output_path = job_dir / output_filename

        process_video(
            input_path=input_path,
            output_path=str(output_path),
            transcription=transcription,
            telop_style=analysis.telop_style,
            hook_text=analysis.hook if i == 0 else "",
            start_time=start,
            end_time=end,
        )

        videos.append({
            "index": idx,
            "filename": output_filename,
            "url": f"/api/videos/{job_id}/{output_filename}",
            "start": start,
            "end": end,
            "duration": end - start,
            "reason": highlight.get("reason", ""),
        })

    return {
        "job_id": job_id,
        "genre": analysis.genre,
        "genre_ja": analysis.genre_ja,
        "title": analysis.title,
        "hook": analysis.hook,
        "description": analysis.description,
        "hashtags": list(analysis.hashtags),
        "telop_style": analysis.telop_style,
        "videos": videos,
        "total_duration": transcription.duration,
        "transcript": transcript_text,
    }
