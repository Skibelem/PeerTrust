import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Key, Mail, User, Phone, Check, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, user, profile } = useAuth()


  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('buyer') // Public users default to 'buyer'
  
  const [error, setError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)



  // Redirect if user is already logged in
  useEffect(() => {
    if (user && profile) {
      const path = profile.role === 'admin' ? '/admin' : '/dashboard'
      navigate(path, { replace: true })

    }
  }, [user, profile, navigate])
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFormSuccess('')

    if (import.meta.env.DEV) console.log('register submit clicked')

    // Field Validations
    if (!fullName.trim()) {
      setError('Full Name is required.')
      return
    }

    if (!phone.trim()) {
      setError('Phone Number is required.')
      return
    }

    if (!email.trim()) {
      setError('Email Address is required.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g. name@domain.com).')
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    // Role restrictions & fallback
    let finalRole = role
    if (finalRole !== 'buyer' && finalRole !== 'seller') {
      finalRole = 'buyer'
    }

    try {
      setSubmitting(true)
      if (import.meta.env.DEV) console.log('signup started', { email, finalRole })

      const result = await signUp(
        email,
        password,
        fullName,
        phone,
        finalRole
      )

      if (import.meta.env.DEV) console.log('signup result returned', result)

      if (result.success) {
        if (import.meta.env.DEV) {
          console.log('profile loaded', result.profile)
          console.log('wallet loaded', result.wallet)
          console.log('navigating to dashboard')
        }
        navigate("/dashboard", { replace: true })
      } else {
        if (import.meta.env.DEV) console.log('signup failed', result.error)
        setError(result.error)
      }
    } catch (err) {
      const errMsg = err?.message || "Registration failed"
      if (import.meta.env.DEV) console.log('signup failed', errMsg)
      setError(errMsg)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <Shield className="h-8 w-8 text-teal-600" />
          <span className="font-bold text-2xl text-slate-900 tracking-tight">PeerTrust</span>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Or{' '}

          <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-500">
            sign in if you already have one
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 rounded-2xl sm:px-10">
          
      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                    placeholder="Joel Buyer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                    placeholder="08012345678"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                placeholder="name@domain.com"

                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                  placeholder="•••••••• (Min 6 chars)"
                />
              </div>
            </div>

            {/* 8. Role Selection Blocks (Only Buyer and Seller) */}
            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                Choose account role
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buyer */}
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`p-4 rounded-xl text-left border transition-all relative ${
                    role === 'buyer'
                      ? 'border-teal-600 bg-teal-50/20 shadow-sm ring-1 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900 text-sm">Buyer</span>
                    {role === 'buyer' && <Check className="h-4 w-4 text-teal-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Browse offers and confirm delivery.
                  </p>
                </button>

                {/* Seller */}
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`p-4 rounded-xl text-left border transition-all relative ${
                    role === 'seller'
                      ? 'border-blue-600 bg-blue-50/20 shadow-sm ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900 text-sm">Seller</span>
                    {role === 'seller' && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Publish offers and fulfill deliveries.
                  </p>
                </button>
              </div>
            </div>


            {/* 11. Error/Success Display below the form fields but above submit */}
            <div className="space-y-3">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2 shrink-0 animate-bounce" />
                    <span className="text-sm text-red-700 font-medium">{error}</span>
                  </div>
                </div>
              )}

              {formSuccess && (
                <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg animate-fade-in">
                  <div className="flex">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 mr-2 shrink-0 animate-pulse" />
                    <span className="text-sm text-teal-700 font-medium">{formSuccess}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Button with type="submit" and corrected disabled state */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                {/* 12. Dynamic Submitting loading text */}
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
