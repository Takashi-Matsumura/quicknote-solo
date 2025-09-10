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
    } catch (_error) {
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
import SecureStorage from '@/lib/utils/secureStorage';
import DeviceAuthManager from './deviceAuth';
import Logger from '@/lib/utils/logger';

// レガシーキーとの互換性のため保持
const TOTP_SECRET_KEY = 'totp_secret';
const TOTP_USER_ID_KEY = 'totp_user_id';

export const getTOTPSecret = (): string | null => {
  // マイグレーションを自動実行
  SecureStorage.migrateFromPlaintext();
  
  // 暗号化されたデータを取得を試行
  let secret = SecureStorage.getTOTPSecret();
  
  // 取得できない場合は復旧を試行
  if (!secret) {
    console.log('Encrypted TOTP secret not found, attempting recovery...');
    const recovery = SecureStorage.attemptDataRecovery();
    if (recovery.secret) {
      console.log('TOTP secret recovered from fallback');
      // 復旧したデータを再暗号化して保存
      SecureStorage.setTOTPSecret(recovery.secret);
      secret = recovery.secret;
    } else {
      // 最後の手段：直接レガシーキーから読み込み
      if (typeof window !== 'undefined') {
        const legacySecret = localStorage.getItem(TOTP_SECRET_KEY);
        if (legacySecret) {
          console.log('Using legacy TOTP secret as fallback');
          SecureStorage.setTOTPSecret(legacySecret);
          secret = legacySecret;
        }
      }
    }
  }
  
  return secret;
};

export const getTOTPUserId = (): string | null => {
  SecureStorage.migrateFromPlaintext();
  
  // 暗号化されたデータを取得を試行
  let userId = SecureStorage.getTOTPUserId();
  
  // 取得できない場合は復旧を試行
  if (!userId) {
    console.log('Encrypted TOTP user ID not found, attempting recovery...');
    const recovery = SecureStorage.attemptDataRecovery();
    if (recovery.userId) {
      console.log('TOTP user ID recovered from fallback');
      // 復旧したデータを再暗号化して保存
      SecureStorage.setTOTPUserId(recovery.userId);
      userId = recovery.userId;
    } else {
      // 最後の手段：直接レガシーキーから読み込み
      if (typeof window !== 'undefined') {
        const legacyUserId = localStorage.getItem(TOTP_USER_ID_KEY);
        if (legacyUserId) {
          console.log('Using legacy TOTP user ID as fallback');
          SecureStorage.setTOTPUserId(legacyUserId);
          userId = legacyUserId;
        }
      }
    }
  }
  
  return userId;
};

export const loginWithTOTP = async (secret: string): Promise<{
  success: boolean;
  requiresDeviceRegistration?: boolean;
  deviceName?: string;
  error?: string;
}> => {
  try {
    // TOTP secretの検証
    if (!TOTPService.verifyTOTP(secret)) {
      Logger.warn('TOTP verification failed');
      return { success: false, error: 'TOTP認証に失敗しました' };
    }

    // ユーザーIDを生成
    const userId = TOTPService.generateUserIdFromSecret(secret);
    
    // デバイス認証の検証
    const deviceAuth = await DeviceAuthManager.verifyDeviceAuth(userId);
    
    if (!deviceAuth.isValid) {
      if (deviceAuth.isNewDevice) {
        Logger.warn('Login attempt from unregistered device', { userId, deviceName: deviceAuth.deviceName });
        
        return { 
          success: false, 
          requiresDeviceRegistration: true,
          deviceName: deviceAuth.deviceName,
          error: `未登録のデバイスからのアクセスです: ${deviceAuth.deviceName}`
        };
      } else {
        Logger.error('Device authentication failed', undefined, { userId });
        return { success: false, error: 'デバイス認証に失敗しました' };
      }
    }

    // 認証成功：データを保存
    SecureStorage.setTOTPSecret(secret);
    SecureStorage.setTOTPUserId(userId);
    
    // セッションを保存
    SessionManager.saveSession(userId);
    
    // TOTP専用のFirebase認証を実行
    await initializeTOTPAuth(userId);
    
    Logger.log('Login successful', { userId, deviceRegistered: true });
    
    return { success: true };
  } catch (error) {
    Logger.error('Login failed with unexpected error', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

export const logoutTOTP = () => {
  if (typeof window === 'undefined') return;
  // シークレットキーは残したまま、セッションのみクリア
  // localStorage.removeItem(TOTP_SECRET_KEY);  // シークレットキーは残す
  // localStorage.removeItem(TOTP_USER_ID_KEY); // ユーザーIDは残す
  SessionManager.clearSession();
};

export const registerDeviceAndLogin = async (secret: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // TOTP secretの検証
    if (!TOTPService.verifyTOTP(secret)) {
      Logger.warn('TOTP verification failed during device registration');
      return { success: false, error: 'TOTP認証に失敗しました' };
    }

    // ユーザーIDを生成
    const userId = TOTPService.generateUserIdFromSecret(secret);
    
    // デバイスを登録
    const deviceRegistered = DeviceAuthManager.registerCurrentDevice(userId);
    if (!deviceRegistered) {
      Logger.error('Device registration failed', undefined, { userId });
      return { success: false, error: 'デバイス登録に失敗しました' };
    }

    // 認証データを保存
    SecureStorage.setTOTPSecret(secret);
    SecureStorage.setTOTPUserId(userId);
    
    // セッションを保存
    SessionManager.saveSession(userId);
    
    // TOTP専用のFirebase認証を実行
    await initializeTOTPAuth(userId);
    
    Logger.log('Device registered and login successful', { userId });
    
    return { success: true };
  } catch (error) {
    Logger.error('Device registration and login failed', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

export const getRegisteredDevices = (userId?: string) => {
  const actualUserId = userId || getTOTPUserId();
  if (!actualUserId) return [];
  
  return DeviceAuthManager.getRegisteredDevices(actualUserId);
};

export const removeDevice = (deviceId: string, userId?: string): boolean => {
  const actualUserId = userId || getTOTPUserId();
  if (!actualUserId) return false;
  
  return DeviceAuthManager.removeDevice(actualUserId, deviceId);
};

export const resetTOTPAuth = () => {
  // TOTP認証を完全にリセット（暗号化されたシークレットキーも削除）
  SecureStorage.clearTOTPData();
  
  // デバイス登録も削除
  const userId = getTOTPUserId();
  if (userId) {
    DeviceAuthManager.clearAllDevices(userId);
  }
  
  // レガシーデータも削除
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOTP_SECRET_KEY);
    localStorage.removeItem(TOTP_USER_ID_KEY);
  }
  
  SessionManager.clearSession();
  
  Logger.log('TOTP auth completely reset');
};