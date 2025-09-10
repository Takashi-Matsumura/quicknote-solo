import { createSettingsManager } from '../utils/settingsManager';

const locationSettingsManager = createSettingsManager<boolean>({
  key: 'quicknote-location-enabled',
  defaultValue: true,
  validator: (value): value is boolean => typeof value === 'boolean'
});

export function getLocationSetting(): boolean {
  return locationSettingsManager.get();
}

export function setLocationSetting(enabled: boolean): void {
  locationSettingsManager.set(enabled);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('locationSettingChanged'));
  }
}

export function subscribeToLocationSettings(callback: (enabled: boolean) => void): () => void {
  return locationSettingsManager.subscribe(callback);
}