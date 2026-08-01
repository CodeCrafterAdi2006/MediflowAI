import { NavLink, Outlet, Link } from 'react-router-dom'
import { Activity, Upload, ClipboardList, LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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
            <ThemeToggle />

            <div className="app-shell__user">
              {user?.picture ? (
                <img src={user.picture} alt={user?.name} className="app-shell__avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="app-shell__avatar-fallback">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              {user?.name && <span className="app-shell__username">{user.name}</span>}
            </div>

            <button onClick={logout} className="app-shell__back">
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}