"""Audio transcription using faster-whisper (subprocess to avoid CUDA crash)."""

import json
import os
import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Word:
    text: str
    start: float
    end: float


@dataclass(frozen=True)
class Segment:
    text: str
    start: float
    end: float
    words: tuple[Word, ...]


@dataclass(frozen=True)
class Transcription:
    segments: tuple[Segment, ...]
    language: str
    duration: float


def transcribe(video_path: str) -> Transcription:
    """Transcribe video in a subprocess (avoids CUDA cleanup crash)."""
    worker = str(
        os.path.join(os.path.dirname(__file__), "_transcribe_worker.py")
    )

    result = subprocess.run(
        [sys.executable, worker, video_path],
        capture_output=True,
        text=True,
        timeout=600,
    )

    stdout = result.stdout.strip()
    if not stdout:
        raise RuntimeError(
            f"Transcription failed.\nstderr: {result.stderr[:500]}"
        )

    data = json.loads(stdout)

    segments = tuple(
        Segment(
            text=s["text"],
            start=s["start"],
            end=s["end"],
            words=tuple(
                Word(text=w["text"], start=w["start"], end=w["end"])
                for w in s.get("words", [])
            ),
        )
        for s in data["segments"]
    )

    return Transcription(
        segments=segments,
        language=data["language"],
        duration=data["duration"],
    )


def format_transcript(transcription: Transcription) -> str:
    """Format transcription as timestamped text for AI analysis."""
    lines = []
    for seg in transcription.segments:
        m = int(seg.start // 60)
        s = int(seg.start % 60)
        lines.append(f"[{m:02d}:{s:02d}] {seg.text}")
    return "\n".join(lines)
