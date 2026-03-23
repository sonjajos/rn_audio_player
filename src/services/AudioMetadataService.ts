import { Paths, File, Directory } from "expo-file-system";
import { AudioTrack } from "../models/AudioTrack";
import { sqliteService } from "./SQLiteService";
import ExpoAudioEngine from "@/modules/expo-audio-engine";

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "wav",
  "aac",
  "flac",
  "ogg",
  "aiff",
]);

function getAudioDir(): Directory {
  return new Directory(Paths.document, "audio_files");
}

class AudioMetadataService {
  /**
   * List all audio files in Documents/audio_files/.
   */
  listAudioFiles(): string[] {
    const audioDir = getAudioDir();
    if (!audioDir.exists) return [];

    const entries = audioDir.list();
    return entries
      .filter((entry): entry is File => {
        if (!(entry instanceof File)) return false;
        const ext = entry.extension.replace(".", "").toLowerCase();
        return AUDIO_EXTENSIONS.has(ext);
      })
      .map((f) => f.uri);
  }

  /**
   * Extract metadata from filename (since we can't use AVAsset from JS).
   */
  extractMetadataFromFilename(filePath: string): {
    title: string;
    artist: string;
  } {
    const fileName = filePath.split("/").pop() ?? "Unknown";
    const title = fileName.replace(/\.[^/.]+$/, "");
    return { title, artist: "Unknown Artist" };
  }

  /**
   * Copy a picked file to Documents/audio_files/.
   * Returns the new persistent file URI.
   */
  copyToDocuments(sourceUri: string): string {
    const audioDir = getAudioDir();
    if (!audioDir.exists) {
      audioDir.create();
    }

    const sourceFile = new File(sourceUri);
    const fileName = sourceFile.name;
    const destFile = new File(audioDir, fileName);

    // Avoid overwriting: append number if file exists
    if (!destFile.exists) {
      sourceFile.copy(destFile);
      return destFile.uri;
    }

    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const ext = sourceFile.extension;
    let counter = 1;
    let newDest = new File(audioDir, `${nameWithoutExt}_${counter}${ext}`);
    while (newDest.exists) {
      counter++;
      newDest = new File(audioDir, `${nameWithoutExt}_${counter}${ext}`);
    }
    sourceFile.copy(newDest);
    return newDest.uri;
  }

  /**
   * Delete a file from the filesystem.
   */
  deleteFile(filePath: string): void {
    const file = new File(filePath);
    if (file.exists) {
      file.delete();
    }
  }

  /**
   * Sync database with files on disk.
   * Removes stale DB entries and imports new files.
   * Uses native AVAsset metadata extraction for title, artist, and duration.
   */
  async scanLocalFiles(): Promise<void> {
    const filePaths = this.listAudioFiles();
    const existingTracks = await sqliteService.getAllTracks();

    const fileNameSet = new Set(filePaths.map((p) => p.split("/").pop()!));

    // Remove DB entries whose files no longer exist on disk
    for (const track of existingTracks) {
      const trackFileName = track.filePath.split("/").pop()!;
      if (!fileNameSet.has(trackFileName)) {
        if (track.id != null) {
          await sqliteService.deleteTrack(track.id!);
        }
      }
    }

    if (filePaths.length === 0) return;

    // Re-read after cleanup
    const remainingTracks = await sqliteService.getAllTracks();
    // Map filename → existing track for path updates
    const existingByFileName = new Map<string, AudioTrack>();
    for (const t of remainingTracks) {
      existingByFileName.set(t.filePath.split("/").pop()!, t);
    }

    // Build map of current disk paths by filename
    const diskPathByFileName = new Map<string, string>();
    for (const path of filePaths) {
      diskPathByFileName.set(path.split("/").pop()!, path);
    }

    // Update stale paths for existing tracks (simulator container UUID changes)
    for (const [fileName, track] of existingByFileName) {
      const currentPath = diskPathByFileName.get(fileName);
      if (currentPath && currentPath !== track.filePath && track.id != null) {
        await sqliteService.updateTrackFilePath(track.id!, currentPath);
      }
    }

    // Backfill duration for existing tracks that were previously saved with duration=0
    // (e.g. inserted before the file:// URI fix was in place)
    for (const [fileName, track] of existingByFileName) {
      if (track.duration === 0 && track.id != null) {
        const currentPath = diskPathByFileName.get(fileName) ?? track.filePath;
        try {
          const metadata = await ExpoAudioEngine.getMetadata(currentPath);
          if (metadata.durationMs > 0) {
            await sqliteService.updateTrackDuration(
              track.id!,
              metadata.durationMs,
            );
            track.duration = metadata.durationMs;
          }
        } catch {
          // Leave duration as 0 if metadata extraction fails
        }
      }
    }

    // Import new files using native metadata extraction
    for (const path of filePaths) {
      const fileName = path.split("/").pop()!;
      if (!existingByFileName.has(fileName)) {
        let title: string;
        let artist: string;
        let duration = 0;
        try {
          const metadata = await ExpoAudioEngine.getMetadata(path);
          title = metadata.title;
          artist = metadata.artist;
          duration = metadata.durationMs;
        } catch {
          // Fallback to filename-based metadata
          const fallback = this.extractMetadataFromFilename(path);
          title = fallback.title;
          artist = fallback.artist;
        }
        const track: AudioTrack = { title, artist, filePath: path, duration };
        await sqliteService.insertTrack(track);
        existingByFileName.set(fileName, track);
      }
    }
  }
}

export const audioMetadataService = new AudioMetadataService();
