import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://127.0.0.1:8081/--/update-password', // Replace with your deep link if you have one
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Check your email',
        'A password reset link has been sent to your email address.'
      );
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.header}>
          <KeyRound size={48} color={colors.primary} />
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a reset link.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    backButton: { position: 'absolute', top: 60, left: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginTop: 16 },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
    form: { gap: 16 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  });