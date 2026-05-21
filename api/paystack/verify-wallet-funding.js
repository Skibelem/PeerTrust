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

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Prevent repeated Paystack verification: if this reference was already processed successfully,
    // return early and do not call Paystack again.
    const { data: existingDeposit, error: depositLookupError } = await adminClient
      .from('wallet_deposits')
      .select('id, reference, amount, status')
      .eq('reference', reference)
      .maybeSingle()

    if (depositLookupError) {
      return json(res, 500, {
        success: false,
        error: depositLookupError.message,
      })
    }

    if (existingDeposit?.status === 'successful') {
      return json(res, 200, {
        success: true,
        reference,
        amount: existingDeposit.amount,
        alreadyProcessed: true,
      })
    }

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

    return json(res, 200, {
      success: true,
      reference,
      amount: tx.amount / 100,
      result: data,
    })
  } catch (err) {
    return json(res, 500, {
      success: false,
      error: err.message || 'Wallet funding verification failed.',
    })
  }
}