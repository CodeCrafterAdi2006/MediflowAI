import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, LogIn, User } from 'lucide-react'

export default function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()

  // If already logged in, redirect to app
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/app/dashboard')
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', padding: '20px' }}>
      <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <LogIn size={32} color="white" />
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Welcome to MediFlow AI</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '14px', lineHeight: '1.5' }}>
          Sign in to save your prescriptions, sync with Google Calendar, and enable caregiver alerts.
        </p>
        
        <button 
          onClick={login}
          style={{ width: '100%', padding: '14px', background: 'white', color: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'transform 0.1s, opacity 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.95'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '20px', height: '20px' }} />
          Sign in with Google
        </button>

      </div>
    </div>
  )
}
