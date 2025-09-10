import CryptoJS from 'crypto-js';
import { createSettingsManager } from '@/lib/utils/settingsManager';
import Logger from '@/lib/utils/logger';

export interface DeviceInfo {
  id: string;
  name: string;
  registeredAt: number;
  lastUsedAt: number;
  fingerprint: string;
  isCurrentDevice?: boolean;
}

export interface RegisteredDevices {
  [userId: string]: DeviceInfo[];
}

class DeviceAuthManager {
  private static readonly DEVICES_KEY = 'registered_devices_encrypted';
  private static readonly MAX_DEVICES = 10; // ユーザーあたりの最大デバイス数
  
  private static devicesManager = createSettingsManager<RegisteredDevices>({
    key: DeviceAuthManager.DEVICES_KEY,
    defaultValue: {},
    validator: (value): value is RegisteredDevices => {
      if (typeof value !== 'object' || value === null) return false;
      
      // 各ユーザーIDのデバイス配列を検証
      for (const [userId, devices] of Object.entries(value)) {
        if (typeof userId !== 'string' || !Array.isArray(devices)) return false;
        
        for (const device of devices) {
          if (typeof device !== 'object' || !device ||
              typeof device.id !== 'string' ||
              typeof device.name !== 'string' ||
              typeof device.registeredAt !== 'number' ||
              typeof device.lastUsedAt !== 'number' ||
              typeof device.fingerprint !== 'string') {
            return false;
          }
        }
      }
      return true;
    }
  });

  /**
   * 現在のデバイスの一意な指紋を生成
   */
  private static generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server-device';

    const navigator = window.navigator;
    const screen = window.screen;

    // ハードウェア情報を組み合わせ
    const hardwareInfo = [
      navigator.hardwareConcurrency || 0,
      screen.availWidth,
      screen.availHeight,
      screen.colorDepth,
      navigator.maxTouchPoints || 0,
      navigator.cookieEnabled.toString(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      // WebGL指紋
      this.getWebGLFingerprint(),
      // Canvas指紋（簡易版）
      this.getCanvasFingerprint()
    ].join('|');

    return CryptoJS.SHA256(hardwareInfo).toString();
  }

  /**
   * WebGL指紋の取得
   */
  private static getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      
      if (!gl) return 'no-webgl';
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      return CryptoJS.SHA256(`${vendor}|${renderer}`).toString().substring(0, 16);
    } catch (_error) {
      return 'webgl-error';
    }
  }

  /**
   * Canvas指紋の取得
   */
  private static getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'no-canvas';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test 🔒', 2, 2);
      
      return CryptoJS.SHA256(canvas.toDataURL()).toString().substring(0, 16);
    } catch (_error) {
      return 'canvas-error';
    }
  }

  /**
   * 永続的なデバイスIDを生成（初回のみ）
   */
  private static generateDeviceId(): string {
    // 指紋 + タイムスタンプ + ランダム値で一意性を保証
    const fingerprint = this.generateDeviceFingerprint();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    
    return CryptoJS.SHA256(`${fingerprint}|${timestamp}|${random}`).toString();
  }

  /**
   * デバイス名を生成
   */
  private static generateDeviceName(): string {
    if (typeof window === 'undefined') return 'Server Device';
    
    const navigator = window.navigator;
    const userAgent = navigator.userAgent;

    // OS検出
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // ブラウザ検出
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return `${os} - ${browser}`;
  }

  /**
   * 現在のデバイスIDを取得（なければ生成）
   */
  public static getCurrentDeviceId(): string {
    if (typeof window === 'undefined') return 'server-device';

    const deviceIdKey = 'device_id_persistent';
    let deviceId = localStorage.getItem(deviceIdKey);
    
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(deviceIdKey, deviceId);
      
      Logger.log('New device ID generated', { deviceId: deviceId.substring(0, 8) + '...' });
    }
    
    return deviceId;
  }

  /**
   * デバイスが登録済みかチェック
   */
  public static isDeviceRegistered(userId: string): boolean {
    const currentDeviceId = this.getCurrentDeviceId();
    const devices = this.devicesManager.get();
    const userDevices = devices[userId] || [];
    
    return userDevices.some(device => device.id === currentDeviceId);
  }

  /**
   * 新しいデバイスを登録
   */
  public static registerCurrentDevice(userId: string): boolean {
    try {
      const currentDeviceId = this.getCurrentDeviceId();
      const fingerprint = this.generateDeviceFingerprint();
      const deviceName = this.generateDeviceName();
      
      const devices = this.devicesManager.get();
      if (!devices[userId]) {
        devices[userId] = [];
      }

      // 既に登録済みかチェック
      if (devices[userId].some(device => device.id === currentDeviceId)) {
        Logger.warn('Device already registered', { userId, deviceId: currentDeviceId.substring(0, 8) + '...' });
        return true;
      }

      // 最大デバイス数チェック
      if (devices[userId].length >= this.MAX_DEVICES) {
        // 最も古いデバイスを削除
        devices[userId] = devices[userId]
          .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
          .slice(0, this.MAX_DEVICES - 1);
      }

      // 新しいデバイスを追加
      const newDevice: DeviceInfo = {
        id: currentDeviceId,
        name: deviceName,
        registeredAt: Date.now(),
        lastUsedAt: Date.now(),
        fingerprint,
        isCurrentDevice: true
      };

      devices[userId].push(newDevice);
      this.devicesManager.set(devices);

      Logger.log('Device registered successfully', { 
        userId, 
        deviceName, 
        deviceId: currentDeviceId.substring(0, 8) + '...' 
      });

      return true;
    } catch (error) {
      Logger.error('Failed to register device', error, { userId });
      return false;
    }
  }

  /**
   * デバイスの最終使用時間を更新
   */
  public static updateLastUsed(userId: string): void {
    try {
      const currentDeviceId = this.getCurrentDeviceId();
      const devices = this.devicesManager.get();
      
      if (!devices[userId]) return;

      const deviceIndex = devices[userId].findIndex(device => device.id === currentDeviceId);
      if (deviceIndex !== -1) {
        devices[userId][deviceIndex].lastUsedAt = Date.now();
        this.devicesManager.set(devices);
      }
    } catch (error) {
      Logger.error('Failed to update device last used time', error, { userId });
    }
  }

  /**
   * ユーザーの登録済みデバイス一覧を取得
   */
  public static getRegisteredDevices(userId: string): DeviceInfo[] {
    const devices = this.devicesManager.get();
    const userDevices = devices[userId] || [];
    const currentDeviceId = this.getCurrentDeviceId();
    
    return userDevices.map(device => ({
      ...device,
      isCurrentDevice: device.id === currentDeviceId
    }));
  }

  /**
   * デバイスを削除
   */
  public static removeDevice(userId: string, deviceId: string): boolean {
    try {
      const devices = this.devicesManager.get();
      if (!devices[userId]) return false;

      const initialLength = devices[userId].length;
      devices[userId] = devices[userId].filter(device => device.id !== deviceId);
      
      if (devices[userId].length < initialLength) {
        this.devicesManager.set(devices);
        
        Logger.log('Device removed successfully', { 
          userId, 
          deviceId: deviceId.substring(0, 8) + '...' 
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to remove device', error, { userId, deviceId });
      return false;
    }
  }

  /**
   * すべてのデバイスをクリア（緊急時用）
   */
  public static clearAllDevices(userId: string): boolean {
    try {
      const devices = this.devicesManager.get();
      delete devices[userId];
      this.devicesManager.set(devices);
      
      Logger.log('All devices cleared', { userId });
      return true;
    } catch (error) {
      Logger.error('Failed to clear devices', error, { userId });
      return false;
    }
  }

  /**
   * デバイス認証の検証
   */
  public static async verifyDeviceAuth(userId: string): Promise<{
    isValid: boolean;
    isNewDevice: boolean;
    deviceName?: string;
  }> {
    try {
      const isRegistered = this.isDeviceRegistered(userId);
      
      if (isRegistered) {
        // 登録済みデバイス：使用時間を更新
        this.updateLastUsed(userId);
        
        return {
          isValid: true,
          isNewDevice: false
        };
      } else {
        // 未登録デバイス：デバイス情報を返すがアクセス拒否
        const deviceName = this.generateDeviceName();
        
        Logger.warn('Unauthorized device access attempt', { 
          userId, 
          deviceName,
          deviceId: this.getCurrentDeviceId().substring(0, 8) + '...'
        });
        
        return {
          isValid: false,
          isNewDevice: true,
          deviceName
        };
      }
    } catch (error) {
      Logger.error('Device auth verification failed', error, { userId });
      
      return {
        isValid: false,
        isNewDevice: false
      };
    }
  }
}

export default DeviceAuthManager;