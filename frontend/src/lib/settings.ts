/**
 * Buzzlit user settings - persisted in localStorage.
 */

export type TelopStyle = "auto" | "variety" | "news" | "drama";
export type OutputQuality = "fast" | "balanced" | "quality";

export type Settings = {
  // Language
  language: string;        // Whisper transcription language code
  uiLanguage: string;      // UI language
  captionLanguage: string; // AI caption output language

  // Video output
  telopStyle: TelopStyle;
  outputQuality: OutputQuality;
  maxClips: number;         // 1-5
  clipDuration: number;     // target seconds per clip (15-60)
  addBgm: boolean;
  bgmVolume: number;        // 0-100

  // Telop
  telopFontSize: "small" | "medium" | "large";
  showHookText: boolean;

  // Export
  watermark: boolean;
  autoDownload: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  language: "ja",
  uiLanguage: "ja",
  captionLanguage: "ja",
  telopStyle: "auto",
  outputQuality: "balanced",
  maxClips: 3,
  clipDuration: 45,
  addBgm: true,
  bgmVolume: 15,
  telopFontSize: "medium",
  showHookText: true,
  watermark: false,
  autoDownload: false,
};

export const LANGUAGES = [
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "en", label: "English", native: "English" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "auto", label: "Auto-detect", native: "Auto" },
] as const;

export const UI_LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
] as const;

const STORAGE_KEY = "buzzlit-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
