import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, RefreshCw } from 'lucide-react'

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading, profileMissing, retryFetchUserData } = useAuth()

  // 1. Loading state spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-slate-500 text-sm font-medium">Verifying authorization...</p>
        </div>
      </div>
    )
  }

  // 2. Not logged in redirect
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 3. Profile table row is missing handler
  if (profileMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-2xl p-8 shadow-sm text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Missing</h2>
          <p className="text-slate-500 mb-6 text-sm">
            We found your auth session, but could not retrieve your user profile or wallet details from the database.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={retryFetchUserData}
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2 animate-pulse" />
              Retry Syncing Profile
            </button>
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
            >
              Return to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 4. Role mismatch redirect
  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    const defaultRedirect = profile.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={defaultRedirect} replace />
  }

  return children
}
