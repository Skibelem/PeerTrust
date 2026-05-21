import { supabase } from '../lib/supabaseClient'

export async function getTradeMoneySummary(tradeId) {
  if (!tradeId) {
    return {
      data: null,
      error: { message: 'Trade ID is required.' },
    }
  }

  const [paymentsResult, escrowResult, payoutResult, refundResult] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id,
        provider,
        reference,
        amount,
        currency,
        status,
        provider_transaction_id,
        paid_at,
        verified_at,
        created_at
      `)
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('escrow_transactions')
      .select(`
        id,
        amount,
        fee,
        status,
        created_at,
        updated_at
      `)
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('seller_payouts')
      .select(`
        id,
        amount,
        currency,
        status,
        payment_method,
        admin_note,
        paid_at,
        created_at,
        updated_at
      `)
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('buyer_refunds')
      .select(`
        id,
        amount,
        currency,
        status,
        refund_method,
        admin_note,
        processed_at,
        created_at,
        updated_at
      `)
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const error =
    paymentsResult.error ||
    escrowResult.error ||
    payoutResult.error ||
    refundResult.error

  if (error) {
    return { data: null, error }
  }

  return {
    data: {
      payment: paymentsResult.data,
      escrow: escrowResult.data,
      payout: payoutResult.data,
      refund: refundResult.data,
    },
    error: null,
  }
}