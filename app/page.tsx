"use client";

import { useCallback, useEffect, useState } from "react";
import { FiSettings, FiInfo } from "react-icons/fi";
import Link from "next/link";

import type { Note, NoteFilter } from "@/lib/models/note";
import { 
  createNote, 
  updateNote, 
  deleteNote, 
  searchNotes, 
  getAllTags 
} from "@/lib/db/indexedDb";
import { getCurrentPosition } from "@/lib/geo/getCurrentPosition";

import SearchBar from "@/components/SearchBar";
import TagChips from "@/components/TagChips";
import NoteList from "@/components/NoteList";
import NoteInputBar from "@/components/NoteInputBar";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

type PeriodFilter = "today" | "7d" | "30d" | "all";

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const loadNotes = useCallback(async () => {
    try {
      const filter: NoteFilter = {
        searchText: searchText || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        period,
      };
      const result = await searchNotes(filter);
      setNotes(result);
    } catch (error) {
      console.error("Failed to load notes:", error);
      showToast("メモの読み込みに失敗しました", "error");
    }
  }, [searchText, selectedTags, period]);

  const loadTags = useCallback(async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }, []);

  // Load notes and tags
  useEffect(() => {
    loadNotes();
    loadTags();
  }, [loadNotes, loadTags]);

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
  };

  const handleSubmitNote = async (text: string, includeLocation: boolean) => {
    setIsSubmitting(true);
    
    try {
      let location = undefined;
      
      if (includeLocation) {
        try {
          location = await getCurrentPosition();
          showToast("位置情報を取得しました", "success");
        } catch (error) {
          console.warn("Failed to get location:", error);
          showToast("位置情報の取得に失敗しましたが、メモを保存します", "info");
        }
      }

      await createNote({
        text,
        tags: [],
        location,
        pinned: false,
      });

      showToast("メモを保存しました", "success");
      loadNotes();
      loadTags();
    } catch (error) {
      console.error("Failed to create note:", error);
      showToast("メモの保存に失敗しました", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinNote = async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (note) {
        await updateNote(id, { pinned: !note.pinned });
        showToast(note.pinned ? "ピン留めを解除しました" : "ピン留めしました", "success");
        loadNotes();
      }
    } catch (error) {
      console.error("Failed to pin note:", error);
      showToast("操作に失敗しました", "error");
    }
  };

  const handleDeleteNote = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    setConfirmDialog({
      isOpen: true,
      title: "メモを削除",
      message: `「${note.text.slice(0, 30)}${note.text.length > 30 ? "..." : ""}」を削除しますか？`,
      onConfirm: async () => {
        try {
          await deleteNote(id);
          showToast("メモを削除しました", "success");
          loadNotes();
          loadTags();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          console.error("Failed to delete note:", error);
          showToast("メモの削除に失敗しました", "error");
        }
      },
    });
  };

  const handleEditTags = async (id: string, tags: string[]) => {
    try {
      await updateNote(id, { tags });
      showToast("タグを更新しました", "success");
      loadNotes();
      loadTags();
    } catch (error) {
      console.error("Failed to update tags:", error);
      showToast("タグの更新に失敗しました", "error");
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearSearch = () => {
    setSearchText("");
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">QuickNote Solo</h1>
          <div className="flex items-center space-x-2">
            <Link 
              href="/about"
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <FiInfo className="h-5 w-5" />
            </Link>
            <Link 
              href="/settings"
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <FiSettings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          onClear={clearSearch}
        />
        
        {/* Period Filter */}
        <div className="flex space-x-2">
          {(["today", "7d", "30d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                period === p
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {{
                today: "今日",
                "7d": "7日間",
                "30d": "30日間",
                all: "すべて",
              }[p]}
            </button>
          ))}
        </div>

        <TagChips
          tags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearAll={clearTags}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-32">
        <NoteList
          notes={notes}
          onPin={handlePinNote}
          onDelete={handleDeleteNote}
          onEditTags={handleEditTags}
        />
      </main>

      {/* Input Bar */}
      <NoteInputBar
        onSubmit={handleSubmitNote}
        isSubmitting={isSubmitting}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}