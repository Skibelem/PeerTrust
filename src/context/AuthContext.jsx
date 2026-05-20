import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profileMissing, setProfileMissing] = useState(false)

  const mountedRef = useRef(true)

  const devLog = (message, ...args) => {
    if (import.meta.env.DEV) {
      console.log(`[AuthContext Dev] ${message}`, ...args)
    }
  }

  const fetchProfileAndWallet = async (userId) => {
    devLog('Fetching profile and wallet for:', userId)

    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      throw new Error(`Failed to fetch profile: ${profileErr.message}`)
    }

    const { data: walletData, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (walletErr) {
      throw new Error(`Failed to fetch wallet: ${walletErr.message}`)
    }

    return { profile: profileData, wallet: walletData }
  }

  const fetchProfileAndWalletWithRetry = async (userId, retryCount = 3) => {
    let lastResult = { profile: null, wallet: null }

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        devLog(`Profile/wallet fetch attempt ${attempt + 1}/${retryCount + 1}`)
        const result = await fetchProfileAndWallet(userId)
        lastResult = result

        if (result.profile && result.wallet) {
          return result
        }
      } catch (err) {
        devLog('Profile/wallet fetch attempt failed:', err.message)
        if (attempt === retryCount) {
          throw err
        }
      }

      if (attempt < retryCount) {
        await delay(500)
      }
    }

    return lastResult
  }

  const applyUserData = ({ authUser, nextProfile, nextWallet }) => {
    if (!mountedRef.current) return

    setUser(authUser || null)
    setProfile(nextProfile || null)
    setWallet(nextWallet || null)
    setProfileMissing(Boolean(authUser && (!nextProfile || !nextWallet)))
  }

  const syncUserData = async (authUser, retryCount = 2) => {
    if (!authUser?.id) {
      applyUserData({ authUser: null, nextProfile: null, nextWallet: null })
      return { profile: null, wallet: null }
    }

    setError(null)

    try {
      const { profile: nextProfile, wallet: nextWallet } = await fetchProfileAndWalletWithRetry(
        authUser.id,
        retryCount
      )

      applyUserData({ authUser, nextProfile, nextWallet })

      if (!nextProfile || !nextWallet) {
        setError('Profile or wallet setup is incomplete. Please retry syncing your account.')
      }

      return { profile: nextProfile, wallet: nextWallet }
    } catch (err) {
      console.error('[AuthContext] syncUserData failed:', err)
      if (mountedRef.current) {
        setUser(authUser)
        setProfile(null)
        setWallet(null)
        setProfileMissing(true)
        setError(err.message || 'Failed to sync account data.')
      }
      return { profile: null, wallet: null, error: err }
    }
  }

  const retryFetchUserData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      await syncUserData(user, 3)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const signUp = async (email, password, fullName, phone, role) => {
    setError(null)

    const safeRole = role === 'seller' ? 'seller' : 'buyer'

    try {
      devLog('Signup started:', { email, fullName, phone, role: safeRole })

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: safeRole,
          },
        },
      })

      if (authErr) throw authErr

      const signedUpUser = authData?.user

      if (!signedUpUser) {
        return {
          success: false,
          error: 'Signup did not return a user. Check Supabase email confirmation settings.',
        }
      }

      devLog('Auth user created:', signedUpUser.id)

      // The database trigger creates profile/wallet. Give it a short time and fetch the result.
      const { profile: nextProfile, wallet: nextWallet, error: syncError } = await syncUserData(
        signedUpUser,
        5
      )

      if (syncError || !nextProfile || !nextWallet) {
        return {
          success: false,
          error:
            syncError?.message ||
            'Account was created, but profile or wallet setup is not complete. Please refresh and try again.',
          user: signedUpUser,
          profile: nextProfile,
          wallet: nextWallet,
        }
      }

      devLog('Signup completed successfully:', {
        user: signedUpUser,
        profile: nextProfile,
        wallet: nextWallet,
      })

      return {
        success: true,
        user: signedUpUser,
        profile: nextProfile,
        wallet: nextWallet,
      }
    } catch (err) {
      console.error('[AuthContext] signUp failed:', err)
      const message = err.message || 'Registration failed.'
      setError(message)
      return {
        success: false,
        error: message,
      }
    }
  }

  const signIn = async (email, password) => {
    setError(null)

    try {
      devLog('Sign in started:', email)

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authErr) throw authErr

      if (data?.user) {
        await syncUserData(data.user, 3)
      }

      return { user: data?.user || null, error: null }
    } catch (err) {
      console.error('[AuthContext] signIn failed:', err)
      const message = err.message || 'Failed to sign in. Please verify credentials.'
      setError(message)
      return { user: null, error: err }
    }
  }

  const signOut = async () => {
    setLoading(true)

    try {
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) {
        console.error('[AuthContext] signOut error:', signOutErr)
      }
    } catch (err) {
      console.error('[AuthContext] signOut threw exception:', err)
    } finally {
      if (mountedRef.current) {
        setUser(null)
        setProfile(null)
        setWallet(null)
        setProfileMissing(false)
        setError(null)
        setLoading(false)
      }
    }
  }

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  }

  useEffect(() => {
    mountedRef.current = true

    const initializeAuth = async () => {
      setLoading(true)

      try {
        devLog('Initial auth check started')

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session?.user) {
          applyUserData({ authUser: null, nextProfile: null, nextWallet: null })
          return
        }

        setUser(session.user)
        await syncUserData(session.user, 2)
      } catch (err) {
        console.error('[AuthContext] Initial auth check failed:', err)
        if (mountedRef.current) {
          setError(err.message || 'Failed to initialize session.')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          devLog('Initial auth check finished')
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      devLog(`Auth state changed: ${event}`)

      if (!mountedRef.current) return

      if (!session?.user) {
        applyUserData({ authUser: null, nextProfile: null, nextWallet: null })
        setLoading(false)
        return
      }

      setUser(session.user)
      setLoading(true)

      // Supabase warns against awaiting extra Supabase calls directly inside
      // onAuthStateChange. Defer profile/wallet reads to avoid auth lock deadlocks.
      setTimeout(async () => {
        try {
          await syncUserData(session.user, 3)
        } finally {
          if (mountedRef.current) {
            setLoading(false)
          }
        }
      }, 0)
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        loading,
        error,
        profileMissing,
        signUp,
        signIn,
        signOut,
        getSession,
        retryFetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
