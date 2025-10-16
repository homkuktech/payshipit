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
  Image,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Tables } from '@/types/database';
import * as Clipboard from 'expo-clipboard';
import { Share2, Copy, MessageSquare, X, FileDown } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type Invoice = Tables<'invoices'> & {
  tax_rate?: number;
  discount_amount?: number;
  delivery_fee?: number;
};
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
  const [isShareModalVisible, setShareModalVisible] = useState(false);

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

  const paymentLink = `https://trustrade.app/invoice/${id}`; // Using a production-style link

  const handleShare = async (
    platform: 'whatsapp' | 'generic' | 'copy' | 'pdf'
  ) => {
    const message = `Hello! Here is your invoice from TrusTrade. Please use the link to view and pay: ${paymentLink}`;

    setShareModalVisible(false);

    try {
      switch (platform) {
        case 'whatsapp':
          const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
            message
          )}`;
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert(
              'WhatsApp Not Installed',
              'Please install WhatsApp to use this feature.'
            );
          }
          break;
        case 'copy':
          await Clipboard.setStringAsync(paymentLink);
          Alert.alert('Copied!', 'Payment link copied to clipboard.');
          break;
        case 'generic':
          await Share.share({
            message: message,
            url: paymentLink, // url is used by some apps like Instagram
            title: `Invoice #${invoice?.invoice_code}`,
          });
          break;
        case 'pdf':
          await handleExportToPdf();
          break;
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not share the link. Please try again.');
    }
  };

  const subtotal = items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );
  const taxAmount = (subtotal * (invoice?.tax_rate || 0)) / 100;
  const totalAmount =
    subtotal +
    taxAmount -
    (invoice?.discount_amount || 0) +
    (invoice?.delivery_fee || 0);

  const handleExportToPdf = async () => {
    if (!invoice) return;

    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>$${Number(item.price).toFixed(2)}</td>
        <td>$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { color: #111; font-size: 28px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; }
          .details-left, .details-right { width: 48%; }
          .details-right { text-align: right; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .table th { background-color: #f2f2f2; font-weight: 600; }
          .table td:nth-child(2), .table td:nth-child(3), .table td:nth-child(4) { text-align: right; }
          .summary-container { display: flex; justify-content: flex-end; }
          .summary { width: 50%; font-size: 14px; }
          .summary table { width: 100%; }
          .summary td { padding: 5px 0; }
          .summary .label { color: #555; }
          .summary .total { font-weight: bold; font-size: 18px; }
          .summary .total-row td { border-top: 2px solid #333; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TrusTrade</h1>
          <h2>Invoice</h2>
        </div>
        <div class="invoice-details">
          <div class="details-left">
            <strong>Billed To:</strong><br>
            ${invoice.customer_name || 'N/A'}<br>
            ${invoice.customer_email || ''}<br>
            ${invoice.customer_phone || ''}
          </div>
          <div class="details-right">
            <strong>Invoice #${invoice.invoice_code}</strong><br>
            Date: ${new Date(invoice.created_at).toLocaleDateString()}<br>
            Status: ${invoice.payment_status}
          </div>
        </div>
        <table class="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary-container">
          <div class="summary">
            <table>
              <tr><td class="label">Subtotal</td><td style="text-align: right;">$${subtotal.toFixed(
                2
              )}</td></tr>
              <tr><td class="label">Tax (${
                invoice.tax_rate || 0
              }%)</td><td style="text-align: right;">$${taxAmount.toFixed(
      2
    )}</td></tr>
              <tr><td class="label">Discount</td><td style="text-align: right;">-$${(
                invoice.discount_amount || 0
              ).toFixed(2)}</td></tr>
              <tr><td class="label">Delivery Fee</td><td style="text-align: right;">$${(
                invoice.delivery_fee || 0
              ).toFixed(2)}</td></tr>
              <tr class="total-row"><td class="total">Total</td><td class="total" style="text-align: right;">$${totalAmount.toFixed(
                2
              )}</td></tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Invoice',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
      console.error('Error generating PDF: ', error);
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
      <View style={styles.header}>
        <Text style={styles.title}>Invoice</Text>
        <Text style={styles.invoiceCode}>#{invoice.invoice_code}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Items</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} x ${Number(item.price).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              ${(item.quantity * item.price).toFixed(2)}
            </Text>
            {item.media_urls && (item.media_urls as string[]).length > 0 && (
              <View style={styles.mediaContainer}>
                {(item.media_urls as string[]).map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.mediaImage}
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Tax ({invoice.tax_rate || 0}%)
          </Text>
          <Text style={styles.summaryValue}>${taxAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={styles.summaryValue}>
            -${(invoice.discount_amount || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>
            ${(invoice.delivery_fee || 0).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.detailText}>
          Payment Status:{' '}
          <Text style={{ fontWeight: 'bold' }}>{invoice.payment_status}</Text>
        </Text>
        <Text style={styles.detailText}>
          Escrow Status:{' '}
          <Text style={{ fontWeight: 'bold' }}>{invoice.escrow_status}</Text>
        </Text>
      </View>

      {!isMerchant && canPay && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, isPaying && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isPaying}
          >
            <Text style={styles.buttonText}>
              {isPaying ? 'Processing...' : 'Pay with Wallet'}
            </Text>
          </TouchableOpacity>
          {invoice.escrow_status === 'pending' && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                isPaying && styles.buttonDisabled,
              ]}
              onPress={() => router.push(`/invoice/escrow/${id}`)}
              disabled={isPaying}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Pay with Escrow
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setShareModalVisible(true)}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Share Payment Link
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isShareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShareModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Payment Link</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => handleShare('whatsapp')}
            >
              <MessageSquare size={24} color={colors.success} />
              <Text style={styles.shareOptionText}>Share on WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => handleShare('copy')}
            >
              <Copy size={24} color={colors.primary} />
              <Text style={styles.shareOptionText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => handleShare('generic')}
            >
              <Share2 size={24} color={colors.textSecondary} />
              <Text style={styles.shareOptionText}>More Options...</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => handleShare('pdf')}
            >
              <FileDown size={24} color={colors.danger} />
              <Text style={styles.shareOptionText}>Export as PDF</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: { padding: 24, paddingBottom: 100 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    header: { paddingTop: 40, marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    invoiceCode: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
    section: { marginBottom: 24 },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    itemContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemTextContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemDescription: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
      fontWeight: '500',
    },
    itemDetails: { fontSize: 14, color: colors.textSecondary },
    itemTotal: {
      fontSize: 16,
      color: colors.text,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    mediaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    mediaImage: { width: 60, height: 60, borderRadius: 8 },
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
    totalRow: { borderBottomWidth: 0, marginTop: 8 },
    totalLabel: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    totalValue: { fontSize: 22, color: colors.primary, fontWeight: 'bold' },
    detailText: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { color: colors.primary },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      padding: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    shareOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 16,
    },
    shareOptionText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
  });
