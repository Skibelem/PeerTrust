import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  LogOut,
  Wallet,
  User,
  ArrowRight,
  Store,
  PlusCircle,
  List,
  CreditCard,
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

       {/* Available Amount */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Available Amount
        </p>

        <p className="text-3xl font-extrabold text-slate-900 mt-2">
          {formatPTC(wallet?.available_balance || 0)}
        </p>

        <p className="text-xs text-slate-400 mt-1">
          Equivalent: {formatNGN(wallet?.available_balance || 0)}
        </p>

        <Link
          to="/wallet/fund"
          className="mt-4 inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Wallet className="h-4 w-4" />
          Fund Account
        </Link>
      </div>


        {/* Clean role-based dashboard shortcuts */}
        <div className="space-y-4">

          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-900 text-lg">Overview</h3>
          </div>

          {profile?.role === 'seller' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/create-offer"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Create Offer</p>
                <p className="text-sm text-slate-700">Post new listings</p>
              </Link>

              <Link
                to="/trades"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">My Trades</p>
                <p className="text-sm text-slate-700">Manage requests and deliveries</p>
              </Link>

              <Link
                to="/admin/payouts"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Pending Payouts</p>
                <p className="text-sm text-slate-700">View settlement status</p>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/marketplace"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Browse Marketplace</p>
                <p className="text-sm text-slate-700">Find offers to trade</p>
              </Link>

              <Link
                to="/trades"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">My Trades</p>
                <p className="text-sm text-slate-700">Active and completed orders</p>
              </Link>

              <Link
                to="/trades"
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Refund Updates</p>
                <p className="text-sm text-slate-700">View refund progress</p>
              </Link>
            </div>
          )}
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


      </main>
    </div>
  )
}