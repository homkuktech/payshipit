import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Package,
  Shield,
  MapPin,
  Wallet,
  Clock,
  Star,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: 'Fast & Reliable Delivery',
      description:
        'Send packages anywhere with our network of verified riders. Track your delivery in real-time from pickup to dropoff.',
      icon: <Package size={80} color="#ffffff" strokeWidth={1.5} />,
      color: colors.primary,
    },
    {
      id: '2',
      title: 'Secure Escrow Payments',
      description:
        'Your money is safe with our escrow system. Funds are only released when delivery is confirmed, protecting both senders and riders.',
      icon: <Shield size={80} color="#ffffff" strokeWidth={1.5} />,
      color: colors.success,
    },
    {
      id: '3',
      title: 'Live Location Tracking',
      description:
        'Know exactly where your package is at all times. Real-time GPS tracking keeps you informed every step of the way.',
      icon: <MapPin size={80} color="#ffffff" strokeWidth={1.5} />,
      color: colors.secondary,
    },
    {
      id: '4',
      title: 'Easy Wallet Management',
      description:
        'Top up your wallet, track earnings, and withdraw funds seamlessly. Transparent pricing with no hidden fees.',
      icon: <Wallet size={80} color="#ffffff" strokeWidth={1.5} />,
      color: '#f59e0b',
    },
    {
      id: '5',
      title: 'Quick & Efficient',
      description:
        'Get your packages delivered faster. Our smart matching algorithm connects you with the nearest available rider instantly.',
      icon: <Clock size={80} color="#ffffff" strokeWidth={1.5} />,
      color: '#8b5cf6',
    },
    {
      id: '6',
      title: 'Trusted Community',
      description:
        'Join thousands of satisfied users. Rate your experience and help us maintain a reliable, trusted delivery network.',
      icon: <Star size={80} color="#ffffff" strokeWidth={1.5} />,
      color: '#ec4899',
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        {item.icon}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                backgroundColor: colors.primary,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={slidesRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 20,
    },
    skipText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    slide: {
      width,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    iconContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    button: {
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '600',
    },
  });
