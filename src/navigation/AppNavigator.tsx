import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AudioListScreen from '../screens/AudioListScreen';
import AudioPlayerScreen from '../screens/AudioPlayerScreen';

export type RootStackParamList = {
  AudioList: undefined;
  AudioPlayer: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1E1E1E' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#121212' },
      }}
    >
      <Stack.Screen
        name="AudioList"
        component={AudioListScreen}
        options={{ title: 'Audio Player' }}
      />
      <Stack.Screen
        name="AudioPlayer"
        component={AudioPlayerScreen}
        options={{ title: 'Now Playing' }}
      />
    </Stack.Navigator>
  );
}
