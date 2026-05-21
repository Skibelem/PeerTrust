import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyWalletFunding } from '../services/walletFundingService'
import { formatNGN, formatPTC } from '../utils/moneyFormatters'
import {
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowRight,
  Wallet,
} from 'lucide-react'

export default function WalletFundingCallbackPage() {
  const [searchParams] = useSearchParams()
  const { retryFetchUserData } = useAuth()

  const hasRun = useRef(false)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const reference = searchParams.get('reference')

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    async function runVerification() {
      try {
        if (!reference) {
          setError({ message: 'Payment reference was not found.' })
          setLoading(false)
          return
        }

        const verifyResult = await verifyWalletFunding(reference)

        if (!verifyResult.success) {
          setError(verifyResult.error || { message: 'Payment verification failed.' })
          setLoading(false)
          return
        }

        setResult(verifyResult.data)
        setLoading(false)

        // Refresh dashboard balance without blocking this success page
        retryFetchUserData().catch((syncErr) => {
          console.warn('Wallet sync after funding failed:', syncErr)
        })
      } catch (err) {
        setError({
          message: err.message || 'Something went wrong while verifying payment.',
        })
        setLoading(false)
      }
    }

    runVerification()
  }, [reference, retryFetchUserData])

  const amount = Number(result?.amount || result?.result?.amount || 0)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
        {loading && (
          <>
            <Loader className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Verifying Payment
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Please wait while we confirm your account funding.
            </p>
          </>
        )}

        {!loading && error && (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Funding Failed
            </h1>
            <p className="text-sm text-red-600 mt-2">
              {error.message || 'Unable to verify payment.'}
            </p>

            <Link
              to="/wallet/fund"
              className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
            >
              Try Again
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}

        {!loading && !error && result && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">
              Account Funded Successfully
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              Your payment has been verified and added to your available amount.
            </p>

            <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">
                Amount Added
              </p>

              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatPTC(amount)}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Equivalent: {formatNGN(amount)}
              </p>
            </div>

            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
            >
              <Wallet className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}