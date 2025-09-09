import type { Note, NoteFilter } from '../models/note';
import { getStorageType } from '../settings/firebaseSettings';
import { isFirebaseInitialized } from '../firebase/config';

// IndexedDB操作（既存）
import * as indexedDbOps from './indexedDb';

// Firestore操作
import * as firestoreOps from './firestore';

// 現在のストレージタイプに基づいて適切なデータベース操作を選択
function getDbOperations() {
  const firebaseReady = isFirebaseInitialized();
  
  // Firebaseが初期化されている場合は、ストレージタイプに関係なくFirestoreを使用
  if (firebaseReady) {
    return firestoreOps;
  }
  
  return indexedDbOps;
}

export async function createNote(noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const ops = getDbOperations();
  
  try {
    return await ops.createNote(noteData);
  } catch (error: unknown) {
    // Firestoreエラーの場合はIndexedDBにフォールバック
    if ((error as Error).message === 'FIRESTORE_DB_NOT_FOUND' || (error as Error).message.includes('timeout')) {
      return await indexedDbOps.createNote(noteData);
    }
    throw error;
  }
}

export async function updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const ops = getDbOperations();
  await ops.updateNote(id, updates);
}

export async function deleteNote(id: string): Promise<void> {
  const ops = getDbOperations();
  await ops.deleteNote(id);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const ops = getDbOperations();
  return await ops.getNoteById(id);
}

export async function getAllNotes(): Promise<Note[]> {
  const ops = getDbOperations();
  return await ops.getAllNotes();
}

export async function searchNotes(filter: NoteFilter): Promise<Note[]> {
  const ops = getDbOperations();
  return await ops.searchNotes(filter);
}

export async function getAllTags(): Promise<string[]> {
  const ops = getDbOperations();
  return await ops.getAllTags();
}

export async function clearAllNotes(): Promise<void> {
  const ops = getDbOperations();
  await ops.clearAllNotes();
}

// ストレージタイプ情報の取得
export function getCurrentStorageType() {
  const storageType = getStorageType();
  const isFirebaseReady = storageType === 'firebase' && isFirebaseInitialized();
  
  return {
    type: isFirebaseReady ? 'firebase' : 'local',
    isFirebaseEnabled: storageType === 'firebase',
    isFirebaseReady
  };
}