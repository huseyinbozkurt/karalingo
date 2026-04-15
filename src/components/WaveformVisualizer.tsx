import { useRef, useMemo, useCallback } from "react";

interface WaveformVisualizerProps {
  progress: number; // 0-100
  onSeek: (percent: number) => void;
}

export function WaveformVisualizer({ progress, onSeek }: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate pseudo-random waveform bars (consistent per session)
  const bars = useMemo(() => {
    const count = 80;
    const heights: number[] = [];
    let seed = 42;
    for (let i = 0; i < count; i++) {
      seed = (seed * 16807 + 7) % 2147483647;
      const h = 0.2 + ((seed % 1000) / 1000) * 0.8;
      heights.push(h);
    }
    return heights;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onSeek(Math.max(0, Math.min(100, pct)));
    },
    [onSeek],
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="h-8 flex items-end gap-px cursor-pointer group"
    >
      {bars.map((h, i) => {
        const barProgress = (i / bars.length) * 100;
        const isPlayed = barProgress <= progress;

        return (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-colors duration-150 ${
              isPlayed
                ? "bg-primary"
                : "bg-surface-lighter group-hover:bg-gray-600"
            }`}
            style={{ height: `${h * 100}%` }}
          />
        );
      })}
    </div>
  );
}
