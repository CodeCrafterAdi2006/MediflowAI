import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Problem from '../components/Problem.jsx'
import Solution from '../components/Solution.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Features from '../components/Features.jsx'
import CTA from '../components/CTA.jsx'
import Footer from '../components/Footer.jsx'

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
