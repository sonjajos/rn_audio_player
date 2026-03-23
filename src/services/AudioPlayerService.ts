import ExpoAudioEngine from "@/modules/expo-audio-engine";
import type {
  StateChangedEvent,
  CommandEvent,
} from "@/modules/expo-audio-engine";

type TrackCompletedCallback = () => void;
type StateChangeCallback = (isPlaying: boolean) => void;

class AudioPlayerService {
  private _isPlaying = false;
  private _positionMs = 0;
  private _durationMs = 0;

  private onTrackCompleted: TrackCompletedCallback | null = null;
  private onStateChange: StateChangeCallback | null = null;
  private _lockScreenNextCallback: (() => void) | null = null;
  private _lockScreenPreviousCallback: (() => void) | null = null;

  constructor() {
    ExpoAudioEngine.addListener("onStateChanged", this.handleStateChanged);
    ExpoAudioEngine.addListener("onTrackCompleted", this.handleTrackCompleted);
    ExpoAudioEngine.addListener("onCommand", this.handleCommand);
  }

  private handleStateChanged = (event: StateChangedEvent) => {
    const wasPlaying = this._isPlaying;
    this._isPlaying = event.state === "playing";
    this._positionMs = event.positionMs;
    this._durationMs = event.durationMs;
    if (wasPlaying !== this._isPlaying) {
      this.onStateChange?.(this._isPlaying);
    }
  };

  private handleTrackCompleted = () => {
    this._isPlaying = false;
    this.onTrackCompleted?.();
  };

  private handleCommand = (event: CommandEvent) => {
    switch (event.command) {
      case "play":
        ExpoAudioEngine.resume();
        break;
      case "pause":
        ExpoAudioEngine.pause();
        break;
      case "next":
        this._lockScreenNextCallback?.();
        break;
      case "previous":
        this._lockScreenPreviousCallback?.();
        break;
    }
  };

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get positionMs(): number {
    return this._positionMs;
  }

  get durationMs(): number {
    return this._durationMs;
  }

  async play(filePath: string, title: string, artist: string): Promise<void> {
    await ExpoAudioEngine.load(filePath, title, artist);
  }

  pause() {
    ExpoAudioEngine.pause();
  }

  resume() {
    ExpoAudioEngine.resume();
  }

  stop() {
    ExpoAudioEngine.stop();
  }

  seek(positionMs: number) {
    ExpoAudioEngine.seek(positionMs);
  }

  setBandCount(count: number) {
    ExpoAudioEngine.setBandCount(count);
  }

  getCurrentPositionMs(): number {
    return ExpoAudioEngine.getPosition();
  }

  getDurationMs(): number {
    return this._durationMs;
  }

  setOnTrackCompleted(cb: TrackCompletedCallback | null) {
    this.onTrackCompleted = cb;
  }

  setOnStateChange(cb: StateChangeCallback | null) {
    this.onStateChange = cb;
  }

  setOnLockScreenNext(cb: (() => void) | null) {
    this._lockScreenNextCallback = cb;
  }

  setOnLockScreenPrevious(cb: (() => void) | null) {
    this._lockScreenPreviousCallback = cb;
  }
}

export const audioPlayerService = new AudioPlayerService();
