import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MarketingNav from './components/marketing/MarketingNav'
import MarketingFooter from './components/marketing/MarketingFooter'
import AppLayout from './components/app/AppLayout'
import ProtectedRoute from './components/app/ProtectedRoute'
import { useAuth } from './lib/auth'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import DocsPage from './pages/DocsPage'

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (ready && user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function DocsWithChrome() {
  return (
    <div className="marketing">
      <MarketingNav />
      <DocsPage />
      <MarketingFooter />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<DocsWithChrome />} />

      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnly>
            <SignupPage />
          </GuestOnly>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
