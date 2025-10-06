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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // The auth context should also provide the user profile
  const { profile, loading: profileLoading } = useAuth();

  if (
    showSplash ||
    authLoading ||
    onboardingLoading ||
    (session && profileLoading)
  ) {
    return <SplashScreen />;
  }

  if (session && profile) {
    // Role-based redirection
    switch (profile.role) {
      case 'customer':
        return <Redirect href="/(customer)" />;
      case 'sender':
        return <Redirect href="/(sender)" />;
      case 'rider':
        return <Redirect href="/(rider)" />;
      case 'merchant':
        return <Redirect href="/(merchant)" />;
      default:
        // Fallback to a default or show an error
        return <Redirect href="/(auth)/login" />;
    }
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
