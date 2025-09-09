"use client";

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { TOTPService } from '@/lib/auth/totp';
import { 
  HiDevicePhoneMobile, 
  HiKey, 
  HiSparkles, 
  HiCheckCircle, 
  HiLockClosed, 
  HiLightBulb,
  HiPencilSquare,
  HiShieldCheck
} from 'react-icons/hi2';

interface TOTPAuthProps {
  onAuthSuccess: (secret: string, userId: string) => void;
  onCancel?: () => void;
}

type AuthMode = 'check' | 'setup' | 'verify' | 'select' | 'input';

export default function TOTPAuth({ onAuthSuccess, onCancel }: TOTPAuthProps) {
  const [mode, setMode] = useState<AuthMode>('verify');
  const [secret, setSecret] = useState<string>('');
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [secretInput, setSecretInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasExistingSecret, setHasExistingSecret] = useState<boolean>(false);

  const generateNewSecret = useCallback(async () => {
    setIsLoading(true);
    try {
      const totpSecret = TOTPService.generateSecret('QuickNote User');
      setSecret(totpSecret.base32);
      
      const qrCode = await TOTPService.generateQRCode(totpSecret);
      setQrCodeUrl(qrCode);
      setMode('setup');
    } catch (error) {
      console.error('QR code generation failed:', error);
      setError('QRコードの生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkExistingAuth = useCallback(() => {
    const existingSecret = localStorage.getItem('totp_secret');
    if (existingSecret) {
      setSecret(existingSecret);
      setHasExistingSecret(true);
      // シークレットキーがあってもTOTP認証画面のまま
    } else {
      setHasExistingSecret(false);
      setSecret('');
      // シークレットキーがない場合は設定画面に遷移
      setMode('select');
    }
  }, []);

  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  const handleTokenVerify = (inputToken?: string) => {
    const currentToken = inputToken || token;
    
    if (currentToken.length !== 6) {
      setError('6桁の数字を入力してください');
      return;
    }

    if (!secret) {
      setError('シークレットキーが設定されていません。新しいシークレットキーを生成してください。');
      return;
    }

    try {
      const isValid = TOTPService.verifyToken(currentToken, secret);
      if (isValid) {
        // setupモードまたはverifyモードでシークレットが新しく設定された場合は保存
        if (mode === 'setup' || !localStorage.getItem('totp_secret')) {
          localStorage.setItem('totp_secret', secret);
        }
        const userId = TOTPService.generateUserIdFromSecret(secret);
        onAuthSuccess(secret, userId);
      } else {
        setError('認証コードが正しくありません。時刻が同期されているか確認してください。');
        setToken('');
      }
    } catch (error) {
      console.error('TOTP verification failed:', error);
      setError('認証処理でエラーが発生しました。しばらく待ってから再試行してください。');
      setToken('');
    }
  };

  const handleResetAuth = () => {
    // シークレットキーは削除せず、選択画面に遷移のみ
    setToken('');
    setError('');
    setMode('select');
  };

  const handleBackToVerify = () => {
    setMode('select');
    setSecret('');
    setQrCodeUrl('');
    setToken('');
    setError('');
  };

  const handleExistingSecretSubmit = () => {
    if (!secretInput.trim()) {
      setError('シークレットキーを入力してください');
      return;
    }

    // Base32フォーマットの検証
    const cleanSecret = secretInput.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z2-7]+$/.test(cleanSecret)) {
      setError('無効なシークレットキー形式です');
      return;
    }

    setSecret(cleanSecret);
    setMode('verify');
    setError('');
  };

  const handleBackToSelect = () => {
    setMode('select');
    setSecret('');
    setSecretInput('');
    setToken('');
    setError('');
  };

  const handleContinueWithExisting = () => {
    const existingSecret = localStorage.getItem('totp_secret');
    if (existingSecret) {
      setSecret(existingSecret);
      setMode('verify');
    }
  };

  if (mode === 'check' || isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-blue-400 border-r-purple-400 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border border-blue-400/30 mx-auto"></div>
            </div>
            <p className="mt-4 text-white/90 font-medium">認証情報を確認中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-center mb-8 text-white">
          {mode === 'setup' ? 'TOTP認証設定' : 
           mode === 'select' ? 'TOTP認証設定' :
           mode === 'input' ? 'シークレットキー入力' : 'ログイン'}
        </h2>

        {/* QRコード設定画面 */}
        {mode === 'setup' && (
          <div className="space-y-8">
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
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <p className="text-amber-300 font-semibold text-sm">手動入力用シークレット</p>
                </div>
                <div className="bg-black/20 border border-white/10 p-4 rounded-xl">
                  <p className="text-white/90 font-mono text-sm break-all leading-relaxed tracking-wide">{TOTPService.formatSecret(secret)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 選択画面（新規またはシークレットキー入力） */}
        {mode === 'select' && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* 既存のシークレットキーがある場合は優先表示 */}
              {(hasExistingSecret || localStorage.getItem('totp_secret')) && (
                <button
                  onClick={handleContinueWithExisting}
                  className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
                >
                  <HiCheckCircle className="w-5 h-5" />
                  保存済みの認証で続行
                </button>
              )}
              
              <button
                onClick={() => setMode('input')}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <HiKey className="w-5 h-5" />
                既存のシークレットキーを入力
              </button>
              <button
                onClick={generateNewSecret}
                className="w-full py-4 px-6 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <HiSparkles className="w-5 h-5" />
                新しくTOTP認証を作成
              </button>
            </div>
          </div>
        )}

        {/* シークレットキー入力画面 */}
        {mode === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-blue-300 mb-3">
                <HiLockClosed className="w-4 h-4 inline mr-2" />
                シークレットキー
              </label>
              <input
                type="text"
                value={secretInput}
                onChange={(e) => {
                  setSecretInput(e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, ''));
                  setError('');
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white font-mono text-sm placeholder-slate-400 backdrop-blur-sm"
                placeholder="例: ABCD EFGH IJKL MNOP..."
                autoComplete="off"
              />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-300 text-sm text-center">
                  ⚠️ {error}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleBackToSelect}
                className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200"
              >
                ← 戻る
              </button>
              <button
                onClick={handleExistingSecretSubmit}
                disabled={!secretInput.trim()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                次へ →
              </button>
            </div>
          </div>
        )}


        {/* 認証コード入力画面（シークレットキーがある場合のみ） */}
        {mode === 'verify' && secret && (
          <div className="text-center mb-8">
            <p className="text-slate-200 text-lg font-medium mb-4">
              Authenticatorアプリから認証コードを入力
            </p>
            <p className="text-slate-400 text-sm">
              6桁の認証コードを入力してください
            </p>
          </div>
        )}

        {/* 認証コード入力フィールドとボタン（両モード共通） */}
        {(mode === 'setup' || (mode === 'verify' && secret)) && (
          <>
            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    const newToken = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setToken(newToken);
                    setError('');
                    // 6桁入力時に自動で認証実行（少し遅延を設ける）
                    if (newToken.length === 6) {
                      setTimeout(() => {
                        // 入力されたトークンを直接渡して実行
                        handleTokenVerify(newToken);
                      }, 300);
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
                <p className="text-red-300 text-sm text-center">
                  ⚠️ {error}
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleTokenVerify}
                disabled={token.length !== 6}
                className="flex-1 py-5 px-8 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-emerald-500/25 hover:shadow-2xl disabled:transform-none shadow-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {token.length === 6 && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  )}
                  {mode === 'setup' ? (
                    <><HiCheckCircle className="w-5 h-5" /> 設定完了</>
                  ) : (
                    <><HiLockClosed className="w-5 h-5" /> 認証実行</>
                  )}
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

            <div className="mt-6 text-center space-y-2">
              {mode === 'setup' && (
                <button
                  onClick={handleBackToVerify}
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-200 font-medium mb-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  選択画面に戻る
                </button>
              )}
              
              {mode === 'verify' && secret && (
                <button
                  onClick={handleResetAuth}
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  新しいシークレットキーを生成
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}