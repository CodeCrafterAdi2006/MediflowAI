import { ArrowRight } from 'lucide-react'
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
          <a href="#top" className="btn btn-primary cta__btn">
            Get Started <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
