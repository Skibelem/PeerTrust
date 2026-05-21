import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyWalletFunding } from '../services/walletFundingService'
import { formatNGN, formatPTC } from '../utils/moneyFormatters'
import { CheckCircle, Info, Loader, Wallet } from 'lucide-react'

export default function WalletFundingCallbackPage() {
  const [searchParams] = useSearchParams()
  const { retryFetchUserData } = useAuth()

  const [status, setStatus] = useState('verifying') // verifying | success | timeout | error
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const hasVerifiedOnceRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function runOnce() {
      if (!reference) {
        setStatus('error')
        setErrorMessage('Payment confirmation pending')
        return
      }

      if (hasVerifiedOnceRef.current) return
      hasVerifiedOnceRef.current = true

      // Optional cache: if we already confirmed earlier in this session, skip verification.
      const successKey = `wallet_funding_verified_${reference}`
      const cachedSuccess = sessionStorage.getItem(successKey)
      if (cachedSuccess) {
        const parsed = JSON.parse(cachedSuccess)
        if (!cancelled) {
          setResult(parsed)
          setStatus('success')
        }

        // Background sync only.
        retryFetchUserData().catch((syncErr) => {
          console.warn('Wallet sync after cached funding failed:', syncErr)
        })
        return
      }

      const verifyPromise = verifyWalletFunding(reference)

      // Stop waiting for UX after ~6 seconds.
      const timeoutMs = 6000
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), timeoutMs)
      )

      const race = await Promise.race([verifyPromise, timeoutPromise])

      if (cancelled) return

      if (race?.timeout) {
        setStatus('timeout')
        return
      }

      // verifyWalletFunding returns { success: true, data } or { success: false, error }
      if (!race?.success) {
        setStatus('error')
        setErrorMessage('Payment Confirmation Pending')
        return
      }

      const data = race.data
      const alreadyProcessed =
        race.alreadyProcessed === true ||
        data?.already_processed === true ||
        data?.alreadyProcessed === true

      if (race.success || alreadyProcessed) {
        sessionStorage.setItem(successKey, JSON.stringify(data))
        setResult(data)
        setStatus('success')

        // Background sync only.
        retryFetchUserData().catch((syncErr) => {
          console.warn('Wallet sync after funding failed:', syncErr)
        })
      } else {
        setStatus('error')
        setErrorMessage('Payment Confirmation Pending')
      }
    }

    runOnce()

    return () => {
      cancelled = true
    }
  }, [reference, retryFetchUserData])

  const amount = Number(result?.amount || result?.result?.amount || 0)

  useEffect(() => {
    if (status !== 'timeout') return
    const t = setTimeout(() => {
      window.location.assign('/dashboard')
    }, 5000)
    return () => clearTimeout(t)
  }, [status])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
        {status === 'verifying' && (
          <>
            <Loader className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">Verifying Payment</h1>
            <p className="text-sm text-slate-500 mt-2">Please wait while we confirm your account funding.</p>
          </>
        )}

        {status === 'success' && result && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">Account Funded Successfully</h1>
            <p className="text-sm text-slate-500 mt-2">Your payment has been verified and added to your available amount.</p>

            <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-bold uppercase">Amount Added</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatPTC(amount)}</p>
              <p className="text-xs text-slate-500 mt-1">Equivalent: {formatNGN(amount)}</p>
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

        {(status === 'timeout' || status === 'error') && (
          <>
            <Info className="h-12 w-12 text-teal-500 mx-auto mb-5" />
            <h1 className="text-xl font-extrabold text-slate-900">
              {status === 'timeout' ? 'Payment Received' : 'Payment Confirmation Pending'}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {status === 'timeout'
                ? 'Your account funding is being confirmed. If your Available Amount has updated, your funding was successful.'
                : 'We could not confirm the payment instantly. Please check your dashboard. If your Available Amount has updated, your funding was successful.'}
            </p>

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

