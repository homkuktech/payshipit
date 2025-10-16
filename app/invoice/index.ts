import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Release Escrow function initialized');

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      throw new Error('Order ID is required.');
    }

    // Create a Supabase client with the user's auth token
    const authHeader = req.headers.get('Authorization')!;
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the currently authenticated user
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a service role client to bypass RLS for trusted operations
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch the order and verify the user is the sender
    const { data: order, error: orderError } = await adminSupabaseClient
      .from('orders')
      .select('*, rider:rider_id(wallet_balance)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found.');
    }

    if (order.sender_id !== user.id) {
      throw new Error('Only the sender can confirm delivery.');
    }

    if (order.status === 'completed') {
      throw new Error('This order has already been completed.');
    }

    // 2. Update the rider's wallet balance
    const riderWalletBalance = (order.rider as any)?.wallet_balance ?? 0;
    const newRiderBalance = riderWalletBalance + order.delivery_fee;

    const { error: balanceError } = await adminSupabaseClient
      .from('profiles')
      .update({ wallet_balance: newRiderBalance })
      .eq('id', order.rider_id);

    if (balanceError) {
      throw new Error(`Failed to update rider's wallet: ${balanceError.message}`);
    }

    // 3. Update the order status to 'completed'
    const { error: statusError } = await adminSupabaseClient
      .from('orders')
      .update({ status: 'completed', escrow_status: 'released' })
      .eq('id', orderId);

    if (statusError) {
      // Note: In a real-world scenario, you'd want to handle rollback here.
      throw new Error(`Failed to update order status: ${statusError.message}`);
    }

    // 4. Create a transaction record for the rider's payout
    const { error: transactionError } = await adminSupabaseClient
      .from('transactions')
      .insert({
        user_id: order.rider_id,
        order_id: order.id,
        type: 'payout',
        amount: order.delivery_fee,
        status: 'successful',
        payment_provider: 'escrow_release',
      });

    if (transactionError) {
      console.error('Failed to create transaction log, but funds were released.');
    }

    return new Response(JSON.stringify({ message: 'Funds released successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});