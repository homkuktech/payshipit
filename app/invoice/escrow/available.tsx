import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Package, MapPin, Tag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/database';

export default function AvailableOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAvailableOrders();
  }, []);

  const loadAvailableOrders = async () => {
    try {
      // Fetch orders that are pending and have no rider assigned
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .is('rider_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading available orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvailableOrders();
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>New Delivery Request</Text>
        <Text style={styles.orderFee}>₦{(item.delivery_fee / 100).toFixed(2)}</Text>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={16} color={colors.primary} />
        <Text style={styles.address} numberOfLines={1}>
          From: {item.pickup_address}
        </Text>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={16} color={colors.error} />
        <Text style={styles.address} numberOfLines={1}>
          To: {item.dropoff_address}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.distanceInfo}>
          <Tag size={14} color={colors.textSecondary} />
          <Text style={styles.distanceText}>
            {item.estimated_distance_km?.toFixed(1)} km
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListHeaderComponent={<Text style={styles.title}>Available Orders</Text>}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No available orders right now.</Text>
            <Text style={styles.emptySubText}>Check back soon!</Text>
          </View>
        }
      />
    </View>
  );
}

// Using a factory for styles to easily pass theme colors
const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  list: { padding: 24, paddingTop: 0 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 16, paddingTop: 60 },
  orderCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: '600', color: colors.text },
  orderFee: { fontSize: 18, fontWeight: 'bold', color: colors.success },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  address: { flex: 1, fontSize: 14, color: colors.textSecondary },
  orderFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  distanceInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontSize: 12, color: colors.textSecondary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});