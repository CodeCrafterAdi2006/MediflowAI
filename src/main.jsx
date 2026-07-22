import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { MedicationProvider } from './context/MedicationContext.jsx'
import './index.css'
import './darkMode.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MedicationProvider>
        <App />
      </MedicationProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
