export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface Note {
  id: string;
  text: string;
  tags: string[];
  location?: Location;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFilter {
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