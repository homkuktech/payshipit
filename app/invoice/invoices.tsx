import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Plus,
} from 'lucide-react-native';

type Invoice = Tables<'invoices'>;
type InvoiceStatus = 'pending' | 'paid' | 'cancelled';

export default function MerchantInvoicesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>(
    'all'
  );
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 15;

  const fetchInvoices = useCallback(
    async (isNewSearch = true) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (isNewSearch) {
        setPage(0);
        setHasMore(true);
        setInvoices([]);
        setLoading(true);
      }

      const from = isNewSearch ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
        let query = supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (statusFilter !== 'all') {
          query = query.eq('payment_status', statusFilter);
        }

        if (searchQuery.trim()) {
          const searchTerm = `%${searchQuery.trim()}%`;
          query = query.or(
            `invoice_code.ilike.${searchTerm},customer_name.ilike.${searchTerm}`
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        const loadedInvoices = data || [];
        if (isNewSearch) {
          setInvoices(loadedInvoices);
        } else {
          setInvoices((prev) => [...prev, ...loadedInvoices]);
        }

        if (loadedInvoices.length < PAGE_SIZE) {
          setHasMore(false);
        }
        setPage((prev) => prev + 1);
      } catch (error) {
        console.error('Error fetching merchant invoices:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user, searchQuery, statusFilter, page]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices(true);
    }, 300); // Debounce search and filter changes

    return () => clearTimeout(handler);
  }, [searchQuery, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchInvoices(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={20} color={colors.success} />;
      case 'pending':
        return <Clock size={20} color={colors.warning} />;
      case 'cancelled':
        return <XCircle size={20} color={colors.danger} />;
      default:
        return <FileText size={20} color={colors.textSecondary} />;
    }
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
      <Text style={styles.customerName}>To: {item.customer_name || 'N/A'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={styles.statusContainer}>
          {getStatusIcon(item.payment_status)}
          <Text style={styles.statusText(item.payment_status)}>
            {item.payment_status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(colors);

  const filterOptions: { label: string; value: InvoiceStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Invoices</Text>
      </View>
      <View style={styles.searchContainer}>
        <Search
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code or customer..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterButton,
              statusFilter === opt.value && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(opt.value)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === opt.value && styles.filterTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && invoices.length === 0 ? (
        <ActivityIndicator
          style={{ flex: 1 }}
          size="large"
          color={colors.primary}
        />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                No invoices match your criteria.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/invoice/create')}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const getStatusColor = (status: string, colors: any) => {
  switch (status) {
    case 'paid':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'cancelled':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: 60, paddingHorizontal: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 24,
      marginTop: 16,
      paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    filterContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    filterButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    filterButtonActive: { backgroundColor: colors.primary },
    filterText: { color: colors.textSecondary, fontWeight: '600' },
    filterTextActive: { color: '#ffffff' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    invoiceCode: { fontSize: 16, fontWeight: '600', color: colors.text },
    invoiceAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
    customerName: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    date: { fontSize: 12, color: colors.textSecondary },
    statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: (status: string) => ({
      fontSize: 12,
      color: getStatusColor(status, colors),
      textTransform: 'capitalize',
      fontWeight: '600',
    }),
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      flex: 1,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
    },
  });
