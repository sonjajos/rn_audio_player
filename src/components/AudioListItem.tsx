import React, { useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AudioTrack } from '../models/AudioTrack';
import { formatDuration } from '../utils/formatDuration';

interface Props {
  track: AudioTrack;
  onPress: () => void;
  onDelete: () => void;
}

function MusicNoteIcon() {
  return (
    <View style={iconStyles.container}>
      {/* Two beamed eighth notes using Views */}
      <View style={iconStyles.beam} />
      <View style={iconStyles.noteGroup}>
        <View style={iconStyles.stemLeft} />
        <View style={iconStyles.stemRight} />
        <View style={iconStyles.headLeft} />
        <View style={iconStyles.headRight} />
      </View>
    </View>
  );
}

export default function AudioListItem({ track, onPress, onDelete }: Props) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Track',
      `Remove "${track.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete();
          },
        },
      ]
    );
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ReanimatedSwipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.iconWrapper}>
          <MusicNoteIcon />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
}

const iconStyles = StyleSheet.create({
  container: {
    width: 22,
    height: 20,
    position: 'relative',
  },
  beam: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 14,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  noteGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 22,
    height: 20,
  },
  stemLeft: {
    position: 'absolute',
    left: 4,
    top: 1,
    width: 2,
    height: 13,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  stemRight: {
    position: 'absolute',
    right: 2,
    top: 1,
    width: 2,
    height: 13,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  headLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  headRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#121212',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  artist: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 14,
    marginTop: 3,
  },
  duration: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 14,
    marginLeft: 12,
  },
  deleteAction: {
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    flex: 1,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
