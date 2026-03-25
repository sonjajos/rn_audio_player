import { NativeModule, requireNativeModule } from "expo";
import type {
  ExpoAudioEngineModuleEvents,
  TrackMetadata,
} from "./ExpoAudioEngine.types";

declare class ExpoAudioEngineModule extends NativeModule<ExpoAudioEngineModuleEvents> {
  load(filePath: string, title: string, artist: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  setBandCount(count: number): void;
  getPosition(): number;
  getIsPlaying(): boolean;
  getMetadata(filePath: string): Promise<TrackMetadata>;
  generateWaveform(filePath: string, barCount: number): Promise<number[]>;
}

export default requireNativeModule<ExpoAudioEngineModule>("ExpoAudioEngine");
