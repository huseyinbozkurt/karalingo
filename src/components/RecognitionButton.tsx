import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../store/useAppStore";

const RECORD_DURATION = 12000;

export function RecognitionButton() {
  const { apiKeys, setProcessing, setSong, setOriginalAudioPath, setShowSettings } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const handleRecognize = useCallback(async () => {
    if (!apiKeys.acrcloud_host || !apiKeys.acrcloud_key || !apiKeys.acrcloud_secret) {
      setProcessing("error", "ACRCloud API keys required — configure them in Settings");
      setShowSettings(true);
      return;
    }

    try {
      // Start recording
      setIsRecording(true);
      setRecordingProgress(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingProgress(Math.min(elapsed / RECORD_DURATION, 1));
      }, 100);

      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = () => reject(new Error("Failed to read audio"));
          reader.readAsDataURL(blob);
        };

        mediaRecorder.onerror = () => reject(new Error("Recording failed"));
        mediaRecorder.start();

        setTimeout(() => {
          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        }, RECORD_DURATION);
      });

      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingProgress(0);
      setProcessing("recognizing", "Identifying song...");

      const result = await invoke<{
        title: string;
        artist: string;
        album: string;
        album_art: string | null;
      }>("recognize_song", {
        audioBase64,
        host: apiKeys.acrcloud_host,
        accessKey: apiKeys.acrcloud_key,
        accessSecret: apiKeys.acrcloud_secret,
      });

      setSong({
        title: result.title,
        artist: result.artist,
        album: result.album,
        albumArt: result.album_art ?? undefined,
      });

      setProcessing("fetching_lyrics", "Fetching lyrics...");
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingProgress(0);
      setProcessing("error", `Recognition failed: ${err}`);
    }
  }, [apiKeys, setProcessing, setSong, setShowSettings]);

  const handleFileImport = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Audio", extensions: ["mp3", "wav", "flac", "ogg", "m4a"] },
        ],
      });

      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        setOriginalAudioPath(path);

        const filename = path.split(/[/\\]/).pop() || "Unknown";
        const title = filename.replace(/\.[^.]+$/, "");

        setSong({
          title,
          artist: "Unknown Artist",
          album: "Imported",
        });

        setProcessing("separating_vocals", "Separating vocals with Demucs...");

        try {
          const result = await invoke<{
            instrumental_path: string;
            vocals_path: string;
          }>("run_demucs", { audioPath: path });

          useAppStore.getState().setInstrumentalPath(result.instrumental_path);
          setProcessing("fetching_lyrics", "Fetching lyrics...");
        } catch {
          // Demucs not available — play original
          setProcessing("ready", "Playing original audio (install Demucs for vocal removal)");
        }
      }
    } catch (err) {
      setProcessing("error", `Import failed: ${err}`);
    }
  }, [setOriginalAudioPath, setSong, setProcessing]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Mic button */}
      <button
        onClick={handleRecognize}
        disabled={isRecording}
        className="relative w-20 h-20 rounded-full bg-primary hover:bg-primary-light
                   transition-all duration-300 flex items-center justify-center
                   shadow-lg shadow-primary/30 hover:shadow-primary/50
                   disabled:opacity-70 group"
      >
        {isRecording ? (
          <>
            <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="36"
                fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"
              />
              <circle
                cx="40" cy="40" r="36"
                fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={`${recordingProgress * 226.2} 226.2`}
                strokeLinecap="round"
                className="transition-all duration-100"
              />
            </svg>
            <div className="w-5 h-5 bg-white rounded-sm animate-pulse" />
          </>
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      <span className="text-xs text-gray-400">
        {isRecording ? "Listening..." : "Tap to recognize"}
      </span>

      <div className="flex items-center gap-2 w-full max-w-[200px]">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      <button
        onClick={handleFileImport}
        className="flex items-center gap-2 px-4 py-2 rounded-lg
                   bg-surface-light hover:bg-surface-lighter
                   transition-colors text-sm text-gray-300"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Import audio file
      </button>
    </div>
  );
}
