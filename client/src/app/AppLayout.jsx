import { NavLink, Outlet, Link } from 'react-router-dom'
import { Activity, Upload, ClipboardList, LayoutDashboard, Users, Settings, ArrowLeft } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle.jsx'
import './AppLayout.css'

const TABS = [
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/review', label: 'Review', icon: ClipboardList },
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/caregiver', label: 'Caregiver', icon: Users },
  { to: '/app/profile', label: 'Profile', icon: Settings },
]

export default function AppLayout() {
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

          <div className="app-shell__actions">
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
