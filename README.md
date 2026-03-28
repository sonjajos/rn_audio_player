# React Native Audio Player

An iOS audio player built with React Native and Expo, featuring real-time FFT audio visualization and waveform display. This project is part of a master thesis comparing performance characteristics between Flutter, React Native, and native Swift implementations of an equivalent audio player application. The app is currently runnable on **iOS only**.

---

## Table of Contents

- [App Description](#app-description)
- [Prerequisites & Tools](#prerequisites--tools)
- [Running the App](#running-the-app)
- [Use Cases](#use-cases)
- [Architecture](#architecture)
  - [Overview](#overview)
  - [Directory Structure](#directory-structure)
  - [Stores (Zustand)](#stores-zustand)
  - [Services (Singletons)](#services-singletons)
  - [Screens & Navigation](#screens--navigation)
  - [Components](#components)
  - [Audio Visualizer](#audio-visualizer)
  - [Waveform Seeker](#waveform-seeker)
  - [Expo Audio Engine Module (Swift)](#expo-audio-engine-module-swift)
  - [Waveform C++ Module](#waveform-c-module)
  - [SQLite Storage](#sqlite-storage)
  - [FFT Data Flow](#fft-data-flow)
  - [End-to-End Playback Flow](#end-to-end-playback-flow)

---

## App Description

This audio player allows users to import audio files from their device, browse a local library, and play tracks with a real-time circular audio visualizer and waveform seeker. It is architected to be performance-measurable — specifically designed for comparison against equivalent Flutter and native Swift implementations as part of a master thesis on cross-platform mobile performance.

The app supports two rendering backends for the visualizer (selectable via environment variable):

- **Skia** — GPU-accelerated rendering via `@shopify/react-native-skia`
- **Reanimated** — UI-thread animation via `react-native-reanimated`

---

## Prerequisites & Tools

### System Requirements

- macOS (required for iOS development)
- Xcode 15 or later (with iOS 16+ SDK)
- iOS Simulator or physical iOS device

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Yarn | 1.x | Package manager |
| Expo CLI | Latest | Expo toolchain |
| CocoaPods | Latest | iOS dependency manager |
| CMake | 3.x+ | Building the C++ waveform module |

### Installation

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Install CocoaPods (via Homebrew)
brew install cocoapods

# Install CMake (required for waveform C++ module)
brew install cmake
```

### Environment Configuration

Create a `.env` file in the project root to select the visualizer renderer:

```env
RENDERER=skia       # Use Skia GPU-accelerated renderer (default)
# RENDERER=reanimated  # Use Reanimated UI-thread renderer
```

---

## Running the App

```bash
# Install JS dependencies
yarn install

# Install iOS CocoaPods
cd ios && pod install && cd ..

# Build and run on iOS simulator (debug mode)
expo run:ios

# Run on a specific simulator
expo run:ios --simulator "iPhone 15"

# Start Metro bundler separately (optional)
npx expo start --clear
```

---

## Use Cases

1. **Import audio files** — Pick one or more audio files (MP3, M4A, WAV, AAC, FLAC, AIFF) from the device using the system document picker. Files are copied to app's Documents directory for persistence.

2. **Browse audio library** — View all imported audio files in a scrollable list showing title, artist, and duration. Swipe left on any track to delete it.

3. **Play a track** — Tap any track in the library to open the full-screen player. Playback begins immediately.

4. **Playback controls** — Play, pause, resume, stop, skip to next, or go to previous track. Controls are also available from the lock screen and Control Center.

5. **Real-time visualization** — View a circular audio visualizer that reacts to the audio frequency spectrum in real time using FFT analysis.

6. **Waveform navigation** — View a waveform representation of the current track with a progress indicator showing elapsed and remaining time.

7. **Adjust FFT resolution** — Cycle through band count presets (16 / 32 / 64 / 128 bands) from the player screen to change visualizer detail.

8. **Mini player** — While browsing the library with a track loaded, a compact player bar at the bottom shows the visualizer, track info, and playback controls.

9. **Background audio** — Audio continues playing when the app goes to the background. Lock screen controls allow playback management without returning to the app.

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────┐
│                   React Native (JS/TS)              │
│                                                     │
│  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │  Screens │  │          Zustand Stores          │ │
│  │  & Nav   │  │  useAudioTrackStore              │ │
│  └────┬─────┘  │  useAudioMetadataStore           │ │
│       │        │  fftStore (module-level)         │ │
│  ┌────▼─────┐  └───────────────┬──────────────────┘ │
│  │Components│                  │                    │
│  │Visualizer│  ┌───────────────▼──────────────────┐ │
│  │Waveform  │  │         Services (Singletons)    │ │
│  │Controls  │  │  AudioPlayerService              │ │
│  └──────────┘  │  AudioMetadataService            │ │
│                │  SQLiteService                   │ │
│                └───────────────┬──────────────────┘ │
└────────────────────────────────┼────────────────────┘
                                 │ Native Bridge
                                 │ (Expo Modules API)
┌────────────────────────────────▼────────────────────┐
│              Expo Audio Engine Module (Swift)       │
│                                                     │
│  ExpoAudioEngineModule                              │
│  ├── AudioEnginePlayer (AVAudioEngine + FFT)        │
│  ├── AudioSessionManager (AVAudioSession)           │
│  └── NowPlayingService (MPRemoteCommandCenter)      │
│                          │                          │
│                          ▼                          │
│              WaveformCppBridge (Obj-C++)            │
│                          │                          │
│                          ▼                          │
│           waveform_peaks.cpp (C++ Library)          │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
              SQLite Database (expo-sqlite)
              Documents/audio_files/ (filesystem)
```

---

### Directory Structure

```
rn_audio_player/
├── App.tsx                        # Root component, initializes stores & navigation
├── index.ts                       # Entry point (registerRootComponent)
├── app.config.ts                  # Expo config, reads .env for RENDERER variable
├── app.json                       # Expo app manifest
├── .env                           # RENDERER=skia|reanimated
│
├── src/
│   ├── config.ts                  # Exports RENDERER constant
│   ├── models/
│   │   └── AudioTrack.ts          # AudioTrack interface (id, title, artist, filePath, duration)
│   ├── stores/
│   │   ├── useAudioTrackStore.ts  # Playback state (current track, position, queue)
│   │   ├── useAudioMetadataStore.ts # Library state (all imported tracks)
│   │   └── fftStore.ts            # Module-level FFT SharedValues + subscription
│   ├── services/
│   │   ├── AudioPlayerService.ts  # Singleton wrapping the native ExpoAudioEngine
│   │   ├── SQLiteService.ts       # Singleton for SQLite track metadata persistence
│   │   └── AudioMetadataService.ts # Singleton for file I/O and metadata extraction
│   ├── screens/
│   │   ├── AudioListScreen.tsx    # Library view with file import and mini player
│   │   └── AudioPlayerScreen.tsx  # Full-screen player with visualizer and waveform
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Native stack navigator (AudioList → AudioPlayer)
│   ├── components/
│   │   ├── Visualizer.tsx         # Facade: delegates to Skia or Reanimated variant
│   │   ├── SkiaCircularVisualizer.tsx     # GPU-rendered circular visualizer (Skia)
│   │   ├── ReanimatedCircularVisualizer.tsx # UI-thread circular visualizer (Reanimated)
│   │   ├── WaveformSeeker.tsx     # Skia-rendered static waveform with progress
│   │   ├── PlaybackControls.tsx   # Play/pause/next/previous buttons
│   │   ├── MiniPlayerBar.tsx      # Compact player bar shown on list screen
│   │   └── AudioListItem.tsx      # List item with swipe-to-delete
│   ├── hooks/
│   │   └── useFFTData.ts          # Hook to subscribe to module-level FFT data
│   └── utils/
│       └── formatDuration.ts      # ms → "m:ss" formatter
│
├── modules/
│   ├── expo-audio-engine/         # Custom Expo native module (Swift)
│   │   ├── src/
│   │   │   ├── ExpoAudioEngineModule.ts   # TypeScript module interface
│   │   │   └── ExpoAudioEngine.types.ts  # Event and method type definitions
│   │   └── ios/
│   │       ├── ExpoAudioEngineModule.swift  # Module entry point, wires all iOS components
│   │       ├── AudioEnginePlayer.swift      # Core AVAudioEngine player + FFT
│   │       ├── AudioSessionManager.swift    # AVAudioSession lifecycle
│   │       ├── NowPlayingService.swift      # Lock screen / Control Center integration
│   │       ├── WaveformCppBridge.h          # Obj-C++ bridge header
│   │       └── WaveformCppBridge.mm         # Obj-C++ bridge implementation
│   │
│   └── waveform-cpp/              # C++ waveform analysis library
│       ├── include/
│       │   └── waveform_peaks.h   # C extern declaration
│       ├── src/
│       │   └── waveform_peaks.cpp # RMS-based waveform peak computation
│       └── CMakeLists.txt         # CMake build configuration
│
└── ios/                           # Xcode project (generated by Expo prebuild)
    ├── RNAudioPlayer/
    │   ├── AppDelegate.swift
    │   └── RNAudioPlayer-Bridging-Header.h
    ├── RNAudioPlayer.xcodeproj/
    └── RNAudioPlayer.xcworkspace/
```

---

### Stores (Zustand)

The app uses [Zustand](https://github.com/pmndrs/zustand) for lightweight, hooks-based state management. There are two Zustand stores and one module-level FFT store.

#### `useAudioTrackStore`

The central store for all playback state. It bridges the native audio engine to the React component tree.

**State:**
```typescript
currentTrack: AudioTrack | null     // Currently loaded track
isPlaying: boolean                  // Playback active?
position: number                    // Current position in ms
duration: number                    // Track duration in ms
queue: AudioTrack[]                 // Current play queue
currentIndex: number                // Index in queue
bandCount: number                   // FFT band count (16/32/64/128)
waveformPeaks: number[] | null      // Normalized waveform peaks (0-1)
```

**Key methods:**
- `playAt(index, queue?)` — Load a track from the queue and start playback
- `pause()`, `resume()`, `stop()`, `next()`, `previous()` — Playback control
- `setBandCount(count)` — Change FFT resolution; relays to native
- `loadWaveform(filePath)` — Async: fetches waveform peaks from C++ module

**Event wiring:** On initialization, subscribes to native events from `AudioPlayerService`:
- `onStateChange` → updates `isPlaying`, `position`, `duration`
- `onTrackCompleted` → auto-advances to next track in queue
- `onLockScreenNext/Previous` → handles hardware media key commands

#### `useAudioMetadataStore`

Manages the audio file library — the list of all tracks the user has imported.

**State:**
```typescript
tracks: AudioTrack[]    // All imported audio files
isLoading: boolean      // Loading in progress?
```

**Key methods:**
- `loadTracks()` — Syncs DB with disk, updates store
- `uploadTrack(fileUri)` — Copies file, extracts metadata, saves to SQLite
- `removeTrack(track)` — Deletes from filesystem and SQLite

#### `fftStore` (Module-Level)

Not a Zustand store — a module-level singleton managing real-time FFT data. This pattern avoids Zustand re-renders for high-frequency updates (~60+ Hz).

```typescript
// Pre-allocated Reanimated SharedValues (one per band, up to 128)
fftBandValues: SharedValue<number>[]

// Subscription management
startFFTSubscription()   // Register native onFFTData listener
stopFFTSubscription()    // Unregister (reference counted)
```

**Why module-level?** Keeping the FFT subscription alive at module scope (rather than tied to a component's lifecycle) prevents animation lag caused by subscription teardown/re-setup during navigation transitions. This mirrors the broadcast stream pattern used in the Flutter counterpart.

---

### Services (Singletons)

All three services are module-level singletons instantiated once and never destroyed.

#### `AudioPlayerService`

Wraps the native `ExpoAudioEngine` module. It is the single point of contact between JavaScript and the native audio engine.

```typescript
// Methods
play(filePath, title, artist): Promise<void>
pause(), resume(), stop(): void
seek(positionMs): void
setBandCount(count): void
loadWaveform(filePath, barCount): Promise<number[]>
getMetadata(filePath): Promise<TrackMetadata>
getPosition(): number          // Synchronous
getIsPlaying(): boolean        // Synchronous
getDurationMs(): number        // Synchronous

// Callbacks (set by useAudioTrackStore)
onTrackCompleted: () => void
onStateChange: (state, positionMs, durationMs) => void
onLockScreenNext: () => void
onLockScreenPrevious: () => void
```

It maintains a local cache of `_isPlaying`, `_positionMs`, and `_durationMs` kept in sync via the `onStateChanged` native event, enabling synchronous reads without bridge round-trips.

#### `SQLiteService`

Manages persistence of audio file metadata using `expo-sqlite`. Opens the database lazily on first access.

**Database schema:**
```sql
CREATE TABLE tracks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  title    TEXT    NOT NULL,
  artist   TEXT    NOT NULL,
  filePath TEXT    NOT NULL UNIQUE,
  duration INTEGER NOT NULL
);
```

WAL journal mode is enabled for better concurrent read/write performance.

**Methods:** `insertTrack`, `getAllTracks`, `deleteTrack`, `updateTrackFilePath`, `updateTrackDuration`

#### `AudioMetadataService`

Handles all file system operations and metadata extraction.

**Methods:**
- `listAudioFiles()` — Scans `Documents/audio_files/` for supported audio formats (mp3, m4a, wav, aac, flac, ogg, aiff)
- `copyToDocuments(sourceUri)` — Copies a picked file into persistent storage, deduplicates filenames by appending `_1`, `_2`, etc.
- `deleteFile(filePath)` — Removes a file from the filesystem
- `scanLocalFiles()` — Synchronizes the SQLite DB with actual files on disk: removes stale entries, backfills missing durations, imports newly discovered files
- `extractMetadataFromFilename(path)` — Fallback parser when ID3 tags are unavailable (filename → title, "Unknown Artist")

---

### Screens & Navigation

Navigation uses `@react-navigation/native-stack` with a dark theme.

```
AudioListScreen  (default, title="Audio Player")
       │
       └─────► AudioPlayerScreen  (title="Now Playing")
```

#### `AudioListScreen`

The library view. Shows all imported tracks in a `FlatList`. A floating action button (`+`) opens the system document picker to import new files. A `MiniPlayerBar` is shown at the bottom whenever a track is loaded.

#### `AudioPlayerScreen`

Full-screen player. Layout from top to bottom:
1. Track title and artist name
2. Large circular audio visualizer (fills remaining space)
3. Waveform seeker with elapsed/total time
4. Playback controls (Previous / Play-Pause / Next)

A small badge in the top-right corner cycles the FFT band count: 16 → 32 → 64 → 128 → 16.

---

### Components

#### `Visualizer`

A facade component that reads the `RENDERER` config and delegates to either `SkiaCircularVisualizer` or `ReanimatedCircularVisualizer`. This is the only place where the renderer choice is resolved — all callers use `<Visualizer>` without knowing which backend is active.

```typescript
// Props
bandValues: SharedValue<number>[]   // FFT band data (Reanimated SharedValues)
bandCount: number                   // How many bands to render (≤ 128)
width: number
height: number
maxHeightFraction?: number          // Caps bar length as fraction of radius
```

#### `PlaybackControls`

Three-button row: Previous | Play/Pause | Next. Icons are drawn with plain `<View>` elements (triangles and bars) — no image assets.

#### `AudioListItem`

List item with swipe-to-delete gesture (via `ReanimatedSwipeable`). Shows a hand-drawn music note icon, track title, artist, and formatted duration. Delete triggers a confirmation alert.

#### `MiniPlayerBar`

Compact player shown on the list screen when a track is loaded. Contains a small visualizer (16 bands, 55% max height), track info, and playback controls. Tapping navigates to the full player screen.

---

### Audio Visualizer

The app ships two implementations of the same circular visualizer. Both use the same geometry, color scheme, and smoothing algorithm — only the rendering approach differs, enabling direct performance comparison.

#### Geometry

Both visualizers render `2 × bandCount` bars arranged in a circle:
- Left half: bands 0 to N-1
- Right half: mirrored bands N-1 to 0
- Inner radius: ~28% of the widget's side length
- Max bar length: ~22% of the side length
- Color: HSL gradient from pink (hue 340°) to cyan (hue 180°) across bands

A module-level `rotationProgress` SharedValue drives continuous rotation (shared between both implementations — only one runs at a time).

#### Smoothing

Both implementations use exponential interpolation (`LERP_FACTOR = 0.3`) applied on every animation frame via `useFrameCallback`. This runs on the UI thread and does not touch the JS thread.

#### `SkiaCircularVisualizer`

Uses `@shopify/react-native-skia`. A `useDerivedValue()` computes a Skia `Picture` from all smoothed band values and feeds it to a `<Canvas>`. All bars are drawn in a single pass — functionally equivalent to Flutter's `CustomPainter`. This is expected to be the more performant backend.

#### `ReanimatedCircularVisualizer`

Uses `react-native-reanimated`. Renders `2 × bandCount` individual `<Animated.View>` components. Each bar's position and dimensions are computed in a `useAnimatedStyle()` worklet running on the UI thread. Colors are pre-computed as hex strings via `useMemo` to avoid per-frame string allocation.

---

### Waveform Seeker

`WaveformSeeker` is a Skia Canvas component that displays a static waveform of the current track and a progress indicator.

**States:**
- **Loading:** Rendered as placeholder sine-wave tick marks while waveform data is being computed
- **Loaded:** Full waveform bars rendered as rounded rectangles

**Bar coloring:**
- Bars to the left of the playhead (elapsed): semi-transparent cyan
- Bars to the right (remaining): darker, subdued cyan with full-opacity white tips on the tallest

**Progress animation:** When playing, the progress position uses `withTiming(target, { duration: 120 })` for smooth movement. When seeking or paused, it updates instantly.

The waveform data comes from the C++ module (see below) and is stored in `useAudioTrackStore.waveformPeaks`.

---

### Expo Audio Engine Module (Swift)

A custom native Expo module (`modules/expo-audio-engine/`) that exposes audio playback, metadata extraction, and waveform generation to JavaScript via the Expo Modules API.

#### Module Entry Point: `ExpoAudioEngineModule.swift`

Orchestrates three sub-components and maps them to the JavaScript-facing API:

```
ExpoAudioEngineModule
├── AudioEnginePlayer       — Actual audio playback and FFT
├── AudioSessionManager     — AVAudioSession configuration
└── NowPlayingService       — Lock screen / Control Center
```

**Events emitted to JS:**
- `onStateChanged` — `{ state, positionMs, durationMs }` at ~10 Hz
- `onFFTData` — `{ bands: [Float], nativeFftTimeUs }` at audio tap rate (~60+ Hz)
- `onTrackCompleted` — Fired when track finishes playing
- `onCommand` — `{ command: "play"|"pause"|"next"|"previous" }` from lock screen

**Metadata extraction:** Uses `AVAsset.commonMetadata` to read ID3 tags (title, artist). Falls back to filename parsing. Duration is computed from `AVAudioFile.length / sampleRate`.

#### `AudioEnginePlayer.swift`

Core playback engine built on `AVAudioEngine` + `AVAudioPlayerNode`.

**Playback:**
- Files are loaded with `AVAudioFile` and scheduled via `playerNode.scheduleSegment()`
- Seek operations stop the player, update `seekFrameOffset`, and reschedule from the new position
- Position is tracked by `playerNode.playerTime(forNodeTime:)` + `seekFrameOffset`
- A `DispatchSourceTimer` fires every 100ms to emit state updates

**FFT Pipeline:**

```
Audio Output (AVAudioEngine MainMixerNode tap)
        │
        ▼  4096 samples per buffer
Stereo → Mono (vDSP_vadd)
        │
        ▼
Backpressure check (os_unfair_lock)
   → drop frame if previous FFT still running
        │
        ▼
Snapshot to windowedBuffer
        │
        ├──► fftQueue.async {
        │         Hann window (vDSP_hann_window)
        │         Real-to-complex conversion (vDSP_ctoz)
        │         FFT (vDSP_fft_zrip, radix-2)
        │         Magnitude² (vDSP_zvmags)
        │         dB conversion (vDSP_vdbcon)
        │         Logarithmic band grouping
        │         Normalization (60 dB floor, power curve)
        │         → emit onFFTData callback
        │    }
```

**App lifecycle handling:**
- `didEnterBackground` → full teardown (stop player, stop timer, remove tap, stop engine); records seek offset so position is preserved
- `willEnterForeground` → does NOT auto-resume; notifies JS of current paused state
- `AVAudioEngineConfigurationChange` → reconnects nodes and resumes if was playing (handles audio route changes like Bluetooth connect/disconnect)

**Waveform generation:**
Reads the entire audio file into an `AVAudioPCMBuffer`, mixes channels to mono, then delegates to the C++ bridge.

#### `AudioSessionManager.swift`

Configures `AVAudioSession`:
- Category: `.playback` (audio plays even when the device is silenced)
- Handles interruptions (phone calls, Siri): pauses on interruption began, optionally resumes on interruption ended
- Handles route changes: pauses when headphones are unplugged

#### `NowPlayingService.swift`

Integrates with `MPRemoteCommandCenter` and `MPNowPlayingInfoCenter`:
- Registers handlers for Play, Pause, Next, Previous, and ChangePlaybackPosition
- `updateNowPlaying(title, artist, duration, position, isPlaying)` — pushes metadata to lock screen
- `clearNowPlaying()` — resets lock screen on stop

---

### Waveform C++ Module

Located at `modules/waveform-cpp/`, this is a small, focused C++ library for computing normalized audio waveform peaks from PCM data.

**Function:**
```cpp
// waveform_peaks.h
extern "C" void generate_waveform_peaks(
    const float* samples,
    uint64_t     frame_count,
    double       sample_rate,
    uint32_t     bar_count,
    float*       out_peaks      // caller-allocated, length = bar_count
);
```

**Algorithm (`waveform_peaks.cpp`):**
1. Divide the audio into `bar_count` uniform time chunks
2. Compute RMS (Root Mean Square) energy per chunk: `sqrt(mean(sample²))`
3. Find the global maximum RMS across all chunks
4. Normalize each chunk: `peak[i] = rms[i] / global_max_rms`
5. Output: array of values in [0, 1]

This approach produces a perceptually accurate representation of loudness across time, with the loudest moment always reaching 1.0 and quieter sections scaled proportionally.

**Build:** Compiled via CMake. Integrated into the Expo module's podspec and linked into the iOS build.

**Bridge (`WaveformCppBridge.mm`):** An Objective-C++ wrapper that Swift can call directly. Accepts a Swift `[Float]` array, calls the C++ function, and returns an `NSArray<NSNumber*>`.

---

### SQLite Storage

Audio file metadata is persisted locally using `expo-sqlite`. The database (`audio_player.db`) is created automatically on first launch.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS tracks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  title    TEXT    NOT NULL,
  artist   TEXT    NOT NULL,
  filePath TEXT    NOT NULL UNIQUE,
  duration INTEGER NOT NULL            -- milliseconds
);
```

**Access pattern:** `SQLiteService` opens the database connection lazily and caches it. WAL (Write-Ahead Logging) mode is enabled for improved concurrent access.

**Sync strategy:** On each app launch, `AudioMetadataService.scanLocalFiles()` reconciles the database with the actual files on disk:
1. Remove DB entries whose files no longer exist
2. Backfill missing duration values using native metadata extraction
3. Import any new files found in `Documents/audio_files/` that aren't yet in the DB

Audio files themselves are stored at: `Documents/audio_files/<filename>` (inside the app's sandboxed Documents directory, which persists across app restarts).

---

### FFT Data Flow

```
Native Audio Thread (AVAudioEngine tap callback)
        │
        │  Buffer: 4096 float32 samples per callback
        ▼
AudioEnginePlayer.swift
  - Mix stereo → mono (vDSP)
  - Backpressure: drop if FFT queue busy (os_unfair_lock)
  - Copy mono samples → windowedBuffer
        │
        ▼  (fftQueue: QoS userInteractive)
  - Apply Hann window
  - vDSP_fft_zrip (radix-2 FFT, 4096 points)
  - vDSP_zvmags (magnitude squared)
  - vDSP_vdbcon (convert to dB)
  - Logarithmic band grouping (bins → N bands)
  - Normalize: 60 dB dynamic range + power curve
        │
        ▼  onFFTData callback → Expo module → JS event
JavaScript (AudioPlayerService.ts)
        │
        ▼  fftStore subscription handler
fftStore.ts
  - fftBandValues[i].value = bands[i]   (Reanimated SharedValues, no re-render)
        │
        ▼  UI Thread (Reanimated worklet / Skia derived value)
Visualizer
  - useFrameCallback: lerp smoothing (LERP_FACTOR = 0.3)
  - Skia: recompute Picture → repaint Canvas
  - Reanimated: each bar's useAnimatedStyle() reads its SharedValue
```

The key design insight is that FFT values flow from native → JS → SharedValue → UI thread without ever triggering a React re-render. The component tree stays static; only the animated values change.

---

### End-to-End Playback Flow

```
1. User taps "+" in AudioListScreen
   └── expo-document-picker → system file picker

2. AudioMetadataService.copyToDocuments(uri)
   └── Copies file to Documents/audio_files/

3. ExpoAudioEngine.getMetadata(filePath)  [native async]
   └── AVAsset reads ID3 tags → { title, artist, durationMs }

4. SQLiteService.insertTrack(track)
   └── Persists to audio_player.db

5. useAudioMetadataStore: track added to store → list re-renders

6. User taps track in list
   └── useAudioTrackStore.playAt(index, queue)

7. AudioPlayerService.play(filePath, title, artist)
   └── ExpoAudioEngine.load(filePath)  [native async]
       ├── AVAudioFile opened
       ├── PlayerNode connected to MainMixerNode
       ├── FFT tap installed on MainMixerNode
       └── AVAudioEngine.start()

8. playerNode.play() + scheduleSegment()
   └── Audio begins playing

9. Every 100ms: position timer fires
   └── onStateChanged event → JS → Zustand store → UI updates

10. Every audio buffer: FFT tap fires
    └── onFFTData event → fftStore SharedValues → visualizer redraws

11. useAudioTrackStore.loadWaveform(filePath)  [background, async]
    └── ExpoAudioEngine.generateWaveform()
        ├── Read entire file → AVAudioPCMBuffer
        ├── Mix to mono
        └── WaveformCppBridge → C++ → normalized peaks
    └── Stored in waveformPeaks → WaveformSeeker renders

12. Track ends: playerNode completion callback
    └── onTrackCompleted event → useAudioTrackStore.next()
        └── Loops back to step 6 with next track in queue
```
