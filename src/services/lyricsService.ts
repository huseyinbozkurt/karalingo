import { invoke } from "@tauri-apps/api/core";
import type { LyricLine, LyricsSource, ApiKeys } from "../store/types";

export interface LyricsResult {
  lines: LyricLine[];
  synced: boolean;
  source: LyricsSource;
}

interface BackendLyricsResult {
  lines: { time: number; text: string }[];
  synced: boolean;
}

type ProgressCallback = (message: string) => void;

/**
 * Fetches lyrics using a three-tier fallback chain:
 * 1. lrclib.net (free, no key needed, synced lyrics)
 * 2. Genius API (requires key, plain lyrics only)
 * 3. Whisper sidecar (local, requires audio file + Python)
 *
 * Falls through each provider on failure and reports which source was used.
 */
export async function fetchLyricsChain(
  title: string,
  artist: string,
  album: string | undefined,
  audioPath: string | null,
  apiKeys: ApiKeys,
  onProgress: ProgressCallback,
): Promise<LyricsResult> {
  // ── 1. Try lrclib.net ──────────────────────────────────────────
  onProgress("Searching lrclib.net...");
  try {
    const result = await invoke<BackendLyricsResult>("fetch_lyrics_lrclib", {
      title,
      artist,
      album: album ?? null,
    });

    if (result.lines.length > 0) {
      return {
        lines: result.lines.map((l) => ({ time: l.time, text: l.text })),
        synced: result.synced,
        source: "lrclib",
      };
    }
  } catch (err) {
    console.warn("lrclib failed:", err);
  }

  // ── 2. Try Genius API ──────────────────────────────────────────
  if (apiKeys.genius_key) {
    onProgress("Searching Genius...");
    try {
      const result = await invoke<BackendLyricsResult>("fetch_lyrics_genius", {
        title,
        artist,
        apiKey: apiKeys.genius_key,
      });

      if (result.lines.length > 0) {
        return {
          lines: result.lines.map((l) => ({ time: l.time, text: l.text })),
          synced: false,
          source: "genius",
        };
      }
    } catch (err) {
      console.warn("Genius failed:", err);
    }
  }

  // ── 3. Try Whisper sidecar ─────────────────────────────────────
  if (audioPath) {
    onProgress("Extracting lyrics with Whisper (this may take a minute)...");
    try {
      const lines = await invoke<{ time: number; text: string }[]>("run_whisper", {
        audioPath,
      });

      if (lines.length > 0) {
        return {
          lines: lines.map((l) => ({ time: l.time, text: l.text })),
          synced: true,
          source: "whisper",
        };
      }
    } catch (err) {
      console.warn("Whisper failed:", err);
    }
  }

  // ── All failed ─────────────────────────────────────────────────
  throw new Error("Lyrics not found from any source");
}

/**
 * Parse manually pasted lyrics into LyricLine array.
 * Supports plain text (one line per line) or LRC format.
 */
export function parseManualLyrics(text: string): { lines: LyricLine[]; synced: boolean } {
  const lrcRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  const rawLines = text.split("\n").filter((l) => l.trim().length > 0);

  // Check if it's LRC format
  const hasLrc = rawLines.some((l) => lrcRegex.test(l));

  if (hasLrc) {
    const lines: LyricLine[] = [];
    for (const raw of rawLines) {
      const match = raw.match(lrcRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, "0"), 10);
        const time = minutes * 60 + seconds + ms / 1000;
        const lineText = match[4].trim();
        if (lineText) {
          lines.push({ time, text: lineText });
        }
      }
    }
    lines.sort((a, b) => a.time - b.time);
    return { lines, synced: lines.length > 0 };
  }

  // Plain text — no timestamps
  const lines: LyricLine[] = rawLines.map((line, i) => ({
    time: i * -1,
    text: line.trim(),
  }));

  return { lines, synced: false };
}
