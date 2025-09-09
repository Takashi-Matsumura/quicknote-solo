import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { TOTP, Secret } from 'otpauth';

export interface TOTPSecret {
  ascii: string;
  hex: string;
  base32: string;
  otpauth_url?: string;
}

export interface BackupCode {
  code: string;
  used: boolean;
}

export class TOTPService {
  private static readonly ISSUER = 'QuickNote Solo';
  private static readonly DIGITS = 6;
  private static readonly STEP = 30;

  static generateSecret(label: string = 'User'): TOTPSecret {
    // 32バイトのランダムシークレット生成
    const secret = new Secret();
    
    // TOTP インスタンス作成
    const totp = new TOTP({
      issuer: this.ISSUER,
      label: label,
      algorithm: 'SHA1',
      digits: this.DIGITS,
      period: this.STEP,
      secret: secret
    });

    return {
      ascii: new TextDecoder().decode(secret.buffer),
      hex: Array.from(new Uint8Array(secret.buffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
      base32: secret.base32,
      otpauth_url: totp.toString()
    };
  }

  static async generateQRCode(secret: TOTPSecret): Promise<string> {
    if (!secret.otpauth_url) {
      throw new Error('OTPAuth URL is required for QR code generation');
    }
    
    return await QRCode.toDataURL(secret.otpauth_url);
  }

  static generateQRCodeUrl(secret: string, label: string = 'User'): string {
    return `otpauth://totp/${encodeURIComponent(this.ISSUER)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(this.ISSUER)}`;
  }

  static verifyToken(token: string, secret: string): boolean {
    try {
      // tokenが6桁の数字であることを確認
      const cleanToken = token.replace(/\s/g, '');
      if (!/^\d{6}$/.test(cleanToken)) {
        return false;
      }

      // Base32 文字列からSecretオブジェクトを作成
      const secretObj = Secret.fromBase32(secret);
      
      // TOTP インスタンス作成
      const totp = new TOTP({
        issuer: this.ISSUER,
        label: 'User',
        algorithm: 'SHA1',
        digits: this.DIGITS,
        period: this.STEP,
        secret: secretObj
      });

      // トークン検証（ウィンドウ1で前後の時間も許可）
      const delta = totp.validate({
        token: cleanToken,
        window: 1
      });

      const isValid = delta !== null;
      return isValid;
    } catch (error) {
      return false;
    }
  }

  static verifyTOTP(secret: string): boolean {
    try {
      const currentToken = this.generateToken(secret);
      return this.verifyToken(currentToken, secret);
    } catch (error) {
      return false;
    }
  }

  static generateToken(secret: string): string {
    try {
      // Base32 文字列からSecretオブジェクトを作成
      const secretObj = Secret.fromBase32(secret);
      
      // TOTP インスタンス作成
      const totp = new TOTP({
        issuer: this.ISSUER,
        label: 'User',
        algorithm: 'SHA1',
        digits: this.DIGITS,
        period: this.STEP,
        secret: secretObj
      });

      // 現在時刻のトークン生成
      return totp.generate();
    } catch (error) {
      return '000000'; // フォールバック値
    }
  }

  static generateBackupCodes(count: number = 10): BackupCode[] {
    const codes: BackupCode[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push({
        code: code,
        used: false
      });
    }
    
    return codes;
  }

  static formatSecret(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  static getTimeRemaining(): number {
    const now = Math.floor(Date.now() / 1000);
    return this.STEP - (now % this.STEP);
  }

  static generateUserIdFromSecret(secret: string): string {
    const userId = crypto.createHash('sha256').update(secret).digest('hex').substring(0, 16);
    return userId;
  }
}