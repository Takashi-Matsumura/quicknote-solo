import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseSettings } from '@/lib/settings/firebaseSettings';
import { initializeFirebase } from '@/lib/firebase/config';
import { ensureAuthenticated } from '@/lib/firebase/auth';
import { EnhancedSessionManager } from '@/lib/auth/enhancedSession';
import { GoogleAuthService } from '@/lib/auth/googleAuth';
import { ErrorHandler, ErrorMessages } from '@/lib/utils/errorHandler';
import Logger from '@/lib/utils/logger';

export function useAuthFlow() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await ErrorHandler.withErrorHandling(
          async () => {
            Logger.log('🚀 useAuthFlow: Starting authentication check', {
              userAgent: navigator.userAgent,
              isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
              currentPath: window.location.pathname
            });
            
            // 現在のGoogle認証プロファイルを取得
            const currentProfile = GoogleAuthService.getCurrentProfile() || GoogleAuthService.restoreProfile();
            Logger.log('🔍 useAuthFlow: Current Google profile check', { 
              hasProfile: !!currentProfile, 
              email: currentProfile?.email,
              id: currentProfile?.id?.substring(0, 8) + '...',
              getCurrentProfileResult: !!GoogleAuthService.getCurrentProfile(),
              restoreProfileResult: !!GoogleAuthService.restoreProfile()
            });
            
            // 強化セッション管理システムで認証チェック（緊急バイパス対応）
            const hasEmergencySession = sessionStorage.getItem('auth_session');
            const isEnhancedAuthenticated = EnhancedSessionManager.isAuthenticated(currentProfile || undefined);
            Logger.log('🔐 useAuthFlow: Enhanced authentication status', { 
              isAuthenticated: isEnhancedAuthenticated, 
              hasEmergencySession: !!hasEmergencySession,
              sessionStorage: {
                authSession: !!sessionStorage.getItem('auth_session'),
                enhancedAuthSession: !!localStorage.getItem('enhanced_auth_session')
              }
            });
            
            // 緊急セッションが存在する場合は認証をバイパス
            if (hasEmergencySession) {
              Logger.log('🚨 useAuthFlow: Emergency session detected, bypassing authentication');
              setIsAuthenticated(true);
              return;
            }
            
            if (!isEnhancedAuthenticated || !currentProfile) {
              Logger.log('❌ useAuthFlow: Not authenticated or no profile - redirecting to /auth', {
                isEnhancedAuthenticated,
                hasCurrentProfile: !!currentProfile,
                currentPath: window.location.pathname
              });
              router.replace('/auth');
              return;
            }

            Logger.log('🔥 useAuthFlow: Authentication validated - initializing Firebase...');
            const firebaseSettings = getFirebaseSettings();
            if (firebaseSettings.enabled && firebaseSettings.config) {
              await initializeFirebase(firebaseSettings.config);
              await ensureAuthenticated();
            }

            Logger.log('✅ useAuthFlow: Authentication successful - setting authenticated state');
            setIsAuthenticated(true);
          },
          ErrorMessages.UNKNOWN,
          { component: 'HomePage', action: 'initialize-auth' }
        );
      } catch (error) {
        Logger.error('❌ useAuthFlow: Authentication failed', error, {
          userAgent: navigator.userAgent,
          isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        });
        router.replace('/auth');
      }
    };

    initializeAuth();
  }, [router]);

  return {
    isAuthenticated
  };
}