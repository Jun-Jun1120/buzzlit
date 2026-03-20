"""Buzzlit FastAPI backend."""

import asyncio
import os
import uuid
import shutil
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Load env
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from .config import OUTPUT_DIR, UPLOAD_DIR, MAX_UPLOAD_SIZE_MB
from .pipeline import run_pipeline

app = FastAPI(title="Buzzlit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job storage
jobs: dict[str, dict] = {}


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: str
    result: dict | None = None
    error: str | None = None


@app.post("/api/generate")
async def generate(
    video: UploadFile = File(...),
    business_type: str = Form("restaurant"),
) -> dict:
    """Upload video and start generation."""
    # Validate file
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(400, "File must be a video")

    job_id = str(uuid.uuid4())[:8]

    # Save uploaded file
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(video.filename or "video.mp4").suffix or ".mp4"
    upload_path = UPLOAD_DIR / f"{job_id}{ext}"

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    # Check file size
    size_mb = upload_path.stat().st_size / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        upload_path.unlink()
        raise HTTPException(400, f"File too large ({size_mb:.0f}MB > {MAX_UPLOAD_SIZE_MB}MB)")

    jobs[job_id] = {
        "status": "processing",
        "progress": "動画をアップロードしました...",
        "result": None,
        "error": None,
    }

    # Run in background
    asyncio.create_task(_process_job(job_id, str(upload_path), business_type))

    return {"job_id": job_id}


async def _process_job(job_id: str, input_path: str, business_type: str) -> None:
    """Process video in background."""
    try:
        jobs[job_id]["progress"] = "音声を文字起こし中..."

        result = await asyncio.to_thread(
            run_pipeline, input_path, business_type, job_id,
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = "完了!"
        jobs[job_id]["result"] = result

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["progress"] = f"エラー: {e}"


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> JobStatus:
    """Get job status."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")

    job = jobs[job_id]
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        result=job["result"],
        error=job["error"],
    )


@app.get("/api/videos/{job_id}/{filename}")
async def get_video(job_id: str, filename: str) -> FileResponse:
    """Download generated video."""
    path = OUTPUT_DIR / job_id / filename
    if not path.exists():
        raise HTTPException(404, "Video not found")

    return FileResponse(str(path), media_type="video/mp4", filename=filename)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "buzzlit"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
