"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  type Settings,
  type TelopStyle,
  type OutputQuality,
  LANGUAGES,
  UI_LANGUAGES,
  loadSettings,
  saveSettings,
} from "@/lib/settings";
import { t } from "@/lib/i18n";

type SectionProps = { title: string; children: React.ReactNode };
function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{title}</h2>
      <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/60 divide-y divide-zinc-800/40">
        {children}
      </div>
    </div>
  );
}

type RowProps = { label: string; desc?: string; children: React.ReactNode };
function Row({ label, desc, children }: RowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        {desc && <p className="text-[11px] text-zinc-600 mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

type SelectProps = { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };
function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-orange-500/40 min-w-[140px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

type ToggleProps = { checked: boolean; onChange: (v: boolean) => void };
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-zinc-700"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  if (!settings) return null;

  const lang = settings.uiLanguage;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const langOptions = LANGUAGES.map((l) => ({ value: l.code, label: `${l.native} (${l.label})` }));
  const uiLangOptions = UI_LANGUAGES.map((l) => ({ value: l.code, label: l.label }));

  const telopOptions: { value: string; label: string }[] = [
    { value: "auto", label: t("style_auto", lang) },
    { value: "variety", label: t("style_variety", lang) },
    { value: "news", label: t("style_news", lang) },
    { value: "drama", label: t("style_drama", lang) },
  ];

  const qualityOptions: { value: string; label: string }[] = [
    { value: "fast", label: t("quality_fast", lang) },
    { value: "balanced", label: t("quality_balanced", lang) },
    { value: "quality", label: t("quality_quality", lang) },
  ];

  const fontOptions: { value: string; label: string }[] = [
    { value: "small", label: t("font_small", lang) },
    { value: "medium", label: t("font_medium", lang) },
    { value: "large", label: t("font_large", lang) },
  ];

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative max-w-lg mx-auto px-4 py-8 sm:py-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-700/80 transition-colors"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold">{t("s_title", lang)}</h1>
          </div>
          {saved && (
            <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 animate-[float_0.3s_ease-out]">
              {t("s_saved", lang)}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Language */}
          <Section title={t("s_lang", lang)}>
            <Row label={t("s_ui_lang", lang)}>
              <Select value={settings.uiLanguage} onChange={(v) => update("uiLanguage", v)} options={uiLangOptions} />
            </Row>
            <Row label={t("s_transcription_lang", lang)} desc="Whisper STT">
              <Select value={settings.language} onChange={(v) => update("language", v)} options={langOptions} />
            </Row>
            <Row label={t("s_caption_lang", lang)} desc="AI output">
              <Select value={settings.captionLanguage} onChange={(v) => update("captionLanguage", v)} options={langOptions.filter((l) => l.value !== "auto")} />
            </Row>
          </Section>

          {/* Video Output */}
          <Section title={t("s_video", lang)}>
            <Row label={t("s_telop_style", lang)}>
              <Select value={settings.telopStyle} onChange={(v) => update("telopStyle", v as TelopStyle)} options={telopOptions} />
            </Row>
            <Row label={t("s_quality", lang)}>
              <Select value={settings.outputQuality} onChange={(v) => update("outputQuality", v as OutputQuality)} options={qualityOptions} />
            </Row>
            <Row label={t("s_max_clips", lang)}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={settings.maxClips}
                  onChange={(e) => update("maxClips", parseInt(e.target.value))}
                  className="w-24 accent-orange-500"
                />
                <span className="text-sm text-zinc-400 w-4 text-right">{settings.maxClips}</span>
              </div>
            </Row>
            <Row label={t("s_clip_duration", lang)}>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={settings.clipDuration}
                  onChange={(e) => update("clipDuration", parseInt(e.target.value))}
                  className="w-24 accent-orange-500"
                />
                <span className="text-sm text-zinc-400 w-12 text-right">{settings.clipDuration}{t("s_seconds", lang)}</span>
              </div>
            </Row>
          </Section>

          {/* Telop */}
          <Section title={t("s_telop", lang)}>
            <Row label={t("s_font_size", lang)}>
              <Select value={settings.telopFontSize} onChange={(v) => update("telopFontSize", v as "small" | "medium" | "large")} options={fontOptions} />
            </Row>
            <Row label={t("s_show_hook", lang)}>
              <Toggle checked={settings.showHookText} onChange={(v) => update("showHookText", v)} />
            </Row>
          </Section>

          {/* Audio */}
          <Section title={t("s_audio", lang)}>
            <Row label={t("s_bgm", lang)}>
              <Toggle checked={settings.addBgm} onChange={(v) => update("addBgm", v)} />
            </Row>
            {settings.addBgm && (
              <Row label={t("s_bgm_volume", lang)}>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={settings.bgmVolume}
                    onChange={(e) => update("bgmVolume", parseInt(e.target.value))}
                    className="w-24 accent-orange-500"
                  />
                  <span className="text-sm text-zinc-400 w-8 text-right">{settings.bgmVolume}%</span>
                </div>
              </Row>
            )}
          </Section>

          {/* Export */}
          <Section title={t("s_export", lang)}>
            <Row label={t("s_watermark", lang)} desc="Buzzlit logo overlay">
              <Toggle checked={settings.watermark} onChange={(v) => update("watermark", v)} />
            </Row>
            <Row label={t("s_auto_download", lang)}>
              <Toggle checked={settings.autoDownload} onChange={(v) => update("autoDownload", v)} />
            </Row>
          </Section>
        </div>
      </main>
    </div>
  );
}
