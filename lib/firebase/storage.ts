import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getFirebaseStorage as getStorageInstance, isFirebaseStorageAvailable } from './config';
import { ensureAuthenticated } from './auth';

/**
 * Firebase Storageのインスタンス取得
 */
export function getFirebaseStorage() {
  if (!isFirebaseStorageAvailable()) {
    console.error('Firebase Storage not available. Please enable Firebase Storage in your Firebase Console.');
    return null;
  }
  
  return getStorageInstance();
}

/**
 * 画像ファイルをFirebase Storageにアップロード
 */
export async function uploadImage(blob: Blob, fileName: string, folder: 'images' | 'thumbnails'): Promise<string> {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage not available. Please enable Firebase Storage in your Firebase Console and ensure storageBucket is configured.');
  }
  
  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');
  
  // ファイルパス: users/{userId}/{folder}/{timestamp}_{fileName}
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `users/${user.uid}/${folder}/${timestamp}_${sanitizedFileName}`;
  
  const storageRef = ref(storage, filePath);
  
  try {
    console.log(`Uploading ${folder} to Firebase Storage: ${filePath}`);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`${folder} uploaded successfully. URL:`, downloadURL);
    return downloadURL;
  } catch (error) {
    console.error(`Failed to upload ${folder}:`, error);
    throw error;
  }
}

/**
 * Firebase Storageから画像を削除
 */
export async function deleteImage(downloadUrl: string): Promise<void> {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage not initialized');
  
  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');
  
  try {
    // URLからファイルパスを抽出
    const url = new URL(downloadUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    if (!pathMatch) throw new Error('Invalid storage URL');
    
    const filePath = decodeURIComponent(pathMatch[1]);
    
    // ユーザーのファイルかどうかチェック
    if (!filePath.startsWith(`users/${user.uid}/`)) {
      throw new Error('Access denied: not your file');
    }
    
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log('File deleted successfully:', filePath);
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw error;
  }
}

/**
 * 複数の画像を一括削除
 */
export async function deleteImages(downloadUrls: string[]): Promise<void> {
  const deletePromises = downloadUrls.map(url => deleteImage(url));
  await Promise.all(deletePromises);
}

/**
 * ストレージの使用量を取得（概算）
 */
export async function getStorageUsage(): Promise<{ fileCount: number; estimatedSize: string }> {
  // Firebase Storageでは直接使用量を取得できないため、
  // Firestoreのattachmentsから推定
  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');
  
  // 実装上の制約により、正確な使用量は取得困難
  // 必要に応じて別途実装
  return {
    fileCount: 0,
    estimatedSize: '不明'
  };
}