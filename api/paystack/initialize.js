export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      return res.status(500).json({
        success: false,
        message: 'PAYSTACK_SECRET_KEY is missing on the server.',
      })
    }

    const { email, amount, reference, callback_url, metadata } = req.body || {}

    if (!email || !amount || !reference) {
      return res.status(400).json({
        success: false,
        message: 'email, amount, and reference are required.',
      })
    }

    const amountInKobo = Math.round(Number(amount) * 100)

    if (!Number.isInteger(amountInKobo) || amountInKobo <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0.',
      })
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        callback_url,
        metadata,
        currency: 'NGN',
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      return res.status(response.status || 400).json({
        success: false,
        message: data.message || 'Paystack initialization failed.',
        paystack: data,
      })
    }

    return res.status(200).json({
      success: true,
      data: data.data,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while initializing Paystack payment.',
    })
  }
}