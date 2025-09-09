"use client";

import { useCallback, useEffect, useState } from "react";
import { FiSettings, FiInfo, FiEdit, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";

import type { Note, NoteFilter, FileAttachment } from "@/lib/models/note";
import { 
  createNote, 
  updateNote, 
  deleteNote, 
  searchNotes, 
  getAllTags 
} from "@/lib/db/database";
import { getCurrentPosition } from "@/lib/geo/getCurrentPosition";
import { getFirebaseSettings } from "@/lib/settings/firebaseSettings";
import { initializeFirebase } from "@/lib/firebase/config";
import { ensureAuthenticated } from "@/lib/firebase/auth";
import { getTOTPSecret } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);

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
      showToast("メモの読み込みに失敗しました", "error");
    }
  }, [searchText, selectedTags, period]);

  const loadTags = useCallback(async () => {
    try {
      const tags = await getAllTags();
      setAllTags(tags);
    } catch (error) {
      // タグ読み込みエラーは無視（メモ機能に影響なし）
    }
  }, []);

  // クライアントサイドの初期化（Hydration対策）
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 認証チェック
  useEffect(() => {
    if (!isClient) return;

    const checkAuth = async () => {
      try {
        const totpSecret = getTOTPSecret();
        if (totpSecret) {
          // まずFirebaseを初期化
          const firebaseSettings = getFirebaseSettings();
          if (firebaseSettings.enabled && firebaseSettings.config) {
            const success = initializeFirebase(firebaseSettings.config);
            if (success) {
              const user = await ensureAuthenticated();
              if (user) {
                setIsAuthenticated(true);
              } else {
                router.push('/auth');
              }
            } else {
              router.push('/auth');
            }
          } else {
            router.push('/auth');
          }
        } else {
          router.push('/auth');
        }
      } catch (error) {
        showToast('認証確認でエラーが発生しました', 'error');
        router.push('/auth');
      }
    };

    checkAuth();
  }, [isClient, router]);

  // Initialize Firebase success toast (Firebase is already initialized during auth check)
  useEffect(() => {
    if (!isClient || !isAuthenticated) return;
    
    const firebaseSettings = getFirebaseSettings();
    if (firebaseSettings.enabled && firebaseSettings.config) {
      showToast('Firebaseクラウドモードで動作しています', 'success');
    } else {
      showToast('ローカルストレージモードで動作しています', 'info');
    }
  }, [isClient, isAuthenticated]);

  // Load notes and tags
  useEffect(() => {
    if (!isClient || !isAuthenticated) return;
    
    loadNotes();
    loadTags();
  }, [loadNotes, loadTags, isClient, isAuthenticated]);

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
  };

  // メモ同期機能（キャッシュクリア＋リロード）
  const handleSyncNotes = useCallback(async () => {
    setIsSyncing(true);
    showToast('メモを同期中...', 'info');
    
    try {
      // 少し待ってからキャッシュクリア＋リロード
      setTimeout(() => {
        // Service Workerのキャッシュをクリア
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName);
            });
          });
        }
        
        // ハードリフレッシュを実行
        window.location.reload();
      }, 500);
    } catch (error) {
      showToast('同期に失敗しました', 'error');
      setIsSyncing(false);
    }
  }, []);

  const handleFileDropped = async (file: FileAttachment, text: string) => {
    await handleSubmitNote(text, true, [file]);
  };

  const handleSubmitNote = async (text: string, includeLocation: boolean, attachments?: FileAttachment[]) => {
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

      console.log('handleSubmitNote: About to call createNote...');
      const newNote = await createNote({
        text,
        tags: [],
        location,
        pinned: false,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });
      console.log('handleSubmitNote: createNote returned successfully:', newNote);

      showToast("メモを保存しました", "success");
      console.log('handleSubmitNote: About to reload notes and tags...');
      
      // loadNotesを個別のtry-catchで実行
      try {
        console.log('handleSubmitNote: Calling loadNotes...');
        await loadNotes();
        console.log('handleSubmitNote: loadNotes completed successfully');
      } catch (loadNotesError) {
        console.error('handleSubmitNote: loadNotes failed:', loadNotesError);
      }
      
      // loadTagsを個別のtry-catchで実行
      try {
        console.log('handleSubmitNote: Calling loadTags...');
        await loadTags();
        console.log('handleSubmitNote: loadTags completed successfully');
      } catch (loadTagsError) {
        console.error('handleSubmitNote: loadTags failed:', loadTagsError);
      }
      
      console.log('handleSubmitNote: All operations completed');
    } catch (error) {
      console.error("Failed to create note:", error);
      console.error("Full error details:", error);
      showToast("メモの保存に失敗しました", "error");
    } finally {
      console.log('handleSubmitNote: Setting isSubmitting to false');
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

    // テキストが空の場合（ファイルのみのメモ）は汎用的なメッセージを表示
    const displayText = note.text.trim() === "" 
      ? "このメモ"
      : `「${note.text.slice(0, 30)}${note.text.length > 30 ? "..." : ""}」`;

    setConfirmDialog({
      isOpen: true,
      title: "メモを削除",
      message: `${displayText}を削除しますか？`,
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

  // Hydration対策または未認証時は最小限の内容のみ表示
  if (!isClient || !isAuthenticated) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-800 rounded-lg mr-2">
                <FiEdit className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">QuickNote Solo</h1>
            </div>
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
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">読み込み中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-800 rounded-lg mr-2">
              <FiEdit className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">QuickNote Solo</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncNotes}
              disabled={isSyncing}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="メモを同期"
            >
              <FiRefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
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
      <div className="bg-white border-b border-gray-200 p-4 space-y-4 flex-shrink-0">
        {/* Period Filter with Search */}
        <div className="flex items-center space-x-2">
          {!isSearchExpanded && (["today", "7d", "30d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                period === p
                  ? "bg-blue-800 text-white border-blue-800"
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
          
          <div className={isSearchExpanded ? "flex-1" : ""}>
            <SearchBar
              value={searchText}
              onChange={setSearchText}
              onClear={clearSearch}
              onSearchExpand={setIsSearchExpanded}
            />
          </div>
        </div>

        <TagChips
          tags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearAll={clearTags}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto pb-32">
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
        onFileDropped={handleFileDropped}
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
        confirmText="削除"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}