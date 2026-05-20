export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { reference } = req.query

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required.',
      })
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok || !data.status) {
      return res.status(response.status || 400).json({
        success: false,
        message: data.message || 'Paystack verification failed.',
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
      message: error.message || 'Server error while verifying Paystack payment.',
    })
  }
}