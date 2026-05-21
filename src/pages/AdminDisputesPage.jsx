import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getDisputedTrades,
  adminReleaseDisputedTrade,
  adminRefundDisputedTrade,
} from '../services/adminService'
import { formatPTC, formatNGN } from '../utils/moneyFormatters'
import {
  Shield,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw,
  User,
  DollarSign,
  LogOut,
  CreditCard,
} from 'lucide-react'

function formatDate(iso) {
  if (!iso) return '—'

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function ErrorBlock({ error, title = 'Error' }) {
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />

      <div className="min-w-0">
        <p className="font-bold text-red-800 text-sm">{title}</p>

        <p className="text-red-700 text-xs mt-1 font-mono break-all">
          {error.message || JSON.stringify(error)}
        </p>

        {error.code && (
          <p className="text-red-500 text-xs mt-1">Code: {error.code}</p>
        )}
      </div>
    </div>
  )
}

export default function AdminDisputesPage() {
  const { profile, signOut } = useAuth()

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)

  async function loadDisputes() {
    setLoading(true)
    setPageError(null)

    const { data, error } = await getDisputedTrades()

    if (error) {
      setPageError(error)
    } else {
      setTrades(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDisputes()
  }, [])

  async function handleRelease(tradeId) {
    const ok = window.confirm(
      'Resolve this dispute in favour of the seller? This will create/queue seller settlement according to your current backend logic.'
    )

    if (!ok) return

    setResolvingId(tradeId)
    setActionError(null)
    setActionSuccess(null)

    const result = await adminReleaseDisputedTrade(tradeId)

    if (!result.success) {
      setActionError(result.error)
      setResolvingId(null)
      return
    }

    setActionSuccess('Dispute resolved in favour of seller. Seller settlement has been handled by the system.')
    await loadDisputes()
    setResolvingId(null)
  }

  async function handleRefund(tradeId) {
    const ok = window.confirm(
      'Resolve this dispute in favour of the buyer? This will create a buyer refund record according to your current backend logic.'
    )

    if (!ok) return

    setResolvingId(tradeId)
    setActionError(null)
    setActionSuccess(null)

    const result = await adminRefundDisputedTrade(tradeId)

    if (!result.success) {
      setActionError(result.error)
      setResolvingId(null)
      return
    }

    setActionSuccess('Dispute resolved in favour of buyer. Buyer refund has been created/pending according to the system.')
    await loadDisputes()
    setResolvingId(null)
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm max-w-md text-center">
          <Shield className="h-10 w-10 text-slate-300 mx-auto mb-4" />

          <h1 className="text-xl font-extrabold text-slate-900">
            Admin access required
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Only admin users can resolve disputes.
          </p>

          <Link
            to="/dashboard"
            className="mt-6 inline-flex px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Home</span>
          </Link>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg">Dispute Resolution</span>
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

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-10 space-y-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Admin Panel
            </p>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Open Disputes
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Review disputed trades and decide whether to refund buyer or release to seller.
            </p>

            <p className="text-xs text-slate-400 mt-2">
              Dispute values are displayed in PTC, with the Naira equivalent shown for manual
              settlement/refund decisions. 1 PTC = ₦100.
            </p>
          </div>

          <button
            onClick={loadDisputes}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="font-bold text-emerald-800 text-sm">{actionSuccess}</p>
          </div>
        )}

        {actionError && (
          <ErrorBlock error={actionError} title="Admin action failed" />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading disputes…</p>
          </div>
        )}

        {!loading && pageError && (
          <ErrorBlock error={pageError} title="Failed to load disputes" />
        )}

        {!loading && !pageError && trades.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />

            <h2 className="font-extrabold text-slate-900 text-xl">
              No open disputes
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              All disputed trades have been resolved.
            </p>
          </div>
        )}

        {!loading && !pageError && trades.length > 0 && (
          <div className="space-y-5">
            {trades.map((trade) => {
              const dispute = Array.isArray(trade.disputes)
                ? trade.disputes[0]
                : trade.disputes

              return (
                <div
                  key={trade.id}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold mb-3">
                        <AlertCircle className="h-4 w-4" />
                        Disputed Trade
                      </div>

                      <h2 className="text-lg font-extrabold text-slate-900">
                        {trade.offer?.title || 'Trade'}
                      </h2>

                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {trade.id}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Trade Value
                      </p>

                      <p className="text-2xl font-extrabold text-slate-900">
                        {formatPTC(trade.amount)}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Naira equivalent: {formatNGN(trade.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                        Parties
                      </p>

                      <p className="text-sm text-slate-700 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        Buyer:{' '}
                        <span className="font-bold">
                          {trade.buyer?.full_name || '—'}
                        </span>
                      </p>

                      <p className="text-sm text-slate-700 flex items-center gap-2 mt-2">
                        <User className="h-4 w-4 text-slate-400" />
                        Seller:{' '}
                        <span className="font-bold">
                          {trade.seller?.full_name || '—'}
                        </span>
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                        Dispute
                      </p>

                      <p className="text-sm text-slate-700">
                        Reason:{' '}
                        <span className="font-bold">
                          {dispute?.reason || '—'}
                        </span>
                      </p>

                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {dispute?.message || 'No message provided.'}
                      </p>

                      <p className="text-xs text-slate-400 mt-2">
                        Opened: {formatDate(dispute?.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">

                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-bold uppercase">
                        Release to Seller
                      </p>

                      <p className="text-lg font-extrabold text-emerald-800">
                        {formatPTC(trade.seller_receives)}
                      </p>

                      <p className="text-xs text-emerald-700 mt-1">
                        Settlement: {formatNGN(trade.seller_receives)}
                      </p>
                    </div>

                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                      <p className="text-xs text-orange-600 font-bold uppercase">
                        Refund Buyer
                      </p>

                      <p className="text-lg font-extrabold text-orange-800">
                        {formatPTC(trade.amount)}
                      </p>

                      <p className="text-xs text-orange-700 mt-1">
                        Refund: {formatNGN(trade.amount)}
                      </p>
                    </div>


                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                    <CreditCard className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />

                    <p className="text-xs text-blue-800 leading-relaxed">
                      For buyer refund, process the Paystack/manual refund amount of{' '}
                      <span className="font-bold">{formatNGN(trade.amount)}</span>. For seller
                      release, settle the seller with{' '}
                      <span className="font-bold">{formatNGN(trade.seller_receives)}</span>.
                      Internal values are shown in PTC for platform consistency.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleRefund(trade.id)}
                      disabled={resolvingId === trade.id}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold rounded-xl text-sm"
                    >
                      {resolvingId === trade.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Resolving…
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Refund Buyer — {formatPTC(trade.amount)}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRelease(trade.id)}
                      disabled={resolvingId === trade.id}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold rounded-xl text-sm"
                    >
                      {resolvingId === trade.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Resolving…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Release Seller — {formatPTC(trade.seller_receives)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}