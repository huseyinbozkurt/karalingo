import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { getCurrentLineIndex } from "../utils/lrc";
import { parseManualLyrics } from "../services/lyricsService";

export function LyricsDisplay() {
  const {
    lyrics,
    currentTime,
    isPlaying,
    lyricsSynced,
    showManualLyricsInput,
    setShowManualLyricsInput,
    setLyrics,
    setProcessing,
  } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const currentIndex = lyricsSynced ? getCurrentLineIndex(lyrics, currentTime) : -1;

  // Auto-scroll to active line (only in synced mode)
  useEffect(() => {
    if (!lyricsSynced) return;
    if (activeLineRef.current && containerRef.current && isPlaying) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;
      const containerHeight = container.clientHeight;
      const lineTop = activeLine.offsetTop;
      const lineHeight = activeLine.clientHeight;

      container.scrollTo({
        top: lineTop - containerHeight / 2 + lineHeight / 2,
        behavior: "smooth",
      });
    }
  }, [currentIndex, isPlaying, lyricsSynced]);

  // Empty state: show manual paste option if all sources failed
  if (lyrics.length === 0) {
    return showManualLyricsInput ? (
      <ManualLyricsInput
        onSubmit={(text) => {
          const result = parseManualLyrics(text);
          setLyrics(result.lines, result.synced, "manual");
          setShowManualLyricsInput(false);
          setProcessing("ready", "Manual lyrics loaded");
        }}
        onCancel={() => setShowManualLyricsInput(false)}
      />
    ) : (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-sm">Lyrics will appear here</p>
          <p className="text-xs mt-1 text-gray-600">Recognize or import a song to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto lyrics-scroll px-6 py-8"
    >
      <div className="space-y-4">
        {lyrics.map((line, index) => {
          const isActive = lyricsSynced && index === currentIndex;
          const isPast = lyricsSynced && index < currentIndex;

          return (
            <div
              key={index}
              ref={isActive ? activeLineRef : undefined}
              className={`transition-all duration-300 ${
                isActive ? "scale-105 origin-left" : ""
              }`}
            >
              {/* Original lyric */}
              <p
                className={`text-lg font-medium leading-relaxed transition-colors duration-300 ${
                  isActive
                    ? "text-lyric-active"
                    : isPast
                    ? "text-gray-600"
                    : "text-gray-300"
                }`}
              >
                {line.text}
              </p>

              {/* Translation */}
              {line.translation && (
                <p
                  className={`text-sm mt-0.5 leading-relaxed transition-colors duration-300 ${
                    isActive
                      ? "text-lyric-translated"
                      : isPast
                      ? "text-gray-700"
                      : "text-gray-500"
                  }`}
                >
                  {line.translation}
                </p>
              )}
            </div>
          );
        })}

        {/* Spacer so last line can scroll to center */}
        {lyricsSynced && <div className="h-[40vh]" />}
      </div>
    </div>
  );
}

function ManualLyricsInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text);
    }
  }, [text, onSubmit]);

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-300 font-medium">Lyrics not found</p>
        <p className="text-xs text-gray-500 mt-1">
          Paste lyrics below (plain text or LRC format)
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste lyrics here...\n\nPlain text (one line per line)\nor LRC format:\n[00:12.34]First line\n[00:15.67]Second line"}
        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3
                   text-sm text-gray-200 placeholder-gray-600 resize-none
                   focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-lg text-sm text-gray-400
                     border border-gray-700 hover:border-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex-1 px-3 py-2 rounded-lg bg-primary hover:bg-primary-light
                     text-sm font-medium text-white transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use Lyrics
        </button>
      </div>
    </div>
  );
}
