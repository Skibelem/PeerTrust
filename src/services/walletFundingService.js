import { supabase } from '../lib/supabaseClient'

export async function initializeWalletFunding(amount) {
  const numericAmount = Number(amount)

  if (!numericAmount || numericAmount <= 0) {
    return {
      success: false,
      error: { message: 'Enter a valid funding amount.' },
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return {
      success: false,
      error: { message: 'You must be logged in to fund your account.' },
    }
  }

  const response = await fetch('/api/paystack/initialize-wallet-funding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      amount: numericAmount,
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    return {
      success: false,
      error: { message: data.error || 'Wallet funding initialization failed.' },
    }
  }

  return {
    success: true,
    reference: data.reference,
    authorizationUrl: data.authorizationUrl,
  }
}

export async function verifyWalletFunding(reference) {
  if (!reference) {
    return {
      success: false,
      error: { message: 'Payment reference is missing.' },
    }
  }

  const response = await fetch(
    `/api/paystack/verify-wallet-funding?reference=${encodeURIComponent(reference)}`
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    return {
      success: false,
      error: { message: data.error || 'Wallet funding verification failed.' },
    }
  }

  return {
    success: true,
    data,
  }
}