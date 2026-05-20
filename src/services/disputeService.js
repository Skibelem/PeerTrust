import { supabase } from '../lib/supabaseClient'

export async function raiseTradeDispute(trade, currentProfile, reason, message) {
  if (!currentProfile?.id) {
    return {
      success: false,
      error: { message: 'You must be logged in to raise a dispute.' },
    }
  }

  if (currentProfile.id !== trade.buyer_id && currentProfile.id !== trade.seller_id) {
    return {
      success: false,
      error: { message: 'Only the buyer or seller can raise a dispute on this trade.' },
    }
  }

  if (!['funded', 'delivered'].includes(trade.status)) {
    return {
      success: false,
      error: {
        message: `Dispute cannot be raised at this stage. Current status: "${trade.status}".`,
      },
    }
  }

  if (!reason) {
    return {
      success: false,
      error: { message: 'Please select a dispute reason.' },
    }
  }

  if (!message || message.trim().length < 10) {
    return {
      success: false,
      error: { message: 'Please explain the dispute with at least 10 characters.' },
    }
  }

  const { data, error } = await supabase.rpc('raise_trade_dispute', {
    p_trade_id: trade.id,
    p_reason: reason,
    p_message: message.trim(),
  })

  if (error) {
    return {
      success: false,
      error: {
        message: `Dispute creation failed: ${error.message}`,
        ...error,
      },
    }
  }

  return {
    success: true,
    data,
  }
}