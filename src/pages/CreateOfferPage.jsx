import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createOffer } from '../services/offerService'
import {
  Shield,
  LogOut,
  ArrowLeft,
  PlusCircle,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader,
  Store,
  Tag,
  Clock,
  DollarSign,
  AlignLeft,
  ChevronDown,
} from 'lucide-react'

const CATEGORIES = ['Development', 'Design', 'Writing', 'Marketing', 'Consulting', 'Other']

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Development',
  price: '',
  delivery_time: '',
}

// ─── Seller-blocked message ───────────────────────────────────────────────────
function BuyerBlockedMessage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-10 shadow-sm text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
          Seller Access Required
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Only sellers can create offers. Your account is registered as a{' '}
          <span className="font-bold text-slate-700">buyer</span>.
          <br /><br />
          If you want to sell services or products on PeerTrust, please register a new seller account.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Store className="h-4 w-4" />
            Browse Marketplace Instead
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreateOfferPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // ── Role gate: only sellers may create offers ──────────────────────────────
  if (!profile || profile.role !== 'seller') {
    return <BuyerBlockedMessage />
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSuccess(false)

    const offerPayload = {
      seller_id:     profile.id,
      title:         form.title.trim(),
      description:   form.description.trim(),
      category:      form.category,
      price:         parseFloat(form.price),
      delivery_time: form.delivery_time.trim(),
      status:        'active',
    }

    const { data, error } = await createOffer(offerPayload)

    setSubmitting(false)

    if (error) {
      setSubmitError(error)
      return
    }

    // Success — reset form and redirect after 2 s
    setSuccess(true)
    setForm(EMPTY_FORM)

    setTimeout(() => {
      navigate('/marketplace')
    }, 2000)
  }

  // ── Shared input styles ───────────────────────────────────────────────────
  const inputBase =
    'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition'

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/marketplace"
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Marketplace</span>
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-teal-400" />
            <span className="font-bold text-lg tracking-tight">Create Offer</span>
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

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 md:px-12 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            New Offer
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            You are posting as{' '}
            <span className="font-semibold text-slate-700">{profile.full_name}</span>
            {' '}· <span className="text-teal-600 font-semibold">Seller</span>
          </p>
        </div>

        {/* ── Success Banner ─────────────────────────────────────────────────── */}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Offer published successfully!</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Redirecting you to the Marketplace…
              </p>
            </div>
          </div>
        )}

        {/* ── Error Banner ───────────────────────────────────────────────────── */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-red-800 text-sm">Supabase returned an error</p>
              <p className="text-red-700 text-xs mt-1 font-mono break-all">
                {submitError.message || JSON.stringify(submitError)}
              </p>
              {submitError.code && (
                <p className="text-red-500 text-xs mt-0.5">
                  Code: {submitError.code}
                  {submitError.hint ? ` · Hint: ${submitError.hint}` : ''}
                </p>
              )}
              <div className="mt-3 p-3 bg-red-100 rounded-xl text-xs text-red-800 font-mono leading-relaxed">
                <p className="font-bold mb-1">If this is an RLS error, run in Supabase SQL Editor:</p>
                <pre className="whitespace-pre-wrap">{`-- Allow sellers to insert their own offers
CREATE POLICY "Allow sellers to insert offers"
ON public.offers FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Allow sellers to update their own offers
CREATE POLICY "Allow sellers to update their own offers"
ON public.offers FOR UPDATE
USING (auth.uid() = seller_id);`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── Form card ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-teal-500" />
                  Offer Title <span className="text-red-400">*</span>
                </span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="e.g. Custom React Web Application"
                className={inputBase}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <AlignLeft className="h-3.5 w-3.5 text-teal-500" />
                  Description <span className="text-red-400">*</span>
                </span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe what you are offering, what's included, and any relevant details…"
                className={`${inputBase} resize-none`}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-teal-500" />
                  Category <span className="text-red-400">*</span>
                </span>
              </label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className={`${inputBase} appearance-none pr-9 cursor-pointer`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price + Delivery — side by side on wider screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-teal-500" />
                    Price (NGN) <span className="text-red-400">*</span>
                  </span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 150000"
                  className={inputBase}
                />
              </div>

              {/* Delivery time */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-teal-500" />
                    Delivery Time <span className="text-red-400">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="delivery_time"
                  value={form.delivery_time}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 3 days, 1 week"
                  className={inputBase}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || success}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Publishing Offer…
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Published! Redirecting…
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Publish Offer
                </>
              )}
            </button>

          </form>
        </div>

        {/* Demo notice */}
        <p className="text-center text-xs text-slate-400 mt-6">
          All offers are stored in your Supabase database. Trading functionality launches in Phase 3.
        </p>

      </main>
    </div>
  )
}
