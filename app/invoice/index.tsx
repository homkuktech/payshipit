import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { DollarSign, FileText, Clock } from 'lucide-react-native';

interface MonthlyStat {
  month_label: string;
  invoice_count: number;
  monthly_revenue: number;
}

interface StatusStat {
  name: string;
  count: number;
}

export default function MerchantDashboardScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        // Call the new, more efficient function
        const { data, error } = await supabase.rpc('get_merchant_dashboard_stats');

        if (error) throw error;

        if (data) {
          setMonthlyStats(data.monthly_stats || []);
          setTotalRevenue(data.total_revenue || 0);
          setPendingAmount(data.pending_amount || 0);
          setTotalInvoices(data.total_invoices || 0);
          setStatusBreakdown(data.status_breakdown || []);
        }
      } catch (error) {
        console.error('Error fetching invoice stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [profile]);

  const styles = getStyles(colors);
  const screenWidth = Dimensions.get('window').width;

  const chartData = {
    labels: monthlyStats.map((s) => s.month_label),
    datasets: [
      {
        data: monthlyStats.map(s => s.invoice_count),
      },
    ],
  };

  const revenueChartData = {
    labels: monthlyStats.map((s) => s.month_label),
    datasets: [
      {
        data: monthlyStats.map(s => Number(s.monthly_revenue)),
        color: (opacity = 1) => `rgba(${hexToRgb(colors.success)}, ${opacity})`,
      },
    ],
  };
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.textSecondary)}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  // Helper to convert hex to rgb for chart color opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  };

  const statusColors: { [key: string]: string } = {
    paid: colors.success,
    pending: colors.warning,
    failed: colors.error,
  };

  const pieChartData = statusBreakdown.map((status, index) => ({
    name: `% ${status.name}`,
    population: status.count,
    color: statusColors[status.name] || colors.textSecondary,
    legendFontColor: colors.textSecondary,
    legendFontSize: 14,
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <DollarSign size={24} color={colors.success} />
          <Text style={styles.statValue}>${totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={24} color={colors.warning} />
          <Text style={styles.statValue}>${pendingAmount.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
      <View style={[styles.statCard, styles.fullWidthCard]}>
        <FileText size={24} color={colors.primary} />
        <Text style={styles.statValue}>{totalInvoices}</Text>
        <Text style={styles.statLabel}>Total Invoices Created</Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Invoices (Last 12 Months)</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ height: 220 }} />
        ) : (
          <BarChart
            data={chartData}
            width={screenWidth - 48} // screen width - padding
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
            showValuesOnTopOfBars
          />
        )}
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Revenue ($)</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ height: 220 }} />
        ) : (
          <LineChart
            data={revenueChartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            fromZero
            yAxisLabel="$"
            yAxisInterval={1}
          />
        )}
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Invoice Status Breakdown</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ height: 220 }} />
        ) : pieChartData.length > 0 ? (
          <PieChart
            data={pieChartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'15'}
          />
        ) : <Text style={styles.noDataText}>No invoice data to display.</Text>}
      </View>
      {/* You can add more analytic cards here */}
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      paddingTop: 60,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 24,
      marginBottom: 16,
      gap: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    fullWidthCard: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
    statValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    chartContainer: {
      marginHorizontal: 24,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    noDataText: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 40,
    },
  });