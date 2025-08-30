const SPEECH_ENABLED_KEY = "quicknote-speech-enabled";
const SPEECH_AUTO_SUBMIT_KEY = "quicknote-speech-auto-submit";
const SPEECH_LANGUAGE_KEY = "quicknote-speech-language";

export function getSpeechEnabled(): boolean {
  if (typeof window === "undefined") return true; // SSR対応
  
  const saved = localStorage.getItem(SPEECH_ENABLED_KEY);
  return saved !== null ? JSON.parse(saved) : true; // デフォルトはON
}

export function setSpeechEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(SPEECH_ENABLED_KEY, JSON.stringify(enabled));
  
  // カスタムイベントを発火して他のコンポーネントに変更を通知
  window.dispatchEvent(new CustomEvent("speechSettingChanged"));
}

export function getSpeechAutoSubmit(): boolean {
  if (typeof window === "undefined") return false; // SSR対応
  
  const saved = localStorage.getItem(SPEECH_AUTO_SUBMIT_KEY);
  return saved !== null ? JSON.parse(saved) : false; // デフォルトはOFF
}

export function setSpeechAutoSubmit(enabled: boolean): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(SPEECH_AUTO_SUBMIT_KEY, JSON.stringify(enabled));
  
  // カスタムイベントを発火して他のコンポーネントに変更を通知
  window.dispatchEvent(new CustomEvent("speechSettingChanged"));
}

export function getSpeechLanguage(): string {
  if (typeof window === "undefined") return "ja-JP"; // SSR対応
  
  const saved = localStorage.getItem(SPEECH_LANGUAGE_KEY);
  return saved || "ja-JP"; // デフォルトは日本語
}

export function setSpeechLanguage(language: string): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(SPEECH_LANGUAGE_KEY, language);
  
  // カスタムイベントを発火して他のコンポーネントに変更を通知
  window.dispatchEvent(new CustomEvent("speechSettingChanged"));
}

export const SUPPORTED_LANGUAGES = [
  { code: "ja-JP", name: "日本語" },
  { code: "en-US", name: "English" },
  { code: "ko-KR", name: "한국어" },
  { code: "zh-CN", name: "中文（简体）" },
] as const;