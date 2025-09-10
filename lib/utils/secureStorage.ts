import CryptoJS from 'crypto-js';

class SecureStorage {
  private static readonly SALT_KEY = 'qns_salt';
  private static readonly SECRET_KEY = 'totp_secret_encrypted';
  private static readonly USER_ID_KEY = 'totp_user_id_encrypted';

  private static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  private static getSalt(): string {
    if (typeof window === 'undefined') return '';
    
    let salt = localStorage.getItem(this.SALT_KEY);
    if (!salt) {
      salt = this.generateSalt();
      localStorage.setItem(this.SALT_KEY, salt);
    }
    return salt;
  }

  private static deriveKey(passphrase: string, salt: string): string {
    return CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  private static getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    // デバイス固有の情報を組み合わせてパスフレーズを生成（セッション要素を除去）
    const navigator = window.navigator;
    const screen = window.screen;
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      // デバイス固有の安定したID（localStorageに永続化）
      localStorage.getItem('device_id') || (() => {
        const deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
        return deviceId;
      })()
    ].join('|');

    return CryptoJS.SHA256(fingerprint).toString();
  }

  static encryptAndStore(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    try {
      const salt = this.getSalt();
      const deviceFingerprint = this.getDeviceFingerprint();
      const derivedKey = this.deriveKey(deviceFingerprint, salt);
      
      const encrypted = CryptoJS.AES.encrypt(value, derivedKey).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to encrypt and store:', error);
      throw new Error('暗号化に失敗しました');
    }
  }

  static decryptAndGet(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const salt = this.getSalt();
      const deviceFingerprint = this.getDeviceFingerprint();
      const derivedKey = this.deriveKey(deviceFingerprint, salt);
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, derivedKey);
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        // 復号化に失敗した場合は無効なデータとして削除
        localStorage.removeItem(key);
        return null;
      }
      
      return decryptedText;
    } catch (error) {
      console.warn('Failed to decrypt, removing corrupted data:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  // TOTP専用のメソッド
  static setTOTPSecret(secret: string): void {
    this.encryptAndStore(this.SECRET_KEY, secret);
  }

  static getTOTPSecret(): string | null {
    return this.decryptAndGet(this.SECRET_KEY);
  }

  static setTOTPUserId(userId: string): void {
    this.encryptAndStore(this.USER_ID_KEY, userId);
  }

  static getTOTPUserId(): string | null {
    return this.decryptAndGet(this.USER_ID_KEY);
  }

  static clearTOTPData(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.SECRET_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.SALT_KEY);
  }

  // 既存の平文データをマイグレーション
  static migrateFromPlaintext(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // 既存の平文データを確認
      const plaintextSecret = localStorage.getItem('totp_secret');
      const plaintextUserId = localStorage.getItem('totp_user_id');
      
      if (plaintextSecret || plaintextUserId) {
        console.log('Migrating plaintext TOTP data to encrypted storage');
        
        // 暗号化して保存
        if (plaintextSecret) {
          this.setTOTPSecret(plaintextSecret);
          localStorage.removeItem('totp_secret');
          console.log('TOTP secret migrated successfully');
        }
        
        if (plaintextUserId) {
          this.setTOTPUserId(plaintextUserId);
          localStorage.removeItem('totp_user_id');
          console.log('TOTP user ID migrated successfully');
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  // 暗号化データの復旧を試行（デバイスIDが変更された場合など）
  static attemptDataRecovery(): { secret: string | null; userId: string | null } {
    if (typeof window === 'undefined') return { secret: null, userId: null };

    console.log('Attempting TOTP data recovery...');
    
    // 平文データが残っている場合
    const plaintextSecret = localStorage.getItem('totp_secret');
    const plaintextUserId = localStorage.getItem('totp_user_id');
    
    if (plaintextSecret || plaintextUserId) {
      console.log('Found plaintext TOTP data, using as fallback');
      return { 
        secret: plaintextSecret, 
        userId: plaintextUserId 
      };
    }

    // バックアップキーの確認（将来的に実装可能）
    const backupSecret = localStorage.getItem('totp_secret_backup');
    const backupUserId = localStorage.getItem('totp_user_id_backup');
    
    if (backupSecret || backupUserId) {
      console.log('Found backup TOTP data');
      return { 
        secret: backupSecret, 
        userId: backupUserId 
      };
    }

    console.log('No recoverable TOTP data found');
    return { secret: null, userId: null };
  }
}

export default SecureStorage;