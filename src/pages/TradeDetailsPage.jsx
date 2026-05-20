import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { initializeTradePayment } from '../services/paymentService'
import { getTradeById, markTradeDelivered } from '../services/tradeService'
import { fundEscrow, confirmDeliveryAndReleaseFunds } from '../services/walletService'
import { raiseTradeDispute } from '../services/disputeService'
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
    label: 'Awaiting Escrow',
  },
  funded: {
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Lock,
    label: 'Funded — Escrow Locked',
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

const ESCROW_RLS_SQL = `-- Buyer can update own wallet
CREATE POLICY "Buyer can update own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Buyer can update their trades
CREATE POLICY "Buyer can update own trades"
ON public.trades FOR UPDATE
USING (auth.uid() = buyer_id);

-- Seller can update their trades
CREATE POLICY "Seller can update own trades"
ON public.trades FOR UPDATE
USING (auth.uid() = seller_id);

-- Buyer can insert wallet_transactions
CREATE POLICY "Buyer can insert wallet_transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (
  wallet_id IN (
    SELECT id FROM public.wallets WHERE user_id = auth.uid()
  )
);

-- Buyer can insert escrow_transactions
CREATE POLICY "Buyer can insert escrow_transactions"
ON public.escrow_transactions FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Seller can read escrow_transactions
CREATE POLICY "Seller can read escrow_transactions"
ON public.escrow_transactions FOR SELECT
USING (auth.uid() = seller_id);`

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TradeDetailsPage() {
  const { id } = useParams()
  const { profile, retryFetchUserData, signOut } = useAuth()

  const [trade, setTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [funding, setFunding] = useState(false)
  const [fundError, setFundError] = useState(null)
  const [fundSuccess, setFundSuccess] = useState(false)
  const [isInsufficient, setIsInsufficient] = useState(false)

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
  }

  useEffect(() => {
    if (id) loadTrade()
  }, [id])

  // ── Fund escrow demo ────────────────────────────────────────────────────
  async function handleFundEscrow() {
    if (!trade || !profile) return

    setFunding(true)
    setFundError(null)
    setFundSuccess(false)
    setIsInsufficient(false)

    const result = await fundEscrow(trade, profile)

    if (!result.success) {
      setFundError(result.error)
      setIsInsufficient(result.isInsufficientFunds || false)
      setFunding(false)
      return
    }

    setFundSuccess(true)
    await loadTrade(true)
    await retryFetchUserData()
    setFunding(false)
  }

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
    await loadTrade(true)
    setDeliveryLoading(false)
  }

  // ── Buyer confirms delivery and releases funds ──────────────────────────
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
    await loadTrade(true)
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

    await loadTrade(true)
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
            {/* Demo warning banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <span className="font-bold">Demo Mode:</span> Escrow funding and fund release use
                simulated wallet balances only. No real money is processed or moved.
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
                  Trade Amount
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatNGN(trade.amount)}
                </p>
              </div>
            </div>

            {/* Context-aware escrow action panel */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Escrow Action
              </h2>

              {/* BUYER — status: created */}
              {isBuyer && status === 'created' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-blue-800 text-xs leading-relaxed">
                      Fund this trade's escrow using your demo wallet balance. Your available
                      balance will decrease and escrow balance will increase by{' '}
                      <span className="font-bold">{formatNGN(trade.amount)}</span>.
                    </p>
                  </div>

                  {isInsufficient && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-orange-800 text-sm">
                          Insufficient Demo Balance
                        </p>
                        <p className="text-orange-700 text-xs mt-1">{fundError?.message}</p>
                      </div>
                    </div>
                  )}

                  {fundError && !isInsufficient && (
                    <ErrorBlock
                      error={fundError}
                      title="Escrow funding failed"
                      rlsSQL={ESCROW_RLS_SQL}
                    />
                  )}

                  {/* Demo escrow funding */}
                  <button
                    onClick={handleFundEscrow}
                    disabled={funding || fundSuccess}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {funding ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Funding Escrow…
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        Fund Escrow Demo — {formatNGN(trade.amount)}
                      </>
                    )}
                  </button>

                  {/* Real Paystack test payment */}
                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="font-bold text-slate-800 text-sm">Real Payment Test</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        This initializes a Paystack test payment. The trade will not be marked as
                        funded until payment verification/webhook is added in the next step.
                      </p>
                    </div>

                    {realPaymentError && (
                      <ErrorBlock
                        error={realPaymentError}
                        title="Paystack initialization failed"
                      />
                    )}

                    <button
                      onClick={handleRealPayment}
                      disabled={realPaymentLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                    >
                      {realPaymentLoading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Initializing Paystack…
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" />
                          Pay with Paystack Test — {formatNGN(trade.amount)}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* SELLER — status: created */}
              {isSeller && status === 'created' && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
                  <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-800 text-sm">
                      Waiting for buyer to fund escrow
                    </p>
                    <p className="text-blue-700 text-xs mt-1">
                      The buyer needs to fund escrow before you can begin working.
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
                      Funds are locked in escrow. The seller will mark this trade as delivered when
                      the work is done.
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
                        Escrow funded — deliver the work
                      </p>
                      <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                        The buyer has locked funds in escrow. Submit a delivery message when the work
                        is complete.
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
                      Waiting for the buyer to confirm delivery and release the escrow funds.
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
                    <ErrorBlock error={releaseError} title="Fund release failed" />
                  )}

                  <button
                    onClick={handleConfirmDelivery}
                    disabled={releaseLoading || releaseSuccess}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {releaseLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Releasing Funds…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Confirm Delivery & Release Funds
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
                        Raise a dispute if there is an issue. Escrow funds will remain locked until
                        admin review is added.
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
                      The buyer confirmed delivery and the demo escrow funds have been released to the
                      seller.
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
                      This trade has been disputed. Escrow funds remain locked until admin resolution
                      is added in the next phase.
                    </p>
                  </div>
                </div>
              )}

              {/* Any other status */}
              {!['created', 'funded', 'delivered', 'completed', 'disputed'].includes(status) && (
                <p className="text-slate-500 text-sm">
                  No escrow action available at this trade status.
                </p>
              )}
            </div>

            {/* Success toasts */}
            {fundSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 text-sm">
                    Escrow funded successfully!
                  </p>
                  <p className="text-emerald-700 text-xs mt-1">
                    Wallet debited, escrow balance updated, wallet transaction recorded, and trade
                    status set to funded.
                  </p>
                </div>
              </div>
            )}

            {releaseSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800 text-sm">
                    Delivery confirmed successfully!
                  </p>
                  <p className="text-emerald-700 text-xs mt-1">
                    Demo escrow funds have been released to the seller.
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
                    The trade has been marked as disputed and escrow funds remain locked.
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
                label="Trade Amount"
                value={formatNGN(trade.amount)}
                accent
                highlight={['funded', 'delivered', 'completed', 'disputed'].includes(status)}
              />
              <DetailRow
                icon={DollarSign}
                label="Platform Fee (2.5%)"
                value={formatNGN(trade.platform_fee)}
              />
              <DetailRow
                icon={DollarSign}
                label="Seller Receives"
                value={formatNGN(trade.seller_receives)}
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