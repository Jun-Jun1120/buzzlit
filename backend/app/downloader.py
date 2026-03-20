"""YouTube video downloader using yt-dlp."""

import subprocess
import json
from pathlib import Path

from .config import UPLOAD_DIR


def download_youtube(url: str, job_id: str) -> tuple[Path, dict]:
    """Download YouTube video and return (video_path, metadata)."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Get video info
    info_result = subprocess.run(
        ["yt-dlp", "--dump-json", "--no-download", url],
        capture_output=True, text=True, check=True,
    )
    metadata = json.loads(info_result.stdout)
    video_id = metadata["id"]

    output_path = UPLOAD_DIR / f"{job_id}_{video_id}.mp4"

    if output_path.exists():
        return output_path, metadata

    # Download best quality up to 1080p
    subprocess.run(
        [
            "yt-dlp",
            "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", str(output_path),
            "--no-playlist",
            url,
        ],
        check=True,
    )

    if not output_path.exists():
        possible = list(UPLOAD_DIR.glob(f"{job_id}_{video_id}.*"))
        if possible:
            output_path = possible[0]

    return output_path, metadata
