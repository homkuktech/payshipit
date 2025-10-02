import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Package, MapPin, TrendingUp, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/database';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    earnings: 0,
  });

  useEffect(() => {
    if (profile) {
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    try {
      const column = profile.role === 'rider' ? 'rider_id' : 'sender_id';

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .eq(column, profile.id)
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit']);

      const { data: completedOrders } = await supabase
        .from('orders')
        .select('*')
        .eq(column, profile.id)
        .eq('status', 'delivered');

      const earnings = profile.role === 'rider' ? profile.wallet_balance : 0;

      setStats({
        active: activeOrders?.length || 0,
        completed: completedOrders?.length || 0,
        earnings: earnings / 100,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{profile?.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Package size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {profile?.role === 'rider' && (
          <View style={styles.statCard}>
            <Clock size={24} color={colors.warning} />
            <Text style={styles.statValue}>₦{stats.earnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        )}
      </View>

      {profile?.role === 'sender' && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/order/create')}
        >
          <MapPin size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>Create New Delivery</Text>
        </TouchableOpacity>
      )}

      {profile?.role === 'rider' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Orders</Text>
          <Text style={styles.sectionSubtitle}>
            Find deliveries near you and start earning
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => router.push('/order/available')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              View Available Orders
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Package size={32} color={colors.primary} />
            <Text style={styles.actionText}>My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <MapPin size={32} color={colors.secondary} />
            <Text style={styles.actionText}>Track Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingTop: 60,
    },
    greeting: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 4,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 24,
      padding: 16,
      borderRadius: 16,
      gap: 8,
    },
    createButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    section: {
      padding: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 16,
    },
    secondaryButton: {
      borderWidth: 2,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    actionText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
