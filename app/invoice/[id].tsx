import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { CheckCircle, Package, User, Truck } from 'lucide-react-native';

type Order = Tables<'orders'>;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id as string)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleConfirmDelivery = async () => {
    if (!order) return;

    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'release-escrow',
        {
          body: { orderId: order.id },
        }
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      Alert.alert(
        'Success',
        'Delivery confirmed and funds have been released to the rider.'
      );
      fetchOrder(); // Refresh order details
    } catch (error: any) {
      Alert.alert(
        'Confirmation Failed',
        error.message || 'An unexpected error occurred.'
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  const isSender = profile?.id === order.sender_id;
  const canConfirm = isSender && order.status === 'in_transit';

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
        <Package size={32} color={colors.primary} />
        <Text style={styles.title}>Order Details</Text>
        <Text style={styles.status(order.status)}>
          {order.status.replace('_', ' ')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Package Information</Text>
        <Text style={styles.detailText}>
          Description: {order.package_description}
        </Text>
        <Text style={styles.detailText}>
          Value: ${Number(order.package_value).toFixed(2)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Recipient</Text>
        <Text style={styles.detailText}>Name: {order.recipient_name}</Text>
        <Text style={styles.detailText}>Phone: {order.recipient_phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Delivery</Text>
        <Text style={styles.detailText}>From: {order.pickup_address}</Text>
        <Text style={styles.detailText}>To: {order.dropoff_address}</Text>
        <Text style={styles.detailText}>
          Fee: ${Number(order.delivery_fee).toFixed(2)}
        </Text>
      </View>

      {canConfirm && (
        <TouchableOpacity
          style={[styles.button, isConfirming && styles.buttonDisabled]}
          onPress={handleConfirmDelivery}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <CheckCircle size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Confirm Delivery</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const getStatusColor = (status: string, colors: any) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in_transit':
      return colors.warning;
    case 'cancelled':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: { color: colors.danger, fontSize: 16 },
    header: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginVertical: 8,
    },
    status: (status: string) => ({
      fontSize: 14,
      fontWeight: '600',
      color: getStatusColor(status, colors),
      backgroundColor: `${getStatusColor(status, colors)}20`,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      textTransform: 'uppercase',
    }),
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    detailText: { fontSize: 16, color: colors.textSecondary, marginBottom: 6 },
    button: {
      flexDirection: 'row',
      backgroundColor: colors.success,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 16,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.7 },
  });
