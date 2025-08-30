import type { Note } from "../models/note";
import { createMapUrl } from "../geo/getCurrentPosition";

export function exportToMarkdown(notes: Note[]): string {
  const title = "# QuickNote Solo Export\n\n";
  const exportDate = `*Exported on ${new Date().toISOString()}*\n\n`;
  
  const notesContent = notes.map(note => {
    let markdown = `## ${note.pinned ? "[PINNED] " : ""}${note.text}\n\n`;
    
    if (note.tags.length > 0) {
      markdown += `**Tags:** ${note.tags.map(tag => `\`${tag}\``).join(", ")}\n\n`;
    }
    
    if (note.location) {
      const mapUrl = createMapUrl(note.location);
      markdown += `**Location:** [${note.location.latitude.toFixed(6)}, ${note.location.longitude.toFixed(6)}](${mapUrl})\n\n`;
    }
    
    markdown += `**Created:** ${new Date(note.createdAt).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(note.updatedAt).toLocaleString()}\n\n`;
    markdown += "---\n\n";
    
    return markdown;
  }).join("");
  
  return title + exportDate + notesContent;
}

export function downloadMarkdownFile(notes: Note[], filename = "quicknote-solo-export.md"): void {
  const markdownData = exportToMarkdown(notes);
  const blob = new Blob([markdownData], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}