import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
// @ts-ignore
import { MedicationProvider } from './context/MedicationContext.jsx'
// @ts-ignore
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import './darkMode.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MedicationProvider>
          <App />
        </MedicationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
