import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Tables } from '@/types/database';

type Invoice = Tables<'invoices'>;
type InvoiceItem = Tables<'invoice_items'>;

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id as string)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id as string);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      Alert.alert('Error', 'Could not load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !profile) return;

    setIsPaying(true);
    try {
      const paymentReference = `PAY-${Date.now()}-${invoice.id.substring(
        0,
        8
      )}`;

      // 1. Check wallet balance
      const newBalance = profile.wallet_balance - Number(invoice.total_amount);
      if (newBalance < 0) {
        throw new Error('Insufficient wallet balance');
      }

      // 2. Create a transaction record
      const { error: paymentError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          type: 'payment',
          amount: invoice.total_amount,
          status: 'successful',
          payment_provider: 'wallet',
          payment_reference: paymentReference,
          metadata: {
            invoice_id: invoice.id,
            invoice_code: invoice.invoice_code,
          },
        });

      if (paymentError) throw paymentError;

      // 3. Update user's wallet balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // 4. Update the invoice status
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ payment_status: 'paid', customer_id: profile.id })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      Alert.alert('Payment Successful', 'Your payment has been received.', [
        { text: 'OK', onPress: () => loadInvoice() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error.message || 'Failed to process payment'
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `View your invoice at: exp://${process.env.EXPO_PUBLIC_HOST}/invoice/${id}`,
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
      Alert.alert('Error', 'Could not share invoice.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.centered}>
        <Text>Invoice not found.</Text>
      </View>
    );
  }

  const styles = getStyles(colors);
  const isMerchant = profile?.id === invoice.user_id;
  const canPay =
    invoice.payment_status === 'pending' &&
    profile &&
    profile.wallet_balance >= Number(invoice.total_amount);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Invoice #{invoice.invoice_code}</Text>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>
          Total Amount: ${Number(invoice.total_amount).toFixed(2)}
        </Text>
        <Text style={styles.detailText}>Status: {invoice.payment_status}</Text>
        <Text style={styles.detailText}>
          Escrow Status: {invoice.escrow_status}
        </Text>
      </View>

      <Text style={styles.subtitle}>Invoice Items</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.itemContainer}>
          <Text style={styles.itemDescription}>{item.description}</Text>
          <Text style={styles.itemDetails}>Qty: {item.quantity}</Text>
          <Text style={styles.itemDetails}>
            @ ${Number(item.price).toFixed(2)}
          </Text>
        </View>
      ))}

      {!isMerchant && canPay && (
        <>
          <Button
            title={isPaying ? 'Processing...' : 'Pay with Wallet'}
            onPress={handlePayment}
            disabled={isPaying}
          />
          {invoice.escrow_status === 'pending' && (
            <View style={{ marginTop: 10 }}>
              <Button
                title="Pay with Escrow"
                onPress={() => router.push(`/invoice/escrow/${id}`)}
                disabled={isPaying}
              />
            </View>
          )}
        </>
      )}

      <View style={{ marginTop: 20 }}>
        <Button title="Share" onPress={handleShare} />
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: colors.text,
    },
    detailsContainer: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    detailText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
      color: colors.text,
    },
    itemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
    },
    itemDescription: {
      flex: 1,
      color: colors.text,
    },
    itemDetails: {
      color: colors.textSecondary,
      marginLeft: 16,
    },
  });
