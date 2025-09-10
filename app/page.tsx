"use client";

import { FiSettings, FiInfo, FiEdit, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";

import type { FileAttachment } from "@/lib/models/note";
import { useAuthFlow } from "@/hooks/useAuthFlow";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { useToastManager } from "@/hooks/useToastManager";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ErrorHandler } from "@/lib/utils/errorHandler";

import SearchBar from "@/components/SearchBar";
import TagChips from "@/components/TagChips";
import NoteList from "@/components/NoteList";
import NoteInputBar from "@/components/NoteInputBar";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function HomePage() {
  const { isAuthenticated } = useAuthFlow();
  const {
    notes,
    allTags,
    searchText,
    selectedTags,
    isSubmitting,
    setSearchText,
    setSelectedTags,
    handleCreateNote,
    handleDeleteNote,
    handlePinToggle,
    handleTagsUpdate,
    loadNotes
  } = useNoteOperations();
  const { 
    toast, 
    showSuccessToast, 
    showErrorToast, 
    closeToast 
  } = useToastManager();
  const {
    confirmDialog,
    showConfirmDialog,
    closeConfirmDialog,
    handleConfirm
  } = useConfirmDialog();

  const handleSubmit = async (text: string, attachments?: FileAttachment[]): Promise<boolean> => {
    try {
      const success = await handleCreateNote(text, attachments);
      if (success) {
        showSuccessToast('ノートを追加しました');
      }
      return success;
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showErrorToast(errorMessage);
      return false;
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await handleDeleteNote(id);
      showSuccessToast('ノートを削除しました');
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showErrorToast(errorMessage);
    }
  };

  const handlePin = async (id: string): Promise<void> => {
    const note = notes.find(n => n.id === id);
    if (note) {
      try {
        await handlePinToggle(id);
        showSuccessToast(note.pinned ? 'ピンを外しました' : 'ピンを設定しました');
      } catch (error) {
        const errorMessage = ErrorHandler.getErrorMessage(error);
        showErrorToast(errorMessage);
      }
    }
  };

  const handleEditTags = async (id: string, tags: string[]): Promise<void> => {
    try {
      await handleTagsUpdate(id, tags);
      showSuccessToast('タグを更新しました');
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showErrorToast(errorMessage);
    }
  };

  const handleSync = async (): Promise<void> => {
    try {
      await loadNotes();
      showSuccessToast('同期が完了しました');
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showErrorToast(errorMessage);
    }
  };

  const handleDeleteClick = (id: string) => {
    showConfirmDialog(
      "ノート削除",
      "このノートを削除しますか？この操作は元に戻せません。",
      () => handleDelete(id)
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">認証中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <FiEdit className="text-blue-600 dark:text-blue-400 h-6 w-6" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                QuickNote Solo
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSync}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="同期"
              >
                <FiRefreshCw className="h-5 w-5" />
              </button>
              <Link
                href="/settings"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="設定"
              >
                <FiSettings className="h-5 w-5" />
              </Link>
              <Link
                href="/about"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="アプリ情報"
              >
                <FiInfo className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Search and Filter Section */}
          <div className="space-y-4">
            <SearchBar
              value={searchText}
              onChange={setSearchText}
              onClear={() => setSearchText("")}
            />
            
            {allTags.length > 0 && (
              <TagChips
                tags={allTags}
                selectedTags={selectedTags}
                onTagToggle={(tag) => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                onClearAll={() => setSelectedTags([])}
              />
            )}
          </div>

          {/* Note Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <NoteInputBar
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Notes List */}
          <NoteList
            notes={notes}
            onDelete={handleDeleteClick}
            onPin={handlePin}
            onEditTags={handleEditTags}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}