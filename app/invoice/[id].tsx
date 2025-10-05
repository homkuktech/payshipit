import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FileText, Package, MapPin, Phone, Mail, Share2, CreditCard, CircleCheck as CheckCircle, Truck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { InvoiceWithItems, InvoiceItem } from '@/types/database';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, merchant:profiles!merchant_id(*)')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      setInvoice(invoiceData);
      setItems(itemsData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load invoice');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !profile) return;

    Alert.alert(
      'Confirm Payment',
      `Pay ₦${(invoice.total_amount / 100).toFixed(2)} for Invoice ${invoice.invoice_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: () => processPayment(),
        },
      ]
    );
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

  const shareInvoice = async () => {
    if (!invoice) return;

    const invoiceLink = `paynship://invoice/${invoice.id}`;
    const webLink = `https://paynship.app/invoice/${invoice.id}`;

    try {
      await Share.share({
        message: `Invoice ${invoice.invoice_number}\n\nFrom: ${invoice.merchant?.full_name}\nTotal: ₦${(invoice.total_amount / 100).toFixed(2)}\n\nView & Pay: ${webLink}`,
        title: `Invoice ${invoice.invoice_number}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'shipped':
        return colors.secondary;
      case 'delivered':
        return colors.primary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getStatusText = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Invoice not found</Text>
      </View>
    );
  }

  const styles = getStyles(colors);
  const isMerchant = profile?.id === invoice.merchant_id;
  const canPay =
    invoice.status === 'pending_payment' &&
    profile &&
    profile.wallet_balance >= invoice.total_amount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invoice</Text>
        <TouchableOpacity onPress={shareInvoice}>
          <Share2 size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.invoiceHeader}>
          <FileText size={48} color={colors.primary} />
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(invoice.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(invoice.status) }]}
            >
              {getStatusText(invoice.status)}
            </Text>
          </View>
          <Text style={styles.date}>
            {new Date(invoice.created_at).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <View style={styles.infoCard}>
            <Text style={styles.merchantName}>{invoice.merchant?.full_name}</Text>
            <Text style={styles.merchantPhone}>{invoice.merchant?.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ship To</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Package size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{invoice.customer_name}</Text>
            </View>
            {invoice.customer_phone && (
              <View style={styles.infoRow}>
                <Phone size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>{invoice.customer_phone}</Text>
              </View>
            )}
            {invoice.customer_email && (
              <View style={styles.infoRow}>
                <Mail size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>{invoice.customer_email}</Text>
              </View>
            )}
            {invoice.shipping_address && (
              <View style={styles.infoRow}>
                <MapPin size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>{invoice.shipping_address}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemTotal}>
                  ₦{(item.total_price / 100).toFixed(2)}
                </Text>
              </View>
              {item.product_description && (
                <Text style={styles.itemDescription}>{item.product_description}</Text>
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  @ ₦{(item.unit_price / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₦{(invoice.subtotal / 100).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                ₦{(invoice.delivery_fee / 100).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₦{(invoice.total_amount / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {invoice.status === 'paid' && (
          <View style={styles.paidNotice}>
            <CheckCircle size={24} color={colors.success} />
            <View style={styles.paidText}>
              <Text style={styles.paidTitle}>Payment Received</Text>
              <Text style={styles.paidSubtitle}>
                Paid on {new Date(invoice.paid_at!).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {invoice.status === 'shipped' && (
          <View style={[styles.paidNotice, { backgroundColor: colors.secondary + '20' }]}>
            <Truck size={24} color={colors.secondary} />
            <View style={styles.paidText}>
              <Text style={[styles.paidTitle, { color: colors.secondary }]}>
                Order Shipped
              </Text>
              <Text style={styles.paidSubtitle}>Your order is on the way</Text>
            </View>
          </View>
        )}

        {!isMerchant && invoice.status === 'pending_payment' && (
          <View style={styles.paymentSection}>
            {profile ? (
              <>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletLabel}>Your Wallet Balance:</Text>
                  <Text style={styles.walletBalance}>
                    ₦{(profile.wallet_balance / 100).toFixed(2)}
                  </Text>
                </View>

                {canPay ? (
                  <TouchableOpacity
                    style={[styles.payButton, paying && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={paying}
                  >
                    <CreditCard size={20} color="#ffffff" />
                    <Text style={styles.payButtonText}>
                      {paying ? 'Processing...' : 'Pay with Wallet'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Text style={styles.insufficientText}>
                      Insufficient wallet balance
                    </Text>
                    <TouchableOpacity
                      style={styles.topUpButton}
                      onPress={() => router.push('/(tabs)/profile')}
                    >
                      <Text style={styles.topUpButtonText}>Top Up Wallet</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginText}>Login to pay this invoice</Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.loginButtonText}>Login / Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
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
    invoiceHeader: {
      alignItems: 'center',
      paddingVertical: 32,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    invoiceNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 16,
    },
    statusBadge: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
      marginTop: 12,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    section: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 8,
    },
    merchantName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    merchantPhone: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    itemName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    itemTotal: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    itemDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    itemDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    itemQuantity: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemPrice: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    notesCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    notesText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
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
    paidNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '20',
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 24,
      gap: 12,
    },
    paidText: {
      flex: 1,
    },
    paidTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success,
    },
    paidSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    paymentSection: {
      padding: 24,
    },
    walletInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    walletLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    walletBalance: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    payButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    payButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    insufficientText: {
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 12,
    },
    topUpButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    topUpButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    loginPrompt: {
      alignItems: 'center',
      gap: 16,
    },
    loginText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    loginButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 16,
    },
  });
