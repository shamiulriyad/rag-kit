# RAG Starter — Frontend

Premium, dark-first React frontend for **RAG Starter**. Marketing landing page plus
the authenticated app (dashboard, documents, knowledge chat, settings, docs).

Stack: React 19 + TypeScript + Vite, `react-router-dom`, `lucide-react`. No CSS
framework — the design system lives in `src/styles/` (tokens → base → ui →
marketing → app).

## Scripts

```bash
npm install
npm run dev       # local dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
```

## Structure

```
src/
  styles/          design tokens + all CSS layers (imported by index.css)
  lib/             auth (mock/localStorage), markdown renderer, formatters, mock + docs data
  services/api.ts  the ONLY place that calls the backend (React → .NET API only)
  components/
    ui/            Button, Badge, Field, StatCard, StatusPill, Toast, Logo, icons
    marketing/     MarketingNav, MarketingFooter, PipelineFlow
    app/           AppLayout, Sidebar, ProtectedRoute, AuthScaffold
  pages/           Landing, Login, Signup, Dashboard, Documents, Chat, Settings, Docs
```

## Routes

| Path | Access | Notes |
| --- | --- | --- |
| `/` | public | Landing page |
| `/docs` | public | Documentation, wrapped in marketing chrome |
| `/login`, `/signup` | guest only | **Mock auth** — no JWT/Identity/DB, localStorage only |
| `/dashboard`, `/documents`, `/chat`, `/settings` | protected | Redirect to `/login` when signed out |

## Backend connection

Configured at build time via `.env` (see `.env.example`):

```
VITE_API_URL=http://localhost:5038      # URL the browser uses to reach the .NET API
VITE_MAX_UPLOAD_MB=200
```

`src/services/api.ts` wraps `/api/health`, `/api/documents/upload` and `/api/chat`.
When the API is unreachable, Documents and Chat fall back to local demo data so the
UI stays explorable, and say so in-line.

## Auth honesty

Authentication is deliberately frontend-only for now. `src/lib/auth.tsx` validates
input shape and stores a mock user in `localStorage`. The UI presents a real SaaS
sign-in experience but no credentials leave the browser.
