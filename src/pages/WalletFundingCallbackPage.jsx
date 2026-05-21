import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyWalletFunding } from '../services/walletFundingService'
import { formatNGN, formatPTC } from '../utils/moneyFormatters'
import { CheckCircle, Info, Loader, Wallet } from 'lucide-react'

export default function WalletFundingCallbackPage() {
  const [searchParams] = useSearchParams()
  const { retryFetchUserData } = useAuth()

  const hasStartedRef = useRef(false)

  const [status, setStatus] = useState('verifying') 
  // verifying | slow | success | pending

  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')

  const reference = searchParams.get('reference') || searchParams.get('trxref')

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    let cancelled = false
    let slowTimer = null

    async function runVerification() {
      if (!reference) {
        setStatus('pending')
        setMessage(
          'Payment reference was not found. Please check your dashboard. If your Available Amount has updated, your funding was successful.'
        )
        return
      }

      const successKey = `wallet_funding_verified_${reference}`

      try {
        const cachedSuccess = sessionStorage.getItem(successKey)

        if (cachedSuccess) {
          const parsed = JSON.parse(cachedSuccess)

          if (!cancelled) {
            setResult(parsed)
            setStatus('success')
          }

          retryFetchUserData().catch((syncErr) => {
            console.warn('Wallet sync after cached funding failed:', syncErr)
          })

          return
        }

        slowTimer = setTimeout(() => {
          if (!cancelled) {
            setStatus('slow')
          }
        }, 8000)

        const verifyResult = await verifyWalletFunding(reference)

        if (slowTimer) clearTimeout(slowTimer)
        if (cancelled) return

        if (!verifyResult.success) {
          setStatus('pending')
          setMessage(
            verifyResult.error?.message ||
              'We could not confirm the payment instantly. Please check your dashboard. If your Available Amount has updated, your funding was successful.'
          )
          return
        }

        const data = verifyResult.data

        sessionStorage.setItem(successKey, JSON.stringify(data))

        setResult(data)
        setStatus('success')

        retryFetchUserData().catch((syncErr) => {
          console.warn('Wallet sync after funding failed:', syncErr)
        })
      } catch (err) {
        if (slowTimer) clearTimeout(slowTimer)

        if (!cancelled) {
          setStatus('pending')
          setMessage(
            err.message ||
              'Payment confirmation is taking longer than expected. Please check your dashboard. If your Available Amount has updated, your funding was successful.'
          )
        }
      }
    }

    runVerification()

    return () => {
      cancelled = true
      if (slowTimer) clearTimeout(slowTimer)
    }
  }, [reference])

  const amount = Number(result?.amount || result?.result?.amount || 0)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
        {status === 'verifying' && (
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

        {status === 'slow' && (
          <>
            <Loader className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-5" />

            <h1 className="text-xl font-extrabold text-slate-900">
              Still Confirming Payment
            </h1>

            <p className="text-sm text-slate-600 mt-2">
              This is taking a little longer than expected. Please wait while we finish confirming your funding.
            </p>

            <p className="text-xs text-slate-400 mt-3">
              Do not refresh this page. Your dashboard will update once confirmation is complete.
            </p>
          </>
        )}

        {status === 'success' && result && (
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

        {status === 'pending' && (
          <>
            <Info className="h-12 w-12 text-teal-500 mx-auto mb-5" />

            <h1 className="text-xl font-extrabold text-slate-900">
              Payment Confirmation Pending
            </h1>

            <p className="text-sm text-slate-600 mt-2">
              {message ||
                'Payment verification is taking longer than expected. If your Available Amount has updated, your funding was successful.'}
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