import type { FirebaseConfig } from '../firebase/config';
import { createSettingsManager } from '../utils/settingsManager';

export type StorageType = 'local' | 'firebase';

export interface FirebaseSettings {
  enabled: boolean;
  config: FirebaseConfig | null;
}

const firebaseSettingsManager = createSettingsManager<FirebaseSettings>({
  key: 'firebase-settings',
  defaultValue: { enabled: false, config: null },
  validator: (value): value is FirebaseSettings => {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return typeof obj.enabled === 'boolean' &&
           (obj.config === null || typeof obj.config === 'object');
  }
});

const storageTypeManager = createSettingsManager<StorageType>({
  key: 'storage-type',
  defaultValue: 'local',
  validator: (value): value is StorageType => 
    value === 'local' || value === 'firebase'
});

export function getFirebaseSettings(): FirebaseSettings {
  // 環境変数からの設定を優先
  const envConfig = getFirebaseConfigFromEnv();
  if (envConfig) {
    return { enabled: true, config: envConfig };
  }

  return firebaseSettingsManager.get();
}

export function setFirebaseSettings(settings: FirebaseSettings): void {
  firebaseSettingsManager.set(settings);
  
  // カスタムイベントを発火して設定変更を通知
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('firebaseSettingChanged'));
  }
}

export function getStorageType(): StorageType {
  return storageTypeManager.get();
}

export function setStorageType(type: StorageType): void {
  storageTypeManager.set(type);
  
  // カスタムイベントを発火して設定変更を通知
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storageTypeChanged'));
  }
}

export function clearFirebaseSettings(): void {
  firebaseSettingsManager.clear();
  storageTypeManager.clear();
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('firebaseSettingChanged'));
    window.dispatchEvent(new Event('storageTypeChanged'));
  }
}

// 設定変更の購読
export function subscribeToFirebaseSettings(callback: (settings: FirebaseSettings) => void): () => void {
  return firebaseSettingsManager.subscribe(callback);
}

export function subscribeToStorageTypeChanges(callback: (type: StorageType) => void): () => void {
  return storageTypeManager.subscribe(callback);
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