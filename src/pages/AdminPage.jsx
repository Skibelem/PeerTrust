import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  LogOut,
  Users,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Settings,
  Landmark,
  Gavel,
  ArrowRight,
  Bug,
  Wallet,
  RotateCcw,
} from 'lucide-react'

export default function AdminPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Admin Navbar */}
      <nav className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-yellow-400 animate-pulse" />
          <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
            PeerTrust{' '}
            <span className="text-xs font-semibold bg-yellow-500 text-slate-950 px-2 py-0.5 rounded uppercase">
              Admin
            </span>
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

      {/* Admin Main Body */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8">
        {/* Welcome Section */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900">
                System Administrator Console
              </h2>

              <span className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm capitalize">
                {profile?.role || 'admin'}
              </span>
            </div>

            <p className="text-slate-500 text-sm mt-1">
              Logged in as {profile?.full_name || 'Admin User'} ({profile?.email})
            </p>
          </div>

          <div className="text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 max-w-full">
            Active Session ID:{' '}
            <code className="text-slate-600 font-mono text-[10px] select-all break-all">
              {profile?.id}
            </code>
          </div>
        </div>

        {/* Admin Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5 text-rose-600" />
            Admin Quick Actions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/admin/disputes"
              className="group bg-white border border-rose-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-rose-600" />
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900">
                    Manage Disputes
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Review open disputes, refund buyers, release funds to sellers, and record admin
                    resolution actions.
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-rose-600 transition-colors shrink-0" />
              </div>
            </Link>

            <Link
              to="/admin/payouts"
              className="group bg-white border border-teal-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-teal-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
                    <Wallet className="h-6 w-6 text-teal-600" />
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900">
                    Manage Seller Payouts
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Review pending seller payouts, confirm manual settlements, and mark completed payouts as paid.
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-teal-600 transition-colors shrink-0" />
              </div>
            </Link>

              <Link
                to="/admin/refunds"
                className="group bg-white border border-orange-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                      <RotateCcw className="h-6 w-6 text-orange-600" />
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900">
                      Manage Buyer Refunds
                    </h3>

                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                      Review pending buyer refunds, confirm manual Paystack refunds, and mark refunds as processed.
                    </p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-600 transition-colors shrink-0" />
                </div>
              </Link>


          </div>
        </div>

        {/* Metric Cards Placeholders */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            System Performance Stats
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Users
                </span>
                <Users className="h-5 w-5 text-slate-400" />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">--</h2>
              <p className="text-[10px] text-slate-400 mt-4">
                Database bindings ready
              </p>
            </div>

            {/* Total Trades */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Trades
                </span>
                <Landmark className="h-5 w-5 text-slate-400" />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">--</h2>
              <p className="text-[10px] text-slate-400 mt-4">
                P2P escrows tracker connected
              </p>
            </div>

            {/* Open Disputes */}
            <Link
              to="/admin/disputes"
              className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
            >
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Active Disputes
                </span>
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">View</h2>
              <p className="text-[10px] text-rose-500 mt-4 font-semibold">
                Open dispute resolution center
              </p>
            </Link>

            {/* Platform limits */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  System Settings
                </span>
                <Settings className="h-5 w-5 text-slate-400" />
              </div>


            </div>
          </div>
        </div>

        {/* Phase Notice */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden border border-slate-800 shadow-md">
          <h3 className="font-bold text-white text-md flex items-center gap-1.5">

            <RefreshCw className="h-4 w-4 text-yellow-400 mr-1 animate-spin" />
            Admin Dispute Controls Active
          </h3>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-4xl">
            You are viewing the administrator console. The dispute resolution center can review
            disputed trades and choose whether to refund the buyer or release escrow funds to the
            seller.
          </p>
        </div>
      </main>
    </div>
  )
}

