import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import { useAudioTrackStore } from "../stores/useAudioTrackStore";
import { audioPlayerService } from "../services/AudioPlayerService";
import { useFFTData } from "../hooks/useFFTData";
import Visualizer from "../components/Visualizer";
import PlaybackControls from "../components/PlaybackControls";

const BAND_COUNTS = [16, 32, 64, 128] as const;

export default function AudioPlayerScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const currentTrack = useAudioTrackStore((s) => s.currentTrack);
  const isPlaying = useAudioTrackStore((s) => s.isPlaying);
  const bandCount = useAudioTrackStore((s) => s.bandCount);
  const setBandCount = useAudioTrackStore((s) => s.setBandCount);

  const bandValues = useFFTData(bandCount, isPlaying);

  // Position tracking
  const updatePosition = useAudioTrackStore((s) => s.updatePosition);
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const pos = audioPlayerService.getCurrentPositionMs();
      updatePosition(pos);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, updatePosition]);

  const cycleBandCount = useCallback(() => {
    const idx = BAND_COUNTS.indexOf(bandCount as (typeof BAND_COUNTS)[number]);
    setBandCount(BAND_COUNTS[(idx + 1) % BAND_COUNTS.length]);
  }, [bandCount, setBandCount]);

  // Match Flutter: horizontal padding 24 on each side
  const visualizerWidth = screenWidth - 48;

  return (
    <View style={styles.container}>
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack?.title ?? "No Track"}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack?.artist ?? ""}
        </Text>
      </View>

      {/* Expanded visualizer fills available space, centered vertically */}
      <View style={styles.visualizerContainer}>
        <Visualizer
          bandValues={bandValues}
          bandCount={bandCount}
          width={visualizerWidth}
          height={visualizerWidth} // square-ish, will be constrained by flex
        />
      </View>

      <View style={styles.controlsSpacer} />
      <PlaybackControls />
      <View style={styles.bottomSpacer} />

      <TouchableOpacity
        style={styles.bandToggle}
        onPress={cycleBandCount}
        activeOpacity={0.7}
      >
        <Text style={styles.bandToggleText}>{bandCount * 2}b</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    paddingTop: 32,
  },
  trackInfo: {
    alignItems: "center",
    marginBottom: 48,
    paddingHorizontal: 32,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  artist: {
    color: "#999",
    fontSize: 16,
    marginTop: 4,
  },
  visualizerContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  controlsSpacer: {
    height: 24,
  },
  bottomSpacer: {
    height: 48,
  },
  bandToggle: {
    position: "absolute",
    top: 8,
    right: 16,
  },
  bandToggleText: {
    color: "#aaa",
    fontSize: 14,
  },
});
