import * as SQLite from "expo-sqlite";
import { AudioTrack } from "../models/AudioTrack";

class SQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    this.db = await SQLite.openDatabaseAsync("audio_player.db");
    await this.db.execAsync("PRAGMA journal_mode = WAL");
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        filePath TEXT NOT NULL UNIQUE,
        duration INTEGER NOT NULL
      )
    `);
    return this.db;
  }

  async insertTrack(track: AudioTrack): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      "INSERT OR IGNORE INTO tracks (title, artist, filePath, duration) VALUES (?, ?, ?, ?)",
      track.title,
      track.artist,
      track.filePath,
      track.duration,
    );
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    const db = await this.getDatabase();
    return db.getAllAsync<AudioTrack>("SELECT * FROM tracks");
  }

  async deleteTrack(id: number): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync("DELETE FROM tracks WHERE id = ?", id);
  }

  async updateTrackFilePath(id: number, newFilePath: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      "UPDATE tracks SET filePath = ? WHERE id = ?",
      newFilePath,
      id,
    );
  }

  async updateTrackDuration(id: number, duration: number): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      "UPDATE tracks SET duration = ? WHERE id = ?",
      duration,
      id,
    );
  }
}

export const sqliteService = new SQLiteService();
