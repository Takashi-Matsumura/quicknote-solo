import type { Note } from "../models/note";

export function exportToJson(notes: Note[]): string {
  return JSON.stringify(notes, null, 2);
}

export function downloadJsonFile(notes: Note[], filename = "quicknote-solo-export.json"): void {
  const jsonData = exportToJson(notes);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}