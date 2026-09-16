import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToHash from './components/ScrollToHash'
import MarketingNav from './components/marketing/MarketingNav'
import MarketingFooter from './components/marketing/MarketingFooter'
import AppLayout from './components/app/AppLayout'
import ProtectedRoute from './components/app/ProtectedRoute'
import { useAuth } from './lib/auth'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import KnowledgeBasesPage from './pages/KnowledgeBasesPage'
import KnowledgeBaseDetailPage from './pages/KnowledgeBaseDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import ChatHistoryPage from './pages/ChatHistoryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DeveloperPortalPage from './pages/DeveloperPortalPage'
import SettingsPage from './pages/SettingsPage'
import DocsPage from './pages/DocsPage'
import PricingPage from './pages/PricingPage'
import PlaygroundPage from './pages/PlaygroundPage'
import PromptPlaygroundPage from './pages/PromptPlaygroundPage'
import BillingPage from './pages/BillingPage'
import TeamPage from './pages/TeamPage'
import ActivityPage from './pages/ActivityPage'
import ProductPage from './pages/ProductPage'
import DevelopersPage from './pages/DevelopersPage'
import FeaturesPage from './pages/FeaturesPage'
import HowItWorksPage from './pages/HowItWorksPage'
import GithubPage from './pages/GithubPage'

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (ready && user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function WithChrome({ children }: { children: ReactNode }) {
  return (
    <div className="marketing">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/product"
        element={
          <WithChrome>
            <ProductPage />
          </WithChrome>
        }
      />
      <Route
        path="/developers"
        element={
          <WithChrome>
            <DevelopersPage />
          </WithChrome>
        }
      />
      <Route
        path="/features"
        element={
          <WithChrome>
            <FeaturesPage />
          </WithChrome>
        }
      />
      <Route
        path="/how-it-works"
        element={
          <WithChrome>
            <HowItWorksPage />
          </WithChrome>
        }
      />
      <Route
        path="/github"
        element={
          <WithChrome>
            <GithubPage />
          </WithChrome>
        }
      />
      <Route
        path="/docs"
        element={
          <WithChrome>
            <DocsPage />
          </WithChrome>
        }
      />
      <Route
        path="/pricing"
        element={
          <WithChrome>
            <PricingPage />
          </WithChrome>
        }
      />

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
        <Route path="/knowledge-bases" element={<KnowledgeBasesPage />} />
        <Route path="/knowledge-bases/:id" element={<KnowledgeBaseDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat-history" element={<ChatHistoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/developer" element={<DeveloperPortalPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/prompt-playground" element={<PromptPlaygroundPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
