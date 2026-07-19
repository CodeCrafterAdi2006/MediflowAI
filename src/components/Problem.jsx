import { FileQuestion, Clock, EyeOff } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import './Problem.css'

const POINTS = [
  {
    icon: FileQuestion,
    title: 'Handwriting nobody can read',
    text: "Doctors' shorthand — dosages, frequencies, abbreviations like 'OD' or 'BD' — is easy to misread and easy to get wrong.",
  },
  {
    icon: Clock,
    title: 'Timings that slip away',
    text: 'Multiple medicines, multiple timings, before-food or after-food rules — it\'s a lot to hold in your head every single day.',
  },
  {
    icon: EyeOff,
    title: 'No visibility for caregivers',
    text: 'Family members and caregivers have no way to know if a dose was actually taken until something goes wrong.',
  },
]

export default function Problem() {
  const ref = useReveal()

  return (
    <section className="problem section" ref={ref}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">The gap</span>
          <h2>Prescriptions are written for pharmacists — not for patients</h2>
          <p>
            The distance between "what the doctor wrote" and "what actually gets taken"
            is where adherence breaks down.
          </p>
        </div>

        <div className="problem__grid">
          {POINTS.map(({ icon: Icon, title, text }, i) => (
            <div className="problem__card reveal" key={title} style={{ transitionDelay: `${i * 90}ms` }}>
              <div className="problem__icon">
                <Icon size={22} strokeWidth={2} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
