import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Package } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function SplashScreen() {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Package size={64} color="#ffffff" strokeWidth={2} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>Paynship</Text>
        <Text style={styles.subtitle}>Secure Logistics & Delivery</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.loader}>
          <View style={styles.loaderBar} />
        </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    iconContainer: {
      marginBottom: 32,
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    footer: {
      position: 'absolute',
      bottom: 60,
      width: '100%',
      alignItems: 'center',
    },
    loader: {
      width: 200,
      height: 4,
      backgroundColor: colors.surface,
      borderRadius: 2,
      overflow: 'hidden',
    },
    loaderBar: {
      width: '40%',
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
  });
