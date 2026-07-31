/**
 * GetStartedButton — Landing Page CTA
 *
 * Auth-aware drop-in replacement for <Link> on the landing page.
 *
 * - Authenticated users  → /app/dashboard (skip login entirely)
 * - Guest users          → /login
 * - While isLoading      → /login (safe fallback, no content flicker)
 *
 * Accepts: className, onClick, children
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function GetStartedButton({ className, onClick, children }) {
  const { user, isLoading } = useAuth()
  const to = (!isLoading && user) ? '/app/dashboard' : '/login'

  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
