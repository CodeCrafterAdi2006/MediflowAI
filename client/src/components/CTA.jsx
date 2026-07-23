import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import useReveal from '../hooks/useReveal.js'
import './CTA.css'

export default function CTA() {
  const ref = useReveal()

  return (
    <section id="get-started" className="cta section" ref={ref}>
      <div className="container">
        <div className="cta__panel reveal">
          <div>
            <h2>Ready to take medicines on time, every time?</h2>
            <p>Upload your first prescription and see your schedule in under a minute.</p>
          </div>
          <Link to="/app/upload" className="btn btn-primary cta__btn">
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
