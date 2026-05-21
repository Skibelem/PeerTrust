import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatPTC, formatNGN } from '../utils/moneyFormatters'
import {
  Shield,
  ArrowLeft,
  Bug,
  Server,
  User,
  Wallet,
  Terminal,
  CheckCircle,
} from 'lucide-react'

export default function ProfileDebugPage() {
  const { user, profile, wallet, loading, error, profileMissing, retryFetchUserData } = useAuth()

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Mini Header */}
      <header className="bg-slate-900 text-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal-400" />
          <span className="font-bold text-lg tracking-tight">PeerTrust Debugger</span>
        </div>

        <Link
          to={profile?.role === 'admin' ? '/admin' : '/dashboard'}
          className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white font-semibold bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-teal-600 animate-pulse" />
          <h2 className="text-2xl font-extrabold text-slate-900">
            Supabase Connection Sandbox
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <h4 className="font-bold text-red-800 text-sm">
              Supabase Fetch Failure Detected
            </h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        )}

        {profileMissing && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-sm">
            <h4 className="font-bold text-yellow-800 text-sm">
              Database Row Missing
            </h4>
            <p className="text-xs text-yellow-700 mt-1">
              Auth session exists, but no database rows exist under table `public.profiles` for ID:{' '}
              <code className="bg-yellow-100 font-mono p-0.5 rounded text-[10px]">
                {user?.id}
              </code>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Auth Session */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-950 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
              <Server className="h-4 w-4 text-teal-600" />
              1. Supabase Auth (Session)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                  Auth User ID
                </span>
                <code className="text-slate-900 font-mono text-[10px] select-all bg-slate-50 border border-slate-100 px-1 py-0.5 rounded block mt-1 overflow-auto max-w-full">
                  {user?.id || 'null (Not Authenticated)'}
                </code>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                  Active Email
                </span>
                <span className="text-slate-900 font-medium">
                  {user?.email || 'null'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                  Session Provider metadata
                </span>
                <pre className="text-slate-600 font-mono text-[9px] bg-slate-50 p-2 border border-slate-100 rounded mt-1 overflow-x-auto max-h-40">
                  {user ? JSON.stringify(user.user_metadata, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>

          {/* Card 2: DB Profile and Wallets */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-950 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
              <User className="h-4 w-4 text-blue-600" />
              2. Profiles and Wallets (DB Schema)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                  Profile Name
                </span>
                <span className="text-slate-900 font-bold">
                  {profile?.full_name || 'null'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Profile Role
                  </span>
                  <span className="text-slate-900 font-semibold capitalize bg-slate-50 border border-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                    {profile?.role || 'null'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Profile Status
                  </span>
                  <span className="text-emerald-800 font-bold capitalize bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded inline-block mt-1">
                    {profile?.status || 'null'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] flex items-center gap-1">
                  <Wallet className="h-3 w-3 text-teal-600" />
                  DB Wallet Balances / PTC Debug
                </span>

                <div className="mt-1 bg-slate-50 border border-slate-100 p-2.5 rounded-lg space-y-2 font-mono text-[10px] text-slate-700">
                  <div>
                    <div className="flex justify-between gap-4">
                      <span>Available:</span>
                      <span className="font-bold text-slate-950">
                        {formatPTC(wallet?.available_balance)}
                      </span>
                    </div>
                    <div className="text-right text-slate-400">
                      {formatNGN(wallet?.available_balance)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between gap-4">
                      <span>Escrow Balance:</span>
                      <span className="font-bold text-slate-950">
                        {formatPTC(wallet?.escrow_balance)}
                      </span>
                    </div>
                    <div className="text-right text-slate-400">
                      {formatNGN(wallet?.escrow_balance)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between gap-4">
                      <span>Pending Settlement:</span>
                      <span className="font-bold text-slate-950">
                        {formatPTC(wallet?.pending_withdrawal)}
                      </span>
                    </div>
                    <div className="text-right text-slate-400">
                      {formatNGN(wallet?.pending_withdrawal)}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-2">
                  PTC is display-only. Database values are still stored as Naira amounts for Paystack/payment logic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Interactive JSON console */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="font-bold text-slate-950 text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-slate-700" />
              Full Context State Payload
            </h3>

            <button
              onClick={retryFetchUserData}
              disabled={loading || !user}
              className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              Force Sync Database
            </button>
          </div>

          <pre className="text-slate-600 font-mono text-[9px] bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto max-h-64 shadow-inner">
            {JSON.stringify(
              {
                app_state: {
                  loading,
                  error,
                  profileMissing,
                },
                auth_payload: user,
                database_profile: profile,
                database_wallet: wallet,
              },
              null,
              2
            )}
          </pre>
        </div>

        {/* State checklist footer */}
        <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex gap-3 text-xs text-teal-800">
          <CheckCircle className="h-5 w-5 text-teal-600 shrink-0" />

          <div>
            <span className="font-bold block">Developer Diagnostics Tool active</span>
            <p className="mt-0.5 text-slate-500">
              Check browser Console (F12) to audit state changes. React Context will print log items on startup, state change, and DB fetch.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}