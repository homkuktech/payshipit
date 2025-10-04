import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Trash2, FileText, Share2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { InvoiceItem } from '@/types/database';

interface ProductItem {
  product_name: string;
  product_description: string;
  quantity: string;
  unit_price: string;
}

export default function CreateInvoiceScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ProductItem[]>([
    { product_name: '', product_description: '', quantity: '1', unit_price: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      { product_name: '', product_description: '', quantity: '1', unit_price: '' },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ProductItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const fee = parseFloat(deliveryFee) || 0;
    return subtotal + fee;
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Error', 'Please enter customer phone');
      return false;
    }
    if (!shippingAddress.trim()) {
      Alert.alert('Error', 'Please enter shipping address');
      return false;
    }
    if (!deliveryFee.trim() || parseFloat(deliveryFee) < 0) {
      Alert.alert('Error', 'Please enter valid delivery fee');
      return false;
    }

    const validItems = items.filter(
      (item) =>
        item.product_name.trim() &&
        item.quantity.trim() &&
        item.unit_price.trim() &&
        parseInt(item.quantity) > 0 &&
        parseFloat(item.unit_price) >= 0
    );

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one valid product');
      return false;
    }

    return true;
  };

  const createInvoice = async () => {
    if (!validateForm() || !profile) return;

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const deliveryFeeAmount = parseFloat(deliveryFee);
      const totalAmount = subtotal + deliveryFeeAmount;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          merchant_id: profile.id,
          status: 'pending_payment',
          subtotal: Math.round(subtotal * 100),
          delivery_fee: Math.round(deliveryFeeAmount * 100),
          total_amount: Math.round(totalAmount * 100),
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          shipping_address: shippingAddress,
          notes: notes || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const validItems = items
        .filter(
          (item) =>
            item.product_name.trim() &&
            item.quantity.trim() &&
            item.unit_price.trim()
        )
        .map((item) => {
          const qty = parseInt(item.quantity);
          const unitPrice = parseFloat(item.unit_price);
          return {
            invoice_id: invoice.id,
            product_name: item.product_name,
            product_description: item.product_description || null,
            quantity: qty,
            unit_price: Math.round(unitPrice * 100),
            total_price: Math.round(qty * unitPrice * 100),
          };
        });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(validItems);

      if (itemsError) throw itemsError;

      Alert.alert(
        'Success',
        `Invoice ${invoice.invoice_number} created successfully!`,
        [
          {
            text: 'Share Link',
            onPress: () => shareInvoice(invoice.id, invoice.invoice_number),
          },
          {
            text: 'View Invoice',
            onPress: () => router.push(`/invoice/${invoice.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const shareInvoice = async (invoiceId: string, invoiceNumber: string) => {
    const invoiceLink = `paynship://invoice/${invoiceId}`;
    const webLink = `https://paynship.app/invoice/${invoiceId}`;

    try {
      await Share.share({
        message: `You have an invoice from ${profile?.full_name}!\n\nInvoice: ${invoiceNumber}\nTotal: ₦${calculateTotal().toFixed(2)}\n\nPay now: ${webLink}`,
        title: `Invoice ${invoiceNumber}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Invoice</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Customer Name *"
            placeholderTextColor={colors.textSecondary}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            placeholderTextColor={colors.textSecondary}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            placeholderTextColor={colors.textSecondary}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Shipping Address *"
            placeholderTextColor={colors.textSecondary}
            value={shippingAddress}
            onChangeText={setShippingAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Product Name *"
                placeholderTextColor={colors.textSecondary}
                value={item.product_name}
                onChangeText={(value) => updateItem(index, 'product_name', value)}
              />

              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                value={item.product_description}
                onChangeText={(value) =>
                  updateItem(index, 'product_description', value)
                }
                multiline
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Quantity *"
                  placeholderTextColor={colors.textSecondary}
                  value={item.quantity}
                  onChangeText={(value) => updateItem(index, 'quantity', value)}
                  keyboardType="number-pad"
                />

                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Unit Price (₦) *"
                  placeholderTextColor={colors.textSecondary}
                  value={item.unit_price}
                  onChangeText={(value) => updateItem(index, 'unit_price', value)}
                  keyboardType="decimal-pad"
                />
              </View>

              {item.quantity && item.unit_price && (
                <Text style={styles.itemTotal}>
                  Item Total: ₦
                  {(parseInt(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery & Summary</Text>

          <TextInput
            style={styles.input}
            placeholder="Delivery Fee (₦) *"
            placeholderTextColor={colors.textSecondary}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₦{calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee:</Text>
              <Text style={styles.summaryValue}>
                ₦{parseFloat(deliveryFee || '0').toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₦{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={createInvoice}
          disabled={loading}
        >
          <FileText size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create & Share Invoice'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      fontSize: 16,
      color: colors.primary,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    itemNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfInput: {
      flex: 1,
    },
    itemTotal: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'right',
      marginTop: 8,
    },
    summary: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    createButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 24,
      marginTop: 24,
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    createButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
