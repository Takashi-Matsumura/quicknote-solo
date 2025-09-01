"use client";

import { useState } from "react";
import { FiBookmark, FiMapPin, FiTrash, FiTag } from "react-icons/fi";
import type { Note } from "@/lib/models/note";
import { createMapUrl } from "@/lib/geo/getCurrentPosition";
import FileDisplay from "./FileDisplay";

interface NoteItemProps {
  note: Note;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onEditTags: (id: string, tags: string[]) => void;
}

export default function NoteItem({ note, onPin, onDelete, onEditTags }: NoteItemProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState(note.tags.join(", "));
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    if (diffX < 0) {
      setTranslateX(Math.max(diffX, -80));
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    if (translateX < -40) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  const handleSwipeDelete = () => {
    onDelete(note.id);
    setTranslateX(0);
  };

  const handleDoubleClick = () => {
    if (translateX === 0) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  const handleSaveTags = () => {
    const tags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    onEditTags(note.id, tags);
    setIsEditingTags(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "昨日";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe actions background */}
      <div className="absolute inset-0 bg-red-100 flex items-center justify-end pr-4 rounded-lg">
        <button
          onClick={handleSwipeDelete}
          className="flex items-center justify-center bg-red-600 text-white w-12 h-12 rounded-lg shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          <FiTrash className="h-6 w-6" />
        </button>
      </div>

      {/* Main note content */}
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 transition-transform duration-200 relative z-10 cursor-pointer select-none"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        title="ダブルクリックで削除メニューを表示"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-2" style={{ minWidth: translateX < 0 ? '75%' : '80%', maxWidth: translateX < 0 ? '75%' : '80%' }}>
            <p className="text-gray-900 text-sm break-words leading-relaxed whitespace-pre-wrap">{note.text}</p>
            <div className={`flex items-center text-xs text-gray-500 mt-1 ${translateX < 0 ? 'flex-wrap' : ''}`}>
              <span className="flex-shrink-0">{formatDate(note.createdAt)}</span>
              {note.location && (
                <>
                  <span className="mx-2 flex-shrink-0">•</span>
                  <a
                    href={createMapUrl(note.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <FiMapPin className="h-3 w-3 mr-1" />
                    位置
                  </a>
                </>
              )}
            </div>
          </div>
          <div className={`flex items-center flex-shrink-0 ${translateX < 0 ? 'ml-1 space-x-0' : 'ml-2 space-x-1'}`}>
            <button
              onClick={() => onPin(note.id)}
              className={`${translateX < 0 ? 'p-0.5' : 'p-1'} rounded ${
                note.pinned
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title={note.pinned ? "ピン留め解除" : "ピン留め"}
            >
              <FiBookmark className={`${translateX < 0 ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </button>
            <button
              onClick={() => setIsEditingTags(!isEditingTags)}
              className={`${translateX < 0 ? 'p-0.5' : 'p-1'} rounded text-gray-400 hover:text-gray-600`}
              title="タグ編集"
            >
              <FiTag className={`${translateX < 0 ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </button>
          </div>
        </div>

        {/* Tags display */}
        {note.tags.length > 0 && !isEditingTags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* File attachments */}
        {note.attachments && note.attachments.length > 0 && (
          <div className="mt-3">
            <FileDisplay 
              attachments={note.attachments} 
              compact={true}
              maxDisplay={3}
            />
          </div>
        )}

        {/* Tags editing */}
        {isEditingTags && (
          <div className="mt-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="タグをカンマ区切りで入力..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setIsEditingTags(false)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveTags}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}