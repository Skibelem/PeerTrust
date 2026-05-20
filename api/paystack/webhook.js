import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // Verify Paystack signature
    const signature = req.headers['x-paystack-signature']
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest('hex')

    if (hash !== signature) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Paystack signature.',
      })
    }

    const event = req.body

    // We only care about successful charges for now
    if (event.event !== 'charge.success') {
      return res.status(200).json({
        success: true,
        message: `Webhook ignored: ${event.event}`,
      })
    }

    const paystackData = event.data
    const reference = paystackData?.reference

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Webhook has no payment reference.',
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. Find payment record
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
        message: 'Payment record not found.',
      })
    }

    // 2. Find trade
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

    // 3. Validate Paystack status
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
        .eq('id', payment.id)

      return res.status(200).json({
        success: true,
        message: `Payment was not successful. Paystack status: ${paystackData.status}`,
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

    // 5. Mark payment successful
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'successful',
        provider_transaction_id: String(paystackData.id || ''),
        provider_response: paystackData,
        paid_at: paystackData.paid_at || new Date().toISOString(),
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

    // 6. If trade already processed, do not duplicate escrow records
    if (trade.status !== 'created') {
      return res.status(200).json({
        success: true,
        message: `Webhook verified. Trade already processed with status: ${trade.status}`,
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

    // 8. Create escrow record
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
      message: 'Webhook processed successfully. Payment verified and trade funded.',
      reference,
      trade: updatedTrade,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while processing Paystack webhook.',
    })
  }
}