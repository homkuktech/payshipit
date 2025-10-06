import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database';

type Invoice = Tables<'invoices'>;

const EscrowPayment = () => {
  const { id } = useLocalSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
    } else {
      setInvoice(data);
    }
  };

  const handleFundEscrow = async () => {
    if (!invoice) return;

    setLoading(true);
    const { error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert([
        {
          invoice_id: invoice.id,
          amount: invoice.total_amount,
        },
      ]);

    if (escrowError) {
      console.error('Error funding escrow:', escrowError);
      Alert.alert('Error', 'Could not fund escrow. Please try again.');
      setLoading(false);
      return;
    }

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ escrow_status: 'funded' })
      .eq('id', invoice.id);

    if (invoiceError) {
      console.error('Error updating invoice status:', invoiceError);
      Alert.alert(
        'Error',
        'Escrow was funded, but failed to update invoice status. Please contact support.'
      );
      setLoading(false);
      return;
    }

    Alert.alert('Success', 'Escrow has been funded!');
    router.replace(`/invoice/${invoice.id}`);
  };

  if (!invoice) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Fund Escrow for Invoice #{invoice.invoice_code}
      </Text>

      <View style={styles.detailsContainer}>
        <Text>Total Amount: ${Number(invoice.total_amount).toFixed(2)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Fund Escrow" onPress={handleFundEscrow} />
      )}
    </ScrollView>
  );
};

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
});

export default EscrowPayment;
