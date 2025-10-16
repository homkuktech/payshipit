import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, Paperclip } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';

interface InvoiceItemState {
  description: string;
  quantity: number;
  price: number;
  media: ImagePicker.ImagePickerAsset[];
}

export default function CreateInvoiceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<InvoiceItemState[]>([
    { description: '', quantity: 1, price: 0, media: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [deliveryFee, setDeliveryFee] = useState('0');

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Sorry, we need camera roll permissions to make this work!'
          );
        }
      }
    })();
  }, []);

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemState,
    value: string | number
  ) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handlePickMedia = async (index: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newItems = [...items];
      newItems[index].media = [...newItems[index].media, ...result.assets];
      setItems(newItems);
    }
  };

  const handleRemoveMedia = (itemIndex: number, mediaIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].media.splice(mediaIndex, 1);
    setItems(newItems);
  };

  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    const sub = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    const tax = (sub * (parseFloat(taxRate) || 0)) / 100;
    const total =
      sub + tax - (parseFloat(discount) || 0) + (parseFloat(deliveryFee) || 0);
    return { subtotal: sub, taxAmount: tax, totalAmount: total };
  }, [items, taxRate, discount, deliveryFee]);

  const uploadMedia = async (
    mediaAssets: ImagePicker.ImagePickerAsset[]
  ): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const asset of mediaAssets) {
      const fileExt = asset.uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `invoices/${user!.id}/${fileName}`;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const { data, error } = await supabase.storage
        .from('attachments') // Ensure you have a 'attachments' bucket
        .upload(filePath, base64, { contentType: asset.type });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path);
      uploadedUrls.push(publicUrlData.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (loading) return;
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

    try {
      // Upload all media first
      const itemsWithMediaUrls = await Promise.all(
        items.map(async (item) => {
          const mediaUrls = await uploadMedia(item.media);
          return {
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            media_urls: mediaUrls,
          };
        })
      );

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
            tax_rate: parseFloat(taxRate) || 0,
            discount_amount: parseFloat(discount) || 0,
            delivery_fee: parseFloat(deliveryFee) || 0,
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

      const invoiceItems = itemsWithMediaUrls.map((item) => ({
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

      Alert.alert('Success', 'Invoice created successfully!');
      router.push(`/invoice/${invoiceData.id}`);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Invoice</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Customer Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Customer Name"
          value={customerName}
          onChangeText={setCustomerName}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Customer Email"
          value={customerEmail}
          onChangeText={setCustomerEmail}
          keyboardType="email-address"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Customer Phone"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Invoice Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <TouchableOpacity
              style={styles.removeItemButton}
              onPress={() => handleRemoveItem(index)}
            >
              <X size={16} color={colors.danger} />
            </TouchableOpacity>
            <TextInput
              style={styles.itemInput}
              placeholder="Item description"
              value={item.description || ''}
              onChangeText={(value) =>
                handleItemChange(index, 'description', value)
              }
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.itemInput, styles.quantityInput]}
                placeholder="Qty"
                value={String(item.quantity)}
                onChangeText={(value) =>
                  handleItemChange(index, 'quantity', Number(value) || 0)
                }
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={[styles.itemInput, styles.priceInput]}
                placeholder="Price"
                value={String(item.price)}
                onChangeText={(value) =>
                  handleItemChange(index, 'price', Number(value) || 0)
                }
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.mediaContainer}>
              {item.media.map((media, mediaIndex) => (
                <View key={media.uri} style={styles.mediaPreview}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaImage}
                  />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(index, mediaIndex)}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addMediaButton}
                onPress={() => handlePickMedia(index)}
              >
                <Paperclip size={18} color={colors.primary} />
                <Text style={styles.addMediaText}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
          <Plus size={18} color={colors.primary} />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax Rate (%)</Text>
          <TextInput
            style={styles.summaryInput}
            value={taxRate}
            onChangeText={setTaxRate}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount ($)</Text>
          <TextInput
            style={styles.summaryInput}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee ($)</Text>
          <TextInput
            style={styles.summaryInput}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Create Invoice</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 24, paddingBottom: 100 },
    header: { paddingTop: 40, marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    section: { marginBottom: 24 },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
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
    itemContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    removeItemButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
    itemInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    itemRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    quantityInput: { flex: 0.4 },
    priceInput: { flex: 0.6 },
    mediaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    mediaPreview: { position: 'relative' },
    mediaImage: { width: 50, height: 50, borderRadius: 8 },
    removeMediaButton: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      padding: 2,
    },
    addMediaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addMediaText: { color: colors.primary, fontWeight: '600' },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
    },
    addItemText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryLabel: { fontSize: 16, color: colors.textSecondary },
    summaryValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
    summaryInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.text,
      minWidth: 100,
      textAlign: 'right',
    },
    totalRow: { borderBottomWidth: 0, marginTop: 8 },
    totalLabel: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    totalValue: { fontSize: 22, color: colors.primary, fontWeight: 'bold' },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
  });
