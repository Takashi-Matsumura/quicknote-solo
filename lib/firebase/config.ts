import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

export function initializeFirebase(config: FirebaseConfig) {
  try {
    app = initializeApp(config);
    
    // Firestoreの設定（WebChannel Listen/Write 400エラー完全対策）
    // リアルタイム機能とキャッシュを完全に無効化
    try {
      db = initializeFirestore(app, {
        // リアルタイム接続を強制的に無効化
        experimentalForceLongPolling: true,  // WebChannelではなくXHRポーリングを使用
        ignoreUndefinedProperties: true,
        // ローカルキャッシュを完全無効化（メモデータの同期問題を解決）
        localCache: {
          kind: 'memory'
        }
      });
      // Firestore初期化成功
    } catch (initError) {
      // フォールバック：通常のgetFirestoreを使用
      db = getFirestore(app);
    }
    
    auth = getAuth(app);
    
    // Firebase Storage初期化
    try {
      storage = getStorage(app);
    } catch (storageError) {
      // Storage失敗でも他のサービスは使用可能
      storage = null;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

export function getFirebaseFirestore(): Firestore | null {
  return db;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  return storage;
}

export function isFirebaseInitialized(): boolean {
  return app !== null && db !== null && auth !== null;
}

export function isFirebaseStorageAvailable(): boolean {
  return storage !== null;
}

export function resetFirebase() {
  app = null;
  db = null;
  auth = null;
  storage = null;
}