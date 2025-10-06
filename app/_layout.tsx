import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import * as Notifications from 'expo-notifications';

// This handler determines how to handle a notification when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show a banner alert
    shouldPlaySound: true, // Play a sound
    shouldSetBadge: false, // Don't change the app icon badge
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification.
    // It works whether the app is foregrounded, backgrounded, or killed.
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          'Notification tapped:',
          response.notification.request.content.data
        );

        // Extract the orderId from the notification's data payload.
        // This was set in the Edge Function.
        const { conversationId } = response.notification.request.content.data;

        if (conversationId) {
          // Navigate to the specific order screen.
          // The order screen already has the logic to open the chat modal.
          router.push({
            pathname: `/chat/${conversationId}`,
            params: { openChat: 'true' },
          });
        }
      });

    // This listener is fired whenever a notification is received while the app is foregrounded.
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received while app is open:', notification);
        // You could potentially use this to show an in-app toast or update the UI.
      });

    // Cleanup function to unsubscribe from events when the component unmounts.
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* The (onboarding), (auth), and role-based stacks are automatically nested here */}
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(sender)" />
          <Stack.Screen name="(rider)" />
          <Stack.Screen name="(merchant)" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="invoice/create" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen
            name="chat/create"
            options={{ presentation: 'modal', title: 'New Chat' }}
          />
          <Stack.Screen name="invoice/[id]" />
          <Stack.Screen name="invoice/escrow/[id]" />
          <Stack.Screen name="invoice/escrow/available" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
