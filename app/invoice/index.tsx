import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { MapPin, Package, Tag, TrendingUp, Star } from 'lucide-react-native';

type Order = Tables<'orders'>;

export default function RiderHomeScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({ completed: 0, rating: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    try {
      // Fetch stats
      const { count: completedCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', profile.id)
        .eq('status', 'completed');

      // Fetch available orders
      const { data: availableOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .is('rider_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      setStats({
        completed: completedCount || 0,
        rating: profile.rating || 0,
      });
      setRecentOrders(availableOrders || []);
    } catch (error) {
      console.error('Error fetching rider data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderOrder = (item: Order) => (
    <TouchableOpacity
      key={item.id}
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>New Delivery Request</Text>
        <Text style={styles.orderFee}>
          ${Number(item.delivery_fee).toFixed(2)}
        </Text>
      </View>
      <View style={styles.locationRow}>
        <MapPin size={16} color={colors.primary} />
        <Text style={styles.address} numberOfLines={1}>
          From: {item.pickup_address}
        </Text>
      </View>
      <View style={styles.locationRow}>
        <MapPin size={16} color={colors.danger} />
        <Text style={styles.address} numberOfLines={1}>
          To: {item.dropoff_address}
        </Text>
      </View>
      <View style={styles.orderFooter}>
        <Tag size={14} color={colors.textSecondary} />
        <Text style={styles.distanceText}>
          {item.estimated_distance
            ? `${Number(item.estimated_distance).toFixed(1)} km`
            : 'Distance not available'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(rider)/profile')}>
          <View style={styles.avatar} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <TrendingUp size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Star size={24} color={colors.warning} />
          <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Orders</Text>
          <TouchableOpacity onPress={() => router.push('/(rider)/orders')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
        ) : recentOrders.length > 0 ? (
          recentOrders.map(renderOrder)
        ) : (
          <View style={styles.emptyState}>
            <Package size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No available orders right now.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 16,
    },
    greeting: { fontSize: 16, color: colors.textSecondary },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 4,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    statValue: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    statLabel: { fontSize: 12, color: colors.textSecondary },
    section: { paddingHorizontal: 24, paddingBottom: 24 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    viewAll: { fontSize: 14, fontWeight: '600', color: colors.primary },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    orderFee: { fontSize: 16, fontWeight: 'bold', color: colors.success },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    address: { flex: 1, fontSize: 14, color: colors.textSecondary },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    distanceText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      fontWeight: '500',
    },
  });
