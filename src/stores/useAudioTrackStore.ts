import { create } from "zustand";
import { AudioTrack } from "../models/AudioTrack";
import { audioPlayerService } from "../services/AudioPlayerService";

interface AudioTrackState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  position: number; // milliseconds
  duration: number; // milliseconds
  queue: AudioTrack[];
  currentIndex: number;

  bandCount: number;
  waveformPeaks: number[] | null;

  playAt: (index: number, queue?: AudioTrack[]) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setBandCount: (count: number) => void;
  loadWaveform: (filePath: string) => Promise<void>;
}

export const useAudioTrackStore = create<AudioTrackState>((set, get) => {
  // Wire up auto-advance on track completion
  audioPlayerService.setOnTrackCompleted(() => {
    get().next();
  });

  // Wire up lock screen previous/next
  audioPlayerService.setOnLockScreenPrevious(() => {
    get().previous();
  });
  audioPlayerService.setOnLockScreenNext(() => {
    get().next();
  });

  // Wire up state changes from native events — delivers isPlaying + position + duration every ~100ms
  audioPlayerService.setOnStateChange(
    (isPlaying: boolean, positionMs: number, durationMs: number) => {
      set((state) => ({
        isPlaying,
        // Only advance position while playing — ignore resets sent on pause/stop events
        position: isPlaying ? positionMs : state.position,
        ...(durationMs > 0 ? { duration: durationMs } : {}),
      }));
    },
  );

  return {
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    queue: [],
    currentIndex: -1,
    bandCount: 16,
    waveformPeaks: null,

    playAt: async (index: number, queue?: AudioTrack[]) => {
      const trackQueue = queue ?? get().queue;
      if (index < 0 || index >= trackQueue.length) return;
      const track = trackQueue[index];
      set({
        currentTrack: track,
        isPlaying: false,
        queue: trackQueue,
        currentIndex: index,
        position: 0,
        duration: track.duration ?? 0,
        waveformPeaks: null,
      });
      try {
        await audioPlayerService.play(
          track.filePath,
          track.title,
          track.artist,
        );
        // Duration and isPlaying state are updated via onStateChanged events
        set({
          isPlaying: true,
          duration: audioPlayerService.durationMs,
        });
        // Load waveform in background (non-blocking)
        get().loadWaveform(track.filePath);
      } catch (error) {
        console.error("Playback error:", error);
        set({ isPlaying: false });
      }
    },

    pause: () => {
      audioPlayerService.pause();
      set({ isPlaying: false });
    },

    resume: () => {
      audioPlayerService.resume();
      set({ isPlaying: true });
    },

    stop: () => {
      audioPlayerService.stop();
      set({ isPlaying: false, position: 0 });
    },

    next: async () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      const current = currentIndex < 0 ? 0 : currentIndex;
      const nextIndex = (current + 1) % queue.length;
      await get().playAt(nextIndex);
    },

    previous: async () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      const current = currentIndex < 0 ? 0 : currentIndex;
      const prevIndex = (current - 1 + queue.length) % queue.length;
      await get().playAt(prevIndex);
    },

    setBandCount: (count: number) => {
      audioPlayerService.setBandCount(count);
      set({ bandCount: count });
    },

    loadWaveform: async (filePath: string) => {
      try {
        const peaks = await audioPlayerService.loadWaveform(filePath);
        set({ waveformPeaks: peaks });
      } catch (error) {
        console.warn("[WaveformSeeker] Failed to generate waveform:", error);
        set({ waveformPeaks: null });
      }
    },
  };
});
