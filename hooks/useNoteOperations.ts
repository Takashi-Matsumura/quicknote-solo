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

export type PeriodFilter = "today" | "7d" | "30d" | "all";

export function useNoteOperations() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
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
  }, [searchText, selectedTags, period]);

  const loadTags = useCallback(async () => {
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
  }, []);

  const handleCreateNote = useCallback(async (
    text: string, 
    attachments?: FileAttachment[]
  ): Promise<boolean> => {
    if (!text.trim() && (!attachments || attachments.length === 0)) {
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
  }, [loadNotes, loadTags]);

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

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

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