import type { Note } from "../models/note";

export function exportToCsv(notes: Note[]): string {
  const headers = ["ID", "Text", "Tags", "Location", "Pinned", "Created At", "Updated At"];
  
  const rows = notes.map(note => [
    note.id,
    `"${note.text.replace(/"/g, '""')}"`, // Escape quotes in CSV
    `"${note.tags.join(", ")}"`,
    note.location 
      ? `"${note.location.latitude},${note.location.longitude}"` 
      : '""',
    note.pinned ? "Yes" : "No",
    new Date(note.createdAt).toISOString(),
    new Date(note.updatedAt).toISOString(),
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");
  
  return csvContent;
}

export function downloadCsvFile(notes: Note[], filename = "quicknote-solo-export.csv"): void {
  const csvData = exportToCsv(notes);
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}