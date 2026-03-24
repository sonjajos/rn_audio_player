import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAudioTrackStore } from "../stores/useAudioTrackStore";
import { useFFTData } from "../hooks/useFFTData";
import PillarVisualizer from "./CircularVisualizer";

const MINI_BAND_COUNT = 16;
const BAR_HEIGHT = 80;

interface MiniPlayerBarProps {
  onPress: () => void;
}

function MiniPlayIcon() {
  return <View style={iconStyles.playTriangle} />;
}

function MiniPauseIcon() {
  return (
    <View style={iconStyles.pauseRow}>
      <View style={iconStyles.pauseBar} />
      <View style={iconStyles.pauseBar} />
    </View>
  );
}

function MiniPrevIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.prevBar} />
      <View style={iconStyles.prevTriangle} />
    </View>
  );
}

function MiniNextIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.nextTriangle} />
      <View style={iconStyles.nextBar} />
    </View>
  );
}

export default function MiniPlayerBar({ onPress }: MiniPlayerBarProps) {
  const currentTrack = useAudioTrackStore((s) => s.currentTrack);
  const isPlaying = useAudioTrackStore((s) => s.isPlaying);
  const pause = useAudioTrackStore((s) => s.pause);
  const resume = useAudioTrackStore((s) => s.resume);
  const next = useAudioTrackStore((s) => s.next);
  const previous = useAudioTrackStore((s) => s.previous);

  const bandValues = useFFTData(MINI_BAND_COUNT, isPlaying);

  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.visualizer}>
        <PillarVisualizer
          bandValues={bandValues}
          bandCount={MINI_BAND_COUNT}
          width={BAR_HEIGHT}
          height={BAR_HEIGHT}
          maxHeightFraction={0.55}
        />
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={previous}
          style={styles.controlButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MiniPrevIcon />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? pause : resume}
          style={styles.playPauseButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isPlaying ? <MiniPauseIcon /> : <MiniPlayIcon />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={next}
          style={styles.controlButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MiniNextIcon />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const iconStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  prevBar: {
    width: 2,
    height: 12,
    backgroundColor: "#fff",
  },
  prevTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#fff",
  },
  nextTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#fff",
  },
  nextBar: {
    width: 2,
    height: 12,
    backgroundColor: "#fff",
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#fff",
  },
  pauseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pauseBar: {
    width: 3.5,
    height: 14,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    backgroundColor: "#1E1E1E",
    flexDirection: "row",
    alignItems: "center",
  },
  visualizer: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
  },
  trackInfo: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  artist: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 13,
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingRight: 16,
  },
  controlButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
