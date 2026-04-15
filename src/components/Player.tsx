import { useAppStore } from "../store/useAppStore";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { formatTime } from "../utils/lrc";
import { WaveformVisualizer } from "./WaveformVisualizer";

export function Player() {
  const { isPlaying, currentTime, duration, volume, song, setVolume } = useAppStore();
  const { togglePlay, seek } = useAudioPlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-surface border-t border-gray-800 px-6 py-3">
      {/* Waveform / progress bar */}
      <div className="mb-3">
        {song ? (
          <WaveformVisualizer
            progress={progress}
            onSeek={(pct) => seek((pct / 100) * duration)}
          />
        ) : (
          <div className="h-8 flex items-center">
            <div className="w-full h-1 bg-surface-light rounded-full" />
          </div>
        )}

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Song info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {song?.albumArt ? (
            <img
              src={song.albumArt}
              alt="Album art"
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-surface-lighter flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {song?.title || "No song loaded"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {song?.artist || "Import or recognize a song"}
            </p>
          </div>
        </div>

        {/* Playback buttons */}
        <div className="flex items-center gap-4">
          {/* Rewind 10s */}
          <button
            onClick={() => seek(Math.max(0, currentTime - 10))}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              <text x="9.5" y="16" fontSize="7" fill="currentColor" fontWeight="bold">10</text>
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!song}
            className="w-12 h-12 rounded-full bg-white hover:bg-gray-200
                       flex items-center justify-center transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => seek(Math.min(duration, currentTime + 10))}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
              <text x="9" y="16" fontSize="7" fill="currentColor" fontWeight="bold">10</text>
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
