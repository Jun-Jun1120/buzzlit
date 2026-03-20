"""Main pipeline: upload -> transcribe -> caption -> process -> output."""

import uuid
from pathlib import Path

from .config import OUTPUT_DIR, UPLOAD_DIR
from .transcriber import transcribe, format_transcript
from .caption_generator import generate_caption, Caption
from .video_processor import process_video


def run_pipeline(
    input_path: str,
    business_type: str = "restaurant",
    job_id: str | None = None,
) -> dict:
    """Run the full Buzzlit pipeline.

    Returns dict with output_path, caption, hashtags, etc.
    """
    job_id = job_id or str(uuid.uuid4())[:8]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Transcribe
    transcription = transcribe(input_path)

    # Step 2: Generate caption
    transcript_text = format_transcript(transcription)

    caption: Caption | None = None
    try:
        caption = generate_caption(transcript_text, business_type)
    except Exception:
        # If AI fails, use fallback
        caption = Caption(
            title="",
            description="",
            hashtags=(),
            hook="",
        )

    # Step 3: Process video
    safe_title = caption.title[:30] if caption.title else job_id
    safe_title = "".join(c for c in safe_title if c.isalnum() or c in "ぁ-んァ-ヶ一-龠ー _-")
    output_filename = f"buzzlit_{job_id}.mp4"
    output_path = job_dir / output_filename

    process_video(
        input_path=input_path,
        output_path=str(output_path),
        transcription=transcription,
        business_type=business_type,
        hook_text=caption.hook,
    )

    return {
        "job_id": job_id,
        "output_path": str(output_path),
        "output_url": f"/api/videos/{job_id}/{output_filename}",
        "title": caption.title,
        "description": caption.description,
        "hashtags": list(caption.hashtags),
        "hook": caption.hook,
        "duration": transcription.duration,
        "transcript": transcript_text,
    }
