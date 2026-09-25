import { useEffect, useState, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { adminApi } from './services/adminApi'
import ScrollToHash from './components/ScrollToHash'
import MarketingNav from './components/marketing/MarketingNav'
import MarketingFooter from './components/marketing/MarketingFooter'
import AppLayout from './components/app/AppLayout'
import ProtectedRoute from './components/app/ProtectedRoute'
import AdminRoute from './components/app/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminUsersPage from './pages/admin/UsersPage'
import AdminUserDetailPage from './pages/admin/UserDetailPage'
import AdminWorkspacesPage from './pages/admin/WorkspacesPage'
import AdminKnowledgeBasesPage from './pages/admin/KnowledgeBasesPage'
import AdminDocumentsPage from './pages/admin/DocumentsPage'
import AdminInvitationsPage from './pages/admin/InvitationsPage'
import AdminJobsPage from './pages/admin/JobsPage'
import AdminJobDetailPage from './pages/admin/JobDetailPage'
import AdminHealthPage from './pages/admin/HealthPage'
import AdminPlansPage from './pages/admin/PlansPage'
import AdminSubscriptionsPage from './pages/admin/SubscriptionsPage'
import AdminAuditPage from './pages/admin/AuditPage'
import AdminCmsPage from './pages/admin/CmsPage'
import AdminCmsEditorPage from './pages/admin/CmsEditorPage'
import AdminSecurityEventsPage from './pages/admin/SecurityEventsPage'
import AdminAdminsPage from './pages/admin/AdminsPage'
import AdminApiKeysPage from './pages/admin/ApiKeysPage'
import AdminUsagePage from './pages/admin/UsageCostPage'
import AdminBillingEventsPage from './pages/admin/BillingEventsPage'
import AdminSupportInboxPage from './pages/admin/SupportInboxPage'
import AdminSupportTicketPage from './pages/admin/SupportTicketAdminPage'
import SupportPage from './pages/SupportPage'
import SupportTicketPage from './pages/SupportTicketPage'
import AdminSettingsPage from './pages/admin/SettingsAdminPage'
import AdminComingSoonPage from './pages/admin/ComingSoonPage'
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
import BillingPage from './pages/BillingPage'
import TeamPage from './pages/TeamPage'
import ActivityPage from './pages/ActivityPage'
import ProductPage from './pages/ProductPage'
import DevelopersPage from './pages/DevelopersPage'
import FeaturesPage from './pages/FeaturesPage'
import HowItWorksPage from './pages/HowItWorksPage'
import GithubPage from './pages/GithubPage'

/** Where a signed-in user belongs: operators go to their panel, everyone else to the app. The API
 *  decides who is an operator; this only picks the landing page. */
function SignedInRedirect() {
  const [target, setTarget] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    adminApi
      .access()
      .then((r) => !cancelled && setTarget(r.isAdmin ? '/admin' : '/dashboard'))
      .catch(() => !cancelled && setTarget('/dashboard'))
    return () => {
      cancelled = true
    }
  }, [])
  if (!target) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <span className="spinner" />
      </div>
    )
  }
  return <Navigate to={target} replace />
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (ready && user) return <SignedInRedirect />
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
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/support/:id" element={<SupportTicketPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="workspaces" element={<AdminWorkspacesPage />} />
        <Route path="knowledge-bases" element={<AdminKnowledgeBasesPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="invitations" element={<AdminInvitationsPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="jobs/:id" element={<AdminJobDetailPage />} />
        <Route path="health" element={<AdminHealthPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="cms" element={<AdminCmsPage />} />
        <Route path="cms/new" element={<AdminCmsEditorPage />} />
        <Route path="cms/:id" element={<AdminCmsEditorPage />} />
        <Route path="security-events" element={<AdminSecurityEventsPage kind="security" />} />
        <Route path="rate-limits" element={<AdminSecurityEventsPage kind="ratelimit" />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="api-keys" element={<AdminApiKeysPage />} />
        <Route path="cost" element={<AdminUsagePage />} />
        <Route path="billing-events" element={<AdminBillingEventsPage />} />
        <Route path="support" element={<AdminSupportInboxPage />} />
        <Route path="support/:id" element={<AdminSupportTicketPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="*" element={<AdminComingSoonPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
