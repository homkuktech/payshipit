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
import { FileText, CheckCircle, AlertCircle, Search } from 'lucide-react-native';

type Invoice = Tables<'invoices'>;

export default function IncomingOrdersScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      // Build a filter that finds invoices linked by ID, email, or phone.
      const filter = `customer_id.eq.${profile.id},customer_email.eq.${profile.email},customer_phone.eq.${profile.phone}`;

      let query = supabase
        .from('invoices')
        .select('*')
        .or(filter)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.ilike('invoice_code', `%${searchQuery.trim()}%`);
      }
      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, searchQuery]);

  useEffect(() => {
    // Debounce the search to avoid excessive API calls
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const renderStatusIcon = (status: string) => {
    if (status === 'paid') {
      return <CheckCircle size={20} color={colors.success} />;
    }
    return <AlertCircle size={20} color={colors.warning} />;
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
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
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={styles.statusContainer}>
          {renderStatusIcon(item.payment_status)}
          <Text style={styles.statusText}>{item.payment_status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Invoices</Text>
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by invoice code..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={{ paddingHorizontal: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>You have no invoices yet.</Text>
            <Text style={styles.emptySubText}>Invoices from merchants will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, paddingTop: 60, paddingHorizontal: 24 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invoiceCode: { fontSize: 16, fontWeight: '600', color: colors.text },
  invoiceAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  date: { fontSize: 12, color: colors.textSecondary },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});