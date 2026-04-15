# KaraLingo

A cross-platform desktop karaoke app with song recognition, synced lyrics, and real-time translation. Built with [Tauri 2](https://tauri.app/) + React + TypeScript.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Song Recognition** — Hold the mic button to recognize any playing song via ACRCloud
- **Smart Lyrics Fetching** — Three-tier fallback chain: lrclib.net → Genius → Whisper transcription
- **Synced Karaoke Display** — Time-synced lyrics with auto-scrolling and active line highlighting
- **Real-Time Translation** — Translate lyrics to 20+ languages via LibreTranslate
- **Vocal Removal** — Isolate instrumentals from imported audio files using Demucs (runs locally)
- **Audio Playback** — Built-in player with play/pause, seek, volume control, and waveform visualizer
- **Audio File Import** — Drag in your own audio files (MP3, WAV, FLAC, OGG, M4A)
- **Manual Lyrics Input** — Paste plain text or LRC-formatted lyrics as a fallback
- **Environment Config** — Pre-fill API keys via `.env` files, override anytime from the Settings UI
- **Cross-Platform** — Runs on macOS, Windows, and Linux

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Tauri Window                   │
│  ┌───────────────────────────────────────────┐  │
│  │            React Frontend (Vite)          │  │
│  │  ┌──────────┐ ┌────────┐ ┌────────────┐  │  │
│  │  │ Zustand   │ │ Howler │ │ MediaRec.  │  │  │
│  │  │ Store     │ │ Player │ │ (Mic)      │  │  │
│  │  └──────────┘ └────────┘ └────────────┘  │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ invoke()                   │
│  ┌──────────────────▼────────────────────────┐  │
│  │           Rust Backend (Tauri)             │  │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │ ACRCloud  │ │ lrclib / │ │ Libre    │ │  │
│  │  │ Recognize │ │ Genius   │ │ Translate│ │  │
│  │  └───────────┘ └──────────┘ └──────────┘ │  │
│  │  ┌───────────────────────────────────┐    │  │
│  │  │ Python Sidecars (Demucs, Whisper) │    │  │
│  │  └───────────────────────────────────┘    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Framework  | Tauri 2 (Rust backend + webview frontend)             |
| Frontend   | React 18, TypeScript 6, Vite 8, Tailwind CSS 4       |
| State      | Zustand 5                                             |
| Audio      | Howler.js (playback), Web Audio API (visualizer)      |
| Mic        | MediaRecorder API                                     |
| Backend    | Rust (reqwest, tokio, hmac-sha1, regex-lite)          |
| Sidecars   | Python — Demucs (vocal separation), Whisper (STT)     |
| APIs       | ACRCloud, lrclib.net, Genius, LibreTranslate          |

## Project Structure

```
karalingo/
├── src/                          # React frontend
│   ├── App.tsx                   # Root component, lyrics fetch orchestration
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Tailwind + custom theme
│   ├── vite-env.d.ts             # VITE_* env type declarations
│   ├── components/
│   │   ├── RecognitionButton.tsx  # Mic recording + file import
│   │   ├── LyricsDisplay.tsx     # Synced/static lyrics + manual input
│   │   ├── Player.tsx            # Playback controls + time display
│   │   ├── WaveformVisualizer.tsx # 80-bar animated waveform
│   │   ├── LanguageSelector.tsx  # Source/target language pickers
│   │   ├── Settings.tsx          # API key configuration modal
│   │   ├── SetupWizard.tsx       # First-run onboarding (4 steps)
│   │   └── ProcessingOverlay.tsx # Full-screen processing spinner
│   ├── hooks/
│   │   ├── useAudioPlayer.ts     # Howler.js wrapper
│   │   └── useRecorder.ts        # MediaRecorder wrapper
│   ├── services/
│   │   └── lyricsService.ts      # Lyrics fallback chain logic
│   ├── store/
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── useAppStore.ts        # Zustand global store
│   └── utils/
│       ├── envDefaults.ts        # .env → ApiKeys reader + merger
│       ├── languages.ts          # Supported language definitions
│       └── lrc.ts                # LRC parser + time utilities
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri app builder + command registration
│   │   ├── main.rs               # Entry point
│   │   └── commands.rs           # All Tauri commands (recognition, lyrics, etc.)
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app configuration
│   └── capabilities/
│       └── default.json          # Permission grants
├── sidecar/                      # Python scripts (bundled with app)
│   ├── demucs_runner.py          # Vocal separation via htdemucs
│   └── whisper_runner.py         # Speech-to-text via OpenAI Whisper
├── .env.public                   # Committed env template (empty values)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (latest stable) — install via [rustup](https://rustup.rs/)
- **Tauri 2 CLI** — included as a dev dependency (`npm run tauri`)
- **Python 3.8+** — required only for Demucs and Whisper features (auto-installs pip packages on first use)
- **System dependencies** — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/karalingo.git
cd karalingo
npm install
```

### 2. Configure environment

Copy the template and fill in your API keys:

```bash
cp .env.public .env.local
```

Edit `.env.local`:

```env
# ACRCloud — get keys at https://console.acrcloud.com
VITE_ACRCLOUD_HOST=identify-eu-west-1.acrcloud.com
VITE_ACRCLOUD_KEY=your_access_key
VITE_ACRCLOUD_SECRET=your_access_secret

# Genius — get a token at https://genius.com/api-clients (optional)
VITE_GENIUS_KEY=your_genius_token

# LibreTranslate — public instance or your own
VITE_LIBRETRANSLATE_URL=https://libretranslate.com
```

> **Note:** `.env.local` is gitignored. You can also enter/override all keys from the in-app Settings UI or the first-run Setup Wizard.

### 3. Get API keys

| Service        | Purpose              | Required? | Free tier?          | Sign up                                                                        |
| -------------- | -------------------- | --------- | ------------------- | ------------------------------------------------------------------------------ |
| ACRCloud       | Song recognition     | Yes*      | Yes (100 req/day)   | [console.acrcloud.com](https://console.acrcloud.com)                           |
| Genius         | Lyrics fallback      | No        | Yes                 | [genius.com/api-clients](https://genius.com/api-clients)                       |
| LibreTranslate | Lyrics translation   | No        | Public instance     | [libretranslate.com](https://libretranslate.com) or [self-host](https://github.com/LibreTranslate/LibreTranslate) |

\* ACRCloud is only required for mic-based song recognition. You can skip it and import audio files directly.

## Development

```bash
# Start the Vite dev server only (frontend)
npm run dev

# Start the full Tauri app (frontend + Rust backend)
npm run tauri dev

# Type-check
npx tsc -b

# Build frontend only
npm run build
```

## Building for Production

```bash
# Build the distributable app bundle
npm run tauri build
```

This produces platform-specific installers in `src-tauri/target/release/bundle/`:

| Platform | Output                        |
| -------- | ----------------------------- |
| macOS    | `.dmg`, `.app`                |
| Windows  | `.msi`, `.exe`                |
| Linux    | `.deb`, `.AppImage`, `.rpm`   |

## How It Works

### Song Recognition

1. Press and hold the mic button to record 12 seconds of ambient audio
2. The recording is sent to ACRCloud via a signed multipart POST (HMAC-SHA1)
3. ACRCloud returns song metadata including title, artist, album, and Spotify album art URL

### Lyrics Fallback Chain

KaraLingo uses a three-tier strategy to find lyrics:

```
1. lrclib.net (free, no API key)
   ├─ Returns synced LRC lyrics when available → karaoke mode
   └─ Falls back to plain lyrics → static mode

2. Genius API (optional, needs API key)
   ├─ Search by title + artist
   └─ Scrape lyrics from song page → static mode

3. Whisper transcription (local, needs Python)
   ├─ Run Demucs to isolate vocals from audio
   └─ Run Whisper on vocal track → synced mode

4. Manual input (always available)
   └─ User pastes plain text or LRC format
```

The UI shows a colored badge indicating the source:
- **Green** — lrclib.net
- **Yellow** — Genius
- **Blue** — Whisper
- **Gray** — Manual

### Vocal Removal

When you import an audio file, KaraLingo runs [Demucs](https://github.com/facebookresearch/demucs) (htdemucs model) locally to separate vocals from instrumentals. The instrumental track is used for karaoke playback, and the vocal track can be fed to Whisper if lyrics aren't found online.

> Demucs and Whisper are auto-installed via pip on first use. No manual Python package setup required.

### Translation

Select a target language from the dropdown and click Translate. Lyrics are sent in batches to LibreTranslate. Translations appear inline below each lyric line during playback.

## Environment Configuration

KaraLingo supports a layered configuration system:

| Priority | Source          | Gitignored? | Use case                     |
| -------- | --------------- | ----------- | ---------------------------- |
| 1 (high) | Settings UI     | N/A         | User overrides (localStorage)|
| 2        | `.env.local`    | Yes         | Developer secrets            |
| 3        | `.env`          | Yes         | Shared team defaults         |
| 4 (low)  | `.env.public`   | No          | Committed empty template     |

The Settings UI shows a green "from .env" badge when a value comes from environment variables, or a gray ".env overridden" badge when the user has changed it.

## License

MIT
