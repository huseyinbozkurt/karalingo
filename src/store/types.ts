export interface LyricLine {
  time: number; // seconds (-1 = no timestamp)
  text: string;
  translation?: string;
}

export interface SongInfo {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: number;
}

export type LyricsSource = "lrclib" | "genius" | "whisper" | "manual" | null;

export interface ApiKeys {
  acrcloud_host?: string;
  acrcloud_key?: string;
  acrcloud_secret?: string;
  genius_key?: string;
  libretranslate_url?: string;
}

export type AppView = "main" | "settings" | "setup";

export type ProcessingStep =
  | "idle"
  | "recognizing"
  | "fetching_lyrics"
  | "separating_vocals"
  | "translating"
  | "ready"
  | "error";
