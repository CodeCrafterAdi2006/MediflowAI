import { Routes, Route, Navigate } from 'react-router-dom'
// @ts-ignore
import LandingPage from './pages/LandingPage.jsx'
// @ts-ignore
import LoginPage from './pages/LoginPage.jsx'
// @ts-ignore
import AppLayout from './app/AppLayout.jsx'
// @ts-ignore
import UploadPage from './app/UploadPage.jsx'
// @ts-ignore
import ReviewPage from './app/ReviewPage.jsx'
// @ts-ignore
import DashboardPage from './app/DashboardPage.jsx'
// @ts-ignore
import CaregiverPage from './app/CaregiverPage.jsx'
// @ts-ignore
import ProfilePage from './app/ProfilePage.jsx'
// @ts-ignore
import ProtectedRoute from './components/ProtectedRoute.jsx'
// @ts-ignore
import { AuthProvider } from './context/AuthContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* / → Landing page (entry point for all visitors) */}
        <Route path="/" element={<LandingPage />} />
        {/* /landing → alias, keeps old links working */}
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="upload" replace />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="caregiver" element={<CaregiverPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
