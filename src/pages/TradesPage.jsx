import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserTrades } from '../services/tradeService'
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  List,
  AlertCircle,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Tag,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatNGN(val) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(val || 0)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  created:         { cls: 'bg-blue-50 text-blue-700 border-blue-100',    icon: Clock },
  funds_locked:    { cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
  seller_working:  { cls: 'bg-purple-50 text-purple-700 border-purple-100', icon: Loader },
  delivered:       { cls: 'bg-teal-50 text-teal-700 border-teal-100',    icon: ArrowRight },
  buyer_confirmed: { cls: 'bg-teal-50 text-teal-700 border-teal-100',    icon: CheckCircle },
  completed:       { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
  disputed:        { cls: 'bg-rose-50 text-rose-700 border-rose-100',    icon: AlertCircle },
  cancelled:       { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle },
  refunded:        { cls: 'bg-orange-50 text-orange-700 border-orange-100', icon: XCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.created
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold capitalize ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {status?.replace(/_/g, ' ') || 'created'}
    </span>
  )
}

// ─── Trade row card ───────────────────────────────────────────────────────────
function TradeCard({ trade, myRole }) {
  const offerTitle   = trade.offer?.title || '(Offer deleted)'
  const counterparty = myRole === 'buyer'
    ? (trade.seller?.full_name || 'Unknown Seller')
    : (trade.buyer?.full_name  || 'Unknown Buyer')
  const counterLabel = myRole === 'buyer' ? 'Seller' : 'Buyer'

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Offer title + status */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-900 text-sm truncate max-w-xs">{offerTitle}</p>
          <StatusBadge status={trade.status} />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            <span className="font-semibold text-slate-600">{counterLabel}:</span>{' '}
            {counterparty}
          </span>
          <span>
            <span className="font-semibold text-slate-600">Amount:</span>{' '}
            {formatNGN(trade.amount)}
          </span>
          <span>
            <span className="font-semibold text-slate-600">Opened:</span>{' '}
            {formatDate(trade.created_at)}
          </span>
        </div>

        {/* Trade ID */}
        <p className="text-[10px] text-slate-400 font-mono">ID: {trade.id}</p>
      </div>

      <Link
        to={`/trades/${trade.id}`}
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
      >
        View Details
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TradesPage() {
  const { profile, signOut } = useAuth()

  const [trades, setTrades]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setFetchError(null)
      const { data, error } = await getUserTrades(profile)
      if (cancelled) return
      if (error) setFetchError(error)
      else setTrades(data || [])
      setLoading(false)
    }
    if (profile?.id) load()
    return () => { cancelled = true }
  }, [profile?.id])

  const myRole = profile?.role || 'buyer'

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg tracking-tight">My Trades</span>
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
      <main className="max-w-4xl mx-auto px-6 md:px-12 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Trades</h1>
          <p className="text-slate-500 text-sm mt-1">
            {myRole === 'seller'
              ? 'All trade requests linked to your offers.'
              : 'All trades you have started as a buyer.'}
          </p>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-red-800 text-sm">Failed to load trades</p>
              <p className="text-red-700 text-xs mt-1 font-mono break-all">
                {fetchError.message || JSON.stringify(fetchError)}
              </p>
              {fetchError.code && (
                <p className="text-red-500 text-xs mt-0.5">Code: {fetchError.code}</p>
              )}
              <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-800 font-mono leading-relaxed">
                <p className="font-bold mb-1">Run in Supabase SQL Editor to fix RLS:</p>
                <pre className="whitespace-pre-wrap">{`-- Buyers can read their own trades
CREATE POLICY "Buyers can read own trades"
ON public.trades FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can read trades on their offers
CREATE POLICY "Sellers can read their trades"
ON public.trades FOR SELECT
USING (auth.uid() = seller_id);`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !fetchError && trades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No trades yet</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-sm">
              {myRole === 'buyer'
                ? 'Head to the marketplace and click Start Trade on any offer.'
                : 'No buyers have started a trade on your offers yet.'}
            </p>
            <Link
              to="/marketplace"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Trade list */}
        {!loading && !fetchError && trades.length > 0 && (
          <>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {trades.length} trade{trades.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-4">
              {trades.map(trade => (
                <TradeCard key={trade.id} trade={trade} myRole={myRole} />
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  )
}
