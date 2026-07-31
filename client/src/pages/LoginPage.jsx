/**
 * LoginPage — MediFlow AI
 *
 * Public route: /login
 *
 * Renders the Google OAuth entry point. Clicking "Continue with Google"
 * calls GET /api/auth/google/url (which generates PKCE and returns the
 * Google consent URL), then redirects the full page to that URL.
 *
 * Error states handled:
 *   ?error=auth_failed  — Google callback reported a failure
 *   ?error=...          — any other OAuth error parameter forwarded by the callback
 *
 * This component has NO routing side-effects — it does not import
 * useNavigate or redirect itself. Wiring (redirect-if-already-logged-in,
 * ProtectedRoute) is done in App.tsx in the next step.
 */

import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle.jsx'
import './LoginPage.css'

const defaultBase = import.meta.env.PROD ? '' : 'http://localhost:5000'
const API_BASE = (import.meta.env.VITE_API_URL ?? defaultBase).replace(/\/$/, '')

/** Human-readable error messages mapped from the query-param error codes. */
const ERROR_MESSAGES = {
  auth_failed: 'Sign-in failed. Please try again.',
  access_denied: 'You cancelled the sign-in. Try again when you are ready.'
}

export default function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState(null)

  // Pick up ?error= param that the OAuth callback may have appended.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errCode = params.get('error')
    if (errCode) {
      setError(ERROR_MESSAGES[errCode] ?? 'An unexpected error occurred. Please try again.')
    }
  }, [])

  async function handleGoogleSignIn() {
    setIsRedirecting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/auth/google/url`, {
        credentials: 'include', // needed so the pkce_verifier cookie is set
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const { url } = await res.json()

      // Full-page redirect to Google's consent screen.
      // This is intentional — Authorization Code Flow requires a real redirect,
      // not a fetch or a popup (which would be blocked in this architecture).
      window.location.href = url
    } catch (err) {
      console.error('[LoginPage] Failed to fetch Google auth URL:', err)
      setError('Could not reach the server. Please check your connection and try again.')
      setIsRedirecting(false)
    }
  }

  return (
    <div className="login-page">
      {/* Decorative background blobs — matches Hero section aesthetic */}
      <div className="login-page__bg" aria-hidden="true" />
      
      {/* Theme Toggle at top right */}
      <div className="login-page__theme-toggle">
        <ThemeToggle />
      </div>

      <div className="login-page__card">
        {/* Brand mark */}
        <div className="login-page__brand">
          <div className="login-page__mark">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <span className="login-page__brand-name">
            MediFlow <em>AI</em>
          </span>
        </div>

        {/* Heading */}
        <h1 className="login-page__title">Welcome back</h1>
        <p className="login-page__subtitle">
          Sign in to manage your prescriptions and medication schedule.
        </p>

        {/* Error banner */}
        {error && (
          <div className="login-page__error" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Google Sign-In button */}
        <button
          id="google-signin-btn"
          className={`login-page__google-btn${isRedirecting ? ' login-page__google-btn--loading' : ''}`}
          onClick={handleGoogleSignIn}
          disabled={isRedirecting}
          aria-busy={isRedirecting}
        >
          {isRedirecting ? (
            <>
              <span className="login-page__spinner" aria-hidden="true" />
              Redirecting to Google…
            </>
          ) : (
            <>
              {/* Google "G" logo — inline SVG, no external dep */}
              <svg
                className="login-page__google-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.42 3.05 29.47 1 24 1 14.82 1 7.02 6.58 3.7 14.44l7.16 5.56C12.61 13.8 17.84 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.14-3.14-.4-4.63H24v8.76h12.68c-.55 2.95-2.2 5.44-4.68 7.12l7.18 5.58C43.26 37.5 46.5 31.45 46.5 24.5z" />
                <path fill="#FBBC05" d="M10.86 28.56A14.5 14.5 0 0 1 9.5 24c0-1.6.28-3.14.77-4.56l-7.16-5.56A23.98 23.98 0 0 0 0 24c0 3.87.93 7.53 2.57 10.75l8.29-6.19z" />
                <path fill="#34A853" d="M24 47c5.45 0 10.02-1.8 13.36-4.9l-7.18-5.58c-1.82 1.22-4.14 1.94-6.18 1.94-6.16 0-11.39-4.3-13.14-10.08l-8.29 6.19C7.02 41.42 14.82 47 24 47z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="login-page__divider" aria-hidden="true" />

        {/* Privacy note */}
        <p className="login-page__legal">
          By signing in you agree to our{' '}
          <a href="/privacy" className="login-page__legal-link">Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms" className="login-page__legal-link">Terms of Service</a>.
          We only request your name, email, and profile picture from Google.
        </p>
      </div>
    </div>
  )
}
