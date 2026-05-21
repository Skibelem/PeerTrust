import { supabase } from '../lib/supabaseClient'

export async function getSellerPayouts(status = 'pending') {
  let query = supabase
    .from('seller_payouts')
    .select(`
      id,
      trade_id,
      seller_id,
      amount,
      currency,
      status,
      payment_method,
      admin_note,
      paid_at,
      created_at,
      updated_at,
      seller:seller_id (
        full_name,
        email,
        phone,
        role
      ),
      trade:trade_id (
        id,
        amount,
        seller_receives,
        status,
        offer:offer_id (
          title,
          category
        ),
        buyer:buyer_id (
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  return { data, error }
}

export async function markSellerPayoutPaid(payoutId, adminNote = '') {
  if (!payoutId) {
    return {
      success: false,
      error: { message: 'Payout ID is required.' },
    }
  }

  const { data, error } = await supabase.rpc('admin_mark_seller_payout_paid', {
    p_payout_id: payoutId,
    p_admin_note: adminNote || null,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: `Mark payout paid failed: ${error.message}`,
        ...error,
      },
    }
  }

  return {
    success: true,
    data,
  }
}