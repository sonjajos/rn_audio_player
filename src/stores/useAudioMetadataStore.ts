import { create } from "zustand";
import { AudioTrack } from "../models/AudioTrack";
import { sqliteService } from "../services/SQLiteService";
import { audioMetadataService } from "../services/AudioMetadataService";
import ExpoAudioEngine from "@/modules/expo-audio-engine";

interface AudioMetadataState {
  tracks: AudioTrack[];
  isLoading: boolean;
  loadTracks: () => Promise<void>;
  uploadTrack: (fileUri: string) => Promise<void>;
  removeTrack: (track: AudioTrack) => Promise<void>;
}

export const useAudioMetadataStore = create<AudioMetadataState>((set, get) => ({
  tracks: [],
  isLoading: false,

  loadTracks: async () => {
    set({ isLoading: true });
    try {
      await audioMetadataService.scanLocalFiles();
      const tracks = await sqliteService.getAllTracks();
      set({ tracks, isLoading: false });
    } catch (error) {
      console.error("Failed to load tracks:", error);
      set({ isLoading: false });
    }
  },

  uploadTrack: async (fileUri: string) => {
    try {
      // 1. Copy file to Documents/audio_files/
      const persistentPath = audioMetadataService.copyToDocuments(fileUri);

      // 2. Extract metadata natively
      let title: string;
      let artist: string;
      let duration = 0;
      try {
        const metadata = await ExpoAudioEngine.getMetadata(persistentPath);
        title = metadata.title;
        artist = metadata.artist;
        duration = metadata.durationMs;
      } catch {
        const fallback =
          audioMetadataService.extractMetadataFromFilename(persistentPath);
        title = fallback.title;
        artist = fallback.artist;
      }

      // 3. Save to SQLite
      const track: AudioTrack = {
        title,
        artist,
        filePath: persistentPath,
        duration,
      };
      await sqliteService.insertTrack(track);

      // 4. Reload tracks
      await get().loadTracks();
    } catch (error) {
      console.error("Failed to upload track:", error);
    }
  },

  removeTrack: async (track: AudioTrack) => {
    if (track.id == null) return;
    try {
      audioMetadataService.deleteFile(track.filePath);
      await sqliteService.deleteTrack(track.id!);
      await get().loadTracks();
    } catch (error) {
      console.error("Failed to remove track:", error);
    }
  },
}));
