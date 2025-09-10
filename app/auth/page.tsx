"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TOTPAuth from '@/components/TOTPAuth';
import { loginWithTOTP } from '@/lib/auth/session';
import { getFirebaseSettings } from '@/lib/settings/firebaseSettings';
import { initializeFirebase } from '@/lib/firebase/config';
import { HiShieldCheck, HiPencilSquare } from 'react-icons/hi2';

export default function AuthPage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    // Firebase を事前に初期化
    const firebaseSettings = getFirebaseSettings();
    if (firebaseSettings.enabled && firebaseSettings.config) {
      initializeFirebase(firebaseSettings.config);
    }
  }, []);

  const handleAuthSuccess = async (secret: string, _userId: string) => {
    try {
      // 新しいTOTP認証システムでログイン
      const success = await loginWithTOTP(secret);
      
      if (success) {
        router.replace('/');
      } else {
        // 認証失敗はサイレントに処理（TOTPAuthコンポーネントがエラー表示）
      }
    } catch (_error) {
      // エラーはサイレントに処理
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-cyan-500 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <HiPencilSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            QuickNote Solo
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            セキュアなメモ体験のため<br />
            <span className="text-blue-400 font-medium">TOTP認証</span>でログインしてください
          </p>
        </div>
        
        {/* Auth Component */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl">
          <TOTPAuth onAuthSuccess={handleAuthSuccess} />
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
            <HiShieldCheck className="w-4 h-4" />
            あなたのプライバシーとセキュリティを最優先に
          </p>
        </div>
      </div>
    </div>
  );
}