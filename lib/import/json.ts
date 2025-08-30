import type { Note, ImportResult } from "../models/note";
import { getNote } from "../db/indexedDb";

function isValidNote(obj: unknown): obj is Note {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).id === "string" &&
    typeof (obj as Record<string, unknown>).text === "string" &&
    Array.isArray((obj as Record<string, unknown>).tags) &&
    ((obj as Record<string, unknown>).tags as unknown[]).every((tag: unknown) => typeof tag === "string") &&
    typeof (obj as Record<string, unknown>).pinned === "boolean" &&
    typeof (obj as Record<string, unknown>).createdAt === "number" &&
    typeof (obj as Record<string, unknown>).updatedAt === "number" &&
    ((obj as Record<string, unknown>).location === undefined || 
      (typeof (obj as Record<string, unknown>).location === "object" &&
       (obj as Record<string, unknown>).location !== null &&
       typeof ((obj as Record<string, unknown>).location as Record<string, unknown>).latitude === "number" &&
       typeof ((obj as Record<string, unknown>).location as Record<string, unknown>).longitude === "number"))
  );
}

export async function importFromJson(jsonData: string): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const data = JSON.parse(jsonData);
    
    if (!Array.isArray(data)) {
      result.errors.push("Invalid JSON format: expected an array of notes");
      return result;
    }

    for (let i = 0; i < data.length; i++) {
      const noteData = data[i];
      
      if (!isValidNote(noteData)) {
        result.errors.push(`Invalid note format at index ${i}`);
        continue;
      }

      // Check if note already exists (skip duplicates)
      const existingNote = await getNote(noteData.id);
      if (existingNote) {
        result.skipped++;
        continue;
      }

      try {
        // Import the note directly to IndexedDB with original data
        const { getDB } = await import("../db/indexedDb");
        const db = await getDB();
        await db.put("notes", noteData);
        
        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import note at index ${i}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Failed to parse JSON: ${error}`);
  }

  return result;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        resolve(e.target.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}