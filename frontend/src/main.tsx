import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'
import { UIProvider } from './lib/ui'
import { WorkspaceProvider } from './lib/workspace'
import { NotificationsProvider } from './lib/notifications'
import { ActivityProvider } from './lib/activity'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <UIProvider>
              <WorkspaceProvider>
                <NotificationsProvider>
                  <ActivityProvider>
                    <App />
                  </ActivityProvider>
                </NotificationsProvider>
              </WorkspaceProvider>
            </UIProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
