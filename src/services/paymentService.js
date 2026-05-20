import { supabase } from '../lib/supabaseClient'

function generatePaymentReference(tradeId) {
  const shortTradeId = String(tradeId || '').slice(0, 8)
  return `PT-${Date.now()}-${shortTradeId}`
}

export async function initializeTradePayment(trade, currentProfile) {
  if (!currentProfile?.id) {
    return {
      success: false,
      error: { message: 'You must be logged in to pay for this trade.' },
    }
  }

  if (currentProfile.id !== trade.buyer_id) {
    return {
      success: false,
      error: { message: 'Only the buyer can pay for this trade.' },
    }
  }

  if (trade.status !== 'created') {
    return {
      success: false,
      error: { message: `Payment can only be made when trade status is "created". Current status: "${trade.status}".` },
    }
  }

  const amount = Number(trade.amount)

  if (!amount || amount <= 0) {
    return {
      success: false,
      error: { message: 'Invalid trade amount.' },
    }
  }

  const reference = generatePaymentReference(trade.id)

  // 1. Create local pending payment record
  const { data: payment, error: paymentInsertError } = await supabase
    .from('payments')
    .insert({
      trade_id: trade.id,
      buyer_id: currentProfile.id,
      provider: 'paystack',
      reference,
      amount,
      currency: 'NGN',
      status: 'pending',
    })
    .select()
    .single()

  if (paymentInsertError) {
    return {
      success: false,
      error: {
        message: `Payment record creation failed: ${paymentInsertError.message}`,
        ...paymentInsertError,
      },
    }
  }

  // 2. Ask our server endpoint to initialize Paystack transaction
  const callbackUrl = `${window.location.origin}/payment/callback?reference=${encodeURIComponent(reference)}`

  const response = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: currentProfile.email || trade.buyer?.email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata: {
        trade_id: trade.id,
        buyer_id: currentProfile.id,
        payment_id: payment.id,
        source: 'peertrust_trade_payment',
      },
    }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    return {
      success: false,
      error: {
        message: result.message || 'Paystack payment initialization failed.',
        paystack: result.paystack || result,
      },
    }
  }

  const paystackData = result.data

  // 3. Save authorization URL/access code from Paystack
  const { error: updatePaymentError } = await supabase
    .from('payments')
    .update({
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      provider_response: paystackData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  if (updatePaymentError) {
    return {
      success: false,
      error: {
        message: `Payment update failed: ${updatePaymentError.message}`,
        ...updatePaymentError,
      },
    }
  }

  return {
    success: true,
    payment,
    reference,
    authorizationUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
  }
}