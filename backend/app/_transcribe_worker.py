"""Subprocess worker for GPU transcription."""

import json
import os
import sys


def _setup_cuda():
    try:
        import nvidia.cublas
        import nvidia.cudnn
        for pkg in [nvidia.cublas, nvidia.cudnn]:
            bin_dir = os.path.join(pkg.__path__[0], "bin")
            if os.path.isdir(bin_dir):
                os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    except ImportError:
        pass


def main():
    _setup_cuda()
    video_path = sys.argv[1]

    from faster_whisper import WhisperModel

    try:
        model = WhisperModel("medium", device="cuda", compute_type="float16")
    except Exception:
        model = WhisperModel("medium", device="cpu", compute_type="int8")

    try:
        raw_segments, info = model.transcribe(
            video_path, language="ja", word_timestamps=True, vad_filter=True,
        )
        raw_segments = list(raw_segments)
    except Exception:
        model = WhisperModel("medium", device="cpu", compute_type="int8")
        raw_segments, info = model.transcribe(
            video_path, language="ja", word_timestamps=True, vad_filter=True,
        )
        raw_segments = list(raw_segments)

    segments = []
    for s in raw_segments:
        words = [
            {"text": w.word.strip(), "start": w.start, "end": w.end}
            for w in (s.words or []) if w.word.strip()
        ]
        segments.append({"text": s.text.strip(), "start": s.start, "end": s.end, "words": words})

    data = {"language": info.language, "duration": info.duration, "segments": segments}
    sys.stdout.write(json.dumps(data, ensure_ascii=False))
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
