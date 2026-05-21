import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

function json(res, status, payload) {
  return res.status(status).json(payload)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, {
        success: false,
        error: 'Supabase server environment variables are missing.',
      })
    }

    if (!PAYSTACK_SECRET_KEY) {
      return json(res, 500, {
        success: false,
        error: 'PAYSTACK_SECRET_KEY is missing.',
      })
    }

    const { reference } = req.query

    if (!reference) {
      return json(res, 400, {
        success: false,
        error: 'Payment reference is required.',
      })
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Check our database FIRST before disturbing Paystack.
    // If this deposit has already been completed, return success immediately.
    const { data: existingDeposit, error: depositLookupError } = await adminClient
      .from('wallet_deposits')
      .select('id, reference, amount, status, verified_at, paid_at')
      .eq('reference', reference)
      .maybeSingle()

    if (depositLookupError) {
      return json(res, 500, {
        success: false,
        error: depositLookupError.message,
      })
    }

    if (!existingDeposit) {
      return json(res, 404, {
        success: false,
        error: 'Wallet deposit record not found.',
      })
    }

    if (existingDeposit.status === 'successful') {
      return json(res, 200, {
        success: true,
        reference,
        amount: Number(existingDeposit.amount || 0),
        alreadyProcessed: true,
        result: {
          success: true,
          already_processed: true,
          deposit_id: existingDeposit.id,
          amount: Number(existingDeposit.amount || 0),
        },
      })
    }

    // 2. Only call Paystack when the deposit is still pending.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData?.status) {
      return json(res, 400, {
        success: false,
        error: paystackData?.message || 'Paystack verification failed.',
      })
    }

    const tx = paystackData.data

    if (tx.status !== 'success') {
      return json(res, 400, {
        success: false,
        error: `Payment was not successful. Status: ${tx.status}`,
        paystackStatus: tx.status,
      })
    }

    // 3. Complete wallet deposit atomically in Supabase.
    const { data, error } = await adminClient.rpc('complete_wallet_deposit', {
      p_reference: reference,
      p_provider_transaction_id: String(tx.id || ''),
    })

    if (error) {
      return json(res, 500, {
        success: false,
        error: error.message,
      })
    }

    // 4. Treat already_processed from RPC as success too.
    return json(res, 200, {
      success: true,
      reference,
      amount: Number(tx.amount || 0) / 100,
      alreadyProcessed: Boolean(data?.already_processed),
      result: data,
    })
  } catch (err) {
    return json(res, 500, {
      success: false,
      error: err.message || 'Wallet funding verification failed.',
    })
  }
}