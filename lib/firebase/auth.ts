import { signInAnonymously, type User } from 'firebase/auth';
import { getFirebaseAuth } from './config';

let currentUser: User | null = null;

export async function initializeAuth(): Promise<User | null> {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    console.error('Firebase Auth not initialized');
    return null;
  }

  try {
    // 既に認証済みの場合はそのユーザーを返す
    if (auth.currentUser) {
      currentUser = auth.currentUser;
      return currentUser;
    }

    // 匿名ログイン
    const userCredential = await signInAnonymously(auth);
    currentUser = userCredential.user;
    
    console.log('Anonymous authentication successful', currentUser.uid);
    return currentUser;
  } catch (error) {
    console.error('Authentication failed:', error);
    return null;
  }
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || currentUser;
}

export async function ensureAuthenticated(): Promise<User | null> {
  const user = getCurrentUser();
  
  if (user) {
    return user;
  }
  
  // 未認証の場合は匿名ログインを試行
  return await initializeAuth();
}