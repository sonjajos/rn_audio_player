import { useEffect } from "react";
import { SharedValue } from "react-native-reanimated";
import {
  fftBandValues,
  startFFTSubscription,
  stopFFTSubscription,
  MAX_BANDS,
} from "../stores/fftStore";

/**
 * Returns module-level SharedValues for FFT band data.
 *
 * The subscription to native "onFFTData" events is managed globally (see fftStore.ts),
 * mirroring Flutter's always-alive broadcast StreamController. No focus-gating happens
 * here — both MiniPlayerBar and AudioPlayerScreen read from the exact same SharedValue
 * objects without any re-subscription delay when navigating between screens.
 *
 * @param bandCount  Number of bands the caller wants to render (≤ MAX_BANDS)
 * @param isPlaying  Whether audio is currently playing
 */
export function useFFTData(
  bandCount: number,
  isPlaying: boolean,
): SharedValue<number>[] {
  useEffect(() => {
    if (isPlaying) {
      startFFTSubscription();
      return () => stopFFTSubscription();
    } else {
      // Zero visible bands when not playing
      for (let i = 0; i < MAX_BANDS; i++) {
        fftBandValues[i].value = 0;
      }
    }
  }, [isPlaying]);

  // Return the slice the caller needs — all backed by module-level SharedValues
  return fftBandValues.slice(0, Math.min(bandCount, MAX_BANDS));
}
