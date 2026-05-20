import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import { verifyTradePayment } from '../services/paymentService'

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function verify() {
      setLoading(true)
      setError(null)

      const response = await verifyTradePayment(reference)

      if (!response.success) {
        setError(response.error)
        setLoading(false)
        return
      }

      setResult(response)
      setLoading(false)
    }

    verify()
  }, [reference])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm max-w-md w-full text-center">
        {loading && (
          <>
            <Loader className="h-10 w-10 text-teal-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Verifying payment
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Please wait while we confirm your Paystack payment.
            </p>
          </>
        )}

        {!loading && error && (
          <>
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Payment verification failed
            </h1>
            <p className="text-sm text-red-600 mt-2 break-all">
              {error.message || JSON.stringify(error)}
            </p>

            <Link
              to="/trades"
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Trades
            </Link>
          </>
        )}

        {!loading && result?.isSuccessful && (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Payment verified successfully
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Your Paystack test payment has been confirmed and the trade has been funded.
            </p>
            <p className="text-xs text-slate-400 mt-3 font-mono break-all">
              Reference: {reference}
            </p>

            <Link
              to="/trades"
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm"
            >
              Back to Trades
            </Link>
          </>
        )}

        {!loading && result && !result.isSuccessful && (
          <>
            <AlertCircle className="h-10 w-10 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Payment not successful
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Paystack returned a non-successful status for this transaction.
            </p>

            <Link
              to="/trades"
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
            >
              Back to Trades
            </Link>
          </>
        )}
      </div>
    </div>
  )
}