import { useEffect, useRef, useCallback } from "react";
import { Howl } from "howler";
import { useAppStore } from "../store/useAppStore";

export function useAudioPlayer() {
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number>(0);

  const {
    instrumentalPath,
    originalAudioPath,
    isPlaying,
    volume,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useAppStore();

  const audioSrc = instrumentalPath || originalAudioPath;

  // Create/destroy Howl when source changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }

    if (!audioSrc) return;

    const howl = new Howl({
      src: [audioSrc],
      html5: true,
      volume: volume,
      onload: () => {
        setDuration(howl.duration());
      },
      onend: () => {
        setIsPlaying(false);
        setCurrentTime(0);
      },
    });

    howlRef.current = howl;

    return () => {
      cancelAnimationFrame(rafRef.current);
      howl.unload();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  // Sync play/pause state
  useEffect(() => {
    const howl = howlRef.current;
    if (!howl) return;

    if (isPlaying) {
      howl.play();
      const tick = () => {
        setCurrentTime(howl.seek() as number);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      howl.pause();
      cancelAnimationFrame(rafRef.current);
    }
  }, [isPlaying, setCurrentTime]);

  // Sync volume
  useEffect(() => {
    howlRef.current?.volume(volume);
  }, [volume]);

  const seek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setCurrentTime(time);
    }
  }, [setCurrentTime]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  return { seek, togglePlay };
}
