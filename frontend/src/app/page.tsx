"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BUSINESS_TYPES = [
  { key: "restaurant", label: "飲食店", icon: "🍽️", desc: "レストラン・カフェ・居酒屋" },
  { key: "salon", label: "美容室", icon: "💇", desc: "ヘアサロン・ネイル・まつエク" },
  { key: "clinic", label: "整体院", icon: "💆", desc: "整体・接骨院・マッサージ" },
] as const;

type InputMode = "upload" | "youtube";

type JobResult = {
  job_id: string;
  output_url: string;
  title: string;
  description: string;
  hashtags: string[];
  hook: string;
  duration: number;
  source_title?: string;
  source_url?: string;
};

type JobStatus = {
  job_id: string;
  status: "processing" | "completed" | "failed";
  progress: string;
  result: JobResult | null;
  error: string | null;
};

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [businessType, setBusinessType] = useState("restaurant");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
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

    try {
      let res: Response;

      if (inputMode === "upload") {
        if (!file) return;
        const formData = new FormData();
        formData.append("video", file);
        formData.append("business_type", businessType);
        res = await fetch("/api/generate", { method: "POST", body: formData });
      } else {
        if (!youtubeUrl.trim()) return;
        res = await fetch("/api/generate-from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl.trim(), business_type: businessType }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
      }

      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data: JobStatus = await res.json();
      setJob(data);
    } catch { /* ignore */ }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    pollJob();
    const interval = setInterval(pollJob, 2000);
    return () => clearInterval(interval);
  }, [jobId, pollJob]);

  const isProcessing = job?.status === "processing";
  const result = job?.result;
  const canSubmit =
    inputMode === "upload" ? !!file : !!youtubeUrl.trim();

  const copyCaption = () => {
    if (!result) return;
    const text = `${result.description}\n\n${result.hashtags.map((t) => `#${t}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setJob(null);
    setJobId(null);
    setFile(null);
    setPreviewUrl(null);
    setYoutubeUrl("");
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Buzzlit
          </span>
        </h1>
        <p className="text-gray-400 text-lg">
          撮るだけで、お店がバズる。AIショート動画生成
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Input & Settings */}
        <div className="space-y-6">
          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">業種を選択</label>
            <div className="grid grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.key}
                  type="button"
                  onClick={() => setBusinessType(bt.key)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    businessType === bt.key
                      ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="text-2xl mb-1">{bt.icon}</div>
                  <div className="text-sm font-medium">{bt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode Tabs */}
          <div>
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "upload"
                    ? "bg-gray-700 text-white shadow"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                動画アップロード
              </button>
              <button
                type="button"
                onClick={() => setInputMode("youtube")}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === "youtube"
                    ? "bg-gray-700 text-white shadow"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                YouTube URL
              </button>
            </div>

            {/* Upload Mode */}
            {inputMode === "upload" && (
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-orange-500/50 bg-orange-500/5"
                    : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
                }`}
              >
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    className="max-h-48 mx-auto rounded-lg mb-3"
                    controls
                    muted
                  />
                ) : (
                  <div className="py-4">
                    <div className="text-4xl mb-3">📱</div>
                    <p className="text-gray-400">タップして動画を選択</p>
                    <p className="text-gray-600 text-sm mt-1">MP4, MOV (最大200MB)</p>
                  </div>
                )}
                {file && (
                  <p className="text-sm text-gray-400 mt-2">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* YouTube URL Mode */}
            {inputMode === "youtube" && (
              <div className="space-y-3">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  disabled={isProcessing}
                />
                <p className="text-gray-600 text-xs">
                  YouTube動画からAIがハイライトを選定してショート動画を生成します
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing || isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all"
          >
            {isSubmitting
              ? "送信中..."
              : isProcessing
              ? "AI が動画を生成中..."
              : inputMode === "youtube"
              ? "YouTube動画からショートを生成"
              : "動画を生成する"}
          </button>

          {/* Progress */}
          {isProcessing && (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">{job?.progress}</span>
              </div>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          )}

          {job?.status === "failed" && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-5">
              <p className="text-red-400 font-medium">エラーが発生しました</p>
              <p className="text-red-300 text-sm mt-1">{job.error}</p>
              <button
                type="button"
                onClick={reset}
                className="mt-3 text-sm text-orange-400 hover:text-orange-300"
              >
                もう一度試す
              </button>
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div>
          {result ? (
            <div className="space-y-5">
              {/* Video Preview */}
              <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] max-h-[500px]">
                <video
                  src={result.output_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Caption & Hashtags */}
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
                <h3 className="font-bold text-lg">{result.title}</h3>
                {result.source_title && (
                  <p className="text-gray-500 text-xs">
                    Source: {result.source_title}
                  </p>
                )}
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={copyCaption}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? "コピーしました!" : "キャプションをコピー"}
                  </button>
                  <a
                    href={result.output_url}
                    download
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-center transition-colors"
                  >
                    ダウンロード
                  </a>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  もう一度生成する
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-600 py-20">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-lg">動画をアップロードするか</p>
                <p className="text-lg">YouTube URLを入力すると</p>
                <p className="text-lg">ここにプレビューが表示されます</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-gray-700 text-sm">
        <p>Buzzlit - お店のSNS動画をAIで自動生成</p>
      </footer>
    </main>
  );
}
