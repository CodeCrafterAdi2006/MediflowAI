// @ts-ignore
import Navbar from './components/Navbar.jsx'
// @ts-ignore
import Hero from './components/Hero.jsx'
// @ts-ignore
import Problem from './components/Problem.jsx'
// @ts-ignore
import Solution from './components/Solution.jsx'
// @ts-ignore
import HowItWorks from './components/HowItWorks.jsx'
// @ts-ignore
import Features from './components/Features.jsx'
// @ts-ignore
import CTA from './components/CTA.jsx'
// @ts-ignore
import Footer from './components/Footer.jsx'

import SupabaseTest from './SupabaseTest';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <SupabaseTest />
        </div>
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
