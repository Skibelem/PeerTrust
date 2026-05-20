import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!paystackSecretKey) {
      return res.status(500).json({
        success: false,
        message: 'PAYSTACK_SECRET_KEY is missing on the server.',
      })
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({
        success: false,
        message: 'Supabase server credentials are missing.',
      })
    }

    const { reference } = req.query

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required.',
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. Verify payment from Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const verifyResult = await verifyResponse.json()

    if (!verifyResponse.ok || !verifyResult.status) {
      return res.status(verifyResponse.status || 400).json({
        success: false,
        message: verifyResult.message || 'Paystack verification failed.',
        paystack: verifyResult,
      })
    }

    const paystackData = verifyResult.data

    if (paystackData.status !== 'success') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          provider_transaction_id: String(paystackData.id || ''),
          provider_response: paystackData,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference)

      return res.status(400).json({
        success: false,
        message: `Payment was not successful. Paystack status: ${paystackData.status}`,
        paystack: paystackData,
      })
    }

    // 2. Get payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .maybeSingle()

    if (paymentError) {
      return res.status(500).json({
        success: false,
        message: `Payment lookup failed: ${paymentError.message}`,
        error: paymentError,
      })
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found in database.',
      })
    }

    // 3. Get trade
    const { data: trade, error: tradeError } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('id', payment.trade_id)
      .maybeSingle()

    if (tradeError) {
      return res.status(500).json({
        success: false,
        message: `Trade lookup failed: ${tradeError.message}`,
        error: tradeError,
      })
    }

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found for this payment.',
      })
    }

    // 4. Validate amount
    const expectedAmountInKobo = Math.round(Number(payment.amount) * 100)
    const paidAmountInKobo = Number(paystackData.amount)

    if (paidAmountInKobo !== expectedAmountInKobo) {
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch. Expected ${expectedAmountInKobo}, got ${paidAmountInKobo}.`,
      })
    }

    // 5. Update payment as successful
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'successful',
        provider_transaction_id: String(paystackData.id || ''),
        provider_response: paystackData,
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      return res.status(500).json({
        success: false,
        message: `Payment update failed: ${paymentUpdateError.message}`,
        error: paymentUpdateError,
      })
    }

    // 6. If trade is already funded/completed, do not duplicate escrow records
    if (trade.status !== 'created') {
      return res.status(200).json({
        success: true,
        message: `Payment verified. Trade is already ${trade.status}.`,
        payment,
        trade,
        paystackData,
        alreadyProcessed: true,
      })
    }

    // 7. Mark trade as funded
    const { data: updatedTrade, error: tradeUpdateError } = await supabaseAdmin
      .from('trades')
      .update({
        status: 'funded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trade.id)
      .select()
      .single()

    if (tradeUpdateError) {
      return res.status(500).json({
        success: false,
        message: `Trade funding update failed: ${tradeUpdateError.message}`,
        error: tradeUpdateError,
      })
    }

    // 8. Create escrow transaction record
    const { error: escrowInsertError } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        trade_id: trade.id,
        buyer_id: trade.buyer_id,
        seller_id: trade.seller_id,
        amount: trade.amount,
        fee: Number(trade.platform_fee) || 0,
        status: 'held',
      })

    if (escrowInsertError) {
      return res.status(500).json({
        success: false,
        message: `Escrow transaction creation failed: ${escrowInsertError.message}`,
        error: escrowInsertError,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and trade funded successfully.',
      payment_reference: reference,
      trade: updatedTrade,
      paystackData,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while verifying and funding trade.',
    })
  }
}