import { signInAnonymously, type User } from 'firebase/auth';
import { getFirebaseAuth } from './config';
import { SessionManager } from '../auth/session';

let currentUser: User | null = null;
let totpUserId: string | null = null;

// Note: Firebase UIDの統一は必要なし
// データベースレイヤーでTOTPユーザーIDによるフィルタリングが既に実装済み
// 各ブラウザーは異なるFirebase UIDを持つが、同じTOTPユーザーIDを使用してデータにアクセス

export async function initializeTOTPAuth(userId: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    console.error('Firebase Auth not initialized');
    return null;
  }

  try {
    // TOTPユーザーIDを保存
    totpUserId = userId;
    SessionManager.saveSession(userId);
    
    // 既に認証済みの場合は現在のユーザーを返す
    if (auth.currentUser) {
      currentUser = auth.currentUser;
      return currentUser;
    }
    
    // 匿名認証を実行（Firebase UIDは毎回異なるが、TOTPユーザーIDでデータを管理）
    const userCredential = await signInAnonymously(auth);
    currentUser = userCredential.user;
    
    // 認証成功をログに記録
    console.log('Firebase auth initialized successfully', { 
      firebaseUid: currentUser?.uid, 
      totpUserId: userId 
    });
    
    return currentUser;
  } catch (error) {
    console.error('Firebase auth initialization failed:', error);
    
    // Firebase認証が失敗した場合でも、セッションが有効なら擬似ユーザーを作成
    if (userId) {
      const pseudoUser = {
        uid: userId,
        displayName: null,
        email: null,
        photoURL: null,
        emailVerified: false,
        isAnonymous: true,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        },
        providerData: [],
        refreshToken: '',
        tenantId: null
      } as User;
      
      currentUser = pseudoUser;
      console.log('Using pseudo user for offline mode', { totpUserId: userId });
      return pseudoUser;
    }
    
    return null;
  }
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || currentUser;
}

export function getCurrentTOTPUserId(): string | null {
  // セッションから取得を優先
  const sessionUserId = SessionManager.getSession();
  
  if (sessionUserId) {
    // セッションとメモリが不一致の場合は同期
    if (sessionUserId !== totpUserId) {
      console.log('Syncing TOTP User ID from session:', { sessionUserId, memoryUserId: totpUserId });
      totpUserId = sessionUserId;
    }
    return sessionUserId;
  }
  
  // セッションがない場合はメモリから
  if (totpUserId) {
    console.log('Using TOTP User ID from memory:', totpUserId);
    return totpUserId;
  }
  
  // どちらもない場合は最後の手段として直接ストレージから
  try {
    const storedUserId = typeof window !== 'undefined' ? 
      sessionStorage.getItem('auth_session') : null;
    if (storedUserId) {
      const session = JSON.parse(storedUserId);
      if (session?.userId && session?.timestamp) {
        const sessionAge = Date.now() - session.timestamp;
        if (sessionAge < 24 * 60 * 60 * 1000) { // 24時間以内
          console.log('Recovering TOTP User ID from storage:', session.userId);
          totpUserId = session.userId;
          return session.userId;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to recover TOTP User ID from storage:', error);
  }
  
  console.log('No TOTP User ID available');
  return null;
}

export async function ensureAuthenticated(): Promise<User | null> {
  // TOTPセッションの確認
  const sessionUserId = SessionManager.getSession();
  if (!sessionUserId) {
    console.log('No valid TOTP session found');
    return null;
  }

  // TOTPユーザーIDを同期
  if (sessionUserId !== totpUserId) {
    console.log('Syncing TOTP User ID:', { sessionUserId, currentTotpUserId: totpUserId });
    totpUserId = sessionUserId;
  }

  // Firebase認証の確認
  const user = getCurrentUser();
  if (user) {
    console.log('Firebase user found:', { firebaseUid: user.uid, totpUserId: sessionUserId });
    return user;
  }
  
  // セッションはあるがFirebase認証がない場合は再認証を試行
  try {
    console.log('Attempting Firebase re-authentication for session:', sessionUserId);
    const authenticatedUser = await initializeTOTPAuth(sessionUserId);
    if (authenticatedUser) {
      console.log('Firebase re-authentication successful');
      return authenticatedUser;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase auth:', error);
  }
  
  // Firebase認証が失敗した場合でも、有効なセッションがあれば擬似的なユーザーオブジェクトを返す
  console.log('Creating pseudo user for session:', sessionUserId);
  const pseudoUser = {
    uid: sessionUserId,
    displayName: null,
    email: null,
    photoURL: null,
    emailVerified: false,
    isAnonymous: true,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    },
    providerData: [],
    refreshToken: '',
    tenantId: null,
    getIdToken: async () => sessionUserId // TOTPユーザーIDをトークンとして使用
  } as User;
  
  currentUser = pseudoUser;
  totpUserId = sessionUserId;
  console.log('Pseudo user created successfully');
  return pseudoUser;
}

export function signOut(): void {
  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    auth.signOut();
  }
  currentUser = null;
  totpUserId = null;
  SessionManager.clearSession();
}

// 下位互換性のため残す（既存コード用）
export async function initializeAuth(): Promise<User | null> {
  console.warn('initializeAuth is deprecated. Use initializeTOTPAuth instead.');
  return null;
}