import { supabase } from '../lib/supabaseClient'

export async function getDisputedTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      id,
      buyer_id,
      seller_id,
      offer_id,
      amount,
      platform_fee,
      seller_receives,
      status,
      delivery_message,
      created_at,
      updated_at,
      buyer:buyer_id ( full_name, email ),
      seller:seller_id ( full_name, email ),
      offer:offer_id ( title, category ),
      disputes (
        id,
        reason,
        message,
        status,
        admin_decision,
        created_at,
        raised_by,
        raised_by_id
      )
    `)
    .eq('status', 'disputed')
    .order('updated_at', { ascending: false })

  return { data, error }
}

export async function adminReleaseDisputedTrade(tradeId) {
  const { data, error } = await supabase.rpc('admin_release_disputed_trade', {
    p_trade_id: tradeId,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: `Admin release failed: ${error.message}`,
        ...error,
      },
    }
  }

  return { success: true, data }
}

export async function adminRefundDisputedTrade(tradeId) {
  const { data, error } = await supabase.rpc('admin_refund_disputed_trade', {
    p_trade_id: tradeId,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: `Admin refund failed: ${error.message}`,
        ...error,
      },
    }
  }

  return { success: true, data }
}