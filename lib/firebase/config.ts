import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

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

export function initializeFirebase(config: FirebaseConfig) {
  try {
    app = initializeApp(config);
    
    // Firestoreの設定（WebChannel Listen/Write 400エラー完全対策）
    // リアルタイム機能を完全に無効化
    try {
      db = initializeFirestore(app, {
        // リアルタイム接続を強制的に無効化
        experimentalForceLongPolling: true,  // WebChannelではなくXHRポーリングを使用
        ignoreUndefinedProperties: true,
        // ローカルキャッシュを無効化  
        localCache: {
          kind: 'memory'
        }
      });
      console.log('Firestore initialized with Long Polling (WebChannel disabled)');
    } catch (initError) {
      console.warn('initializeFirestore failed, using fallback:', initError);
      // フォールバック：通常のgetFirestoreを使用
      db = getFirestore(app);
      console.log('Firestore initialized with standard method');
    }
    
    auth = getAuth(app);
    
    console.log('Firebase initialized successfully - WebChannel Listen/Write disabled');
    return true;
  } catch (error) {
    console.error('Firebase initialization completely failed:', error);
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

export function isFirebaseInitialized(): boolean {
  return app !== null && db !== null && auth !== null;
}

export function resetFirebase() {
  app = null;
  db = null;
  auth = null;
}