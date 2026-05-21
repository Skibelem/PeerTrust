import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBuyerRefunds, markBuyerRefundProcessed } from '../services/refundService'
import {
  ArrowLeft,
  Shield,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
  RotateCcw,
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

export default function AdminRefundsPage() {
  const { profile, signOut } = useAuth()

  const [refunds, setRefunds] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [adminNotes, setAdminNotes] = useState({})

  async function loadRefunds() {
    setLoading(true)
    setPageError(null)

    const { data, error } = await getBuyerRefunds(statusFilter)

    if (error) {
      setPageError(error)
    } else {
      setRefunds(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadRefunds()
  }, [statusFilter])

  async function handleMarkProcessed(refundId) {
    const note = adminNotes[refundId] || ''
    const ok = window.confirm(
      'Have you processed this refund manually in Paystack or your payment dashboard?'
    )
    if (!ok) return

    setProcessingId(refundId)
    setActionError(null)
    setActionSuccess(null)

    const result = await markBuyerRefundProcessed(refundId, note)

    if (!result.success) {
      setActionError(result.error)
      setProcessingId(null)
      return
    }

    setActionSuccess('Buyer refund marked as processed.')
    setAdminNotes((prev) => ({ ...prev, [refundId]: '' }))
    await loadRefunds()
    setProcessingId(null)
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm max-w-md text-center">
          <Shield className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-slate-900">Admin access required</h1>
          <p className="text-sm text-slate-500 mt-2">
            Only admin users can manage buyer refunds.
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
            <RotateCcw className="h-5 w-5 text-orange-400" />
            <span className="font-bold text-lg">Buyer Refunds</span>
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
              Admin Refunds
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Buyer Refund Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review buyer refunds and mark them as processed after manual Paystack refund.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none"
            >
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>

            <button
              onClick={loadRefunds}
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

        {actionError && <ErrorBlock error={actionError} title="Refund action failed" />}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading buyer refunds…</p>
          </div>
        )}

        {!loading && pageError && (
          <ErrorBlock error={pageError} title="Failed to load buyer refunds" />
        )}

        {!loading && !pageError && refunds.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-extrabold text-slate-900 text-xl">No refunds found</h2>
            <p className="text-sm text-slate-500 mt-2">
              There are no buyer refunds matching this filter.
            </p>
          </div>
        )}

        {!loading && !pageError && refunds.length > 0 && (
          <div className="space-y-5">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mb-3 ${
                        refund.status === 'processed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {refund.status}
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900">
                      {refund.trade?.offer?.title || 'Buyer Refund'}
                    </h2>

                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Refund ID: {refund.id}
                    </p>

                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Trade ID: {refund.trade_id}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Refund Amount
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {formatNGN(refund.amount)}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                      Buyer
                    </p>
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-bold">{refund.buyer?.full_name || '—'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2 break-all">
                      {refund.buyer?.email || '—'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                      Seller / Trade
                    </p>
                    <p className="text-sm text-slate-700">
                      Seller:{' '}
                      <span className="font-bold">
                        {refund.trade?.seller?.full_name || '—'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Created: {formatDate(refund.created_at)}
                    </p>
                    {refund.processed_at && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Processed: {formatDate(refund.processed_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold uppercase">
                      Refund Buyer
                    </p>
                    <p className="text-lg font-extrabold text-orange-800">
                      {formatNGN(refund.amount)}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Method
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {refund.refund_method || 'paystack_manual_refund'}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Payment Reference
                    </p>
                    <p className="text-xs font-mono text-slate-700 mt-1 break-all">
                      {refund.payment?.reference || '—'}
                    </p>
                  </div>
                </div>

                {refund.status === 'pending' && (
                  <div className="space-y-3 pt-2">
                    <textarea
                      value={adminNotes[refund.id] || ''}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({
                          ...prev,
                          [refund.id]: e.target.value,
                        }))
                      }
                      placeholder="Admin note, e.g. Refunded manually through Paystack dashboard."
                      className="w-full min-h-[90px] rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />

                    <button
                      onClick={() => handleMarkProcessed(refund.id)}
                      disabled={processingId === refund.id}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-bold rounded-xl text-sm"
                    >
                      {processingId === refund.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Marking Processed…
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Mark as Processed
                        </>
                      )}
                    </button>
                  </div>
                )}

                {refund.status !== 'pending' && refund.admin_note && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Admin Note
                    </p>
                    <p className="text-sm text-slate-700 mt-1">{refund.admin_note}</p>
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