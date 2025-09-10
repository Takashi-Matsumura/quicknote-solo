"use client";

import Logger from '@/lib/utils/logger';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  prompt_parent_id?: string;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string;
  locale?: string;
}

interface GoogleCredentialResponse {
  credential: string;  // JWT ID token
  select_by?: string;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}

export interface GoogleAuthProfile {
  id: string;          // Google unique ID
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  profile?: GoogleAuthProfile;
  error?: string;
  accessToken?: string;
}

export class GoogleAuthService {
  // 環境変数へのアクセスを安定化
  private static getClientID(): string {
    // Next.js環境変数の正しい取得方法
    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const hardcoded = '461066488430-7iklgpsaaotq894ab6q18s21aisnfcqu.apps.googleusercontent.com';
    
    // 環境変数が設定されている場合はそれを使用、そうでなければハードコード値
    return envClientId && envClientId !== 'your_google_client_id_here' ? envClientId : hardcoded;
  }
  
  private static get CLIENT_ID(): string {
    return this.getClientID();
  }
  private static readonly SCRIPT_URL = 'https://accounts.google.com/gsi/client';
  private static readonly BACKUP_SCRIPT_URL = 'https://apis.google.com/js/api.js';
  private static isInitialized = false;
  private static currentProfile: GoogleAuthProfile | null = null;

  /**
   * Google Auth APIの初期化
   */
  static async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      Logger.warn('Google Auth: Window not available (SSR)');
      return false;
    }

    Logger.log('Checking CLIENT_ID...', { 
      hasClientId: !!this.CLIENT_ID, 
      clientIdLength: this.CLIENT_ID?.length || 0,
      clientIdStart: this.CLIENT_ID?.substring(0, 12) || 'undefined',
      rawClientId: this.CLIENT_ID,
      processEnv: {
        hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        googleClientIdLength: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.length || 0,
        allGoogleEnvs: Object.keys(process.env).filter(key => key.includes('GOOGLE'))
      }
    });

    // CLIENT_IDは常に有効な値が返されるため、この確認は不要
    Logger.log('Google Auth: Using CLIENT_ID', { 
      clientIdLength: this.CLIENT_ID.length,
      clientIdStart: this.CLIENT_ID.substring(0, 12) + '...',
      isFromEnv: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    if (this.isInitialized) {
      Logger.log('Google Auth already initialized');
      return true;
    }

    try {
      Logger.log('Initializing Google Auth with CLIENT_ID:', this.CLIENT_ID.substring(0, 20) + '...');
      
      // Next.js Script component でスクリプトが読み込まれるのを待つ
      await this.waitForGoogleAPI();
      
      // Google Auth の初期化
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: this.CLIENT_ID,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        
        this.isInitialized = true;
        Logger.log('Google Auth initialized successfully');
        return true;
      } else {
        throw new Error('Google accounts API not available');
      }
    } catch (error) {
      Logger.error('Failed to initialize Google Auth', error);
      return false;
    }
  }

  /**
   * Google APIが利用可能になるまで待機
   */
  private static waitForGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 増加
      
      const checkAPI = () => {
        Logger.log(`Checking Google API availability... (${attempts + 1}/${maxAttempts})`, {
          windowGoogle: !!window.google,
          googleAccounts: !!window.google?.accounts,
          googleAccountsId: !!window.google?.accounts?.id
        });
        
        if (window.google?.accounts?.id) {
          Logger.log('Google API is available');
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkAPI, 1000); // 1秒に延長
        } else {
          Logger.error('Google API failed to become available', {
            attempts,
            windowGoogle: !!window.google,
            googleAccounts: !!window.google?.accounts,
            googleAccountsId: !!window.google?.accounts?.id
          });
          reject(new Error('Google API not available'));
        }
      };
      
      // 少し遅延してから開始（Script読み込み完了を待つ）
      setTimeout(checkAPI, 2000);
    });
  }

  /**
   * Google Scriptの動的読み込み
   */
  private static loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に読み込み済みのスクリプトをチェック
      const existingScript = document.querySelector(`script[src="${this.SCRIPT_URL}"]`);
      if (existingScript) {
        // 既に読み込み済みの場合、Google APIが利用可能かチェック
        if (window.google?.accounts?.id) {
          resolve();
        } else {
          // APIがまだ初期化されていない場合、少し待つ
          setTimeout(() => {
            if (window.google?.accounts?.id) {
              resolve();
            } else {
              reject(new Error('Google API loaded but not initialized'));
            }
          }, 1000);
        }
        return;
      }

      Logger.log('Loading Google Auth script...');
      const script = document.createElement('script');
      script.src = this.SCRIPT_URL;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        Logger.log('Google Auth script loaded, waiting for API initialization...');
        // スクリプト読み込み後、APIの初期化を待つ
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkAPI = () => {
          if (window.google?.accounts?.id) {
            Logger.log('Google API initialized successfully');
            resolve();
          } else if (attempts < maxAttempts) {
            attempts++;
            Logger.log(`Waiting for Google API initialization... (${attempts}/${maxAttempts})`);
            setTimeout(checkAPI, 1000); // 待機時間を延長
          } else {
            Logger.error('Google API failed to initialize after loading', {
              attempts,
              windowGoogle: !!window.google,
              googleAccounts: !!window.google?.accounts,
              googleAccountsId: !!window.google?.accounts?.id
            });
            reject(new Error('Google API failed to initialize after loading'));
          }
        };
        
        // 開発環境ではより長く待機
        setTimeout(checkAPI, 3000);
      };
      
      script.onerror = (event) => {
        Logger.error('Failed to load Google Auth script', { 
          event, 
          url: this.SCRIPT_URL,
          navigator: {
            userAgent: navigator.userAgent,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled
          }
        });
        reject(new Error('Failed to load Google Auth script'));
      };
      
      // CORSやネットワークの問題を回避するため属性を設定
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer-when-downgrade';
      script.integrity = '';  // IntegrityCheckを無効化
      script.type = 'text/javascript';
      
      document.head.appendChild(script);
    });
  }

  /**
   * ワンタップログインの表示
   */
  static showOneTap(): void {
    if (!this.isInitialized) {
      Logger.warn('Google Auth not initialized');
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          Logger.log('Google One Tap not displayed:', notification.getDismissedReason());
        } else if (notification.isSkippedMoment()) {
          Logger.log('Google One Tap skipped');
        } else if (notification.isDismissedMoment()) {
          Logger.log('Google One Tap dismissed:', notification.getDismissedReason());
        }
      });
    }
  }

  /**
   * サインインボタンのレンダリング
   */
  static renderButton(element: HTMLElement, config?: Partial<GoogleButtonConfig>): void {
    if (!this.isInitialized) {
      Logger.warn('Google Auth not initialized');
      return;
    }

    const defaultConfig: GoogleButtonConfig = {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: '320',
      ...config
    };

    if (window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(element, defaultConfig);
    }
  }

  /**
   * Google認証レスポンスの処理
   */
  private static async handleCredentialResponse(response: GoogleCredentialResponse): Promise<void> {
    try {
      const profile = await this.parseJWTToken(response.credential);
      
      if (profile) {
        this.currentProfile = profile;
        Logger.log('Google Auth successful', { 
          email: profile.email, 
          name: profile.name,
          id: profile.id.substring(0, 8) + '...' 
        });

        // カスタムイベントを発火してアプリケーションに通知
        const authEvent = new CustomEvent('googleAuthSuccess', {
          detail: { profile, credential: response.credential }
        });
        window.dispatchEvent(authEvent);
      } else {
        throw new Error('Failed to parse profile from JWT');
      }
    } catch (error) {
      Logger.error('Google Auth response handling failed', error);
      
      const authEvent = new CustomEvent('googleAuthError', {
        detail: { error: 'Authentication failed' }
      });
      window.dispatchEvent(authEvent);
    }
  }

  /**
   * JWTトークンの解析
   */
  private static async parseJWTToken(credential: string): Promise<GoogleAuthProfile | null> {
    try {
      // JWT の payload 部分をデコード (Base64URL)
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      // Base64URL を Base64 に変換
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      const profile = JSON.parse(decoded);

      // 必要なフィールドの検証
      if (!profile.sub || !profile.email) {
        throw new Error('Invalid profile data');
      }

      return {
        id: profile.sub,           // Google unique ID
        email: profile.email,
        name: profile.name || profile.email,
        picture: profile.picture,
        verified_email: profile.email_verified,
        given_name: profile.given_name,
        family_name: profile.family_name,
        locale: profile.locale,
      };
    } catch (error) {
      Logger.error('JWT parsing failed', error);
      return null;
    }
  }

  /**
   * 現在のプロファイル取得
   */
  static getCurrentProfile(): GoogleAuthProfile | null {
    return this.currentProfile;
  }

  /**
   * ログアウト
   */
  static signOut(): void {
    this.currentProfile = null;
    
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }

    // セッションストレージからGoogle関連データを削除
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('google_auth_profile');
      sessionStorage.removeItem('google_access_token');
    }

    Logger.log('Google Auth signed out');

    // カスタムイベントを発火
    const authEvent = new CustomEvent('googleAuthSignOut');
    window.dispatchEvent(authEvent);
  }

  /**
   * 認証状態の確認
   */
  static isAuthenticated(): boolean {
    return this.currentProfile !== null;
  }

  /**
   * プロファイルの永続化
   */
  static saveProfile(profile: GoogleAuthProfile, credential: string): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('google_auth_profile', JSON.stringify(profile));
      sessionStorage.setItem('google_access_token', credential);
      this.currentProfile = profile;
    } catch (error) {
      Logger.error('Failed to save Google profile', error);
    }
  }

  /**
   * 保存されたプロファイルの復元
   */
  static restoreProfile(): GoogleAuthProfile | null {
    if (typeof window === 'undefined') return null;

    try {
      const savedProfile = sessionStorage.getItem('google_auth_profile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        this.currentProfile = profile;
        return profile;
      }
    } catch (error) {
      Logger.error('Failed to restore Google profile', error);
    }

    return null;
  }

  /**
   * アクセストークンの取得
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('google_access_token');
  }
}