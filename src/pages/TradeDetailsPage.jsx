import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initializeTradePayment } from '../services/paymentService'
import { getTradeById, markTradeDelivered } from '../services/tradeService'
import { confirmDeliveryAndReleaseFunds } from '../services/walletService'
import { raiseTradeDispute } from '../services/disputeService'
import { getTradeMoneySummary } from '../services/tradeMoneyService'
import {
  ArrowLeft,
  LogOut,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ArrowRight,
  User,
  Tag,
  DollarSign,
  Shield,
  Info,
  Lock,
  Unlock,
  AlertTriangle,
  Wallet,
} from 'lucide-react'

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatNGN(val) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

const PTC_RATE = 100 // 1 PTC = ₦100

function formatPTC(val) {
  const credits = Number(val || 0) / PTC_RATE

  return `${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: credits % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(credits)} PTC`
}

function formatPTCWithNaira(val) {
  return `${formatPTC(val)} (${formatNGN(val)})`
}

function formatDate(iso) {
  if (!iso) return '—'

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso))
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META = {
  created: {
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
    label: 'Awaiting Payment',
  },
  funded: {
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Lock,
    label: 'Funded — Escrow Held',
  },
  delivered: {
    cls: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: ArrowRight,
    label: 'Delivered',
  },
  completed: {
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
    label: 'Completed',
  },
  disputed: {
    cls: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertCircle,
    label: 'Disputed',
  },
  cancelled: {
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: XCircle,
    label: 'Cancelled',
  },
  refunded: {
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: XCircle,
    label: 'Refunded',
  },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.created
  const Icon = meta.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${meta.cls}`}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </span>
  )
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value, mono = false, accent = false, highlight = false }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3.5 border-b border-slate-50 last:border-0 ${
        highlight ? 'rounded-lg px-2 -mx-2 bg-teal-50/50' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-slate-500 text-sm min-w-0 shrink-0">
        <Icon className={`h-4 w-4 ${highlight ? 'text-teal-500' : 'text-slate-400'}`} />
        <span>{label}</span>
      </div>

      <span
        className={`text-sm text-right break-all
          ${mono ? 'font-mono text-slate-600 text-xs' : ''}
          ${accent ? 'font-extrabold text-slate-900 text-base' : 'font-semibold text-slate-800'}
          ${highlight ? '!text-teal-800 font-bold' : ''}`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

// ─── Inline error block ───────────────────────────────────────────────────────
function ErrorBlock({ error, title = 'Error', rlsSQL = '' }) {
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />

      <div className="min-w-0 w-full">
        <p className="font-bold text-red-800 text-sm">{title}</p>

        <p className="text-red-700 text-xs mt-1 font-mono break-all">
          {error.message || JSON.stringify(error)}
        </p>

        {error.code && (
          <p className="text-red-500 text-xs mt-0.5">
            Code: {error.code}
            {error.hint ? ` · Hint: ${error.hint}` : ''}
          </p>
        )}

        {rlsSQL && (
          <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-800 font-mono leading-relaxed">
            <p className="font-bold mb-1">Run in Supabase SQL Editor to fix RLS:</p>
            <pre className="whitespace-pre-wrap">{rlsSQL}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

const TRADE_RLS_SQL = `-- Buyers can read their own trades
CREATE POLICY "Buyers can read own trades"
ON public.trades FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can read trades on their offers
CREATE POLICY "Sellers can read their trades"
ON public.trades FOR SELECT
USING (auth.uid() = seller_id);`

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TradeDetailsPage() {
  const { id } = useParams()
  const { profile, retryFetchUserData, signOut } = useAuth()

  const [trade, setTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState(null)

  const [releaseLoading, setReleaseLoading] = useState(false)
  const [releaseError, setReleaseError] = useState(null)
  const [releaseSuccess, setReleaseSuccess] = useState(false)

  const [disputeReason, setDisputeReason] = useState('')
  const [disputeMessage, setDisputeMessage] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState(null)
  const [disputeSuccess, setDisputeSuccess] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)

  const [realPaymentLoading, setRealPaymentLoading] = useState(false)
  const [realPaymentError, setRealPaymentError] = useState(null)

  const [moneySummary, setMoneySummary] = useState(null)
  const [moneySummaryError, setMoneySummaryError] = useState(null)

  // ── Fetch trade ─────────────────────────────────────────────────────────
  async function loadTrade(silent = false) {
    if (!silent) {
      setLoading(true)
      setFetchError(null)
    }

    const { data, error } = await getTradeById(id)

    if (error) {
      setFetchError(error)
    } else {
      setTrade(data)
    }

    if (!silent) {
      setLoading(false)
    }

    return data
  }

  async function loadMoneySummary(tradeId = trade?.id) {
    if (!tradeId) return

    setMoneySummaryError(null)

    const { data, error } = await getTradeMoneySummary(tradeId)

    if (error) {
      setMoneySummaryError(error)
      return
    }

    setMoneySummary(data)
  }

  useEffect(() => {
    if (id) loadTrade()
  }, [id])

  useEffect(() => {
    if (trade?.id) {
      loadMoneySummary(trade.id)
    }
  }, [trade?.id, trade?.status])

  // ── Initialize real Paystack payment ────────────────────────────────────
  async function handleRealPayment() {
    if (!trade || !profile) return

    setRealPaymentLoading(true)
    setRealPaymentError(null)

    const result = await initializeTradePayment(trade, profile)

    if (!result.success) {
      setRealPaymentError(result.error)
      setRealPaymentLoading(false)
      return
    }

    window.location.href = result.authorizationUrl
  }

  // ── Seller marks delivered ──────────────────────────────────────────────
  async function handleMarkDelivered() {
    if (!trade || !profile) return

    setDeliveryLoading(true)
    setDeliveryError(null)

    const result = await markTradeDelivered(trade, profile, deliveryMessage)

    if (!result.success) {
      setDeliveryError(result.error)
      setDeliveryLoading(false)
      return
    }

    setDeliveryMessage('')
    const freshTrade = await loadTrade(true)
    await loadMoneySummary(freshTrade?.id || trade.id)
    setDeliveryLoading(false)
  }

  // ── Buyer confirms delivery and creates seller payout pending ───────────
  async function handleConfirmDelivery() {
    if (!trade || !profile) return

    setReleaseLoading(true)
    setReleaseError(null)
    setReleaseSuccess(false)

    const result = await confirmDeliveryAndReleaseFunds(trade, profile)

    if (!result.success) {
      setReleaseError(result.error)
      setReleaseLoading(false)
      return
    }

    setReleaseSuccess(true)
    const freshTrade = await loadTrade(true)
    await loadMoneySummary(freshTrade?.id || trade.id)
    await retryFetchUserData()
    setReleaseLoading(false)
  }

  // ── Buyer/Seller raises dispute ─────────────────────────────────────────
  async function handleRaiseDispute() {
    if (!trade || !profile) return

    setDisputeLoading(true)
    setDisputeError(null)
    setDisputeSuccess(false)

    const result = await raiseTradeDispute(
      trade,
      profile,
      disputeReason,
      disputeMessage
    )

    if (!result.success) {
      setDisputeError(result.error)
      setDisputeLoading(false)
      return
    }

    setDisputeSuccess(true)
    setDisputeReason('')
    setDisputeMessage('')
    setShowDisputeForm(false)

    const freshTrade = await loadTrade(true)
    await loadMoneySummary(freshTrade?.id || trade.id)
    await retryFetchUserData()

    setDisputeLoading(false)
  }

  // ── Derived UI state ───────────────────────────────────────────────────
  const isBuyer = profile?.id === trade?.buyer_id
  const isSeller = profile?.id === trade?.seller_id
  const status = trade?.status

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/trades"
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">My Trades</span>
          </Link>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg tracking-tight">Trade Details</span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Log Out</span>
        </button>
      </nav>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading trade details…</p>
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <ErrorBlock error={fetchError} title="Failed to load trade" rlsSQL={TRADE_RLS_SQL} />
        )}

        {/* Not found */}
        {!loading && !fetchError && !trade && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mb-4" />
            <p className="font-bold text-slate-900 text-lg">Trade not found</p>
            <p className="text-slate-500 text-sm mt-2">
              This trade ID doesn't exist or you don't have access.
            </p>

            <Link
              to="/trades"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Trades
            </Link>
          </div>
        )}

        {/* Trade content */}
        {!loading && !fetchError && trade && (
          <>
            {/* Payment notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <span className="font-bold">Payment Notice:</span> PeerTrust displays trade value in PTC credits.
                1 PTC = ₦100. Actual payments are processed in Nigerian Naira through Paystack.
                Refunds and seller settlements are tracked inside the platform.
              </p>
            </div>

            {/* Status + Amount header */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                  Trade Status
                </p>
                <StatusBadge status={status} />
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                  Trade Value
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatPTC(trade.amount)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Paystack amount: {formatNGN(trade.amount)}
                </p>
              </div>
            </div>

            {/* Payment & Settlement Summary */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Payment &amp; Settlement Summary
              </h2>

              {moneySummaryError && (
                <ErrorBlock error={moneySummaryError} title="Failed to load money summary" />
              )}

              {!moneySummaryError && (
                <div className="space-y-1">
                  <DetailRow
                    icon={DollarSign}
                    label="Trade Value"
                    value={formatPTCWithNaira(trade.amount)}
                    accent
                  />

                  <DetailRow
                    icon={DollarSign}
                    label="Payment Provider"
                    value={moneySummary?.payment?.provider || '—'}
                  />

                  <DetailRow
                    icon={CheckCircle}
                    label="Payment Status"
                    value={moneySummary?.payment?.status || 'Not paid yet'}
                    highlight={moneySummary?.payment?.status === 'successful'}
                  />

                  <DetailRow
                    icon={Shield}
                    label="Payment Reference"
                    value={moneySummary?.payment?.reference || '—'}
                    mono
                  />

                  <DetailRow
                    icon={Lock}
                    label="Escrow Status"
                    value={moneySummary?.escrow?.status || '—'}
                    highlight={['held', 'released'].includes(moneySummary?.escrow?.status)}
                  />

                  <DetailRow
                    icon={Wallet}
                    label="Seller Payout"
                    value={moneySummary?.payout?.status || '—'}
                    highlight={moneySummary?.payout?.status === 'paid'}
                  />

                  <DetailRow
                    icon={AlertCircle}
                    label="Buyer Refund"
                    value={moneySummary?.refund?.status || '—'}
                    highlight={moneySummary?.refund?.status === 'processed'}
                  />
                </div>
              )}
            </div>

            {/* Context-aware trade action panel */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Trade Action
              </h2>

              {/* BUYER — status: created */}
              {isBuyer && status === 'created' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-blue-800 text-xs leading-relaxed">
                      Secure this trade by paying through Paystack. Once your payment is verified,
                      the trade will be marked as funded and the seller can begin delivery.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="font-bold text-slate-800 text-sm">Secure Paystack Payment</p>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      This trade is valued at {formatPTC(trade.amount)}. You will pay the real Naira
                      equivalent through Paystack: {formatNGN(trade.amount)}.
                    </p>
                  </div>

                  {realPaymentError && (
                    <ErrorBlock error={realPaymentError} title="Paystack payment failed" />
                  )}

                  <button
                    onClick={handleRealPayment}
                    disabled={realPaymentLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {realPaymentLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Initializing Payment…
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        Pay Securely with Paystack — {formatNGN(trade.amount)}
                      </>
                    )}
                  </button>
                </>
              )}

              {/* SELLER — status: created */}
              {isSeller && status === 'created' && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
                  <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-800 text-sm">
                      Waiting for buyer payment
                    </p>
                    <p className="text-blue-700 text-xs mt-1">
                      The buyer needs to fund this trade through Paystack before you can begin working.
                    </p>
                  </div>
                </div>
              )}

              {/* BUYER — status: funded */}
              {isBuyer && status === 'funded' && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
                  <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-800 text-sm">Seller is working</p>
                    <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                      Your payment has been verified and held for this trade. The seller will mark
                      this trade as delivered when the work is done.
                    </p>
                  </div>
                </div>
              )}

              {/* SELLER — status: funded */}
              {isSeller && status === 'funded' && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                    <Unlock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">
                        Payment verified — deliver the work
                      </p>
                      <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                        The buyer has funded this trade. Submit a delivery message when the work is complete.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={deliveryMessage}
                    onChange={(e) => setDeliveryMessage(e.target.value)}
                    placeholder="Write a short delivery note, e.g. The service has been completed and delivered."
                    className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  {deliveryError && (
                    <ErrorBlock error={deliveryError} title="Delivery update failed" />
                  )}

                  <button
                    onClick={handleMarkDelivered}
                    disabled={deliveryLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {deliveryLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Marking Delivered…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Mark as Delivered
                      </>
                    )}
                  </button>
                </>
              )}

              {/* SELLER — status: delivered */}
              {isSeller && status === 'delivered' && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
                  <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-800 text-sm">Delivery submitted</p>
                    <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                      Waiting for the buyer to confirm delivery. Seller payout will be queued after confirmation.
                    </p>
                  </div>
                </div>
              )}

              {/* BUYER — status: delivered */}
              {isBuyer && status === 'delivered' && (
                <>
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
                    <p className="font-bold text-teal-800 text-sm">
                      Seller marked this trade as delivered
                    </p>
                    <p className="text-teal-700 text-xs mt-2 leading-relaxed">
                      {trade.delivery_message || 'No delivery message was provided.'}
                    </p>
                  </div>

                  {releaseError && (
                    <ErrorBlock error={releaseError} title="Delivery confirmation failed" />
                  )}

                  <button
                    onClick={handleConfirmDelivery}
                    disabled={releaseLoading || releaseSuccess}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {releaseLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Confirming Delivery…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Confirm Delivery
                      </>
                    )}
                  </button>
                </>
              )}

              {/* DISPUTE ACTION — buyer or seller can dispute funded/delivered trades */}
              {(isBuyer || isSeller) && ['funded', 'delivered'].includes(status) && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800 text-sm">Problem with this trade?</p>
                      <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                        Raise a dispute if there is an issue. Funds remain locked until admin review.
                      </p>
                    </div>
                  </div>

                  {!showDisputeForm && (
                    <button
                      onClick={() => setShowDisputeForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Raise Dispute
                    </button>
                  )}

                  {showDisputeForm && (
                    <div className="space-y-3">
                      <select
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                      >
                        <option value="">Select dispute reason</option>
                        <option value="Seller did not deliver">Seller did not deliver</option>
                        <option value="Buyer refused to confirm">Buyer refused to confirm</option>
                        <option value="Wrong or incomplete delivery">Wrong or incomplete delivery</option>
                        <option value="Quality issue">Quality issue</option>
                        <option value="Other">Other</option>
                      </select>

                      <textarea
                        value={disputeMessage}
                        onChange={(e) => setDisputeMessage(e.target.value)}
                        placeholder="Explain the issue clearly..."
                        className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                      />

                      {disputeError && (
                        <ErrorBlock error={disputeError} title="Dispute creation failed" />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setShowDisputeForm(false)
                            setDisputeError(null)
                            setDisputeReason('')
                            setDisputeMessage('')
                          }}
                          disabled={disputeLoading}
                          className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={handleRaiseDispute}
                          disabled={disputeLoading}
                          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                        >
                          {disputeLoading ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              Raising Dispute…
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4" />
                              Submit Dispute
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COMPLETED */}
              {status === 'completed' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Trade completed</p>
                    <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                      The buyer confirmed delivery. Seller payout is pending admin settlement.
                    </p>
                  </div>
                </div>
              )}

              {/* DISPUTED */}
              {status === 'disputed' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-800 text-sm">Dispute open</p>
                    <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                      This trade has been disputed. Funds remain locked until admin resolution.
                    </p>
                  </div>
                </div>
              )}

              {/* REFUNDED */}
              {status === 'refunded' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-800 text-sm">Trade refunded</p>
                    <p className="text-orange-700 text-xs mt-1 leading-relaxed">
                      This trade has been resolved in favour of the buyer. Check the buyer refund status above.
                    </p>
                  </div>
                </div>
              )}

              {/* Any other status */}
              {!['created', 'funded', 'delivered', 'completed', 'disputed', 'refunded'].includes(status) && (
                <p className="text-slate-500 text-sm">
                  No action available at this trade status.
                </p>
              )}
            </div>

            {releaseSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 text-sm">
                    Delivery confirmed successfully!
                  </p>
                  <p className="text-emerald-700 text-xs mt-1">
                    Seller payout is now pending manual settlement.
                  </p>
                </div>
              </div>
            )}

            {disputeSuccess && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-800 text-sm">
                    Dispute submitted successfully!
                  </p>
                  <p className="text-rose-700 text-xs mt-1">
                    The trade has been marked as disputed and funds remain locked.
                  </p>
                </div>
              </div>
            )}

            {/* Offer + Parties */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Offer &amp; Parties
              </h2>

              <DetailRow icon={Tag} label="Offer Title" value={trade.offer?.title || '(Offer deleted)'} />
              <DetailRow icon={Tag} label="Category" value={trade.offer?.category || '—'} />
              <DetailRow icon={Clock} label="Delivery Time" value={trade.offer?.delivery_time || '—'} />
              <DetailRow icon={User} label="Buyer" value={trade.buyer?.full_name || '—'} />
              <DetailRow icon={User} label="Seller" value={trade.seller?.full_name || '—'} />
            </div>

            {/* Financial breakdown */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Financial Breakdown
              </h2>

              <DetailRow
                icon={DollarSign}
                label="Trade Value"
                value={formatPTCWithNaira(trade.amount)}
                accent
                highlight={['funded', 'delivered', 'completed', 'disputed', 'refunded'].includes(status)}
              />

              <DetailRow
                icon={DollarSign}
                label="Seller Receives"
                value={formatPTCWithNaira(trade.seller_receives)}
              />
            </div>

            {/* Metadata */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Trade Metadata
              </h2>

              <DetailRow icon={Shield} label="Trade ID" value={trade.id} mono />
              <DetailRow icon={Clock} label="Opened On" value={formatDate(trade.created_at)} />
              <DetailRow icon={Clock} label="Last Updated" value={formatDate(trade.updated_at)} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}