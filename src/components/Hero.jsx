import { ArrowRight, PlayCircle } from 'lucide-react'
import HeroIllustration from './HeroIllustration.jsx'
import './Hero.css'

export default function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero__row">
        <div className="hero__copy">
          <span className="eyebrow">AI-powered medication care</span>
          <h1 className="hero__title">
            Never Miss a<br />
            <span className="hero__title-accent">Dose Again</span>
          </h1>
          <p className="hero__subtitle">
            Upload a prescription. Get an AI-generated medication schedule
            with smart reminders — built for patients, watched over by caregivers.
          </p>
          <div className="hero__actions">
            <a href="#get-started" className="btn btn-primary">
              Get Started <ArrowRight size={18} />
            </a>
            <a href="#solution" className="btn btn-secondary">
              <PlayCircle size={18} /> Learn More
            </a>
          </div>

          <div className="hero__proof">
            <div className="hero__proof-avatars">
              <span />
              <span />
              <span />
            </div>
            <p>Trusted by patients and caregivers managing 10,000+ doses a day</p>
          </div>
        </div>

        <div className="hero__visual">
          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}
