import { supabase } from '../lib/supabaseClient'

async function readJsonSafely(response) {
  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    return {
      success: false,
      error:
        text?.slice(0, 200) ||
        `Server returned a non-JSON response. Status: ${response.status}`,
    }
  }
}

export async function initializeWalletFunding(amount) {
  try {
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

    const data = await readJsonSafely(response)

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: {
          message:
            data.error ||
            data.message ||
            `Wallet funding initialization failed. Status: ${response.status}`,
        },
      }
    }

    return {
      success: true,
      reference: data.reference,
      authorizationUrl: data.authorizationUrl,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        message: err.message || 'Wallet funding initialization failed.',
      },
    }
  }
}

export async function verifyWalletFunding(reference) {
  try {
    if (!reference) {
      return {
        success: false,
        error: { message: 'Payment reference is missing.' },
      }
    }

    const response = await fetch(
      `/api/paystack/verify-wallet-funding?reference=${encodeURIComponent(reference)}`
    )

    const data = await readJsonSafely(response)

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: {
          message:
            data.error ||
            data.message ||
            `Wallet funding verification failed. Status: ${response.status}`,
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        message: err.message || 'Wallet funding verification failed.',
      },
    }
  }
}