import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { Activity, Upload, ClipboardList, LayoutDashboard, Users, Settings, ArrowLeft, LogOut, LogIn } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../context/AuthContext'
import './AppLayout.css'

const TABS = [
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/review', label: 'Review', icon: ClipboardList },
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/caregiver', label: 'Caregiver', icon: Users },
  { to: '/app/profile', label: 'Profile', icon: Settings },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="app-shell__nav">
        <div className="app-shell__row">
          <Link to="/" className="app-shell__brand">
            <span className="app-shell__mark">
              <Activity size={16} strokeWidth={2.5} />
            </span>
            MediFlow <span>AI</span>
          </Link>

          <nav className="app-shell__tabs">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `app-shell__tab ${isActive ? 'app-shell__tab--active' : ''}`}
              >
                <Icon size={16} strokeWidth={2.2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="app-shell__actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-sunken)', padding: '4px 12px 4px 4px', borderRadius: '30px', border: '1px solid var(--border-subtle)' }}>
                {user.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{user.name}</span>
                <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--text-muted)' }} title="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <ThemeToggle />
            <Link to="/" className="app-shell__back">
              <ArrowLeft size={15} />
              <span>Back to site</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}
