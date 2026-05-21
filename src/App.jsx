import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Page Imports
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import ProfileDebugPage from './pages/ProfileDebugPage'
import MarketplacePage from './pages/MarketplacePage'
import CreateOfferPage from './pages/CreateOfferPage'
import TradesPage from './pages/TradesPage'
import TradeDetailsPage from './pages/TradeDetailsPage'
import AdminDisputesPage from './pages/AdminDisputesPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import AdminPayoutsPage from './pages/AdminPayoutsPage'
import AdminRefundsPage from './pages/AdminRefundsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile-debug"
            element={
              <ProtectedRoute>
                <ProfileDebugPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-offer"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <CreateOfferPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <TradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades/:id"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <TradeDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/disputes"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDisputesPage />
              </ProtectedRoute>
            }
          />

          <Route path="/payment/callback" element={<PaymentCallbackPage />} />

          <Route
            path="/admin/payouts"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPayoutsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/refunds"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRefundsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
