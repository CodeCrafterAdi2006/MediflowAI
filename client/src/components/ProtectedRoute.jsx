import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    // Simple full-page spinner that matches the app's aesthetic
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: 'var(--paper)' 
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid var(--line)',
          borderTopColor: 'var(--blue)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    // Not logged in (or just logged out) — send to landing page.
    // From there, "Get Started" routes them to /login when they're ready.
    return <Navigate to="/" replace />
  }

  // Logged in — render the child routes
  return <Outlet />
}
