/**
 * AuthContext — MediFlow AI
 *
 * Provides global auth state to the entire React application.
 *
 * Exposes:
 *   user      — { sub, email, name, picture } | null
 *   isLoading — true while the initial /api/auth/me check is in flight
 *   logout()  — calls POST /api/auth/logout, clears user state
 *
 * Usage:
 *   import { useAuth } from '../context/AuthContext.jsx'
 *   const { user, isLoading, logout } = useAuth()
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const defaultBase = import.meta.env.PROD ? '' : 'http://localhost:5000'
const API_BASE = (import.meta.env.VITE_API_URL ?? defaultBase).replace(/\/$/, '')

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, check whether an auth_token cookie is already present and valid.
  // This is the only "session restore" mechanism — cookies are HttpOnly so JS
  // cannot read them directly; /api/auth/me does the verification server-side.
  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include', // send the auth_token cookie
        })

        if (!cancelled) {
          if (res.ok) {
            const { user: profile } = await res.json()
            setUser(profile)
          } else {
            // 401 or any non-ok → no valid session
            setUser(null)
          }
        }
      } catch {
        // Network error or server down — treat as logged out, don't crash
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    checkSession()
    return () => { cancelled = true }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network errors — clear local state regardless
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume AuthContext. Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
