import { openDB, type IDBPDatabase } from "idb";
import type { Note, NoteFilter } from "../models/note";

const DB_NAME = "quicknote-solo";
const DB_VERSION = 1;
const STORE_NAME = "notes";

interface NotesDB {
  notes: {
    key: string;
    value: Note;
    indexes: {
      createdAt: number;
      text: string;
      tags: string[];
      pinned: boolean;
    };
  };
}

let dbInstance: IDBPDatabase<NotesDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
      store.createIndex("text", "text");
      store.createIndex("tags", "tags", { multiEntry: true });
      store.createIndex("pinned", "pinned");
    },
  });

  return dbInstance;
}

export async function createNote(noteData: Omit<Note, "id" | "createdAt" | "updatedAt">): Promise<Note> {
  const db = await getDB();
  const note: Note = {
    ...noteData,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.add(STORE_NAME, note);
  return note;
}

export async function updateNote(id: string, updates: Partial<Omit<Note, "id" | "createdAt">>): Promise<Note | null> {
  const db = await getDB();
  const note = await db.get(STORE_NAME, id);
  
  if (!note) return null;

  const updatedNote: Note = {
    ...note,
    ...updates,
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, updatedNote);
  return updatedNote;
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDB();
  const note = await db.get(STORE_NAME, id);
  
  if (!note) return false;

  await db.delete(STORE_NAME, id);
  return true;
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDB();
  const note = await db.get(STORE_NAME, id);
  return note || null;
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll(STORE_NAME);
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });
}

export async function searchNotes(filter: NoteFilter): Promise<Note[]> {
  const db = await getDB();
  let notes = await db.getAll(STORE_NAME);

  // Period filter
  if (filter.period && filter.period !== "all") {
    const now = Date.now();
    let cutoff = 0;
    
    switch (filter.period) {
      case "today":
        cutoff = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        cutoff = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoff = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    notes = notes.filter(note => note.createdAt >= cutoff);
  }

  // Text search filter
  if (filter.searchText) {
    const searchText = filter.searchText.toLowerCase();
    notes = notes.filter(note => 
      note.text.toLowerCase().includes(searchText)
    );
  }

  // Tags filter (OR logic)
  if (filter.tags && filter.tags.length > 0) {
    notes = notes.filter(note =>
      filter.tags!.some((filterTag: string) =>
        note.tags.some((noteTag: string) =>
          noteTag.toLowerCase().includes(filterTag.toLowerCase())
        )
      )
    );
  }

  // Sort: pinned first, then by creation date
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });
}

export async function getAllTags(): Promise<string[]> {
  const db = await getDB();
  const notes = await db.getAll(STORE_NAME);
  const tagSet = new Set<string>();
  
  notes.forEach(note => {
    note.tags.forEach((tag: string) => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}

export async function clearAllNotes(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}