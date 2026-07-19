import { Activity, Twitter, Linkedin, Mail } from 'lucide-react'
import './Footer.css'

const COLUMNS = [
  {
    title: 'Product',
    links: ['How it works', 'Features', 'For caregivers', 'Security'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Help center', 'Medicine glossary', 'Privacy policy', 'Terms of service'],
  },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <a href="#top" className="footer__logo">
            <span className="footer__mark">
              <Activity size={18} strokeWidth={2.5} />
            </span>
            MediFlow <span>AI</span>
          </a>
          <p>
            AI-generated medication schedules and reminders — built to help
            patients stay on track and caregivers stay informed.
          </p>
          <div className="footer__socials">
            <a href="#" aria-label="Twitter"><Twitter size={17} /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={17} /></a>
            <a href="#" aria-label="Email"><Mail size={17} /></a>
          </div>
        </div>

        <div className="footer__cols">
          {COLUMNS.map((col) => (
            <div className="footer__col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link}><a href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container footer__bottom">
        <p>© {new Date().getFullYear()} MediFlow AI. All rights reserved.</p>
        <p className="footer__disclaimer">
          MediFlow AI supports medication reminders and is not a substitute for professional medical advice.
        </p>
      </div>
    </footer>
  )
}
