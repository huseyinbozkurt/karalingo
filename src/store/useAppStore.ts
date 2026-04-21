import { create } from "zustand";
import type { LyricLine, SongInfo, ApiKeys, AppView, ProcessingStep, LyricsSource } from "./types";

interface AppState {
  // Navigation
  view: AppView;
  setView: (view: AppView) => void;

  // Song info
  song: SongInfo | null;
  setSong: (song: SongInfo | null) => void;

  // Lyrics
  lyrics: LyricLine[];
  lyricsSynced: boolean;
  lyricsSource: LyricsSource;
  setLyrics: (lyrics: LyricLine[], synced: boolean, source: LyricsSource) => void;
  updateTranslations: (translations: string[]) => void;

  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  instrumentalPath: string | null;
  originalAudioPath: string | null;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setInstrumentalPath: (path: string | null) => void;
  setOriginalAudioPath: (path: string | null) => void;

  // Processing
  processingStep: ProcessingStep;
  processingMessage: string;
  setProcessing: (step: ProcessingStep, message?: string) => void;

  // Language
  originalLanguage: string;
  targetLanguage: string;
  setOriginalLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;

  // API Keys
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
  setupComplete: boolean;
  setSetupComplete: (complete: boolean) => void;

  // UI
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showManualLyricsInput: boolean;
  setShowManualLyricsInput: (show: boolean) => void;

  // Reset
  resetSong: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  view: "main",
  setView: (view) => set({ view }),

  // Song info
  song: null,
  setSong: (song) => set({ song }),

  // Lyrics
  lyrics: [],
  lyricsSynced: false,
  lyricsSource: null,
  setLyrics: (lyrics, synced, source) => set({ lyrics, lyricsSynced: synced, lyricsSource: source }),
  updateTranslations: (translations) =>
    set((state) => ({
      lyrics: state.lyrics.map((line, i) => ({
        ...line,
        translation: translations[i] ?? line.translation,
      })),
    })),

  // Playback
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  instrumentalPath: null,
  originalAudioPath: null,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setInstrumentalPath: (instrumentalPath) => set({ instrumentalPath }),
  setOriginalAudioPath: (originalAudioPath) => set({ originalAudioPath }),

  // Processing
  processingStep: "idle",
  processingMessage: "",
  setProcessing: (step, message = "") =>
    set({ processingStep: step, processingMessage: message }),

  // Language
  originalLanguage: "auto",
  targetLanguage: "en",
  setOriginalLanguage: (originalLanguage) => set({ originalLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),

  // API Keys
  apiKeys: {},
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setupComplete: false,
  setSetupComplete: (setupComplete) => set({ setupComplete }),

  // UI
  showSettings: false,
  setShowSettings: (showSettings) => set({ showSettings }),
  showManualLyricsInput: false,
  setShowManualLyricsInput: (showManualLyricsInput) => set({ showManualLyricsInput }),

  // Reset
  resetSong: () =>
    set({
      song: null,
      lyrics: [],
      lyricsSynced: false,
      lyricsSource: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      instrumentalPath: null,
      originalAudioPath: null,
      processingStep: "idle",
      processingMessage: "",
      showManualLyricsInput: false,
    }),
}));
