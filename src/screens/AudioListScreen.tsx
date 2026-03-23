import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioMetadataStore } from '../stores/useAudioMetadataStore';
import { useAudioTrackStore } from '../stores/useAudioTrackStore';
import AudioListItem from '../components/AudioListItem';
import MiniPlayerBar from '../components/MiniPlayerBar';
import { AudioTrack } from '../models/AudioTrack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AudioList'>;

export default function AudioListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { tracks, isLoading, loadTracks, uploadTrack, removeTrack } = useAudioMetadataStore();
  const playAt = useAudioTrackStore((s) => s.playAt);
  const currentTrack = useAudioTrackStore((s) => s.currentTrack);

  useEffect(() => {
    loadTracks();
  }, []);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadTrack(asset.uri);
        }
      }
    } catch (error) {
      console.error('File pick error:', error);
    }
  };

  const handleTrackPress = (_track: AudioTrack, index: number) => {
    playAt(index, tracks);
    navigation.navigate('AudioPlayer');
  };

  const renderItem = ({ item, index }: { item: AudioTrack; index: number }) => (
    <AudioListItem
      track={item}
      onPress={() => handleTrackPress(item, index)}
      onDelete={() => removeTrack(item)}
    />
  );

  if (isLoading && tracks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentTrack && (
        <MiniPlayerBar onPress={() => navigation.navigate('AudioPlayer')} />
      )}
      {tracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No audio files yet.{'\n'}Tap + to upload.</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString() ?? item.filePath}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={handlePickFile} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
