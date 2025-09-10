import { createSettingsManager } from '../utils/settingsManager';

export interface SpeechSettings {
  enabled: boolean;
  autoSubmit: boolean;
  language: string;
}

const speechSettingsManager = createSettingsManager<SpeechSettings>({
  key: 'quicknote-speech-settings',
  defaultValue: {
    enabled: true,
    autoSubmit: false,
    language: 'ja-JP'
  },
  validator: (value): value is SpeechSettings => {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return typeof obj.enabled === 'boolean' &&
           typeof obj.autoSubmit === 'boolean' &&
           typeof obj.language === 'string';
  }
});

export function getSpeechSettings(): SpeechSettings {
  return speechSettingsManager.get();
}

export function getSpeechEnabled(): boolean {
  return speechSettingsManager.get().enabled;
}

export function setSpeechEnabled(enabled: boolean): void {
  const current = speechSettingsManager.get();
  speechSettingsManager.set({ ...current, enabled });
  notifySpeechSettingChanged();
}

export function getSpeechAutoSubmit(): boolean {
  return speechSettingsManager.get().autoSubmit;
}

export function setSpeechAutoSubmit(autoSubmit: boolean): void {
  const current = speechSettingsManager.get();
  speechSettingsManager.set({ ...current, autoSubmit });
  notifySpeechSettingChanged();
}

export function getSpeechLanguage(): string {
  return speechSettingsManager.get().language;
}

export function setSpeechLanguage(language: string): void {
  const current = speechSettingsManager.get();
  speechSettingsManager.set({ ...current, language });
  notifySpeechSettingChanged();
}

export function setSpeechSettings(settings: Partial<SpeechSettings>): void {
  const current = speechSettingsManager.get();
  speechSettingsManager.set({ ...current, ...settings });
  notifySpeechSettingChanged();
}

export function subscribeToSpeechSettings(callback: (settings: SpeechSettings) => void): () => void {
  return speechSettingsManager.subscribe(callback);
}

function notifySpeechSettingChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('speechSettingChanged'));
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: "ja-JP", name: "日本語" },
  { code: "en-US", name: "English" },
  { code: "ko-KR", name: "한국어" },
  { code: "zh-CN", name: "中文（简体）" },
] as const;