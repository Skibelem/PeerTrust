import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowRight, CheckCircle2, Lock, Landmark } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Navigation Header */}
      <header className="border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-600" />
          <span className="font-bold text-xl text-slate-900 tracking-tight">PeerTrust</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            Login
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-xs font-semibold text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
              Secure Trade Payments
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Secure P2P Escrow, Built on <span className="text-teal-600">Trust</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
              Experience the safest way to trade products, services, and digital assets. PeerTrust holds funds in a secured escrow wallet until delivery is confirmed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md group hover:-translate-y-0.5"
              >
                Create Account

                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              >
                Sign In to Sandbox
              </Link>
            </div>
          </div>

          <div className="relative">
            {/* Visual Escrow Pipeline Widget */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-teal-100 rounded-full blur-3xl opacity-30 -mr-16 -mt-16"></div>
              
              <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-teal-600" />
                Simulated Escrow Ledger
              </h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0 text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Buyer Deposits Funds</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Funds are secured in a trust vault instantly.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0 text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Seller Delivers Service</h4>
                    <p className="text-xs text-slate-500 mt-0.5">The seller fulfills the agreement and provides proof.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-teal-200 bg-teal-50/20">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Trust Lock Released</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Buyer confirms receipt and payouts are triggered.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trust Badges footer */}
      <footer className="border-t border-slate-100 py-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>© 2026 PeerTrust. Payments and trade activity are handled securely through Paystack and Supabase.</p>
        </div>
      </footer>
    </div>
  )
}
