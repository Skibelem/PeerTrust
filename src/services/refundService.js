import { supabase } from '../lib/supabaseClient'

export async function getBuyerRefunds(status = 'pending') {
  let query = supabase
    .from('buyer_refunds')
    .select(`
      id,
      trade_id,
      buyer_id,
      payment_id,
      amount,
      currency,
      status,
      refund_method,
      admin_note,
      processed_at,
      created_at,
      updated_at,
      buyer:buyer_id (
        full_name,
        email,
        phone,
        role
      ),
      payment:payment_id (
        reference,
        provider,
        provider_transaction_id,
        status,
        amount
      ),
      trade:trade_id (
        id,
        amount,
        status,
        offer:offer_id (
          title,
          category
        ),
        seller:seller_id (
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

export async function markBuyerRefundProcessed(refundId, adminNote = '') {
  if (!refundId) {
    return {
      success: false,
      error: { message: 'Refund ID is required.' },
    }
  }

  const { data, error } = await supabase.rpc('admin_mark_buyer_refund_processed', {
    p_refund_id: refundId,
    p_admin_note: adminNote || null,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: `Mark refund processed failed: ${error.message}`,
        ...error,
      },
    }
  }

  return {
    success: true,
    data,
  }
}