import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface InvoiceItemState {
  description: string;
  quantity: number;
  price: number;
}

const CreateInvoice = () => {
  const [customerName, setCustomerName] = useState(''); // These can be part of a larger form state object
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<InvoiceItemState[]>([
    { description: '', quantity: 1, price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemState,
    value: string | number
  ) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value; // Basic update, can be improved with type guards
    setItems(newItems);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  }, [items]);

  const handleSubmit = async () => {
    if (loading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an invoice.');
      return;
    }

    if (
      items.some(
        (item) => !item.description || item.quantity <= 0 || item.price <= 0
      )
    ) {
      Alert.alert(
        'Invalid Item',
        'Please ensure all invoice items have a description, and quantity/price are greater than zero.'
      );
      return;
    }

    setLoading(true);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: user.id,
          invoice_code: `INV-${Date.now()}`,
          total_amount: totalAmount,
          payment_status: 'pending',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
      ])
      .select()
      .single();

    if (invoiceError || !invoiceData) {
      console.error('Error creating invoice:', invoiceError);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
      setLoading(false);
      return;
    }

    const invoiceItems = items.map((item) => ({
      invoice_id: invoiceData.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      // Attempt to clean up the created invoice if items fail to insert
      await supabase.from('invoices').delete().eq('id', invoiceData.id);
      console.error('Error creating invoice items:', itemsError);
      Alert.alert('Error', 'Failed to save invoice items. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert('Success', 'Invoice created successfully!');
    router.push(`/invoice/${invoiceData.id}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Invoice</Text>

      <Text style={styles.label}>Customer Information</Text>
      <TextInput
        style={styles.input}
        placeholder="Customer Name"
        value={customerName}
        onChangeText={setCustomerName}
      />
      <TextInput
        style={styles.input}
        placeholder="Customer Email"
        value={customerEmail}
        onChangeText={setCustomerEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Customer Phone"
        value={customerPhone}
        onChangeText={setCustomerPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.subtitle}>Invoice Items</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <TextInput
            style={styles.itemInput}
            placeholder="Description"
            value={item.description || ''}
            onChangeText={(value) =>
              handleItemChange(index, 'description', value)
            }
          />
          <TextInput
            style={[styles.itemInput, styles.quantityInput]}
            placeholder="Quantity"
            value={String(item.quantity)}
            onChangeText={(value) =>
              handleItemChange(index, 'quantity', Number(value) || 0)
            }
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.itemInput, styles.priceInput]}
            placeholder="Price"
            value={String(item.price)}
            onChangeText={(value) =>
              handleItemChange(index, 'price', Number(value) || 0)
            }
            keyboardType="numeric"
          />
        </View>
      ))}

      <Button title="Add Item" onPress={handleAddItem} />

      <Text style={styles.total}>Total: ${totalAmount.toFixed(2)}</Text>

      <View style={styles.submitButton}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Button title="Create Invoice" onPress={handleSubmit} color="#fff" />
        )}
      </View>
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
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    flex: 1,
  },
  quantityInput: {
    flex: 0.5,
    marginHorizontal: 5,
  },
  priceInput: {
    flex: 0.6,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#2563eb', // primary blue from your theme
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
  },
});

export default CreateInvoice;
