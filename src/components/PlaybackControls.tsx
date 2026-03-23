import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioTrackStore } from '../stores/useAudioTrackStore';

function PrevIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.prevBar} />
      <View style={iconStyles.prevTriangle} />
    </View>
  );
}

function NextIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.nextTriangle} />
      <View style={iconStyles.nextBar} />
    </View>
  );
}

function PlayIcon() {
  return <View style={iconStyles.playTriangle} />;
}

function PauseIcon() {
  return (
    <View style={iconStyles.pauseRow}>
      <View style={iconStyles.pauseBar} />
      <View style={iconStyles.pauseBar} />
    </View>
  );
}

export default function PlaybackControls() {
  const isPlaying = useAudioTrackStore((s) => s.isPlaying);
  const pause = useAudioTrackStore((s) => s.pause);
  const resume = useAudioTrackStore((s) => s.resume);
  const next = useAudioTrackStore((s) => s.next);
  const previous = useAudioTrackStore((s) => s.previous);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={previous} style={styles.sideButton} activeOpacity={0.7}>
        <PrevIcon />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={isPlaying ? pause : resume}
        style={styles.playButton}
        activeOpacity={0.7}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </TouchableOpacity>

      <TouchableOpacity onPress={next} style={styles.sideButton} activeOpacity={0.7}>
        <NextIcon />
      </TouchableOpacity>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  prevBar: {
    width: 3,
    height: 18,
    backgroundColor: '#fff',
  },
  prevTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#fff',
  },
  nextTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  nextBar: {
    width: 3,
    height: 18,
    backgroundColor: '#fff',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#000',
  },
  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 24,
    backgroundColor: '#000',
    borderRadius: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 48,
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
