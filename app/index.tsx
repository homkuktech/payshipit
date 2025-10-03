import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import SplashScreen from '@/components/SplashScreen';

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { hasSeenOnboarding, loading: onboardingLoading } = useOnboarding();
  const { colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || authLoading || onboardingLoading) {
    return <SplashScreen />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
