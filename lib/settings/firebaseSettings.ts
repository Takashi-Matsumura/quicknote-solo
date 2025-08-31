import type { FirebaseConfig } from '../firebase/config';

const FIREBASE_SETTINGS_KEY = 'firebase-settings';
const STORAGE_TYPE_KEY = 'storage-type';

export type StorageType = 'local' | 'firebase';

export interface FirebaseSettings {
  enabled: boolean;
  config: FirebaseConfig | null;
}

export function getFirebaseSettings(): FirebaseSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, config: null };
  }

  try {
    const settings = localStorage.getItem(FIREBASE_SETTINGS_KEY);
    if (!settings) {
      return { enabled: false, config: null };
    }
    
    return JSON.parse(settings);
  } catch (error) {
    console.error('Failed to load Firebase settings:', error);
    return { enabled: false, config: null };
  }
}

export function setFirebaseSettings(settings: FirebaseSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FIREBASE_SETTINGS_KEY, JSON.stringify(settings));
    
    // カスタムイベントを発火して設定変更を通知
    window.dispatchEvent(new Event('firebaseSettingChanged'));
  } catch (error) {
    console.error('Failed to save Firebase settings:', error);
  }
}

export function getStorageType(): StorageType {
  if (typeof window === 'undefined') return 'local';

  try {
    const type = localStorage.getItem(STORAGE_TYPE_KEY);
    return (type as StorageType) || 'local';
  } catch (error) {
    console.error('Failed to load storage type:', error);
    return 'local';
  }
}

export function setStorageType(type: StorageType): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_TYPE_KEY, type);
    
    // カスタムイベントを発火して設定変更を通知
    window.dispatchEvent(new Event('storageTypeChanged'));
  } catch (error) {
    console.error('Failed to save storage type:', error);
  }
}

export function clearFirebaseSettings(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(FIREBASE_SETTINGS_KEY);
    localStorage.removeItem(STORAGE_TYPE_KEY);
    
    window.dispatchEvent(new Event('firebaseSettingChanged'));
    window.dispatchEvent(new Event('storageTypeChanged'));
  } catch (error) {
    console.error('Failed to clear Firebase settings:', error);
  }
}