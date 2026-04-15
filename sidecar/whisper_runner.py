#!/usr/bin/env python3
"""
Whisper speech-to-text sidecar for KaraLingo.
Extracts lyrics with timestamps from audio files.

Usage: python3 whisper_runner.py <audio_file_path>
Output: JSON array of {time: float, text: string}
"""

import json
import os
import sys
import subprocess


def ensure_whisper():
    """Install openai-whisper if not available."""
    try:
        import whisper  # noqa: F401
    except ImportError:
        print("Installing openai-whisper...", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "openai-whisper"],
            stdout=subprocess.DEVNULL,
        )


def transcribe(audio_path: str) -> list:
    """Transcribe audio and return timestamped lines."""
    import whisper

    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Use 'base' model for balance of speed and accuracy
    model = whisper.load_model("base")

    result = model.transcribe(
        audio_path,
        word_timestamps=True,
        verbose=False,
    )

    lines = []
    for segment in result.get("segments", []):
        text = segment.get("text", "").strip()
        if text:
            lines.append({
                "time": round(segment["start"], 2),
                "text": text,
            })

    return lines


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: whisper_runner.py <audio_path>"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        ensure_whisper()
        lines = transcribe(audio_path)
        print(json.dumps(lines))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
