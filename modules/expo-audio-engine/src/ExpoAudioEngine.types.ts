export type PlaybackState = "idle" | "playing" | "paused" | "stopped";

export type StateChangedEvent = {
  state: PlaybackState;
  positionMs: number;
  durationMs: number;
};

export type FFTDataEvent = {
  bands: number[];
  nativeFftTimeUs: number;
};

export type CommandEvent = {
  command: "play" | "pause" | "next" | "previous";
};

export type TrackMetadata = {
  title: string;
  artist: string;
  durationMs: number;
};

export type ExpoAudioEngineModuleEvents = {
  onStateChanged: (event: StateChangedEvent) => void;
  onFFTData: (event: FFTDataEvent) => void;
  onTrackCompleted: () => void;
  onCommand: (event: CommandEvent) => void;
};
