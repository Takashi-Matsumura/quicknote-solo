import { TOTPService } from './totp';
import { initializeTOTPAuth } from '@/lib/firebase/auth';
import EnhancedSecureStorage from '@/lib/utils/enhancedSecureStorage';
import DeviceAuthManager from './deviceAuth';
import Logger from '@/lib/utils/logger';
import { GoogleAuthService, type GoogleAuthProfile } from './googleAuth';

interface AuthSession {
  userId: string;
  googleId: string;
  timestamp: number;
}

export class EnhancedSessionManager {
  private static readonly SESSION_KEY = 'enhanced_auth_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

  static saveSession(userId: string, googleProfile: GoogleAuthProfile): void {
    if (typeof window === 'undefined') return;
    
    const session: AuthSession = {
      userId,
      googleId: googleProfile.id,
      timestamp: Date.now()
    };
    
    // セッションをGoogle UIDで暗号化して保存
    try {
      const sessionData = JSON.stringify(session);
      EnhancedSecureStorage.encryptAndStore(this.SESSION_KEY, sessionData, googleProfile);
      
      Logger.log('Enhanced session saved', { 
        userId, 
        googleEmail: googleProfile.email,
        googleId: googleProfile.id.substring(0, 8) + '...'
      });
    } catch (error) {
      Logger.error('Failed to save enhanced session', error);
    }
  }

  static getSession(googleProfile?: GoogleAuthProfile): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = EnhancedSecureStorage.decryptAndGet(this.SESSION_KEY, googleProfile);
      if (!sessionData) return null;
      
      const session: AuthSession = JSON.parse(sessionData);
      
      // セッション有効期限チェック
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        this.clearSession();
        Logger.log('Enhanced session expired');
        return null;
      }
      
      // Google IDの一致確認
      if (googleProfile && session.googleId !== googleProfile.id) {
        this.clearSession();
        Logger.warn('Google ID mismatch - session cleared');
        return null;
      }
      
      return session.userId;
    } catch (error) {
      Logger.error('Enhanced session retrieval failed', error);
      this.clearSession();
      return null;
    }
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.SESSION_KEY);
      Logger.log('Enhanced session cleared');
    } catch (error) {
      Logger.error('Failed to clear enhanced session', error);
    }
  }

  static isAuthenticated(googleProfile?: GoogleAuthProfile): boolean {
    return this.getSession(googleProfile) !== null;
  }
}

// 統合認証関数
export const getTOTPSecret = (googleProfile?: GoogleAuthProfile): string | null => {
  return EnhancedSecureStorage.getTOTPSecret(googleProfile);
};

export const getTOTPUserId = (googleProfile?: GoogleAuthProfile): string | null => {
  return EnhancedSecureStorage.getTOTPUserId(googleProfile);
};

/**
 * 強化されたTOTPログイン（Google OAuth + TOTP + デバイス認証）
 */
export const loginWithEnhancedTOTP = async (
  secret: string, 
  googleProfile: GoogleAuthProfile
): Promise<{
  success: boolean;
  requiresDeviceRegistration?: boolean;
  deviceName?: string;
  error?: string;
}> => {
  try {
    Logger.log('Enhanced TOTP login started', { 
      googleEmail: googleProfile.email,
      googleId: googleProfile.id.substring(0, 8) + '...'
    });

    // 1. TOTP秘密鍵の検証
    if (!TOTPService.verifyTOTP(secret)) {
      Logger.warn('TOTP verification failed in enhanced login');
      return { success: false, error: 'TOTP認証に失敗しました' };
    }

    // 2. ユーザーIDを生成（TOTP秘密鍵ベース）
    const userId = TOTPService.generateUserIdFromSecret(secret);
    
    // 3. デバイス認証の検証（Google UIDと組み合わせ）
    const enhancedDeviceAuth = await DeviceAuthManager.verifyDeviceAuth(userId + '_' + googleProfile.id);
    
    if (!enhancedDeviceAuth.isValid) {
      if (enhancedDeviceAuth.isNewDevice) {
        Logger.warn('Enhanced login: unregistered device', { 
          userId, 
          deviceName: enhancedDeviceAuth.deviceName,
          googleEmail: googleProfile.email
        });
        
        return { 
          success: false, 
          requiresDeviceRegistration: true,
          deviceName: enhancedDeviceAuth.deviceName,
          error: `未登録のデバイスからのアクセスです: ${enhancedDeviceAuth.deviceName}`
        };
      } else {
        Logger.error('Enhanced device authentication failed', undefined, { userId, googleEmail: googleProfile.email });
        return { success: false, error: 'デバイス認証に失敗しました' };
      }
    }

    // 4. 認証成功：強化暗号化でデータを保存
    EnhancedSecureStorage.setTOTPSecret(secret, googleProfile);
    EnhancedSecureStorage.setTOTPUserId(userId, googleProfile);
    EnhancedSecureStorage.setGoogleProfile(googleProfile);
    
    // 5. 強化セッションを保存
    EnhancedSessionManager.saveSession(userId, googleProfile);
    
    // 6. Firebase認証を実行
    await initializeTOTPAuth(userId);
    
    Logger.log('Enhanced login successful', { 
      userId, 
      googleEmail: googleProfile.email,
      deviceRegistered: true,
      securityLevel: 'Enterprise'
    });
    
    return { success: true };
  } catch (error) {
    Logger.error('Enhanced login failed with unexpected error', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * 強化されたデバイス登録とログイン
 */
export const registerDeviceAndLoginEnhanced = async (
  secret: string,
  googleProfile: GoogleAuthProfile
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    Logger.log('Enhanced device registration started', { 
      googleEmail: googleProfile.email,
      googleId: googleProfile.id.substring(0, 8) + '...'
    });

    // TOTP秘密鍵の検証
    if (!TOTPService.verifyTOTP(secret)) {
      Logger.warn('TOTP verification failed during enhanced device registration');
      return { success: false, error: 'TOTP認証に失敗しました' };
    }

    // ユーザーIDを生成
    const userId = TOTPService.generateUserIdFromSecret(secret);
    
    // Google UIDと組み合わせたデバイス登録
    const enhancedUserId = userId + '_' + googleProfile.id;
    const deviceRegistered = DeviceAuthManager.registerCurrentDevice(enhancedUserId);
    
    if (!deviceRegistered) {
      Logger.error('Enhanced device registration failed', undefined, { 
        userId, 
        googleEmail: googleProfile.email 
      });
      return { success: false, error: 'デバイス登録に失敗しました' };
    }

    // 強化暗号化でデータを保存
    EnhancedSecureStorage.setTOTPSecret(secret, googleProfile);
    EnhancedSecureStorage.setTOTPUserId(userId, googleProfile);
    EnhancedSecureStorage.setGoogleProfile(googleProfile);
    
    // 強化セッションを保存
    EnhancedSessionManager.saveSession(userId, googleProfile);
    
    // Firebase認証を実行
    await initializeTOTPAuth(userId);
    
    Logger.log('Enhanced device registration and login successful', { 
      userId, 
      googleEmail: googleProfile.email,
      securityLevel: 'Enterprise'
    });
    
    return { success: true };
  } catch (error) {
    Logger.error('Enhanced device registration and login failed', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
};

/**
 * 強化ログアウト
 */
export const logoutEnhanced = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // 強化セッションをクリア
    EnhancedSessionManager.clearSession();
    
    // Google認証をサインアウト
    GoogleAuthService.signOut();
    
    // 強化暗号化データは保持（再ログイン時に必要）
    // EnhancedSecureStorage.clearEnhancedData(); // 通常は実行しない
    
    Logger.log('Enhanced logout completed');
  } catch (error) {
    Logger.error('Enhanced logout failed', error);
  }
};

/**
 * 登録済みデバイス一覧取得（強化版）
 */
export const getRegisteredDevicesEnhanced = (googleProfile?: GoogleAuthProfile): unknown[] => {
  const userId = getTOTPUserId(googleProfile);
  if (!userId || !googleProfile) return [];
  
  const enhancedUserId = userId + '_' + googleProfile.id;
  return DeviceAuthManager.getRegisteredDevices(enhancedUserId);
};

/**
 * デバイス削除（強化版）
 */
export const removeDeviceEnhanced = (
  deviceId: string, 
  googleProfile?: GoogleAuthProfile
): boolean => {
  const userId = getTOTPUserId(googleProfile);
  if (!userId || !googleProfile) return false;
  
  const enhancedUserId = userId + '_' + googleProfile.id;
  return DeviceAuthManager.removeDevice(enhancedUserId, deviceId);
};

/**
 * 強化認証の完全リセット
 */
export const resetEnhancedAuth = (): void => {
  // 全ての強化データを削除
  EnhancedSecureStorage.clearEnhancedData();
  
  // レガシーデータも削除
  if (typeof window !== 'undefined') {
    localStorage.removeItem('totp_secret');
    localStorage.removeItem('totp_user_id');
    localStorage.removeItem('totp_secret_encrypted');
    localStorage.removeItem('totp_user_id_encrypted');
    localStorage.removeItem('qns_salt');
  }
  
  // セッションクリア
  EnhancedSessionManager.clearSession();
  
  // Google認証をサインアウト
  GoogleAuthService.signOut();
  
  Logger.log('Enhanced auth completely reset - maximum security cleared');
};