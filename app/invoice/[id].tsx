import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Invoice, InvoiceItem } from '../../types/database';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      return;
    }

    setInvoice(invoiceData);

    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return;
    }

    setItems(itemsData || []);
  };

  const processPayment = async () => {
    if (!invoice || !profile) return;

    setPaying(true);
    try {
      const paymentReference = `PAY-${Date.now()}-${invoice.id.substring(0, 8)}`;

      const { error: paymentError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          type: 'payment',
          amount: invoice.total_amount,
          status: 'completed',
          payment_provider: 'wallet',
          payment_reference: paymentReference,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
          },
        });

      if (paymentError) throw paymentError;

      const newBalance = profile.wallet_balance - invoice.total_amount;
      if (newBalance < 0) {
        throw new Error('Insufficient wallet balance');
      }

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          customer_id: profile.id,
          paid_at: new Date().toISOString(),
          payment_reference: paymentReference,
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      Alert.alert(
        'Payment Successful',
        'Your payment has been received. The merchant will ship your order soon.',
        [{ text: 'OK', onPress: () => loadInvoice() }]
      );
    } catch (error: any) {
      Alert.alert('Payment Failed', error.message || 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `View your invoice at: exp://${process.env.EXPO_PUBLIC_HOST}/invoice/${id}`,
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
    }
  };

  if (!invoice) {
    return <Text>Loading...</Text>;
  }

  const styles = getStyles(colors);
  const isMerchant = profile?.id === invoice.merchant_id;
  const canPay =
    invoice.status === 'pending_payment' &&
    profile &&
    profile.wallet_balance >= invoice.total_amount;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Invoice #{invoice.invoice_code}</Text>

      <View style={styles.detailsContainer}>
        <Text>Total Amount: ${invoice.total_amount.toFixed(2)}</Text>
        <Text>Status: {invoice.payment_status}</Text>
        <Text>Escrow Status: {invoice.escrow_status}</Text>
      </View>

      <Text style={styles.subtitle}>Invoice Items</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.itemContainer}>
          <Text>{item.description}</Text>
          <Text>Quantity: {item.quantity}</Text>
          <Text>Price: ${item.price.toFixed(2)}</Text>
        </View>
      ))}

      {invoice.payment_status === 'pending' && (
        <Button title="Pay Now" onPress={handlePayment} />
      )}
      {invoice.payment_status === 'pending' && invoice.escrow_status === 'pending' && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Pay with Escrow"
            onPress={() => router.push(`/invoice/escrow/${id}`)}
          />
        </View>
      )}
      <View style={{ marginTop: 20 }}>
        <Button title="Share" onPress={handleShare} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
});
