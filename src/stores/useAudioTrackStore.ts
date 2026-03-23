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

  playAt: (index: number, queue?: AudioTrack[]) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (positionMs: number) => void;
  updatePosition: (position: number) => void;
  setBandCount: (count: number) => void;
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

  // Wire up state changes from native events (interruptions, lock screen, route changes)
  audioPlayerService.setOnStateChange((isPlaying: boolean) => {
    set({ isPlaying });
  });

  return {
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    queue: [],
    currentIndex: -1,
    bandCount: 16,

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

    seek: (positionMs: number) => {
      audioPlayerService.seek(positionMs);
      set({ position: positionMs });
    },

    updatePosition: (position: number) => {
      set({ position });
    },

    setBandCount: (count: number) => {
      audioPlayerService.setBandCount(count);
      set({ bandCount: count });
    },
  };
});
