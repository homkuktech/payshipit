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
import { supabase } from '../../lib/supabase';
import { Tables } from '../../types/database'; // Assuming you have generated types

type Invoice = Tables<'invoices'>;
type InvoiceItem = Tables<'invoice_items'>;

const InvoiceDetail = () => {
  const { id } = useLocalSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      Alert.alert('Error', 'Could not fetch invoice details.');
      setLoading(false);
      return;
    }

    setInvoice(invoiceData);

    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      // Non-critical, so we don't block the UI
      return;
    }

    setItems(itemsData || []);
    setLoading(false);
  };

  const handlePayment = () => {
    // For now, just log a message to the console.
    console.log('Payment button pressed for invoice:', id);
    // In a real application, you would integrate a payment gateway here.
  };

  const handleShare = async () => {
    try {
      // For production, you should use a proper deep link like 'paynship://invoice/[id]'
      // and configure the scheme in app.json.
      const result = await Share.share({
        message: `View your Paynship invoice #${invoice?.invoice_code}. Open with this link: paynship://invoice/${id}`,
        title: `Paynship Invoice #${invoice?.invoice_code}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share invoice.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!invoice && !loading) {
    return (
      <View style={styles.centered}>
        <Text>Invoice not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Invoice #{invoice.invoice_code}</Text>

      <View style={styles.detailsContainer}>
        <Text>Total Amount: ${Number(invoice.total_amount).toFixed(2)}</Text>
        <Text>Status: {invoice.payment_status}</Text>
        <Text>Escrow Status: {invoice.escrow_status}</Text>
      </View>

      <Text style={styles.subtitle}>Invoice Items</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.itemContainer}>
          <Text>{item.description}</Text>
          <Text>Quantity: {item.quantity}</Text>
          <Text>Price: ${Number(item.price).toFixed(2)}</Text>
        </View>
      ))}

      {invoice.payment_status === 'pending' && (
        <Button title="Pay Now" onPress={handlePayment} />
      )}
      {invoice.payment_status === 'pending' &&
        invoice.escrow_status === 'pending' && (
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

export default InvoiceDetail;