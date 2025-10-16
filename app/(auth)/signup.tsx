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
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ChevronDown,
  UserPlus,
  ShoppingBag,
  Bike,
  Store,
  Package,
} from 'lucide-react-native';
import { UserRole } from '@/types/database';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [isRolePickerVisible, setRolePickerVisible] = useState(false);

  const { signUpWithEmail } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const roleOptions: RoleOption[] = [
    {
      value: 'customer',
      label: 'Customer',
      description: 'Receive & track items',
      icon: <Package size={24} color={colors.text} />,
    },
    {
      value: 'sender',
      label: 'Sender',
      description: 'Send packages P2P',
      icon: <ShoppingBag size={24} color={colors.text} />,
    },
    {
      value: 'rider',
      label: 'Rider',
      description: 'Deliver packages',
      icon: <Bike size={24} color={colors.text} />,
    },
    {
      value: 'merchant',
      label: 'Merchant',
      description: 'Business account',
      icon: <Store size={24} color={colors.text} />,
    },
  ];

  const handleSignup = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert(
        'Error',
        'Please enter a valid phone number (e.g., +2348012345678)'
      );
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, {
        full_name: fullName,
        phone,
        role,
      });
      Alert.alert(
        'Success',
        'Account created successfully! Welcome to TrusTrade.'
      );
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Signup Failed',
        error.message || 'An error occurred during signup'
      );
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <UserPlus size={48} color={colors.primary} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join TrusTrade today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I am a:</Text>
            <TouchableOpacity
              style={styles.roleSelector}
              onPress={() => setRolePickerVisible(true)}
            >
              <Text style={styles.roleSelectorText}>
                {roleOptions.find((o) => o.value === role)?.label}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Modal
            visible={isRolePickerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setRolePickerVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setRolePickerVisible(false)}
            >
              <View style={styles.modalContent}>
                {roleOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.roleOption,
                      role === option.value && styles.roleOptionSelected,
                    ]}
                    onPress={() => {
                      setRole(option.value);
                      setRolePickerVisible(false);
                    }}
                  >
                    <View style={styles.roleIconContainer}>{option.icon}</View>
                    <View style={styles.roleTextContainer}>
                      <Text style={styles.roleLabel}>{option.label}</Text>
                      <Text style={styles.roleDescription}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number (+234...)"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 60,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 16,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 8,
    },
    form: {
      gap: 16,
    },
    inputGroup: {
      gap: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    roleSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    roleSelectorText: {
      fontSize: 16,
      color: colors.text,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      width: '90%',
      gap: 8,
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    roleOptionSelected: {
      backgroundColor: colors.primary + '20', // 20 is for ~12% opacity
    },
    roleIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    roleTextContainer: {},
    roleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    roleDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
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
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      gap: 8,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    link: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    bottomPadding: {
      height: 40,
    },
  });
