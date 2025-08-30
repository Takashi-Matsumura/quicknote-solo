"use client";

import { FiEdit } from "react-icons/fi";
import type { Note } from "@/lib/models/note";
import NoteItem from "./NoteItem";

interface NoteListProps {
  notes: Note[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onEditTags: (id: string, tags: string[]) => void;
}

export default function NoteList({ notes, onPin, onDelete, onEditTags }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <FiEdit className="text-gray-400 text-4xl" />
        </div>
        <p className="text-gray-500 text-sm">メモがありません</p>
        <p className="text-gray-400 text-xs mt-1">下のテキストボックスからメモを追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          onPin={onPin}
          onDelete={onDelete}
          onEditTags={onEditTags}
        />
      ))}
    </div>
  );
}