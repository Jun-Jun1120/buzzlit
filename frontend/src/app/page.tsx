"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { loadSettings, type Settings } from "@/lib/settings";
import { t } from "@/lib/i18n";

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

/* ── Step indicator for processing ── */
const STEPS_JA = [
  { key: "download", label: "ダウンロード" },
  { key: "transcribe", label: "文字起こし" },
  { key: "analyze", label: "AI分析" },
  { key: "render", label: "動画生成" },
] as const;

const STEPS_EN = [
  { key: "download", label: "Download" },
  { key: "transcribe", label: "Transcribe" },
  { key: "analyze", label: "Analyze" },
  { key: "render", label: "Render" },
] as const;

function getStepIndex(progress: string): number {
  if (progress.includes("ダウンロード")) return 0;
  if (progress.includes("文字起こし")) return 1;
  if (progress.includes("分析") || progress.includes("AI")) return 2;
  if (progress.includes("動画") || progress.includes("生成")) return 3;
  return 1;
}

export default function Home() {
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSettingsState(loadSettings()); }, []);

  const lang = settings?.uiLanguage ?? "ja";
  const i = (key: Parameters<typeof t>[0]) => t(key, lang);

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
            language: settings?.language ?? "ja",
            caption_language: settings?.captionLanguage ?? "ja",
            max_clips: settings?.maxClips ?? 3,
            clip_duration: settings?.clipDuration ?? 45,
            telop_style: settings?.telopStyle ?? "auto",
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
      }
      setJobId((await res.json()).job_id);
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
      if (res.ok) setJob(await res.json());
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
  const videos = result?.videos ?? [];
  const currentVideo = videos[activeVideo];

  const copyCaption = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${result.description}\n\n${result.hashtags.map((t) => `#${t}`).join(" ")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px]" style={{ animation: "pulse-slow 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-red-600/6 rounded-full blur-[100px]" style={{ animation: "pulse-slow 10s ease-in-out infinite 2s" }} />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-amber-500/4 rounded-full blur-[80px]" style={{ animation: "pulse-slow 12s ease-in-out infinite 4s" }} />
      </div>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div />
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 shadow-lg shadow-orange-500/20" />
                <div className="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 blur-md opacity-40" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Buzzlit</h1>
            </div>
            <Link
              href="/settings"
              className="w-9 h-9 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center hover:bg-zinc-700/60 hover:border-zinc-600/50 transition-all"
              title={i("settings")}
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
          <p className="text-zinc-500 text-sm sm:text-base max-w-lg mx-auto leading-relaxed text-center">
            {i("tagline")}
          </p>
        </header>

        {result ? (
          /* ═══ RESULT VIEW ═══ */
          <div className="space-y-6 animate-[float_0.5s_ease-out]">
            {/* Top bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 text-orange-400 rounded-full text-xs font-medium backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {result.genre_ja}
                </span>
                <span className="text-zinc-600 text-xs">{videos.length} {i("label_clips")}</span>
              </div>
              <button type="button" onClick={reset} className="px-4 py-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all hover:bg-zinc-900">
                {i("btn_new")}
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Player - 7 cols */}
              <div className="lg:col-span-7">
                <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl shadow-black/40">
                  <div className="aspect-[9/16] max-h-[620px] bg-black relative">
                    {currentVideo && (
                      <video key={currentVideo.url} src={currentVideo.url} controls autoPlay className="w-full h-full object-contain" />
                    )}
                  </div>
                  {videos.length > 1 && (
                    <div className="flex gap-2 p-3 border-t border-zinc-800/50">
                      {videos.map((v, i) => (
                        <button
                          key={v.filename}
                          type="button"
                          onClick={() => setActiveVideo(i)}
                          className={`relative flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            i === activeVideo
                              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20"
                              : "bg-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          {lang === "ja" ? `${v.index}` : `Clip ${v.index}`}
                          <span className="ml-1 opacity-60">{Math.round(v.duration)}s</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Info panel - 5 cols */}
              <div className="lg:col-span-5 space-y-4">
                {/* Caption card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/80 p-6 shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="font-semibold text-lg text-white leading-tight">{result.title}</h2>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider flex-shrink-0 ml-3">{result.telop_style}</span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap mb-5">{result.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {result.hashtags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-zinc-800/80 text-zinc-400 rounded-lg text-[11px] border border-zinc-700/50">#{tag}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={copyCaption}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      copied
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    {copied ? i("btn_copied") : i("btn_copy")}
                  </button>
                </div>

                {/* Downloads */}
                <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/80 p-5 shadow-xl">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3 font-medium">{i("label_downloads")}</p>
                  <div className="space-y-2">
                    {videos.map((v) => (
                      <a
                        key={v.filename}
                        href={v.url}
                        download={v.filename}
                        className="flex items-center justify-between py-3 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/30 hover:border-zinc-600/50 rounded-xl text-sm transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-zinc-300 font-medium">{lang === "ja" ? `${v.index}` : `Clip ${v.index}`}</span>
                            <span className="text-zinc-600 text-xs ml-2">{Math.round(v.duration)}s</span>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>

                {currentVideo?.reason && (
                  <div className="px-4 py-3 rounded-xl border border-zinc-800/40 bg-zinc-900/40">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{i("label_reason")}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed">{currentVideo.reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══ INPUT VIEW ═══ */
          <div className="max-w-lg mx-auto">
            <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-800/60 p-6 sm:p-8 shadow-2xl shadow-black/30">
              {/* Mode tabs */}
              <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl mb-6">
                {(["youtube", "upload"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInputMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      inputMode === mode
                        ? "bg-zinc-700/80 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-400"
                    }`}
                  >
                    {mode === "youtube" ? i("tab_youtube") : i("tab_upload")}
                  </button>
                ))}
              </div>

              {/* YouTube input */}
              {inputMode === "youtube" && (
                <div className="mb-5">
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">{i("label_url")}</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 text-sm transition-all"
                    disabled={isProcessing}
                  />
                </div>
              )}

              {/* Upload input */}
              {inputMode === "upload" && (
                <div className="mb-5">
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">{i("label_file")}</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border rounded-xl p-6 text-center cursor-pointer transition-all ${
                      file
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-zinc-700/50 border-dashed hover:border-zinc-600 bg-zinc-800/30"
                    }`}
                  >
                    {previewUrl ? (
                      <video src={previewUrl} className="max-h-32 mx-auto rounded-lg mb-2" controls muted />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-zinc-500 text-xs">{i("label_upload_click")}</p>
                        <p className="text-zinc-700 text-[10px] mt-1">{i("label_upload_hint")}</p>
                      </>
                    )}
                    {file && <p className="text-[10px] text-zinc-600 mt-2">{file.name}</p>}
                    <input ref={fileRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                  </div>
                </div>
              )}

              {/* Custom prompt toggle */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-medium hover:text-zinc-400 transition-colors"
                >
                  <svg className={`w-3 h-3 transition-transform ${showPrompt ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {i("label_custom")}
                </button>
                {showPrompt && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={i("placeholder_prompt")}
                    rows={2}
                    className="w-full mt-2 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 text-sm resize-none transition-all"
                    disabled={isProcessing}
                  />
                )}
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isProcessing || isSubmitting}
                className="relative w-full py-3.5 rounded-xl font-semibold text-sm transition-all overflow-hidden disabled:cursor-not-allowed group"
              >
                <div className={`absolute inset-0 transition-opacity ${!canSubmit || isProcessing ? "opacity-0" : "opacity-100"}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" style={{ backgroundSize: "200% 200%", animation: "gradient-shift 3s ease infinite" }} />
                </div>
                <div className={`absolute inset-0 bg-zinc-800 transition-opacity ${!canSubmit || isProcessing ? "opacity-100" : "opacity-0"}`} />
                <span className={`relative z-10 ${!canSubmit || isProcessing ? "text-zinc-600" : "text-white"}`}>
                  {isSubmitting ? i("btn_sending") : isProcessing ? i("btn_generating") : i("btn_generate")}
                </span>
                {!isProcessing && canSubmit && !isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              {/* Processing state */}
              {isProcessing && (
                <div className="mt-5 space-y-4">
                  <div className="flex gap-1">
                    {(lang === "en" ? STEPS_EN : STEPS_JA).map((step, i) => {
                      const currentStep = getStepIndex(job?.progress || "");
                      const isActive = i === currentStep;
                      const isDone = i < currentStep;
                      return (
                        <div key={step.key} className="flex-1">
                          <div className={`h-1 rounded-full transition-all duration-500 ${
                            isDone ? "bg-gradient-to-r from-orange-500 to-red-500" :
                            isActive ? "bg-gradient-to-r from-orange-500 to-red-500 animate-pulse" :
                            "bg-zinc-800"
                          }`} />
                          <p className={`text-[9px] mt-1.5 text-center transition-colors ${
                            isActive ? "text-orange-400" : isDone ? "text-zinc-500" : "text-zinc-700"
                          }`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-xs text-zinc-500">{job?.progress}</p>
                </div>
              )}

              {/* Error */}
              {job?.status === "failed" && (
                <div className="mt-5 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <p className="text-red-400 text-xs font-medium">{job.error}</p>
                  <button type="button" onClick={reset} className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-400 underline underline-offset-2">
                    {i("btn_try_again")}
                  </button>
                </div>
              )}
            </div>

            {/* Subtle features list */}
            <div className="mt-8 grid grid-cols-3 gap-4 px-2">
              {[
                { label: i("feat_genre"), desc: i("feat_genre_desc") },
                { label: i("feat_clips"), desc: i("feat_clips_desc") },
                { label: i("feat_telop"), desc: i("feat_telop_desc") },
              ].map((f) => (
                <div key={f.label} className="text-center">
                  <p className="text-[10px] text-zinc-400 font-medium">{f.label}</p>
                  <p className="text-[9px] text-zinc-600 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
