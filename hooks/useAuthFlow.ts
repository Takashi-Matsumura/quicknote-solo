import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseSettings } from '@/lib/settings/firebaseSettings';
import { initializeFirebase } from '@/lib/firebase/config';
import { ensureAuthenticated } from '@/lib/firebase/auth';
import { getTOTPSecret } from '@/lib/auth/session';
import { ErrorHandler, ErrorMessages } from '@/lib/utils/errorHandler';

export function useAuthFlow() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await ErrorHandler.withErrorHandling(
          async () => {
            const totpSecret = getTOTPSecret();
            if (!totpSecret) {
              router.replace('/auth');
              return;
            }

            const firebaseSettings = getFirebaseSettings();
            if (firebaseSettings.enabled && firebaseSettings.config) {
              await initializeFirebase(firebaseSettings.config);
              await ensureAuthenticated();
            }

            setIsAuthenticated(true);
          },
          ErrorMessages.UNKNOWN,
          { component: 'HomePage', action: 'initialize-auth' }
        );
      } catch (error) {
        console.error('Authentication failed:', error);
        router.replace('/auth');
      }
    };

    initializeAuth();
  }, [router]);

  return {
    isAuthenticated
  };
}