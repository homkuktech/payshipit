import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AudioPlayerProps {
  uri: string;
  duration: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri, duration }) => {
  const { colors } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      if (status.didJustFinish) {
        sound?.setPositionAsync(0);
      }
    }
  };

  async function playSound() {
    if (sound) {
      await sound.playAsync();
    } else {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      } catch (e) {
        console.error("Couldn't load sound", e);
      }
    }
  }

  async function pauseSound() {
    if (sound) {
      await sound.pauseAsync();
    }
  }

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${(parseInt(seconds) < 10 ? '0' : '')}${seconds}`;
  };

  const progress = duration > 0 ? (position / (duration * 1000)) * 100 : 0;
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={isPlaying ? pauseSound : playSound}>
        {isPlaying ? (
          <Pause size={24} color={colors.primary} />
        ) : (
          <Play size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground} />
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.durationText}>
        {formatTime(duration * 1000)}
      </Text>
    </View>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: 200,
    },
    progressBarContainer: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      justifyContent: 'center',
    },
    progressBarBackground: {
      height: '100%',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
      position: 'absolute',
    },
    durationText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default AudioPlayer;