export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes (original file size)
  url: string; // Firebase Storage URL or Base64 data URL for local storage
  thumbnailUrl?: string; // Firebase Storage thumbnail URL (Firebase only)
  uploadedAt: number;
  // Local storage compatibility
  data?: string; // Base64 encoded data (for IndexedDB compatibility)
  width?: number;
  height?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface Note {
  id: string;
  text: string;
  tags: string[];
  location?: Location;
  pinned: boolean;
  attachments?: FileAttachment[]; // ファイル添付
  timestamp: number; // 後方互換性のため
  createdAt: number;
  updatedAt: number;
}

export interface NoteFilter {
  text?: string; // 後方互換性のため
  searchText?: string;
  tags?: string[];
  period?: "today" | "7d" | "30d" | "all";
}

export interface ExportFormat {
  format: "json" | "csv" | "md";
  notes: Note[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}