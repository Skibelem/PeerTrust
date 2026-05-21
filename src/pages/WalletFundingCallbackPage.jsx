import React, { useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyWalletFunding } from '../services/walletFundingService'
import { Loader, Wallet } from 'lucide-react'

export default function WalletFundingCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { retryFetchUserData } = useAuth()

  const hasStartedRef = useRef(false)
  const hasRedirectedRef = useRef(false)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    if (reference) {
      // 3. Call verifyWalletFunding(reference) only once in the background.
      verifyWalletFunding(reference)
        .then(() => {
          // 9. Do not await retryFetchUserData before changing UI.
          retryFetchUserData?.().catch((err) => console.warn('Wallet sync failed:', err))
        })
        .catch((err) => console.warn('Verification failed:', err))
    }

    // 10. After 4 seconds, navigate automatically to /dashboard.
    const timer = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        navigate('/dashboard', { replace: true })
      }
    }, 4000)

    return () => clearTimeout(timer)
  }, [reference, navigate, retryFetchUserData])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
        <Loader className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-5" />

        {/* 2. Show simple screen */}
        <h1 className="text-xl font-extrabold text-slate-900">
          Payment Received
        </h1>

        <p className="text-sm text-slate-500 mt-2">
          We are confirming your account funding. You will be redirected to your dashboard shortly.
        </p>

        {/* 13. If verification fails or delays, still show a friendly message */}
        <p className="text-xs text-slate-400 mt-4">
          If your Available Amount has updated, your funding was successful.
        </p>

        {/* 11. Also show a Back to Dashboard button. */}
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Wallet className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}