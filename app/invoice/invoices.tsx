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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { FileText, CheckCircle, AlertCircle, Search, Plus, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

type Invoice = Tables<'invoices'>;

export default function MerchantInvoicesScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 15;

  const fetchInvoices = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    // Reset for a new search/initial load
    setPage(0);
    setHasMore(true);
    setInvoices([]);
    setLoading(true);

    try {
      const from = 0;
      const to = PAGE_SIZE - 1;

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', profile.id) // Fetch invoices created by the current user (merchant)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchQuery.trim()) {
        // Allow searching by invoice code or customer name
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(`invoice_code.ilike.${searchTerm},customer_name.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const loadedInvoices = data || [];
      setInvoices(loadedInvoices);
      if (loadedInvoices.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setPage(1);
    } catch (error) {
      console.error('Error fetching merchant invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, searchQuery]); // Only depends on profile and search query for re-fetching from scratch

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !profile) return;

    setLoadingMore(true);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(`invoice_code.ilike.${searchTerm},customer_name.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const newInvoices = data || [];
      if (newInvoices.length > 0) {
        setInvoices(prev => [...prev, ...newInvoices]);
        setPage(prev => prev + 1);
      }
      if (newInvoices.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more invoices:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExport = async () => {
    if (invoices.length === 0) {
      Alert.alert('No Data', 'There are no invoices to export.');
      return;
    }

    try {
      // 1. Prepare data for CSV
      const dataToExport = invoices.map(inv => ({
        'Invoice Code': inv.invoice_code,
        'Customer Name': inv.customer_name,
        'Customer Email': inv.customer_email,
        'Customer Phone': inv.customer_phone,
        'Total Amount': inv.total_amount,
        'Payment Status': inv.payment_status,
        'Escrow Status': inv.escrow_status,
        'Created At': new Date(inv.created_at).toISOString(),
      }));

      // 2. Convert JSON to CSV string
      const csvString = Papa.unparse(dataToExport);

      // 3. Write the file to the device's cache directory
      const fileName = `invoices-${Date.now()}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 4. Open the share sheet to export the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Invoices',
      });
    } catch (error) {
      console.error('Failed to export invoices:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting the invoices.');
    }
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
      <Text style={styles.customerName}>To: {item.customer_name || 'N/A'}</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>My Invoices</Text>
        <TouchableOpacity onPress={handleExport}>
          <Download size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code or customer..."
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>You haven't created any invoices.</Text>
            <TouchableOpacity onPress={() => router.push('/invoice/create')}>
              <Text style={styles.link}>Create one now</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {/* Floating Action Button to create a new invoice */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/invoice/create')}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 24, marginVertical: 16, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceCode: { fontSize: 16, fontWeight: '600', color: colors.text },
  invoiceAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  customerName: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  date: { fontSize: 12, color: colors.textSecondary },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  link: { color: colors.primary, marginTop: 8, fontSize: 16, fontWeight: '600' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});