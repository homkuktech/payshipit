import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LayoutDashboard, FileText, User } from 'lucide-react-native';

export default function MerchantLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index" // This would be the merchant dashboard
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard color={color} /> }}
      />
      <Tabs.Screen
        name="invoices"
        options={{ title: 'Invoices', tabBarIcon: ({ color }) => <FileText color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} /> }}
      />
    </Tabs>
  );
}