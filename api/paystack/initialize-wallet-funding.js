import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

function json(res, status, payload) {
  return res.status(status).json(payload)
}

function generateReference() {
  return `PTW-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, {
        success: false,
        error: 'Supabase environment variables are missing.',
      })
    }

    if (!PAYSTACK_SECRET_KEY) {
      return json(res, 500, {
        success: false,
        error: 'PAYSTACK_SECRET_KEY is missing.',
      })
    }

    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return json(res, 401, {
        success: false,
        error: 'Authentication token is required.',
      })
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return json(res, 401, {
        success: false,
        error: authError?.message || 'Invalid user session.',
      })
    }

    const { amount } = req.body || {}
    const parsedAmount = Number(amount)

    if (!parsedAmount || parsedAmount <= 0) {
      return json(res, 400, {
        success: false,
        error: 'Enter a valid funding amount.',
      })
    }

    if (parsedAmount < 100) {
      return json(res, 400, {
        success: false,
        error: 'Minimum funding amount is ₦100.',
      })
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return json(res, 404, {
        success: false,
        error: profileError?.message || 'User profile not found.',
      })
    }

    const { data: wallet } = await adminClient
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const reference = generateReference()

    const { error: depositError } = await adminClient
      .from('wallet_deposits')
      .insert({
        user_id: user.id,
        wallet_id: wallet?.id || null,
        amount: parsedAmount,
        currency: 'NGN',
        provider: 'paystack',
        reference,
        status: 'pending',
      })

    if (depositError) {
      return json(res, 500, {
        success: false,
        error: depositError.message,
      })
    }

    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : '')

    const callbackUrl = `${origin}/wallet/funding/callback?reference=${encodeURIComponent(
      reference
    )}`

    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email || user.email,
          amount: Math.round(parsedAmount * 100),
          reference,
          callback_url: callbackUrl,
          metadata: {
            type: 'wallet_funding',
            user_id: user.id,
            profile_name: profile.full_name,
          },
        }),
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData?.status) {
      return json(res, 500, {
        success: false,
        error: paystackData?.message || 'Paystack initialization failed.',
      })
    }

    return json(res, 200, {
      success: true,
      reference,
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code,
    })
  } catch (err) {
    return json(res, 500, {
      success: false,
      error: err.message || 'Wallet funding initialization failed.',
    })
  }
}