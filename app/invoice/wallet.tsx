import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { Wallet, ArrowUpRight, ArrowDownLeft, PlusCircle } from 'lucide-react-native';

type Transaction = Tables<'transactions'>;

export default function RiderWalletScreen() {
  const { colors } = useTheme();
  const { profile, user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const renderTransactionIcon = (type: Transaction['type']) => {
    if (type === 'payout' || type === 'top-up') {
      return <ArrowDownLeft size={20} color={colors.success} />;
    }
    return <ArrowUpRight size={20} color={colors.danger} />;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {renderTransactionIcon(item.type)}
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>{item.type.replace('_', ' ')}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'payout' || item.type === 'top-up' ? colors.success : colors.danger },
        ]}
      >
        {item.type === 'payout' || item.type === 'top-up' ? '+' : '-'}
        ${Number(item.amount).toFixed(2)}
      </Text>
    </View>
  );

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            ${Number(profile?.wallet_balance || 0).toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity style={styles.topUpButton}>
          <PlusCircle size={20} color={colors.primary} />
          <Text style={styles.topUpButtonText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Transaction History</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    balanceCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 24,
      padding: 24,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceLabel: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
    balanceAmount: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
    topUpButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.primary}20`, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    topUpButtonText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    historyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, paddingHorizontal: 24, marginBottom: 16 },
    transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    transactionDetails: { flex: 1 },
    transactionType: { fontSize: 16, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
    transactionDate: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    transactionAmount: { fontSize: 16, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '600' },
  });