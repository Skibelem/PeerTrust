import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getActiveOffers } from '../services/offerService'
import { startTradeFromOffer } from '../services/tradeService'
import { formatPTC, formatNGN } from '../utils/moneyFormatters'
import {
  LogOut,
  Store,
  PlusCircle,
  Search,
  Clock,
  Tag,
  User,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  ChevronDown,
  Loader,
  ArrowRight,
  List,
  CreditCard,
} from 'lucide-react'

// ─── Category colour mapping ──────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Development: 'bg-blue-50 text-blue-700 border-blue-100',
  Design: 'bg-purple-50 text-purple-700 border-purple-100',
  Writing: 'bg-amber-50 text-amber-700 border-amber-100',
  Marketing: 'bg-rose-50 text-rose-700 border-rose-100',
  Consulting: 'bg-teal-50 text-teal-700 border-teal-100',
  Other: 'bg-slate-100 text-slate-600 border-slate-200',
}

const CATEGORIES = ['All', 'Development', 'Design', 'Writing', 'Marketing', 'Consulting', 'Other']

function categoryStyle(cat) {
  return CATEGORY_STYLES[cat] || CATEGORY_STYLES.Other
}

// ─── RLS hint block ───────────────────────────────────────────────────────────
function RlsHint({ error, forTrades = false }) {
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />

      <div className="min-w-0">
        <p className="font-bold text-red-800 text-sm">
          {forTrades ? 'Trade creation failed' : 'Failed to load offers'}
        </p>

        <p className="text-red-700 text-xs mt-1 font-mono break-all">
          {error.message || JSON.stringify(error)}
        </p>

        {error.code && (
          <p className="text-red-500 text-xs mt-0.5">
            Code: {error.code}
            {error.hint ? ` · Hint: ${error.hint}` : ''}
          </p>
        )}

        <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-800 font-mono leading-relaxed">
          <p className="font-bold mb-1">If this is an RLS error, run in Supabase SQL Editor:</p>

          <pre className="whitespace-pre-wrap">
            {forTrades
              ? `-- Buyers can insert trades
CREATE POLICY "Buyers can insert trades"
ON public.trades FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can read their own trades
CREATE POLICY "Buyers can read own trades"
ON public.trades FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can read trades on their offers
CREATE POLICY "Sellers can read their trades"
ON public.trades FOR SELECT
USING (auth.uid() = seller_id);`
              : `-- Allow all logged-in users to read active offers
CREATE POLICY "Allow authenticated users to read offers"
ON public.offers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow sellers to insert their own offers
CREATE POLICY "Allow sellers to insert offers"
ON public.offers FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Allow authenticated users to read all profiles (for seller name)
CREATE POLICY "Allow authenticated users to read all profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);`}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Offer Card ───────────────────────────────────────────────────────────────
function OfferCard({ offer, profile, onTradeError }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  const sellerName = offer.profiles?.full_name || 'Unknown Seller'
  const isSeller = profile?.role === 'seller'
  const isOwnOffer = profile?.id === offer.seller_id

  async function handleStartTrade() {
    setStarting(true)
    onTradeError(null)

    const { data, error } = await startTradeFromOffer(offer, profile)

    if (error) {
      onTradeError(error)
      setStarting(false)
      return
    }

    const tradeId = data?.[0]?.id

    if (tradeId) {
      navigate(`/trades/${tradeId}`)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-slate-900 text-base leading-snug flex-1 min-w-0 truncate">
          {offer.title}
        </h3>

        <span
          className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${categoryStyle(
            offer.category
          )}`}
        >
          {offer.category}
        </span>
      </div>

      {/* Description */}
      <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
        {offer.description || 'No description provided.'}
      </p>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-teal-500" />
          {offer.delivery_time}
        </span>

        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-blue-400" />
          {sellerName}
        </span>
      </div>

      {/* PTC price */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Trade Value
        </p>

        <p className="text-2xl font-extrabold text-slate-900 mt-1">
          {formatPTC(offer.price)}
        </p>

        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <CreditCard className="h-3.5 w-3.5 text-teal-500" />
          Paystack equivalent: {formatNGN(offer.price)}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto gap-3">
        {/* Seller: cannot start trade */}
        {isSeller && (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none w-full justify-center">
            <Tag className="h-3.5 w-3.5" />
            {isOwnOffer ? 'Your Offer' : 'Sellers cannot start trades'}
          </span>
        )}

        {/* Buyer: active Start Trade button */}
        {!isSeller && (
          <button
            onClick={handleStartTrade}
            disabled={starting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white transition-colors w-full"
          >
            {starting ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                Start Trade
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
      <div className="h-3 bg-slate-100 rounded w-full mb-2" />
      <div className="h-3 bg-slate-100 rounded w-5/6 mb-4" />

      <div className="flex gap-3 mb-4">
        <div className="h-3 bg-slate-100 rounded w-20" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </div>

      <div className="h-20 bg-slate-100 rounded-2xl mb-4" />

      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
        <div className="h-8 bg-slate-100 rounded-xl w-full" />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const { profile, signOut } = useAuth()

  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [tradeError, setTradeError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    let cancelled = false

    async function loadOffers() {
      setLoading(true)
      setFetchError(null)

      const { data, error } = await getActiveOffers()

      if (cancelled) return

      if (error) {
        setFetchError(error)
      } else {
        setOffers(data || [])
      }

      setLoading(false)
    }

    loadOffers()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    let result = offers

    if (category !== 'All') {
      result = result.filter((o) => o.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()

      result = result.filter(
        (o) =>
          o.title?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q)
      )
    }

    return result
  }, [offers, search, category])

  const isSeller = profile?.role === 'seller'

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg tracking-tight">Marketplace</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/trades"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
            My Trades
          </Link>

          {isSeller && (
            <Link
              to="/create-offer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create Offer
            </Link>
          )}

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Service Marketplace
            </h1>

            <p className="text-slate-500 text-sm mt-1">
              {isSeller
                ? 'Browse active offers. Sellers cannot start trades.'
                : 'Find a seller and start a trade. Prices are displayed in PeerTrust Credits.'}
            </p>

            <p className="text-xs text-slate-400 mt-2">
              1 PTC = ₦100. Actual buyer payments are processed in Naira through Paystack.
            </p>
          </div>

          {isSeller && (
            <Link
              to="/create-offer"
              className="sm:hidden inline-flex items-center gap-1.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Create Offer
            </Link>
          )}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

            <input
              type="text"
              placeholder="Search offers by title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none w-full sm:w-48 pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trade error */}
        {tradeError && <RlsHint error={tradeError} forTrades />}

        {/* Fetch error */}
        {fetchError && <RlsHint error={fetchError} forTrades={false} />}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !fetchError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-teal-400" />
            </div>

            <h3 className="text-slate-900 font-bold text-lg">
              {offers.length === 0 ? 'No offers yet' : 'No results found'}
            </h3>

            <p className="text-slate-500 text-sm mt-2 max-w-sm">
              {offers.length === 0
                ? "Sellers haven't posted any active offers yet."
                : 'Try adjusting your search or selecting a different category.'}
            </p>

            {isSeller && offers.length === 0 && (
              <Link
                to="/create-offer"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Create the First Offer
              </Link>
            )}
          </div>
        )}

        {/* Offer grid */}
        {!loading && !fetchError && filtered.length > 0 && (
          <>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {filtered.length} offer{filtered.length !== 1 ? 's' : ''} found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  profile={profile}
                  onTradeError={setTradeError}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}