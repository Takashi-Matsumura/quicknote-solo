const LOCATION_SETTING_KEY = "quicknote-location-enabled";

export function getLocationSetting(): boolean {
  if (typeof window === "undefined") return true; // SSR対応
  
  const saved = localStorage.getItem(LOCATION_SETTING_KEY);
  return saved !== null ? JSON.parse(saved) : true; // デフォルトはON
}

export function setLocationSetting(enabled: boolean): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem(LOCATION_SETTING_KEY, JSON.stringify(enabled));
  
  // カスタムイベントを発火して他のコンポーネントに変更を通知
  window.dispatchEvent(new CustomEvent("locationSettingChanged"));
}