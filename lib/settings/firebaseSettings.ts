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

  // 環境変数からの設定を優先
  const envConfig = getFirebaseConfigFromEnv();
  if (envConfig) {
    return { enabled: true, config: envConfig };
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

// 環境変数からFirebase設定を読み込む
export function getFirebaseConfigFromEnv(): FirebaseConfig | null {
  if (typeof window === 'undefined') return null;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // すべての必須環境変数が設定されているかチェック
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

// 環境変数が設定されているかチェック
export function isFirebaseConfigInEnv(): boolean {
  return getFirebaseConfigFromEnv() !== null;
}