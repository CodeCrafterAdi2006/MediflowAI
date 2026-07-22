import { useEffect, useState } from 'react'
import { Activity, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'
import './Navbar.css'

const LINKS = [
  { href: '#solution', label: 'Solution' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__row">
        <a href="#top" className="navbar__brand">
          <span className="navbar__mark">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          MediFlow <span className="navbar__ai">AI</span>
        </a>

        <nav className="navbar__links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <ThemeToggle />
          <Link to="/app/upload" className="btn btn-primary navbar__cta">
            Get Started
          </Link>
        </div>

        <div className="navbar__mobile-actions">
          <ThemeToggle />
          <button
            className="navbar__burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="navbar__mobile">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/app/upload" className="btn btn-primary" onClick={() => setOpen(false)}>
            Get Started
          </Link>
        </div>
      )}
    </header>
  )
}
