import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { RecognitionButton } from "./components/RecognitionButton";
import { LyricsDisplay } from "./components/LyricsDisplay";
import { LanguageSelector } from "./components/LanguageSelector";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
import { SetupWizard } from "./components/SetupWizard";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { fetchLyricsChain } from "./services/lyricsService";
import { getEnvDefaults, mergeKeys } from "./utils/envDefaults";

export default function App() {
  const {
    view,
    setView,
    song,
    apiKeys,
    setApiKeys,
    setSetupComplete,
    processingStep,
    setProcessing,
    setLyrics,
    setShowManualLyricsInput,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);

  // Load env defaults + saved keys on mount, decide if setup is needed
  useEffect(() => {
    const envDefaults = getEnvDefaults();
    let userKeys = {};
    let hasSavedKeys = false;
    try {
      const saved = localStorage.getItem("karalingo_keys");
      if (saved) {
        userKeys = JSON.parse(saved);
        hasSavedKeys = true;
      }
    } catch {
      // first run
    }

    const merged = mergeKeys(envDefaults, userKeys);
    setApiKeys(merged);

    // Skip setup if user previously saved keys OR env provides them
    const hasEnvKeys = !!(envDefaults.acrcloud_host || envDefaults.acrcloud_key);
    if (hasSavedKeys || hasEnvKeys) {
      setSetupComplete(true);
      setView("main");
    } else {
      setView("setup");
    }
  }, [setApiKeys, setSetupComplete, setView]);

  // Auto-fetch lyrics via fallback chain when triggered
  useEffect(() => {
    if (processingStep !== "fetching_lyrics" || !song) return;

    let cancelled = false;

    const run = async () => {
      const audioPath = useAppStore.getState().originalAudioPath;

      try {
        const result = await fetchLyricsChain(
          song.title,
          song.artist,
          song.album,
          audioPath,
          apiKeys,
          (msg) => {
            if (!cancelled) setProcessing("fetching_lyrics", msg);
          },
        );

        if (cancelled) return;

        setLyrics(result.lines, result.synced, result.source);

        const sourceLabel = result.source === "lrclib" ? "lrclib.net"
          : result.source === "genius" ? "Genius"
          : "Whisper";
        const syncLabel = result.synced ? "synced" : "static";
        setProcessing("ready", `Lyrics loaded from ${sourceLabel} (${syncLabel})`);
      } catch {
        if (cancelled) return;
        setProcessing("error", "Lyrics not found");
        setShowManualLyricsInput(true);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [processingStep, song, apiKeys, setLyrics, setProcessing, setShowManualLyricsInput]);

  // Show setup wizard
  if (view === "setup") {
    return <SetupWizard />;
  }

  return <AppMain showSettings={showSettings} setShowSettings={setShowSettings} />;
}

const SOURCE_BADGE_COLORS: Record<string, string> = {
  lrclib: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  genius: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  whisper: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  manual: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function LyricsSourceBadge() {
  const { lyricsSource, lyricsSynced } = useAppStore();
  if (!lyricsSource) return null;

  const colors = SOURCE_BADGE_COLORS[lyricsSource] || SOURCE_BADGE_COLORS.manual;

  return (
    <div className="flex items-center gap-1.5">
      {!lyricsSynced && (
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">static</span>
      )}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors}`}>
        {lyricsSource}
      </span>
    </div>
  );
}

function AppMain({ showSettings, setShowSettings }: { showSettings: boolean; setShowSettings: (v: boolean) => void }) {
  const {
    song,
    lyrics,
    processingStep,
    processingMessage,
  } = useAppStore();

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            Kara<span className="text-primary">Lingo</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {song && <LanguageSelector />}

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-surface-light transition-colors text-gray-400 hover:text-white"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Center area: Recognition + Album art */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-w-0">
          {!song ? (
            <div className="flex flex-col items-center">
              <RecognitionButton />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full max-w-sm">
              {/* Album art */}
              {song.albumArt ? (
                <img
                  src={song.albumArt}
                  alt={`${song.album} cover`}
                  className="w-64 h-64 rounded-2xl shadow-2xl shadow-black/50 object-cover"
                />
              ) : (
                <div className="w-64 h-64 rounded-2xl bg-surface-light flex items-center justify-center">
                  <svg className="w-20 h-20 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}

              {/* Song info */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{song.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{song.artist}</p>
                {song.album && song.album !== "Imported" && (
                  <p className="text-xs text-gray-500 mt-0.5">{song.album}</p>
                )}
              </div>

              {/* Processing status */}
              {processingStep === "ready" && processingMessage && (
                <p className="text-xs text-accent">{processingMessage}</p>
              )}
              {processingStep === "error" && (
                <p className="text-xs text-red-400">{processingMessage}</p>
              )}

              {/* New song button */}
              <button
                onClick={() => useAppStore.getState().resetSong()}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors mt-2"
              >
                Choose another song
              </button>
            </div>
          )}
        </div>

        {/* Right panel: Lyrics */}
        <div className="w-[400px] border-l border-gray-800 bg-surface/50 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-300">Lyrics</h3>
              {lyrics.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {lyrics.length} lines
                  {lyrics.some((l) => l.translation) && " · translated"}
                </p>
              )}
            </div>
            <LyricsSourceBadge />
          </div>
          <LyricsDisplay />
        </div>
      </div>

      {/* Bottom: Player */}
      <Player />

      {/* Modals */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      <ProcessingOverlay />
    </div>
  );
}
