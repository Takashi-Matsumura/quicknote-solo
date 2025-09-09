interface AuthSession {
  userId: string;
  timestamp: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'auth_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

  static saveSession(userId: string): void {
    if (typeof window === 'undefined') return;
    
    const session: AuthSession = {
      userId,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  static getSession(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;
      
      const session: AuthSession = JSON.parse(sessionData);
      
      // セッション有効期限チェック
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        this.clearSession();
        return null;
      }
      
      return session.userId;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
}

import { TOTPService } from './totp';
import { initializeTOTPAuth } from '@/lib/firebase/auth';

const TOTP_SECRET_KEY = 'totp_secret';
const TOTP_USER_ID_KEY = 'totp_user_id';

export const getTOTPSecret = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOTP_SECRET_KEY);
};

export const getTOTPUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOTP_USER_ID_KEY);
};

export const loginWithTOTP = async (secret: string): Promise<boolean> => {
  try {
    // TOTP secretの検証
    if (!TOTPService.verifyTOTP(secret)) {
      return false;
    }

    // ユーザーIDを生成
    const userId = TOTPService.generateUserIdFromSecret(secret);
    
    // セッションに保存
    localStorage.setItem(TOTP_SECRET_KEY, secret);
    localStorage.setItem(TOTP_USER_ID_KEY, userId);
    
    // TOTP専用のFirebase認証を実行
    await initializeTOTPAuth(userId);
    
    return true;
  } catch (error) {
    return false;
  }
};

export const logoutTOTP = () => {
  if (typeof window === 'undefined') return;
  // シークレットキーは残したまま、セッションのみクリア
  // localStorage.removeItem(TOTP_SECRET_KEY);  // シークレットキーは残す
  // localStorage.removeItem(TOTP_USER_ID_KEY); // ユーザーIDは残す
  SessionManager.clearSession();
};

export const resetTOTPAuth = () => {
  if (typeof window === 'undefined') return;
  // TOTP認証を完全にリセット（シークレットキーも削除）
  localStorage.removeItem(TOTP_SECRET_KEY);
  localStorage.removeItem(TOTP_USER_ID_KEY);
  SessionManager.clearSession();
};