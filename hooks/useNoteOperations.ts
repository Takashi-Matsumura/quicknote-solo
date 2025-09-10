import { useState, useEffect, useCallback } from 'react';
import type { Note, NoteFilter, FileAttachment } from '@/lib/models/note';
import { 
  createNote, 
  updateNote, 
  deleteNote, 
  searchNotes, 
  getAllTags 
} from '@/lib/db/database';
import { getCurrentPosition } from '@/lib/geo/getCurrentPosition';
import { getLocationSetting } from '@/lib/settings/locationSettings';
import { ErrorHandler, ErrorMessages } from '@/lib/utils/errorHandler';
import { getCurrentTOTPUserId } from '@/lib/firebase/auth';
import { SessionManager } from '@/lib/auth/session';

export type PeriodFilter = "today" | "7d" | "30d" | "all";

export function useNoteOperations() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 認証状態の確認
  const checkAuthReady = useCallback(async () => {
    const sessionUserId = SessionManager.getSession();
    const totpUserId = getCurrentTOTPUserId();
    
    console.log('Auth check:', { sessionUserId, totpUserId, isAuthenticated: SessionManager.isAuthenticated() });
    
    // セッションまたはTOTPユーザーIDのどちらかが利用可能であれば認証完了とみなす
    if (sessionUserId || totpUserId) {
      setIsAuthReady(true);
      return true;
    }
    
    // 両方とも利用できない場合、少し待ってから再チェック
    await new Promise(resolve => setTimeout(resolve, 100));
    const retrySessionUserId = SessionManager.getSession();
    const retryTotpUserId = getCurrentTOTPUserId();
    
    console.log('Auth retry check:', { retrySessionUserId, retryTotpUserId });
    
    if (retrySessionUserId || retryTotpUserId) {
      setIsAuthReady(true);
      return true;
    }
    
    // まだ認証が準備できていない場合は、ローカルストレージのみでも動作を許可
    console.log('No auth ready, falling back to local-only mode');
    setIsAuthReady(true);
    return true;
  }, []);

  const loadNotes = useCallback(async () => {
    // 認証が準備できていない場合は処理をスキップ
    if (!isAuthReady) {
      console.log('Auth not ready, skipping note loading');
      return;
    }

    try {
      await ErrorHandler.withErrorHandling(
        async () => {
          const filter: NoteFilter = { 
            text: searchText, 
            tags: selectedTags,
            period
          };
          const loadedNotes = await searchNotes(filter);
          setNotes(loadedNotes);
        },
        ErrorMessages.STORAGE,
        { component: 'NoteOperations', action: 'load-notes' }
      );
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }, [searchText, selectedTags, period, isAuthReady]);

  const loadTags = useCallback(async () => {
    // 認証が準備できていない場合は処理をスキップ
    if (!isAuthReady) {
      console.log('Auth not ready, skipping tag loading');
      return;
    }

    try {
      await ErrorHandler.withErrorHandling(
        async () => {
          const tags = await getAllTags();
          setAllTags(tags);
        },
        ErrorMessages.STORAGE,
        { component: 'NoteOperations', action: 'load-tags' }
      );
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, [isAuthReady]);

  const handleCreateNote = useCallback(async (
    text: string, 
    attachments?: FileAttachment[]
  ): Promise<boolean> => {
    if (!text.trim() && (!attachments || attachments.length === 0)) {
      return false;
    }

    // 認証チェック
    if (!isAuthReady) {
      console.log('Auth not ready, cannot create note');
      return false;
    }

    setIsSubmitting(true);
    
    try {
      return await ErrorHandler.withErrorHandling(
        async () => {
          let location = undefined;
          
          if (getLocationSetting()) {
            try {
              location = await getCurrentPosition();
            } catch (locationError) {
              console.warn('Location not available:', locationError);
            }
          }

          const now = Date.now();
          const newNote: Omit<Note, 'id'> = {
            text: text.trim(),
            timestamp: now,
            tags: [],
            pinned: false,
            location,
            attachments: attachments || [],
            createdAt: now,
            updatedAt: now
          };

          await createNote(newNote);
          await Promise.all([loadNotes(), loadTags()]);
          return true;
        },
        ErrorMessages.STORAGE,
        { component: 'NoteOperations', action: 'create-note' }
      );
    } catch (error) {
      console.error('Failed to create note:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadNotes, loadTags, isAuthReady]);

  const handleUpdateNote = useCallback(async (
    id: string, 
    updates: Partial<Note>
  ): Promise<void> => {
    try {
      await ErrorHandler.withErrorHandling(
        async () => {
          await updateNote(id, updates);
          await loadNotes();
        },
        ErrorMessages.STORAGE,
        { component: 'NoteOperations', action: 'update-note' }
      );
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  }, [loadNotes]);

  const handleDeleteNote = useCallback(async (id: string): Promise<void> => {
    try {
      await ErrorHandler.withErrorHandling(
        async () => {
          await deleteNote(id);
          await Promise.all([loadNotes(), loadTags()]);
        },
        ErrorMessages.STORAGE,
        { component: 'NoteOperations', action: 'delete-note' }
      );
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [loadNotes, loadTags]);

  const handlePinToggle = useCallback(async (id: string): Promise<void> => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await handleUpdateNote(id, { pinned: !note.pinned });
    }
  }, [notes, handleUpdateNote]);

  const handleTagsUpdate = useCallback(async (id: string, tags: string[]): Promise<void> => {
    await handleUpdateNote(id, { tags });
    await loadTags();
  }, [handleUpdateNote, loadTags]);

  // 認証状態の初期化
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const authReady = await checkAuthReady();
      if (mounted && authReady) {
        console.log('Auth ready, loading initial data');
        await Promise.all([loadNotes(), loadTags()]);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [checkAuthReady, loadNotes, loadTags]);

  // 認証が準備できた後にデータを読み込み
  useEffect(() => {
    if (isAuthReady) {
      loadNotes();
    }
  }, [loadNotes, isAuthReady]);

  useEffect(() => {
    if (isAuthReady) {
      loadTags();
    }
  }, [loadTags, isAuthReady]);

  return {
    // State
    notes,
    allTags,
    searchText,
    selectedTags,
    period,
    isSubmitting,
    
    // Setters
    setSearchText,
    setSelectedTags,
    setPeriod,
    
    // Operations
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handlePinToggle,
    handleTagsUpdate,
    loadNotes,
    loadTags
  };
}