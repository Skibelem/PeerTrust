import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  LogOut,
  Wallet,
  User,
  Bug,
  HelpCircle,
  ArrowRight,
  Store,
  PlusCircle,
  List,
  RefreshCw,
  CreditCard,
  Lock,
  Clock,
} from 'lucide-react'
import { formatPTC, formatNGN } from '../utils/moneyFormatters'

export default function DashboardPage() {
  const { profile, wallet, signOut, retryFetchUserData } = useAuth()

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Top Navbar */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-400" />
          <span className="font-bold text-xl tracking-tight text-white">
            PeerTrust Dashboard
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/profile-debug"
            className="hidden sm:inline-flex items-center gap-1 text-slate-300 hover:text-white text-xs font-semibold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Bug className="h-3.5 w-3.5 text-teal-400" />
            Profile Debugger
          </Link>

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8">
        {/* Banner Announcement */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="space-y-1">
            <h4 className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              PeerTrust Credits Active
            </h4>

            <p className="text-xs text-teal-700 max-w-xl leading-relaxed">
              PeerTrust displays internal trade value in PTC credits. 1 PTC = ₦100.
              Actual payments are processed in Nigerian Naira through Paystack.
            </p>
          </div>

          <Link
            to="/profile-debug"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 px-3.5 py-2 rounded-xl transition-all"
          >
            Inspect Session Data
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Hello Profile Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-4 items-center">
            <div className="h-16 w-16 rounded-full bg-slate-900 text-teal-400 font-bold flex items-center justify-center text-xl uppercase shadow-inner shrink-0">
              {profile?.full_name?.charAt(0) || <User className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {profile?.full_name || 'Loading user...'}
                </h2>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize shadow-sm ${
                    profile?.role === 'buyer'
                      ? 'bg-teal-50 text-teal-800 border border-teal-100'
                      : 'bg-blue-50 text-blue-800 border border-blue-100'
                  }`}
                >
                  {profile?.role || 'user'}
                </span>
              </div>

              <p className="text-slate-500 text-sm mt-1">
                {profile?.email || 'Checking email...'}
              </p>

              {profile?.phone && (
                <p className="text-slate-400 text-xs mt-0.5">
                  Phone: {profile.phone}
                </p>
              )}
            </div>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
              Account Status
            </span>

            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {profile?.status || 'Active'}
            </span>
          </div>
        </div>

        {/* Credits / Settlement Overview Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-teal-600" />
              PeerTrust Credits Overview
            </h3>

            <button
              onClick={retryFetchUserData}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 border border-slate-200 bg-white hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
              title="Refresh account data from Supabase"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Display Credits */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-teal-50 rounded-full blur-2xl opacity-40 -mr-8 -mt-8"></div>

              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Internal Credit Display
              </span>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                {formatPTC(wallet?.available_balance)}
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Equivalent: {formatNGN(wallet?.available_balance)}
              </p>

              <p className="text-[10px] text-slate-500 mt-4 border-t border-slate-50 pt-2">
                PTC is used for internal display only. Paystack payments are still processed in Naira.
              </p>
            </div>

            {/* Escrow Credit Value */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-yellow-50 rounded-full blur-2xl opacity-40 -mr-8 -mt-8"></div>

              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Escrow Credit Value
              </span>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                {formatPTC(wallet?.escrow_balance)}
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Equivalent: {formatNGN(wallet?.escrow_balance)}
              </p>

              <p className="text-[10px] text-slate-500 mt-4 border-t border-slate-50 pt-2">
                Represents trade value currently locked or tracked in escrow records.
              </p>
            </div>

            {/* Pending Settlement / Refund */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-orange-50 rounded-full blur-2xl opacity-40 -mr-8 -mt-8"></div>

              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending Settlement Value
              </span>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                {formatPTC(wallet?.pending_withdrawal)}
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Equivalent: {formatNGN(wallet?.pending_withdrawal)}
              </p>

              <p className="text-[10px] text-slate-500 mt-4 border-t border-slate-50 pt-2">
                Real payouts/refunds are handled through admin settlement and payment records.
              </p>
            </div>
          </div>
        </div>

        {/* Real Payment Flow Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
              <CreditCard className="h-5 w-5 text-teal-600" />
            </div>
            <p className="font-bold text-slate-900 text-sm">Buyer Payment</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Buyers pay the Naira equivalent through Paystack when funding a trade.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
              <Lock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="font-bold text-slate-900 text-sm">Escrow Tracking</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Funded trades are tracked as held until delivery, dispute, refund, or settlement.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <p className="font-bold text-slate-900 text-sm">Manual Settlement</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Seller payouts and buyer refunds remain pending until admin confirms processing.
            </p>
          </div>
        </div>

        {/* Marketplace Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-teal-600" />
            Marketplace
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Browse Marketplace — visible to all */}
            <Link
              to="/marketplace"
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Store className="h-5 w-5 text-teal-600" />
                </div>

                <div>
                  <p className="font-bold text-slate-900 text-sm">Explore Marketplace</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Browse active seller offers priced in PTC
                  </p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
            </Link>

            {/* My Trades — visible to all */}
            <Link
              to="/trades"
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <List className="h-5 w-5 text-indigo-600" />
                </div>

                <div>
                  <p className="font-bold text-slate-900 text-sm">My Trades</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    View payments, escrow, settlement, and refund status
                  </p>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </Link>

            {/* Create Offer — sellers only */}
            {profile?.role === 'seller' && (
              <Link
                to="/create-offer"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <PlusCircle className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 text-sm">Create New Offer</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Post a service or product for buyers
                    </p>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            )}
          </div>
        </div>

        {/* MVP Notice Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
          <div className="flex gap-4 items-start">
            <HelpCircle className="h-6 w-6 text-teal-400 shrink-0 mt-0.5 animate-pulse" />

            <div>
              <h3 className="font-bold text-white text-md">MVP Payment Notice</h3>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
                PeerTrust Credits are internal display units only. 1 PTC = ₦100. Buyers pay
                the real Naira equivalent through Paystack. Seller payouts and buyer refunds
                are tracked in the platform and require admin settlement confirmation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}