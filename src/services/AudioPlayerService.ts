import ExpoAudioEngine from "@/modules/expo-audio-engine";
import type {
  StateChangedEvent,
  CommandEvent,
} from "@/modules/expo-audio-engine";

type TrackCompletedCallback = () => void;
type StateChangeCallback = (
  isPlaying: boolean,
  positionMs: number,
  durationMs: number,
) => void;

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
    this._isPlaying = event.state === "playing";
    this._positionMs = event.positionMs;
    this._durationMs = event.durationMs;
    // Always propagate — store needs live position + duration, not just play/pause transitions
    this.onStateChange?.(this._isPlaying, event.positionMs, event.durationMs);
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

  setBandCount(count: number) {
    ExpoAudioEngine.setBandCount(count);
  }

  async loadWaveform(filePath: string, barCount = 300): Promise<number[]> {
    return ExpoAudioEngine.generateWaveform(filePath, barCount);
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
