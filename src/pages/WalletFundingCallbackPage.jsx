import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyWalletFunding } from '../services/walletFundingService'
import { formatNGN, formatPTC } from '../utils/moneyFormatters'
import { CheckCircle, Info, Loader, ArrowRight, Wallet } from 'lucide-react'


export default function WalletFundingCallbackPage() {
  const [searchParams] = useSearchParams()
  const { retryFetchUserData } = useAuth()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const reference = searchParams.get('reference') || searchParams.get('trxref')

  const inFlightRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false

    async function runVerification() {
      if (!reference) {
        setError({ message: 'Payment reference was not found.' })
        setLoading(false)
        return
      }

      const successKey = `wallet_funding_verified_${reference}`
      const pendingKey = `wallet_funding_verifying_${reference}`
      const fallbackKey = `wallet_funding_fallback_shown_${reference}`

      const showFallbackIfStillLoading = () => {
        if (cancelled) return
        if (sessionStorage.getItem(fallbackKey)) return
        sessionStorage.setItem(fallbackKey, '1')

        setError({
          message:
            'Payment verification is taking longer than expected. If your Available Amount has updated, your funding was successful.',
          isFallback: true,
        })
        setLoading(false)
      }

      try {
        const cachedSuccess = sessionStorage.getItem(successKey)

        // Only show fallback after 15-20s (never at 4s)
        const pendingTimeout = setTimeout(showFallbackIfStillLoading, 18000)

        if (cachedSuccess) {
          const parsed = JSON.parse(cachedSuccess)
          clearTimeout(pendingTimeout)

          if (!cancelled) {
            setResult(parsed)
            setError(null)
            setLoading(false)
          }

          // Sync in background; do not block UI.
          retryFetchUserData().catch((syncErr) => {
            console.warn('Wallet sync after cached funding failed:', syncErr)
          })
          return
        }

        const pendingStartedAt = sessionStorage.getItem(pendingKey)

        if (pendingStartedAt) {
          const age = Date.now() - Number(pendingStartedAt)

          // Another tab/page started verification. Do not hammer the API.
          // We still allow the shared fallback timer to kick in (after 18s).
          if (age < 600000) {
            return
          }

          // Old pending lock; remove and try again.
          sessionStorage.removeItem(pendingKey)
        }

        // In-memory single-flight per reference (prevents duplicate calls inside SPA)
        if (inFlightRef.current.has(reference)) {
          const verifyResult = await inFlightRef.current.get(reference)
          clearTimeout(pendingTimeout)
          if (cancelled) return
          if (!verifyResult?.success) {
            setError(verifyResult?.error || { message: 'Payment verification failed.' })
            setLoading(false)
            return
          }

          const data = verifyResult.data
          setResult(data)
          setError(null)
          setLoading(false)
          retryFetchUserData().catch((syncErr) => {
            console.warn('Wallet sync after funding failed:', syncErr)
          })
          return
        }

        sessionStorage.setItem(pendingKey, String(Date.now()))

        const verifyPromise = (async () => {
          const verifyResult = await verifyWalletFunding(reference)
          return verifyResult
        })()

        inFlightRef.current.set(reference, verifyPromise)

        const verifyResult = await verifyPromise

        inFlightRef.current.delete(reference)
        sessionStorage.removeItem(pendingKey)
        clearTimeout(pendingTimeout)

        if (cancelled) return

        if (!verifyResult?.success) {
          setError(verifyResult?.error || { message: 'Payment verification failed.' })
          setLoading(false)
          return
        }

        const data = verifyResult.data
        // Treat alreadyProcessed/already_processed as success too.
        const backendSaysAlreadyProcessed =
          verifyResult.alreadyProcessed === true ||
          data?.already_processed === true ||
          data?.alreadyProcessed === true

        if (backendSaysAlreadyProcessed || verifyResult.success) {
          sessionStorage.setItem(successKey, JSON.stringify(data))
          setResult(data)
          setError(null)
          setLoading(false)
          // Sync in background only.
          retryFetchUserData().catch((syncErr) => {
            console.warn('Wallet sync after funding failed:', syncErr)
          })
          return
        }

        // Fallback: backend says success but we didn't receive expected data
        sessionStorage.setItem(successKey, JSON.stringify(data))
        setResult(data)
        setError(null)
        setLoading(false)
      } catch (err) {
        sessionStorage.removeItem(pendingKey)
        if (!cancelled) {
          setError({ message: err.message || 'Something went wrong while verifying payment.' })
          setLoading(false)
        }
      }
    }

    runVerification()

    return () => {
      cancelled = true
    }
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
            <Info className="h-12 w-12 text-teal-500 mx-auto mb-5" />

            <h1 className="text-xl font-extrabold text-slate-900">
              Verification Taking Longer
            </h1>

            <p className="text-sm text-slate-600 mt-2">
              {error.message || 'Payment verification is taking longer than expected.'}
            </p>

            {error.isFallback ? (
              <p className="text-xs text-slate-500 mt-3">
                Check your dashboard. If your Available Amount has updated, your funding was successful.
              </p>
            ) : null}


            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
            >
              <Wallet className="h-4 w-4" />
              Back to Dashboard
            </Link>

            <Link
              to="/wallet/fund"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl"
            >
              Try Another Funding
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