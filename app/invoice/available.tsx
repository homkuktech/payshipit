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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { ShieldCheck, FileText } from 'lucide-react-native';

type InvoiceWithProfile = Tables<'invoices'> & {
  profiles: { full_name: string | null } | null;
};

export default function AvailableEscrowInvoicesScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, profiles(full_name)')
        .or(`customer_email.eq.${profile.email},customer_phone.eq.${profile.phone}`)
        .eq('escrow_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching available escrow invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const renderInvoice = ({ item }: { item: InvoiceWithProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/invoice/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.invoiceCode}>{item.invoice_code}</Text>
        <Text style={styles.invoiceAmount}>
          ${Number(item.total_amount).toFixed(2)}
        </Text>
      </View>
      <Text style={styles.customerName}>
        From: {item.profiles?.full_name || 'Merchant'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={styles.statusContainer}>
          <ShieldCheck size={16} color={colors.warning} />
          <Text style={styles.statusText}>Awaiting Escrow</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available for Escrow</Text>
      </View>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={{ paddingHorizontal: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No invoices are currently awaiting escrow payment.</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    invoiceCode: { fontSize: 16, fontWeight: '600', color: colors.text },
    invoiceAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
    customerName: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
    date: { fontSize: 12, color: colors.textSecondary },
    statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, color: colors.warning, textTransform: 'capitalize', fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1, paddingHorizontal: 40 },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600', textAlign: 'center' },
  });

```

This new screen provides a dedicated place for customers to manage their escrow payments, making the process clear and straightforward.

<!--
[PROMPT_SUGGESTION]How can I add a button on the profile screen to navigate to this new escrow page?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Can you implement the logic to release funds from escrow upon delivery confirmation?[/PROMPT_SUGGESTION]
-->