import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSellerPayouts, markSellerPayoutPaid } from '../services/payoutService'
import {
  ArrowLeft,
  Shield,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
  Wallet,
  User,
  DollarSign,
} from 'lucide-react'

function formatNGN(val) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

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
        {error.code && <p className="text-red-500 text-xs mt-1">Code: {error.code}</p>}
      </div>
    </div>
  )
}

export default function AdminPayoutsPage() {
  const { profile, signOut } = useAuth()

  const [payouts, setPayouts] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [adminNotes, setAdminNotes] = useState({})

  async function loadPayouts() {
    setLoading(true)
    setPageError(null)

    const { data, error } = await getSellerPayouts(statusFilter)

    if (error) {
      setPageError(error)
    } else {
      setPayouts(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPayouts()
  }, [statusFilter])

  async function handleMarkPaid(payoutId) {
    const note = adminNotes[payoutId] || ''
    const ok = window.confirm('Have you manually paid this seller? This will mark the payout as paid.')
    if (!ok) return

    setProcessingId(payoutId)
    setActionError(null)
    setActionSuccess(null)

    const result = await markSellerPayoutPaid(payoutId, note)

    if (!result.success) {
      setActionError(result.error)
      setProcessingId(null)
      return
    }

    setActionSuccess('Seller payout marked as paid.')
    setAdminNotes((prev) => ({ ...prev, [payoutId]: '' }))
    await loadPayouts()
    setProcessingId(null)
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm max-w-md text-center">
          <Shield className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-slate-900">Admin access required</h1>
          <p className="text-sm text-slate-500 mt-2">
            Only admin users can manage seller payouts.
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
          <Link to="/admin" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Home</span>
          </Link>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg">Seller Payouts</span>
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
              Admin Settlement
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Seller Payout Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review completed trades and mark seller payouts as paid after manual settlement.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>

            <button
              onClick={loadPayouts}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="font-bold text-emerald-800 text-sm">{actionSuccess}</p>
          </div>
        )}

        {actionError && <ErrorBlock error={actionError} title="Payout action failed" />}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading seller payouts…</p>
          </div>
        )}

        {!loading && pageError && (
          <ErrorBlock error={pageError} title="Failed to load seller payouts" />
        )}

        {!loading && !pageError && payouts.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-extrabold text-slate-900 text-xl">No payouts found</h2>
            <p className="text-sm text-slate-500 mt-2">
              There are no seller payouts matching this filter.
            </p>
          </div>
        )}

        {!loading && !pageError && payouts.length > 0 && (
          <div className="space-y-5">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mb-3 ${
                        payout.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      <Wallet className="h-4 w-4" />
                      {payout.status}
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900">
                      {payout.trade?.offer?.title || 'Seller Payout'}
                    </h2>

                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Payout ID: {payout.id}
                    </p>

                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Trade ID: {payout.trade_id}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Amount To Pay Seller
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {formatNGN(payout.amount)}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                      Seller
                    </p>
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-bold">{payout.seller?.full_name || '—'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2 break-all">
                      {payout.seller?.email || '—'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                      Buyer / Trade
                    </p>
                    <p className="text-sm text-slate-700">
                      Buyer: <span className="font-bold">{payout.trade?.buyer?.full_name || '—'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Created: {formatDate(payout.created_at)}
                    </p>
                    {payout.paid_at && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Paid: {formatDate(payout.paid_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-bold uppercase">
                      Seller Receives
                    </p>
                    <p className="text-lg font-extrabold text-emerald-800">
                      {formatNGN(payout.amount)}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Method
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {payout.payment_method || 'manual_bank_transfer'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Trade Status
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {payout.trade?.status || '—'}
                    </p>
                  </div>
                </div>

                {payout.status === 'pending' && (
                  <div className="space-y-3 pt-2">
                    <textarea
                      value={adminNotes[payout.id] || ''}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({
                          ...prev,
                          [payout.id]: e.target.value,
                        }))
                      }
                      placeholder="Admin note, e.g. Paid via bank transfer to seller account."
                      className="w-full min-h-[90px] rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    <button
                      onClick={() => handleMarkPaid(payout.id)}
                      disabled={processingId === payout.id}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold rounded-xl text-sm"
                    >
                      {processingId === payout.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Marking Paid…
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Mark as Paid
                        </>
                      )}
                    </button>
                  </div>
                )}

                {payout.status !== 'pending' && payout.admin_note && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Admin Note
                    </p>
                    <p className="text-sm text-slate-700 mt-1">{payout.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}