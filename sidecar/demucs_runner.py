#!/usr/bin/env python3
"""
Demucs vocal separation sidecar for KaraLingo.
Separates vocals from instrumental in an audio file.

Usage: python3 demucs_runner.py <audio_file_path>
Output: JSON with instrumental_path and vocals_path
"""

import json
import os
import sys
import subprocess


def ensure_demucs():
    """Install demucs if not available."""
    try:
        import demucs  # noqa: F401
    except ImportError:
        print("Installing demucs...", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "demucs"],
            stdout=subprocess.DEVNULL,
        )


def separate(audio_path: str) -> dict:
    """Run demucs separation and return output paths."""
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    output_dir = os.path.join(os.path.dirname(audio_path), "separated")
    os.makedirs(output_dir, exist_ok=True)

    # Run demucs with htdemucs model (best quality for vocals)
    result = subprocess.run(
        [
            sys.executable, "-m", "demucs",
            "--two-stems", "vocals",
            "-n", "htdemucs",
            "-o", output_dir,
            audio_path,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Demucs failed: {result.stderr}")

    # Find output files
    basename = os.path.splitext(os.path.basename(audio_path))[0]
    model_dir = os.path.join(output_dir, "htdemucs", basename)

    vocals_path = os.path.join(model_dir, "vocals.wav")
    no_vocals_path = os.path.join(model_dir, "no_vocals.wav")

    if not os.path.isfile(no_vocals_path):
        raise FileNotFoundError(f"Instrumental not found at: {no_vocals_path}")

    return {
        "instrumental_path": no_vocals_path,
        "vocals_path": vocals_path,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: demucs_runner.py <audio_path>"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        ensure_demucs()
        result = separate(audio_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
