import { Upload, ScanSearch, ListChecks, Bell } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import './HowItWorks.css'

const STEPS = [
  {
    icon: Upload,
    title: 'Upload prescription',
    text: 'Take a photo or upload an image of any handwritten prescription.',
  },
  {
    icon: ScanSearch,
    title: 'AI extracts medicines',
    text: 'Our model identifies each medicine, its dosage, and how often it\'s prescribed.',
  },
  {
    icon: ListChecks,
    title: 'Generate schedule',
    text: 'Extracted details are organized into a clear daily and weekly medication plan.',
  },
  {
    icon: Bell,
    title: 'Receive smart reminders',
    text: 'Timely alerts for every dose — including before-food and after-food guidance.',
  },
]

export default function HowItWorks() {
  const ref = useReveal()

  return (
    <section id="how-it-works" className="how section" ref={ref}>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Four steps between a photo and peace of mind</h2>
          <p>The same sequence every time — quick enough to do the moment you leave the clinic.</p>
        </div>

        <div className="how__timeline">
          <div className="how__line" aria-hidden="true" />
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div className="how__step reveal" key={title} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="how__number">{String(i + 1).padStart(2, '0')}</div>
              <div className="how__icon">
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
