import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { Package, MapPin, Tag } from 'lucide-react-native';

type Order = Tables<'orders'>;

export default function AvailableOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAvailableOrders = useCallback(async () => {
    try {
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
  }, []);

  useEffect(() => {
    loadAvailableOrders();
  }, [loadAvailableOrders]);

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
        <Text style={styles.orderTitle}>New Delivery Request</Text>
        <Text style={styles.orderFee}>${Number(item.delivery_fee).toFixed(2)}</Text>
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
          {item.estimated_distance ? `${Number(item.estimated_distance).toFixed(1)} km` : 'Distance not available'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  if (loading && !refreshing) {
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Available Orders</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No available orders right now.</Text>
            <Text style={styles.emptySubText}>Pull down to refresh.</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 24, paddingBottom: 24 },
  header: { paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  orderCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  orderFee: { fontSize: 16, fontWeight: 'bold', color: colors.success },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  address: { flex: 1, fontSize: 14, color: colors.textSecondary },
  orderFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  distanceText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, flex: 1 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});

```

This screen is now fully integrated into the rider's tab navigation, providing them with a central place to find and engage with new delivery opportunities on the TrusTrade platform.

<!--
[PROMPT_SUGGESTION]How do I implement the logic for a rider to accept an order?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Can you add a map view to this screen to show where the orders are located?[/PROMPT_SUGGESTION]
-->