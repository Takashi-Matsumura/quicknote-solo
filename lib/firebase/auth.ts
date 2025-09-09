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
    
    return currentUser;
  } catch (error) {
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
  return sessionUserId || totpUserId;
}

export async function ensureAuthenticated(): Promise<User | null> {
  // TOTPセッションの確認
  const sessionUserId = SessionManager.getSession();
  if (!sessionUserId) {
    console.log('No valid TOTP session found');
    return null;
  }

  // Firebase認証の確認
  const user = getCurrentUser();
  if (user) {
    totpUserId = sessionUserId;
    return user;
  }
  
  // セッションはあるがFirebase認証がない場合は再認証
  return await initializeTOTPAuth(sessionUserId);
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