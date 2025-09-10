import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  Timestamp,
  getDocsFromServer // リアルタイムリスナーを使わずにサーバーから直接取得
} from 'firebase/firestore';
import type { Note, NoteFilter } from '../models/note';
import { getFirebaseFirestore, getFirebaseApp } from '../firebase/config';
import { ensureAuthenticated, getCurrentTOTPUserId } from '../firebase/auth';

const COLLECTION_NAME = 'notes';

// REST API フォールバック関数
async function createNoteViaRestApi(firestoreNote: Omit<FirestoreNote, 'id'>, user: { uid: string; accessToken?: string; getIdToken: () => Promise<string> }) {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase app not initialized');
  
  const projectId = app.options.projectId;
  const accessToken = await user.accessToken || (await user.getIdToken());
  
  // Firestore REST API エンドポイント
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${COLLECTION_NAME}`;
  
  // TimestampをISO文字列に変換
  const restApiData = {
    fields: {
      text: { stringValue: firestoreNote.text },
      tags: { arrayValue: { values: firestoreNote.tags.map(tag => ({ stringValue: tag })) } },
      pinned: { booleanValue: firestoreNote.pinned },
      userId: { stringValue: firestoreNote.userId },
      createdAt: { timestampValue: firestoreNote.createdAt.toDate().toISOString() },
      updatedAt: { timestampValue: firestoreNote.updatedAt.toDate().toISOString() },
      ...(firestoreNote.location && {
        location: {
          mapValue: {
            fields: {
              latitude: { doubleValue: firestoreNote.location.latitude },
              longitude: { doubleValue: firestoreNote.location.longitude }
            }
          }
        }
      })
    }
  };
  
  // REST API フォールバック実行中
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(restApiData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REST API failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  const documentPath = result.name;
  const documentId = documentPath.split('/').pop();
  
  return { id: documentId };
}

// Firestore用のNote型（Timestampを使用）
interface FirestoreNote extends Omit<Note, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
}

// FirestoreNoteをNoteに変換
function firestoreNoteToNote(firestoreNote: FirestoreNote): Note {
  return {
    ...firestoreNote,
    createdAt: firestoreNote.createdAt.toMillis(),
    updatedAt: firestoreNote.updatedAt.toMillis()
  };
}

// NoteをFirestoreNoteに変換
function noteToFirestoreNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Omit<FirestoreNote, 'id'> {
  return {
    ...note,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
}

export async function createNote(noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const db = getFirebaseFirestore();
  if (!db) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }

  console.log('createNote: Starting authentication check');
  const user = await ensureAuthenticated();
  if (!user) {
    console.log('createNote: Authentication failed - no user (will fallback to IndexedDB)');
    throw new Error('Authentication required');
  }

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) {
    console.error('createNote: TOTP User ID not found');
    throw new Error('TOTP User ID not found');
  }

  console.log('createNote: Authentication successful', { 
    firebaseUid: user.uid, 
    totpUserId, 
    noteText: noteData.text?.substring(0, 30) 
  });

  try {
    console.log('Creating note for TOTP user:', totpUserId, 'Firebase UID:', user.uid, 'Text:', noteData.text);
    
    const firestoreNote = noteToFirestoreNote(noteData, totpUserId);
    console.log('Firestore note data:', firestoreNote);
    
    console.log('Executing addDoc with timeout protection and REST API fallback...');
    
    let docRef;
    try {
      // addDocにタイムアウトを追加（5秒でタイムアウト）
      docRef = await Promise.race([
        addDoc(collection(db, COLLECTION_NAME), firestoreNote),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('addDoc timeout after 5 seconds')), 5000)
        )
      ]);
      // addDoc成功
    } catch (addDocError) {
      // addDoc失敗、REST APIフォールバック実行
      
      // REST API フォールバック
      try {
        const restApiDocRef = await createNoteViaRestApi(firestoreNote, user);
        // REST API フォールバック成功
        docRef = { id: restApiDocRef.id };
      } catch (restError) {
        console.error('Both addDoc and REST API failed:', restError);
        
        // 404エラー（データベース不存在）の場合は特別なエラーメッセージ
        if ((restError as Error).message && (restError as Error).message.includes('404')) {
          console.error('Firestore database does not exist. This should trigger IndexedDB fallback.');
          throw new Error('FIRESTORE_DB_NOT_FOUND');
        }
        
        throw new Error(`Both methods failed. SDK: ${(addDocError as Error).message}, REST: ${(restError as Error).message}`);
      }
    }
    
    const note: Note = {
      id: docRef.id,
      ...noteData,
      createdAt: firestoreNote.createdAt.toMillis(),
      updatedAt: firestoreNote.updatedAt.toMillis()
    };

    // ノート作成完了
    return note;
  } catch (error) {
    console.error('Error creating note:', error);
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      code: (error as { code?: string }).code,
      stack: (error as Error).stack
    });
    throw error;
  }
}

export async function updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  const docRef = doc(db, COLLECTION_NAME, id);
  
  // 更新データにTimestampを追加
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now()
  };

  // updateDocにタイムアウトを追加
  await Promise.race([
    updateDoc(docRef, updateData),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('updateDoc timeout after 10 seconds')), 10000)
    )
  ]);
}

export async function deleteNote(id: string): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  const docRef = doc(db, COLLECTION_NAME, id);
  
  // deleteDocにタイムアウトを追加
  await Promise.race([
    deleteDoc(docRef),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('deleteDoc timeout after 10 seconds')), 10000)
    )
  ]);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const firestoreNote = { id: docSnap.id, ...docSnap.data() } as FirestoreNote;
  
  // ユーザー権限チェック（TOTPユーザーIDでチェック）
  if (firestoreNote.userId !== totpUserId) {
    throw new Error('Access denied');
  }

  return firestoreNoteToNote(firestoreNote);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  try {
    // クエリ実行開始
    
    // インデックス不要の最もシンプルなクエリ
    const q = query(collection(db, COLLECTION_NAME));

    let querySnapshot;
    try {
      // まずサーバーから直接取得を試行
      querySnapshot = await getDocsFromServer(q);
    } catch (_serverError) {
      // サーバー取得が失敗した場合はキャッシュから取得
      querySnapshot = await getDocs(q);
    }
    
    const notes: Note[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('getAllNotes: Document data:', { 
        id: doc.id, 
        userId: data.userId, 
        text: data.text?.substring(0, 30),
        match: data.userId === totpUserId
      });
      
      // クライアントサイドでuserIdフィルタリング（TOTPユーザーIDでフィルタ）
      if (data.userId === totpUserId) {
        const firestoreNote = { id: doc.id, ...data } as FirestoreNote;
        notes.push(firestoreNoteToNote(firestoreNote));
        console.log('getAllNotes: Added note to results:', doc.id);
      } else {
        console.log('getAllNotes: Filtered out note:', doc.id, 'Expected:', totpUserId, 'Actual:', data.userId);
      }
    });

    // ピン留めされたメモを前に並べ替え（クライアントサイド）
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });

    return notes;
  } catch (error) {
    console.error('getAllNotes: Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      code: (error as { code?: string })?.code,
      stack: (error as Error)?.stack
    });
    throw error;
  }
}

export async function searchNotes(filter: NoteFilter): Promise<Note[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  try {
    
    // インデックス不要の最もシンプルなクエリ
    const q = query(collection(db, COLLECTION_NAME));

    let querySnapshot;
    try {
      // まずサーバーから直接取得を試行
      querySnapshot = await getDocsFromServer(q);
    } catch (_serverError) {
      // サーバー取得が失敗した場合はキャッシュから取得
      querySnapshot = await getDocs(q);
    }
    
    let notes: Note[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // クライアントサイドでuserIdフィルタリング（TOTPユーザーIDでフィルタ）
      if (data.userId === totpUserId) {
        const firestoreNote = { id: doc.id, ...data } as FirestoreNote;
        notes.push(firestoreNoteToNote(firestoreNote));
      }
    });

    // 期間フィルター（クライアントサイド）
    if (filter.period && filter.period !== 'all') {
      const now = new Date();
      let startTime: number;

      switch (filter.period) {
        case 'today':
          const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startTime = startDate.getTime();
          break;
        case '7d':
          startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          break;
        default:
          startTime = 0;
      }

      notes = notes.filter(note => note.createdAt >= startTime);
    }

    // タグフィルター（クライアントサイド）
    if (filter.tags && filter.tags.length > 0) {
      notes = notes.filter(note =>
        filter.tags!.some(filterTag => note.tags.includes(filterTag))
      );
    }

    // テキスト検索（クライアントサイドでフィルタリング）
    if (filter.searchText) {
      const searchTerm = filter.searchText.toLowerCase();
      notes = notes.filter(note =>
        note.text.toLowerCase().includes(searchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // ピン留めされたメモを前に並べ替え（クライアントサイド）
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });

    return notes;
  } catch (error) {
    console.error('searchNotes: Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      code: (error as { code?: string })?.code,
      stack: (error as Error)?.stack
    });
    throw error;
  }
}

export async function getAllTags(): Promise<string[]> {
  const notes = await getAllNotes();
  const allTags = notes.flatMap(note => note.tags);
  return Array.from(new Set(allTags)).sort();
}

export async function clearAllNotes(): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore not initialized');

  const user = await ensureAuthenticated();
  if (!user) throw new Error('Authentication required');

  // TOTPユーザーIDを取得
  const totpUserId = getCurrentTOTPUserId();
  if (!totpUserId) throw new Error('TOTP User ID not found');

  // インデックス不要の最もシンプルなクエリ
  const q = query(collection(db, COLLECTION_NAME));

  let querySnapshot;
  try {
    // まずサーバーから直接取得を試行
    querySnapshot = await getDocsFromServer(q);
  } catch (_serverError) {
    // サーバー取得が失敗した場合はキャッシュから取得
    querySnapshot = await getDocs(q);
  }
  
  const batch: Promise<void>[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // クライアントサイドでuserIdフィルタリング（TOTPユーザーIDでフィルタ）
    if (data.userId === totpUserId) {
      batch.push(deleteDoc(doc.ref));
    }
  });

  await Promise.all(batch);
}

// オフライン対応機能を削除（WebChannel 400エラー対策）
// リアルタイム機能を使用せずに通常のHTTPリクエストのみを使用