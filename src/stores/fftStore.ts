/**
 * Module-level FFT store — mirrors Flutter's always-alive broadcast StreamController.
 *
 * Flutter architecture:
 *   AudioPlayerService constructor subscribes to EventChannel ONCE, broadcasts
 *   forever. MiniPlayerBar and AudioPlayerScreen each hold their own StreamSubscription
 *   to the same broadcast stream. The broadcast stream is never torn down during
 *   normal navigation because GoRouter pushes screens on a stack, keeping the list
 *   screen (and MiniPlayerBar) mounted/active throughout.
 *
 * RN problem:
 *   useFFTData used useIsFocused() to gate the ExpoAudioEngine "onFFTData" listener.
 *   When AudioPlayerScreen is on top, AudioListScreen loses focus → listener removed →
 *   SharedValues zeroed. On navigate-back, isFocused becomes true again but there is
 *   a React render cycle delay before the new listener subscribes, causing a visible
 *   animation "lag" or "cold start" on the MiniPlayerBar pillars.
 *
 * Solution:
 *   One module-level subscription to "onFFTData" that is created when the first track
 *   starts playing (or on app init) and is never torn down during navigation.
 *   SharedValues for all 128 bands live here at module scope, outside any React tree.
 *   Both MiniPlayerBar and AudioPlayerScreen read from these same SharedValues via
 *   useFFTData(), with no focus-gate.
 */

import { makeMutable, SharedValue } from "react-native-reanimated";
import ExpoAudioEngine from "@/modules/expo-audio-engine";
import type { FFTDataEvent } from "@/modules/expo-audio-engine";
import type { EventSubscription } from "expo-modules-core";

export const MAX_BANDS = 128;

/**
 * Module-level SharedValues — allocated once, never recreated.
 * These are plain Reanimated mutables, not tied to any component lifecycle.
 */
export const fftBandValues: SharedValue<number>[] = Array.from(
  { length: MAX_BANDS },
  () => makeMutable(0),
);

let subscription: EventSubscription | null = null;
let activeListeners = 0;

/**
 * Start the global FFT subscription if not already running.
 * Call this when the first component that needs FFT data mounts,
 * or when playback starts.
 */
export function startFFTSubscription(): void {
  activeListeners++;
  if (subscription) return;

  subscription = ExpoAudioEngine.addListener(
    "onFFTData",
    (event: FFTDataEvent) => {
      const bands = event.bands;
      const len = Math.min(bands.length, MAX_BANDS);
      for (let i = 0; i < len; i++) {
        fftBandValues[i].value = bands[i];
      }
      // Zero out any bands beyond what native sends
      for (let i = len; i < MAX_BANDS; i++) {
        fftBandValues[i].value = 0;
      }
    },
  );
}

/**
 * Signal that a component no longer needs FFT data.
 * When all components have called stop, zeroes the bands but keeps
 * the native subscription alive (cheap) so the next startFFTSubscription()
 * is instantaneous.
 */
export function stopFFTSubscription(): void {
  activeListeners = Math.max(0, activeListeners - 1);
  if (activeListeners === 0) {
    // Zero the visualizer bars when nothing is listening
    for (let i = 0; i < MAX_BANDS; i++) {
      fftBandValues[i].value = 0;
    }
    // Note: we intentionally keep `subscription` alive to avoid the
    // re-subscription delay. The native side is already throttled by
    // AudioEnginePlayer's FFT backpressure (os_unfair_lock).
  }
}
