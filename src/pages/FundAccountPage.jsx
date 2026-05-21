import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initializeWalletFunding } from '../services/walletFundingService'
import { formatNGN, formatPTC } from '../utils/moneyFormatters'
import {
  ArrowLeft,
  Wallet,
  LogOut,
  CreditCard,
  Loader,
  AlertCircle,
} from 'lucide-react'

export default function FundAccountPage() {
  const { profile, signOut } = useAuth()

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const numericAmount = Number(amount || 0)
  const hasAmount = numericAmount > 0

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setError(null)

    const result = await initializeWalletFunding(numericAmount)

    if (!result.success || !result.authorizationUrl) {
      setError(result.error || { message: 'Unable to start payment.' })
      setLoading(false)
      return
    }

    window.location.href = result.authorizationUrl
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg">Fund Account</span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Log Out</span>
        </button>
      </nav>

      <main className="max-w-xl mx-auto px-6 md:px-12 py-10">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Account Funding
            </p>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Add Money to Your Account
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              Enter the amount you want to add. Payment will be processed securely through Paystack.
            </p>

            {profile?.email && (
              <p className="text-xs text-slate-400 mt-2">
                Funding as: <span className="font-semibold">{profile.email}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-semibold">
                {error.message || 'Funding failed.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Amount in Naira
              </label>

              <input
                type="number"
                min="100"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />

              <p className="text-xs text-slate-400 mt-2">
                Minimum amount: ₦100
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Funding Preview
              </p>

              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {hasAmount ? formatPTC(numericAmount) : '0 PTC'}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Equivalent: {formatNGN(numericAmount)}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !hasAmount}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Opening Paystack…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Continue to Paystack
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}