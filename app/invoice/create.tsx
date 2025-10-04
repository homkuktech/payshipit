import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const CreateInvoice = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const router = useRouter();

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const handleSubmit = async () => {
    const totalAmount = calculateTotal();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          invoice_code: `INV-${Date.now()}`,
          total_amount: totalAmount,
          payment_status: 'pending',
        },
      ])
      .select();

    if (error || !invoice) {
      console.error('Error creating invoice:', error);
      return;
    }

    const invoiceItems = items.map((item) => ({
      invoice_id: invoice[0].id,
      ...item,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
      return;
    }

    router.push(`/invoice/${invoice[0].id}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Invoice</Text>

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
            value={item.description}
            onChangeText={(value) => handleItemChange(index, 'description', value)}
          />
          <TextInput
            style={styles.itemInput}
            placeholder="Quantity"
            value={String(item.quantity)}
            onChangeText={(value) => handleItemChange(index, 'quantity', Number(value))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.itemInput}
            placeholder="Price"
            value={String(item.price)}
            onChangeText={(value) => handleItemChange(index, 'price', Number(value))}
            keyboardType="numeric"
          />
        </View>
      ))}

      <Button title="Add Item" onPress={handleAddItem} />

      <Text style={styles.total}>Total: ${calculateTotal().toFixed(2)}</Text>

      <Button title="Create Invoice" onPress={handleSubmit} />
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
    marginRight: 5,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'right',
  },
});

export default CreateInvoice;