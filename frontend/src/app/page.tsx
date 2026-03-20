"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type InputMode = "upload" | "youtube";

type VideoClip = {
  index: number;
  filename: string;
  url: string;
  start: number;
  end: number;
  duration: number;
  reason: string;
};

type JobResult = {
  job_id: string;
  genre: string;
  genre_ja: string;
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  telop_style: string;
  videos: VideoClip[];
  total_duration: number;
  source_title?: string;
};

type JobStatus = {
  job_id: string;
  status: "processing" | "completed" | "failed";
  progress: string;
  result: JobResult | null;
  error: string | null;
};

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setJob(null);
    setJobId(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setJob(null);
    setActiveVideo(0);

    try {
      let res: Response;
      if (inputMode === "upload") {
        if (!file) return;
        const fd = new FormData();
        fd.append("video", file);
        fd.append("business_type", "auto");
        fd.append("custom_prompt", customPrompt);
        res = await fetch("/api/generate", { method: "POST", body: fd });
      } else {
        if (!youtubeUrl.trim()) return;
        res = await fetch("/api/generate-from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            business_type: "auto",
            custom_prompt: customPrompt,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
      alert(`${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      setJob(await res.json());
    } catch { /* ignore */ }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    pollJob();
    const iv = setInterval(pollJob, 2000);
    return () => clearInterval(iv);
  }, [jobId, pollJob]);

  const isProcessing = job?.status === "processing";
  const result = job?.result;
  const canSubmit = inputMode === "upload" ? !!file : !!youtubeUrl.trim();
  const currentVideo = result?.videos?.[activeVideo];

  const copyCaption = () => {
    if (!result) return;
    const text = `${result.description}\n\n${result.hashtags.map((t) => `#${t}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const reset = () => {
    setJob(null);
    setJobId(null);
    setFile(null);
    setPreviewUrl(null);
    setYoutubeUrl("");
    setActiveVideo(0);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600" />
          <h1 className="text-3xl font-bold tracking-tight">Buzzlit</h1>
        </div>
        <p className="text-gray-400 text-base max-w-md mx-auto">
          動画からAIがバズるショート動画を自動生成。ジャンル自動判定、テロップ、キャプション付き。
        </p>
      </header>

      {result ? (
        /* ── Result View ── */
        <div className="space-y-6">
          {/* Meta bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm font-medium">
                {result.genre_ja}
              </span>
              <span className="text-gray-500 text-sm">{result.videos.length} clips generated</span>
              {result.source_title && (
                <span className="text-gray-600 text-sm truncate max-w-xs">
                  {result.source_title}
                </span>
              )}
            </div>
            <button type="button" onClick={reset} className="text-sm text-gray-400 hover:text-white transition-colors">
              New
            </button>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Video Player - 3 cols */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                <div className="aspect-[9/16] max-h-[600px] bg-black">
                  {currentVideo && (
                    <video
                      key={currentVideo.url}
                      src={currentVideo.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                {/* Clip selector */}
                {result.videos.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {result.videos.map((v, i) => (
                      <button
                        key={v.filename}
                        type="button"
                        onClick={() => setActiveVideo(i)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          i === activeVideo
                            ? "bg-orange-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        Clip {v.index} ({Math.round(v.duration)}s)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info panel - 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title & Caption */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="font-bold text-lg mb-3">{result.title}</h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                  {result.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {result.hashtags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyCaption}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  {copiedIdx === -1 ? "Copied!" : "Copy caption"}
                </button>
              </div>

              {/* Download */}
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Download</h3>
                <div className="space-y-2">
                  {result.videos.map((v) => (
                    <a
                      key={v.filename}
                      href={v.url}
                      download={v.filename}
                      className="flex items-center justify-between py-2.5 px-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors"
                    >
                      <span>Clip {v.index} - {Math.round(v.duration)}s</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Clip info */}
              {currentVideo?.reason && (
                <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800/50">
                  <p className="text-xs text-gray-500">Why this clip:</p>
                  <p className="text-sm text-gray-400 mt-1">{currentVideo.reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Input View ── */
        <div className="max-w-xl mx-auto space-y-6">
          {/* Mode Tabs */}
          <div className="flex gap-1 bg-gray-900/80 p-1 rounded-xl">
            {(["upload", "youtube"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === mode
                    ? "bg-gray-800 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {mode === "upload" ? "Upload Video" : "YouTube URL"}
              </button>
            ))}
          </div>

          {/* Upload */}
          {inputMode === "upload" && (
            <div
              onClick={() => fileRef.current?.click()}
              className={`border border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                file
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "border-gray-800 hover:border-gray-600 bg-gray-900/30"
              }`}
            >
              {previewUrl ? (
                <video src={previewUrl} className="max-h-40 mx-auto rounded-xl mb-3" controls muted />
              ) : (
                <div className="py-2">
                  <svg className="w-10 h-10 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400 text-sm">Click to upload or drag video here</p>
                  <p className="text-gray-600 text-xs mt-1">MP4, MOV up to 200MB</p>
                </div>
              )}
              {file && <p className="text-xs text-gray-500 mt-2">{file.name}</p>}
              <input ref={fileRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {/* YouTube URL */}
          {inputMode === "youtube" && (
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3.5 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 text-sm"
              disabled={isProcessing}
            />
          )}

          {/* Custom Prompt */}
          <div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="(Optional) Custom instructions - e.g. 面白い部分だけ切り抜いて, 感動的なシーンを選んで..."
              rows={2}
              className="w-full px-4 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 text-sm resize-none"
              disabled={isProcessing}
            />
          </div>

          {/* Generate */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing || isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            {isSubmitting
              ? "Sending..."
              : isProcessing
              ? "Generating..."
              : "Generate Shorts"}
          </button>

          {/* Progress */}
          {isProcessing && (
            <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-300">{job?.progress}</span>
              </div>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-1">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {job?.status === "failed" && (
            <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-5">
              <p className="text-red-400 text-sm font-medium">Error</p>
              <p className="text-red-300/80 text-sm mt-1">{job.error}</p>
              <button type="button" onClick={reset} className="mt-3 text-xs text-orange-400 hover:text-orange-300">
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
