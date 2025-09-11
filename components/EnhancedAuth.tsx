"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TOTPService } from '@/lib/auth/totp';
import { GoogleAuthService, type GoogleAuthProfile } from '@/lib/auth/googleAuth';
import { 
  loginWithEnhancedTOTP, 
  registerDeviceAndLoginEnhanced,
  EnhancedSessionManager,
  getTOTPSecret,
  getTOTPUserId
} from '@/lib/auth/enhancedSession';
import EnhancedSecureStorage from '@/lib/utils/enhancedSecureStorage';
import { 
  HiDevicePhoneMobile, 
  HiKey, 
  HiCheckCircle,
  HiShieldCheck,
  HiExclamationTriangle
} from 'react-icons/hi2';
import Logger from '@/lib/utils/logger';

interface EnhancedAuthProps {
  onAuthSuccess: (secret: string, userId: string, googleProfile: GoogleAuthProfile) => void;
  onCancel?: () => void;
}

type AuthMode = 'google_signin' | 'device_choice' | 'secret_input' | 'totp_setup' | 'totp_verify' | 'device_registration' | 'migration';

export default function EnhancedAuth({ onAuthSuccess, onCancel }: EnhancedAuthProps) {
  const [mode, setMode] = useState<AuthMode>('google_signin');
  const [googleProfile, setGoogleProfile] = useState<GoogleAuthProfile | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [secretInput, setSecretInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceRegistrationInfo, setDeviceRegistrationInfo] = useState<{ deviceName?: string }>({});
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef<boolean>(false);

  const handleGoogleSignIn = useCallback(async (profile: GoogleAuthProfile) => {
    Logger.log('🚀 handleGoogleSignIn called - START', { 
      profile: { email: profile.email, name: profile.name, id: profile.id?.substring(0, 8) + '...' },
      userAgent: navigator.userAgent,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      currentMode: mode
    });
    
    setGoogleProfile(profile);
    setIsLoading(true);
    setError('');

    try {
      Logger.log('✅ Google authentication successful', { 
        email: profile.email, 
        name: profile.name,
        id: profile.id?.substring(0, 8) + '...'
      });

      // レガシーデータの移行チェック
      Logger.log('🔄 Checking legacy data migration...');
      const needsMigration = EnhancedSecureStorage.migrateFromLegacyStorage(profile);
      Logger.log('🔄 Migration check result', { needsMigration });
      
      if (needsMigration) {
        Logger.log('📱 Migration required - switching to migration mode');
        setMode('migration');
        setIsLoading(false);
        return;
      }

      // 既存のTOTP設定を確認（強化版ストレージを使用）
      Logger.log('🔐 Checking existing TOTP settings...');
      const existingSecret = getTOTPSecret(profile);
      const existingUserId = getTOTPUserId(profile);
      
      Logger.log('🔐 TOTP settings check result', { 
        hasExistingSecret: !!existingSecret, 
        hasExistingUserId: !!existingUserId,
        secretLength: existingSecret?.length,
        userIdLength: existingUserId?.length
      });

      if (existingSecret && existingUserId) {
        // 既存設定がある場合、セッション確認
        Logger.log('🔍 Checking existing session validity...');
        const isValidSession = EnhancedSessionManager.isAuthenticated(profile);
        Logger.log('🔍 Session check result', { isValidSession });
        
        if (isValidSession) {
          // 有効なセッションがある場合、直接認証成功
          Logger.log('✅ Valid session found - calling onAuthSuccess', {
            secret: existingSecret?.substring(0, 8) + '...',
            userId: existingUserId?.substring(0, 8) + '...',
            email: profile.email
          });
          
          // モバイルデバッグ用：onAuthSuccess呼び出し前後をログ
          Logger.log('📱 MOBILE DEBUG: About to call onAuthSuccess');
          onAuthSuccess(existingSecret, existingUserId, profile);
          Logger.log('📱 MOBILE DEBUG: onAuthSuccess called successfully');
          return;
        } else {
          // セッション期限切れの場合、TOTP認証
          Logger.log('⏰ Session expired - switching to TOTP verify mode');
          setSecret(existingSecret);
          setMode('totp_verify');
        }
      } else {
        // 新規設定が必要 - デバイス選択画面に移行
        Logger.log('🆕 No existing settings - switching to device choice mode');
        setMode('device_choice');
      }
    } catch (error) {
      Logger.error('❌ Google sign-in handling failed', error, {
        userAgent: navigator.userAgent,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
        profileEmail: profile?.email
      });
      setError('Google認証の処理に失敗しました');
    } finally {
      Logger.log('🏁 handleGoogleSignIn completed - setIsLoading(false)');
      setIsLoading(false);
    }
  }, [onAuthSuccess, mode]);

  // Google認証の初期化
  useEffect(() => {
    const initGoogleAuth = async () => {
      // 重複初期化を防ぐ
      if (isInitializingRef.current) {
        Logger.log('Google Auth initialization already in progress, skipping...');
        return;
      }
      
      isInitializingRef.current = true;
      
      Logger.log('Starting Google Auth initialization...');
      Logger.log('Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        googleClientIdValue: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        allPublicEnvs: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
      });
      setIsLoading(true);
      
      try {
        const initialized = await GoogleAuthService.initialize();
        
        if (initialized) {
          Logger.log('Google Auth initialized, rendering button...');
          
          // DOM要素が準備されるまで待機（retry付き）
          const renderButton = (attempts = 0) => {
            if (googleButtonRef.current) {
              GoogleAuthService.renderButton(googleButtonRef.current, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: '100%'
              });
              Logger.log('Google Auth button rendered successfully');
            } else if (attempts < 10) { // 最大10回リトライ（1秒間）
              setTimeout(() => renderButton(attempts + 1), 100);
            } else {
              Logger.error('Google button container ref not available after retries');
              setError('認証ボタンの表示に失敗しました。ページを再読み込みしてください。');
            }
          };
          
          renderButton();
        } else {
          Logger.error('Google Auth initialization failed');
          setError('Google認証の初期化に失敗しました。NEXT_PUBLIC_GOOGLE_CLIENT_IDが正しく設定されているか確認してください。');
        }
      } catch (error) {
        Logger.error('Google Auth initialization error', error);
        setError('Google認証でエラーが発生しました。ネットワーク接続を確認してください。');
      } finally {
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    };

    // Google認証が完了していない場合のみ初期化
    if (mode === 'google_signin') {
      initGoogleAuth();
    }

    // Google認証イベントリスナー
    const handleGoogleAuthSuccess = (event: CustomEvent) => {
      Logger.log('Google auth success event received', event.detail);
      const { profile } = event.detail;
      if (!googleProfile) { // 既に認証済みの場合はスキップ
        handleGoogleSignIn(profile);
      }
    };

    const handleGoogleAuthError = (event: CustomEvent) => {
      Logger.log('Google auth error event received', event.detail);
      const { error } = event.detail;
      setError(`Google認証エラー: ${error}`);
      setIsLoading(false);
    };

    // Google認証の成功を定期チェック（認証未完了時のみ）
    let pollInterval: NodeJS.Timeout | null = null;
    const checkGoogleAuthStatus = () => {
      if (!googleProfile && mode === 'google_signin') {
        const currentProfile = GoogleAuthService.getCurrentProfile();
        if (currentProfile) {
          Logger.log('Google profile found via polling', currentProfile);
          handleGoogleSignIn(currentProfile);
        }
      }
    };

    // イベントリスナー登録
    window.addEventListener('googleAuthSuccess', handleGoogleAuthSuccess as EventListener);
    window.addEventListener('googleAuthError', handleGoogleAuthError as EventListener);
    
    // バックアップとして定期チェック開始（Google認証画面の場合のみ）
    if (mode === 'google_signin' && !googleProfile) {
      pollInterval = setInterval(checkGoogleAuthStatus, 1000);
    }

    // 既存のGoogle認証を確認（初回のみ）
    if (mode === 'google_signin' && !googleProfile) {
      const existingProfile = GoogleAuthService.getCurrentProfile() || GoogleAuthService.restoreProfile();
      Logger.log('Checking for existing profile on page load', { hasExistingProfile: !!existingProfile });
      if (existingProfile) {
        Logger.log('Found existing profile, attempting to restore session', { email: existingProfile.email });
        handleGoogleSignIn(existingProfile);
      }
    }

    return () => {
      window.removeEventListener('googleAuthSuccess', handleGoogleAuthSuccess as EventListener);
      window.removeEventListener('googleAuthError', handleGoogleAuthError as EventListener);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [handleGoogleSignIn, mode, googleProfile]);

  const generateNewSecret = useCallback(async () => {
    Logger.log('generateNewSecret called', { hasGoogleProfile: !!googleProfile });
    
    if (!googleProfile) {
      setError('TOTP設定にはGoogle認証が必要です。まずGoogleアカウントでサインインしてください。');
      setMode('google_signin');
      return;
    }

    setIsLoading(true);
    try {
      Logger.log('Generating new TOTP secret and QR code...');
      const totpSecret = TOTPService.generateSecret(googleProfile.name || 'QuickNote User');
      setSecret(totpSecret.base32);
      
      const qrCode = await TOTPService.generateQRCode(totpSecret);
      setQrCodeUrl(qrCode);
      Logger.log('TOTP secret generated successfully', { secretLength: totpSecret.base32.length });
    } catch (error) {
      Logger.error('QR code generation failed', error);
      setError('QRコードの生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [googleProfile]);

  const handleTokenVerify = async (inputToken?: string) => {
    const currentToken = inputToken || token;
    
    if (currentToken.length !== 6) {
      setError('6桁の数字を入力してください');
      return;
    }

    if (!secret) {
      setError('シークレットキーが設定されていません');
      return;
    }

    setIsLoading(true);
    try {
      Logger.log('Starting TOTP token verification', { tokenLength: currentToken.length });
      
      // TOTP トークン検証
      const isValid = TOTPService.verifyToken(currentToken, secret);
      if (!isValid) {
        Logger.warn('TOTP token verification failed');
        setError('認証コードが正しくありません。時刻が同期されているか確認してください。');
        setToken('');
        return;
      }

      if (!googleProfile) {
        Logger.error('Google profile not available during TOTP verification');
        setError('Google認証が必要です。まずGoogleアカウントでサインインしてください。');
        setToken('');
        return;
      }

      Logger.log('TOTP token verified successfully - proceeding with device authentication');
      
      // 強化セキュリティ：デバイス認証を実行
      const userId = TOTPService.generateUserIdFromSecret(secret);
      
      // デバイス認証チェック
      const loginResult = await loginWithEnhancedTOTP(secret, googleProfile);
      
      if (loginResult.success) {
        Logger.log('✅ Enhanced authentication successful! Calling onAuthSuccess', { 
          userId, 
          email: googleProfile.email 
        });
        onAuthSuccess(secret, userId, googleProfile);
      } else if (loginResult.requiresDeviceRegistration) {
        // デバイス登録が必要
        Logger.log('Device registration required', { deviceName: loginResult.deviceName });
        setDeviceRegistrationInfo({ deviceName: loginResult.deviceName });
        setMode('device_registration');
      } else {
        Logger.error('Enhanced authentication failed', { error: loginResult.error });
        setError(loginResult.error || '認証に失敗しました');
        setToken('');
      }
    } catch (error) {
      Logger.error('TOTP verification failed', error);
      setError('認証処理でエラーが発生しました。しばらく待ってから再試行してください。');
      setToken('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceRegistration = async () => {
    Logger.log('🔧 Device registration button clicked');
    
    if (!googleProfile || !secret) {
      Logger.error('Device registration failed: Missing profile or secret', { hasProfile: !!googleProfile, hasSecret: !!secret });
      setError('認証情報が不完全です');
      return;
    }

    Logger.log('Starting device registration process', { 
      email: googleProfile.email,
      secretLength: secret.length 
    });

    setIsLoading(true);
    try {
      Logger.log('Calling registerDeviceAndLoginEnhanced...');
      const result = await registerDeviceAndLoginEnhanced(secret, googleProfile);
      Logger.log('Device registration result received', { success: result.success, error: result.error });
      
      if (result.success) {
        const userId = TOTPService.generateUserIdFromSecret(secret);
        Logger.log('✅ Device registration successful! Calling onAuthSuccess', { 
          userId, 
          email: googleProfile.email,
          onAuthSuccessType: typeof onAuthSuccess 
        });
        onAuthSuccess(secret, userId, googleProfile);
      } else {
        Logger.error('Device registration failed', { error: result.error });
        setError(result.error || 'デバイス登録に失敗しました');
        setMode('totp_verify');
      }
    } catch (error) {
      Logger.error('Enhanced device registration failed', error);
      setError('デバイス登録でエラーが発生しました');
      setMode('totp_verify');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingSecretSubmit = async () => {
    if (!secretInput) {
      setError('シークレットキーを入力してください');
      return;
    }
    
    if (!googleProfile) {
      setError('Google認証が必要です。まずGoogleアカウントでサインインしてください。');
      setMode('google_signin');
      return;
    }

    try {
      setSecret(secretInput);
      
      // 既存シークレットでTOTP設定を確認
      const userId = TOTPService.generateUserIdFromSecret(secretInput);
      
      // シークレットをセキュアストレージに保存
      EnhancedSecureStorage.setTOTPSecret(secretInput, googleProfile);
      EnhancedSecureStorage.setTOTPUserId(userId, googleProfile);
      
      Logger.log('Existing secret configured successfully', { 
        userId, 
        secretLength: secretInput.length 
      });
      
      // TOTP認証画面に移行
      setMode('totp_verify');
      setError('');
    } catch (error) {
      Logger.error('Failed to configure existing secret', error);
      setError('シークレットキーの設定に失敗しました');
    }
  };

  const handleGoogleSignOut = () => {
    GoogleAuthService.signOut();
    setGoogleProfile(null);
    setMode('google_signin');
    setError('');
    setSecret('');
    setToken('');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-blue-400 border-r-purple-400 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border border-blue-400/30 mx-auto"></div>
            </div>
            <p className="mt-4 text-white/90 font-medium">
              {mode === 'google_signin' ? '認証情報を確認中...' : 
               mode === 'totp_setup' ? 'TOTP設定を準備中...' :
               mode === 'totp_verify' ? '認証処理中...' :
               mode === 'device_registration' ? 'デバイス登録中...' : 
               '処理中...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-8">

        <h2 className="text-2xl font-bold text-center mb-8 text-white">
          {mode === 'google_signin' ? 'login' :
           mode === 'totp_setup' ? 'TOTP認証設定' :
           mode === 'device_choice' ? 'TOTP認証' :
           mode === 'secret_input' ? 'シークレットキー入力' :
           mode === 'totp_verify' ? 'TOTP認証' :
           mode === 'device_registration' ? 'デバイス登録' :
           mode === 'migration' ? 'セキュリティ移行' : '認証'}
        </h2>

        {/* Google認証画面 */}
        {mode === 'google_signin' && (
          <div className="space-y-6">
            
            <div className="flex justify-center">
              <div ref={googleButtonRef}></div>
            </div>
            
          </div>
        )}

        {/* デバイス選択画面 */}
        {mode === 'device_choice' && (
          <div className="space-y-6">
            {!googleProfile && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                <div className="text-center">
                  <HiExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <h3 className="text-red-300 font-bold text-lg mb-2">Google認証が必要です</h3>
                  <p className="text-red-200 text-sm mb-4">
                    デバイス設定にはGoogleアカウントでのサインインが必要です。
                  </p>
                  <button
                    onClick={() => setMode('google_signin')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Googleサインインに戻る
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <HiDevicePhoneMobile className="w-8 h-8 text-blue-400" />
                <h3 className="text-xl font-bold text-blue-300">デバイス設定を選択</h3>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed text-center mb-6">
                新しいデバイスの設定方法を選択してください
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (!googleProfile) {
                      setError('TOTP設定にはGoogle認証が必要です。まずGoogleアカウントでサインインしてください。');
                      setMode('google_signin');
                      return;
                    }
                    setMode('totp_setup');
                    generateNewSecret();
                  }}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <HiKey className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-bold">新しくTOTP設定を作成</div>
                    <div className="text-sm opacity-90">QRコードで認証アプリに登録</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    if (!googleProfile) {
                      setError('シークレット入力にはGoogle認証が必要です。まずGoogleアカウントでサインインしてください。');
                      setMode('google_signin');
                      return;
                    }
                    setMode('secret_input');
                    setSecret('');
                    setSecretInput('');
                    setError('');
                  }}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <HiShieldCheck className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-bold">既存のシークレットキーを入力</div>
                    <div className="text-sm opacity-90">他のデバイスからシークレットを共有</div>
                  </div>
                </button>
              </div>
            </div>
            
            {onCancel && (
              <div className="text-center mt-6">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        )}

        {/* シークレット入力画面 */}
        {mode === 'secret_input' && (
          <div className="space-y-6">
            {!googleProfile && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                <div className="text-center">
                  <HiExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <h3 className="text-red-300 font-bold text-lg mb-2">Google認証が必要です</h3>
                  <p className="text-red-200 text-sm mb-4">
                    シークレット入力にはGoogleアカウントでのサインインが必要です。
                  </p>
                  <button
                    onClick={() => setMode('google_signin')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Googleサインインに戻る
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <HiKey className="w-8 h-8 text-amber-400" />
                <h3 className="text-xl font-bold text-amber-300">既存のキーを入力</h3>
              </div>
              <p className="text-amber-200 text-sm leading-relaxed text-center mb-6">
                他のデバイスで使用しているTOTPシークレットキーを入力してください
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-amber-200 text-sm font-medium mb-2">
                    TOTPシークレットキー（Base32形式）
                  </label>
                  <textarea
                    value={secretInput}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '');
                      setSecretInput(value);
                      setError('');
                    }}
                    placeholder="例: JBSWY3DPEHPK3PXP..."
                    className="w-full px-4 py-3 bg-black/20 border border-amber-500/30 rounded-xl text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
                    rows={3}
                  />
                  <p className="text-amber-200/70 text-xs mt-2">
                    ※ スペースや記号は自動的に除去されます
                  </p>
                </div>
                
                <button
                  onClick={handleExistingSecretSubmit}
                  disabled={!secretInput || secretInput.length < 16}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                >
                  シークレットキーを設定
                </button>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setMode('device_choice');
                  setSecretInput('');
                  setError('');
                }}
                className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200"
              >
                戻る
              </button>
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        )}

        {/* 移行画面 */}
        {mode === 'migration' && (
          <div className="space-y-6">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <HiExclamationTriangle className="w-8 h-8 text-amber-400" />
                <h3 className="text-xl font-bold text-amber-300">セキュリティ強化移行</h3>
              </div>
              <p className="text-amber-200 text-sm leading-relaxed mb-4">
                より強固なセキュリティのため、既存の認証データを新しい暗号化システムに移行する必要があります。
                <br />既存のTOTP設定を再設定してください。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (!googleProfile) {
                      setError('TOTP設定にはGoogle認証が必要です。まずGoogleアカウントでサインインしてください。');
                      setMode('google_signin');
                      return;
                    }
                    setMode('totp_setup');
                    generateNewSecret();
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  新しいTOTP設定を作成
                </button>
                <button
                  onClick={() => {
                    if (!googleProfile) {
                      setError('TOTP認証にはGoogle認証が必要です。まずGoogleアカウントでサインインしてください。');
                      setMode('google_signin');
                      return;
                    }
                    setMode('totp_verify');
                    setSecret(''); // 手動入力を促す
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                >
                  既存設定を入力
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOTP設定画面 */}
        {mode === 'totp_setup' && (
          <div className="space-y-8">
            {!googleProfile && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                <div className="text-center">
                  <HiExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <h3 className="text-red-300 font-bold text-lg mb-2">Google認証が必要です</h3>
                  <p className="text-red-200 text-sm mb-4">
                    TOTP設定にはGoogleアカウントでのサインインが必要です。
                  </p>
                  <button
                    onClick={() => setMode('google_signin')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Googleサインインに戻る
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <HiDevicePhoneMobile className="w-6 h-6 text-slate-200" />
                <p className="text-slate-200 text-lg font-medium">
                  Authenticatorアプリでスキャン
                </p>
              </div>
              
              {qrCodeUrl && (
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl mb-6 inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="rounded-xl" />
                </div>
              )}
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <HiKey className="w-5 h-5 text-amber-400" />
                  <p className="text-amber-300 font-semibold text-sm">手動入力用シークレット</p>
                </div>
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <p className="text-white/90 font-mono text-sm break-all leading-relaxed tracking-wide">
                    {TOTPService.formatSecret(secret)}
                  </p>
                </div>
              </div>

              {/* TOTP認証コード入力 */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl">
                <div className="text-center mb-4">
                  <HiShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <h3 className="text-white font-semibold text-lg mb-2">認証コードを入力</h3>
                  <p className="text-slate-300 text-sm">
                    Authenticatorアプリに表示される6桁のコードを入力してください
                  </p>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setToken(value);
                      setError('');
                    }}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-center text-xl font-mono tracking-wider placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    maxLength={6}
                  />
                  
                  <button
                    onClick={() => handleTokenVerify()}
                    disabled={token.length !== 6 || isLoading}
                    className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    {isLoading ? '設定中...' : 'TOTP設定を完了'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode('device_choice');
                  setSecret('');
                  setQrCodeUrl('');
                  setToken('');
                  setError('');
                }}
                className="w-full py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        {/* TOTP認証画面 */}
        {mode === 'totp_verify' && secret && (
          <div className="space-y-6">
            {!googleProfile ? (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                <div className="text-center">
                  <HiExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <h3 className="text-red-300 font-bold text-lg mb-2">Google認証が必要です</h3>
                  <p className="text-red-200 text-sm mb-4">
                    TOTP認証にはGoogleアカウントでのサインインが必要です。
                  </p>
                  <button
                    onClick={() => setMode('google_signin')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Googleサインインに戻る
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-green-300 text-sm">
                    <strong>{googleProfile.name}</strong> として認証済み
                  </p>
                </div>
              </div>
            )}
            
            <div className="text-center mb-8">
              <p className="text-slate-200 text-lg font-medium mb-4">
                Authenticatorアプリから認証コードを入力
              </p>
              <p className="text-slate-400 text-sm">
                6桁の認証コードを入力してください
              </p>
            </div>

            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    const newToken = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setToken(newToken);
                    setError('');
                    if (newToken.length === 6) {
                      setTimeout(() => handleTokenVerify(newToken), 300);
                    }
                  }}
                  className="w-full px-6 py-6 bg-white/5 border-2 border-white/20 rounded-2xl focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-400 text-white text-center text-3xl font-mono tracking-[1rem] placeholder-slate-400 backdrop-blur-lg transition-all duration-300 shadow-xl"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="off"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl pointer-events-none"></div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-300 text-sm text-center">⚠️ {error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => handleTokenVerify()}
                disabled={token.length !== 6}
                className="flex-1 py-5 px-8 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-emerald-500/25 hover:shadow-2xl disabled:transform-none shadow-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  <HiShieldCheck className="w-5 h-5" />
                  強化認証実行
                </span>
              </button>
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm"
                >
                  キャンセル
                </button>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleGoogleSignOut}
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-200 font-medium"
              >
                別のGoogleアカウントでサインイン
              </button>
            </div>
          </div>
        )}

        {/* デバイス登録画面 */}
        {mode === 'device_registration' && (
          <div className="space-y-6">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <HiDevicePhoneMobile className="w-8 h-8 text-amber-400" />
                <h3 className="text-xl font-bold text-amber-300">新しいデバイスが検出されました</h3>
              </div>
              <p className="text-amber-200 text-sm leading-relaxed text-center">
                強化セキュリティのため、新しいデバイスでの初回アクセスには登録が必要です。
              </p>
              {deviceRegistrationInfo.deviceName && (
                <div className="mt-4 bg-black/20 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-amber-100 text-sm text-center">
                    <strong>検出されたデバイス:</strong> {deviceRegistrationInfo.deviceName}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleDeviceRegistration}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
            >
              <HiShieldCheck className="w-5 h-5" />
              このデバイスを登録
            </button>
            
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode('totp_verify');
                  setDeviceRegistrationInfo({});
                  setError('');
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}