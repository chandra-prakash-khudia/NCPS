# NCPS — React Frontend Enhancement Changelog

> **Date:** 2026-05-20  
> **Goal:** Replace the vanilla HTML/CSS/JS webapp with a modern React.js frontend while keeping Nitesh's Python/FastAPI backend & algorithm completely untouched.

---

## 2026-05-28 Update: NCPS Analytics & Leaderboard Feature Integration

> **Goal:** Port practical analytics, propagation-tier, and trusted-contributor features from the original `NCPS` project into `Nitesh/NCPS` without changing the core credibility algorithm under `backend/app/engine/*`.

### Backend Changes

| File | Change |
|------|--------|
| `backend/webapp/store.py` | Added DB-backed analytics helpers for overview metrics, credibility distribution, propagation tier counts, and trusted contributor leaderboard with trust badges. |
| `backend/webapp/__init__.py` | Added `/api/analytics/overview`, `/api/analytics/credibility-distribution`, `/api/analytics/propagation-stats`, and `/api/analytics/leaderboard`. |
| `backend/tests/test_webapp_auth.py` | Extended the 10-user integration test to verify analytics overview, credibility buckets, propagation tiers, and leaderboard responses. |
| `backend/scripts/verify_webapp_flow.py` | Extended the live HTTP verifier to check analytics and leaderboard endpoints during the 10-user flow. |

### React Frontend Changes

| File | Change |
|------|--------|
| `react-frontend/src/pages/InsightsPage.jsx` | Added an Insights page showing system metrics, credibility distribution, propagation tiers, and trusted contributors. |
| `react-frontend/src/services/api.js` | Added analytics API client wrappers. |
| `react-frontend/src/App.jsx` | Added protected `/insights` route. |
| `react-frontend/src/components/Navbar.jsx` | Added Insights navigation entry. |
| `README.md` | Documented the Insights feature and the 10-user webapp verifier command. |

### Verification

| Command | Result |
|---------|--------|
| `cd backend && ./venv/bin/python -m pytest -q` | `7 passed`, with one existing Pydantic deprecation warning. |
| `cd backend && ./venv/bin/python scripts/verify_webapp_flow.py --base-url http://127.0.0.1:8766 --users 10` | Passed against a live local FastAPI server with 10 users, 10 posts, 90 votes, duplicate vote `409`, and 10 leaderboard users. |
| `cd react-frontend && npm run lint` | Passed. |
| `cd react-frontend && npm run build` | Passed. Vite reported only the existing large chunk warning. |

### Backend Algorithm Status

No files under `backend/app/engine/*` were changed. The integration adds reporting and leaderboard views over persisted webapp data.

---

## 2026-05-28 Update: 10-User Webapp Integration Verification

> **Goal:** Replace shallow smoke-test confidence with a fuller multi-user webapp test that exercises account, posting, voting, scoring, profile, activity, and persistence flows.

### Test Changes

| File | Change |
|------|--------|
| `backend/tests/test_webapp_auth.py` | Added `test_full_webapp_flow_with_ten_users`, which registers 10 accounts, logs each account in, updates location, creates 10 posts, records 90 cross-user votes, verifies duplicate-vote rejection, checks feed/post detail/profile/activity responses, checks private profile access behavior, and confirms login/feed persistence after DB reinitialization. |
| `backend/scripts/verify_webapp_flow.py` | Added a real HTTP verification script that runs the same multi-user flow against any live base URL, including localhost, Render, or a Vercel-routed `/api` deployment. |
| `backend/webapp/db.py` | Added `get_database_kind()` so diagnostics can report the active database type. |
| `backend/webapp/__init__.py` | Updated `/api/health` to report the active database type instead of always returning `postgresql`, which makes local and deployed diagnostics clearer. |
| `CHANGELOG.md` | Recorded the new multi-user verification coverage and latest test results. |

### Verification

| Command | Result |
|---------|--------|
| `cd backend && ./venv/bin/python -m pytest -q` | `7 passed`, with one existing Pydantic deprecation warning. |
| `cd backend && ./venv/bin/python -m alembic upgrade head --sql` | Passed and generated PostgreSQL migration SQL. |
| `cd backend && ./venv/bin/python -m simulation.runner` | Passed. Phase 6 attack scenario reached `Accuracy=1.000`, `Attack Success=0.000`, and `Anomaly Recall=0.840`. |
| `cd backend && ./venv/bin/python scripts/verify_webapp_flow.py --base-url http://127.0.0.1:8765 --users 10` | Passed against a live local FastAPI server with 10 users, 10 posts, 90 votes, duplicate vote `409`, and persisted feed after relogin. |
| `cd react-frontend && npm run lint` | Passed. |
| `cd react-frontend && npm run build` | Passed. Vite reported only the existing large chunk warning. |

### Deployment Note

A deployed `502 Bad Gateway` is not proven or disproven by local tests. It usually means the Render backend process is not healthy, is not listening on Render's `$PORT`, cannot connect to PostgreSQL, failed migrations, or the Vercel `/api` rewrite points to the wrong backend URL.

---

## 2026-05-28 Update: Final Year IEEE-Style Project Report

> **Goal:** Add an original final-year engineering report draft for NCPS using the provided sample report structure and IEEE-style technical formatting.

### Documentation Changes

| File | Change |
|------|--------|
| `docs/FINAL_YEAR_PROJECT_REPORT_IEEE.md` | Added a complete editable project report draft for "Network-aware Credibility and Propagation System for Local News Verification" with title pages, certificate, declaration, acknowledgement, abstract, chapters, IEEE-style references, tables, and image placeholders. |
| `CHANGELOG.md` | Recorded the new report artifact and documentation behavior for traceability. |

### Report Notes

- Followed the provided sample report organization while writing original NCPS-specific content.
- Left explicit placeholders for screenshots, architecture diagrams, workflow figures, and UI images.
- Included simulation results from `backend/simulation.runner` and kept algorithm descriptions aligned with the existing project documentation.
- Added citations in IEEE style; final institute/student details should be filled before submission.

---

## 2026-05-21 Update: PostgreSQL-Backed Production Persistence

> **Goal:** Replace user-facing webapp in-memory storage with deployment-ready database persistence while keeping auth/frontend API behavior stable and leaving the core credibility algorithm untouched.

### Backend Persistence Changes

| File | Change |
|------|--------|
| `backend/webapp/__init__.py` | Replaced module-level account dictionaries and `memory_store` usage with database-backed dependencies, startup DB validation, stable auth/feed/post/vote/location/profile routes, and DB health mode. |
| `backend/webapp/db.py` | Added production database wiring, PostgreSQL URL normalization, schema validation, test-only schema creation, session dependency, and clear startup failure when no valid DB/schema is available. |
| `backend/webapp/models.py` | Added persistent `auth_accounts` model with separate auth data linked one-to-one to algorithmic `users`. |
| `backend/webapp/store.py` | Added DB-backed webapp service mirroring the previous memory-store behavior for accounts, users, posts, feed ranking, voting, profile state, activity, location history, and current webapp scoring formulas. |
| `backend/app/models/user.py` | Switched UUID columns to SQLAlchemy generic `Uuid` so the same ORM metadata can be used by PostgreSQL and isolated test DBs. |
| `backend/app/models/post.py` | Switched UUID columns to generic `Uuid` and made embedding use generic JSON with PostgreSQL JSONB variant. |
| `backend/app/models/interaction.py` | Switched UUID columns to generic `Uuid` and added unique `(user_id, post_id)` duplicate-vote protection. |
| `README.md` | Updated user-facing webapp setup and environment documentation from in-memory mode to PostgreSQL-backed persistence. |

### Migration & Test Changes

| File | Change |
|------|--------|
| `backend/alembic.ini` | Added Alembic configuration for deployment migrations. |
| `backend/alembic/env.py` | Added migration environment using the existing ORM metadata plus the new webapp auth model. |
| `backend/alembic/versions/20260521_0001_persistent_webapp_storage.py` | Added initial PostgreSQL migration for users, auth accounts, posts, interactions, locations, graph, alerts, and alert limits. |
| `backend/tests/test_webapp_auth.py` | Expanded tests for persistent registration/login, protected post creation, duplicate votes, persisted feed/activity, and startup failure when non-PostgreSQL DBs are used outside test mode. |

### Verification

| Command | Result |
|---------|--------|
| `cd backend && ./venv/bin/python -m pytest -q` | `6 passed`, with one existing Pydantic deprecation warning. |
| `cd backend && ./venv/bin/python -m alembic upgrade head --sql` | Passed and generated PostgreSQL migration SQL. |
| `cd react-frontend && npm run lint` | Passed |
| `cd react-frontend && npm run build` | Passed. Vite reported only the existing large chunk warning. |

### Backend Algorithm Status

No core credibility algorithm files were changed in this update:

- `backend/app/engine/*` unchanged
- The user-facing webapp scoring behavior was ported from `memory_store` into `backend/webapp/store.py`.
- Auth data is now stored separately from algorithmic trust/scoring data.
- The API no longer has an in-memory fallback for production startup.

---

## 2026-05-20 Update: Multi-User Authentication & Account Workflows

> **Goal:** Move the user-facing NCPS app away from single-browser UUID identity into authenticated multi-user accounts, without changing the credibility/scoring algorithm.

### Backend Changes

| File | Change |
|------|--------|
| `backend/webapp/security.py` | Added PBKDF2-SHA256 password hashing, HMAC-signed bearer token creation, token verification, expiration handling, and auth error handling using Python standard library only. |
| `backend/webapp/__init__.py` | Added account model/state, `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, authenticated dependencies, role metadata, and first-user-admin assignment. |
| `backend/webapp/__init__.py` | Protected report creation, voting, location update, and profile state routes so they use the authenticated account from the bearer token instead of trusting `user_id` from the client. |
| `backend/webapp/__init__.py` | Added `/api/user/me/state` and `/api/user/me/activity` for account-scoped profile, recent reports, and recent votes. |
| `backend/webapp/__init__.py` | Added duplicate-vote protection in the API layer before calling the existing memory-store vote algorithm. |
| `backend/tests/test_webapp_auth.py` | Added tests for registration, protected post creation, authenticated profile state, token requirement, and duplicate-vote rejection. |

### React Frontend Changes

| File | Change |
|------|--------|
| `react-frontend/src/services/api.js` | Added auth token storage, user session storage, bearer-token request interceptor, 401 auth-expiry handling, and auth API wrappers. Removed browser-generated UUID identity from user actions. |
| `react-frontend/src/context/AuthContext.jsx` | Added app-wide auth state, login/register/logout flows, session hydration, and current-user refresh. |
| `react-frontend/src/pages/AuthPage.jsx` | Added login/register screen with email/password forms, validation messages, password visibility toggle, and account creation flow. |
| `react-frontend/src/App.jsx` | Added public auth routes and protected app routes for feed, map, report creation, profile, and post details. |
| `react-frontend/src/main.jsx` | Wrapped the app in `AuthProvider`. |
| `react-frontend/src/components/Navbar.jsx` | Added authenticated account badge, account menu, profile navigation, and sign-out controls for desktop and mobile. |
| `react-frontend/src/pages/HomePage.jsx` | Removed local UUID registration, uses authenticated location updates, and shows the signed-in account. |
| `react-frontend/src/pages/CreateNewsPage.jsx` | Creates reports as the authenticated user, not a client-supplied `user_id`. |
| `react-frontend/src/pages/MapPage.jsx` | Updates location through the authenticated account session. |
| `react-frontend/src/components/VoteButtons.jsx` | Votes as the authenticated user and respects already-voted state returned by the API. |
| `react-frontend/src/components/NewsCard.jsx` | Passes per-user vote state into vote controls. |
| `react-frontend/src/pages/PostDetailPage.jsx` | Shows authenticated author metadata and per-user vote state. |
| `react-frontend/src/pages/ProfilePage.jsx` | Shows account name/email/role plus recent report and vote activity. |
| `react-frontend/eslint.config.js` | Adjusted lint rules to match the React 19/Vite project style and allow existing Fast Refresh/context patterns. |
| `react-frontend/src/components/CredibilityMeter.jsx` | Removed an unused theme variable found during lint verification. |
| `react-frontend/vite.config.js` | Made the backend proxy target configurable with `VITE_API_TARGET`, useful when port `8000` is already occupied. |

### Verification

| Command | Result |
|---------|--------|
| `cd backend && ./venv/bin/python -m pytest -q` | `3 passed` |
| `cd react-frontend && npm run lint` | Passed |
| `cd react-frontend && npm run build` | Passed. Vite reported only the existing large chunk warning. |

### Backend Algorithm Status

No core credibility algorithm files were changed in this update:

- `backend/app/engine/*` unchanged
- `backend/app/database/memory_store.py` unchanged
- The API now authenticates and authorizes users before it calls the existing report/vote/location functions.
- The trust, weight, Bayesian credibility, urgency, and propagation computations remain the same.

---

## Architecture Overview

```
Nitesh/NCPS/
├── backend/              ← UNTOUCHED — Nitesh's Python/FastAPI engine
│   ├── app/engine/       ← 14-signal, 6-phase credibility pipeline
│   ├── webapp/           ← FastAPI API server (serves API at :8000)
│   ├── simulation/       ← Simulation runner
│   └── venv/             ← Python virtual environment
│
├── react-frontend/       ← NEW — React.js app (Vite + MUI)
│   ├── src/
│   │   ├── theme/        ← MUI dark/light theme with glassmorphism
│   │   ├── services/     ← API layer → FastAPI backend via proxy
│   │   ├── components/   ← Reusable UI components
│   │   ├── pages/        ← Page-level components
│   │   └── utils/        ← Helper functions
│   ├── vite.config.js    ← Dev proxy: /api → VITE_API_TARGET or localhost:8000
│   ├── index.html        ← Entry HTML with Google Fonts
│   └── package.json      ← Dependencies
│
├── webapp/               ← OLD vanilla HTML webapp (preserved, not modified)
└── frontend/             ← Simulation dashboard (preserved, not modified)
```

**Dev Setup:**  
- React on `:3000` → proxy `/api` to FastAPI on `:8000`  
- `cd backend && source venv/bin/activate && python -m webapp.server`  
- `cd react-frontend && npm run dev`

---

## Changes Made

### 1. Project Initialization

| What | Details |
|------|---------|
| **Created** | `react-frontend/` directory via `npx create-vite@latest` with `react` template |
| **Installed** | Core deps: `react`, `react-dom`, `vite`, `@vitejs/plugin-react` |
| **Installed** | UI deps: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` |
| **Installed** | Routing: `react-router-dom` |
| **Installed** | HTTP: `axios` |
| **Installed** | Map: `leaflet`, `react-leaflet` |
| **Installed** | Charts: `recharts` |
| **Installed** | Notifications: `react-toastify` |
| **Installed** | Date utils: `date-fns` |

### 2. Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite config with proxy from `/api` → `VITE_API_TARGET` or `http://localhost:8000` (FastAPI backend) |
| `index.html` | Entry HTML with Google Fonts (Inter, JetBrains Mono), meta tags, SEO |

### 3. Core Foundation Files

| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point with BrowserRouter, ThemeProvider, ToastContainer |
| `src/App.jsx` | Main app with React Router routes for all pages |
| `src/index.css` | Global CSS: glassmorphism `.glass-surface` class, scrollbar, animations, skeleton loaders, responsive breakpoints |

### 4. Theme System

| File | Purpose |
|------|---------|
| `src/theme/AppThemeProvider.jsx` | Full MUI theme with dark/light mode toggle. Custom palette (indigo/purple primary), typography (Inter), component overrides (gradient buttons, rounded cards, glassmorphism chips). Exports `useColorMode()` hook. |

### 5. Service Layer

| File | Purpose |
|------|---------|
| `src/services/api.js` | Axios instance with `/api` base URL. User identity (UUID in localStorage). Preference management. API wrappers: `registerUser()`, `fetchFeed()`, `createPost()`, `votePost()`, `getPost()`, `updateLocation()`, `getUserState()`, `getHealth()`. |

### 6. Utility Functions

| File | Purpose |
|------|---------|
| `src/utils/helpers.js` | `formatRelativeTime()` — date-fns relative time. `getCredibilityColor()` — green/yellow/red by score. `getCredibilityLabel()` — text labels. `formatDistance()` — meters to km. `getRadiusTierLabel()` — Hyperlocal/Local/District/Regional/Wide. `getUrgencyInfo()` — urgency badges. `getIndicatorInfo()` — indicator colors. `getTrustBadge()` — Newcomer/Contributor/Verifier/Trusted/Expert. `detectUrgency()` — keyword-based urgency detection for report form. |

### 7. Reusable Components

| File | What It Does |
|------|--------------|
| `src/components/Navbar.jsx` | Premium sticky navbar with glassmorphism backdrop blur. Gradient NCPS logo avatar. Desktop nav buttons with active state highlighting. Dark/light mode toggle button. Mobile hamburger → slide-in Drawer with nav items. Responsive breakpoints. |
| `src/components/NewsCard.jsx` | Rich news card: credibility-colored top stripe, indicator chips (urgency, trending, verified), content preview (4-line clamp), circular CredibilityMeter + linear progress bar, distance/radius/effective-votes meta chips, VoteButtons row, share button. Click navigates to `/post/:id`. Hover animation (translateY + shadow). |
| `src/components/CredibilityMeter.jsx` | SVG circular gauge showing credibility percentage. Color-coded ring (green ≥70%, yellow ≥40%, red <40%). Animated stroke-dashoffset fill. Three sizes (small/medium/large). Optional label. JetBrains Mono font for number. |
| `src/components/VoteButtons.jsx` | "Credible" / "Fake" pill buttons. Calls `/api/post/vote` on click. Optimistic UI update. Disabled after voting. Toast feedback on success/error. Vote count display. Color-coded active states (green for credible, red for fake). |
| `src/components/LoadingSpinner.jsx` | CircularProgress with rounded stroke. Inner ring border decoration. Optional text label. Full-screen mode option. Three size presets. |

### 8. Page Components

| File | What It Does |
|------|--------------|
| `src/pages/HomePage.jsx` | **Hero card** with gradient background, decorative orb, radar icon. **Dashboard metrics** (stories count, avg credibility, high trust count) in 3-column grid. **Radius filter** chips (1/5/10/25/50 km). **Location status** chip (detected/detecting/denied) with coordinates. **Refresh** button. **Feed title** with story count. **News grid** (2-col desktop, 1-col mobile) rendering NewsCard components. **Loading/Error/Empty** states. Calls `fetchFeed()` API with lat/lon params. Auto-registers user on mount. |
| `src/pages/PostDetailPage.jsx` | **Back button** to navigate to feed. **Content card** with credibility-colored top stripe, indicator chips, full content text, author info. **Credibility Analysis** section: large CredibilityMeter gauge + 3 progress bars (C_Bayes crowd consensus, voter disagreement/variance, effective evidence mass N). **Propagation & Location** section: radius tier chip, coordinates chip, urgency chip. **Vote section** with VoteButtons. |
| `src/pages/CreateNewsPage.jsx` | **Report form** with multiline TextField (5000 char limit). **Real-time urgency detection** — highlights keywords (fire, accident, emergency, etc.) as chips. **Urgency preview card** showing detected urgency level. **Auto-location detection** on mount with status indicator. **Character counter**. **Submit button** calls `createPost()` API. **Success state** with checkmark icon, "View Feed" and "New Report" buttons. |
| `src/pages/ProfilePage.jsx` | **Header card** with gradient background, avatar circle, user ID, trust badge (Newcomer→Expert). **Stats row** (votes, posts, weight). **Weight Decomposition** visual formula: Trust(T) × (1-Anom) × Exp = Weight, each in a styled card with JetBrains Mono values. **Trust Signals** section: 5 signal bars (R*, experience, anomaly, graph trust, location confidence) each with label, description, value, and color-coded LinearProgress bar. |
| `src/pages/MapPage.jsx` | **Full-screen Leaflet map** (100vh - navbar). Loads Leaflet CSS/JS dynamically. **User location** marker (pulsing indigo dot). **Post markers** color-coded by credibility (green/yellow/red). **Propagation radius circles** around each post. **Click popup** showing content preview, credibility %, radius tier, vote count. **Legend card** overlay with color explanations. |

### 9. Backend Changes

| What | Details |
|------|---------|
| **Python venv created** | `backend/venv/` — installed all requirements from `requirements.txt` |
| **No code changes** | Backend `webapp/__init__.py` and `app/engine/*` are completely untouched |

---

## What Was NOT Changed

> [!IMPORTANT]
> The following files/directories were **not modified** at all:

- `backend/app/engine/` — All 14-signal credibility algorithms preserved
- `backend/app/database/` — Memory store logic preserved
- `backend/app/config/` — Configuration preserved
- `backend/webapp/__init__.py` — FastAPI server preserved (serves the API the React app consumes)
- `backend/simulation/` — Simulation framework preserved
- `webapp/` — Old vanilla HTML webapp preserved (still accessible via FastAPI at :8000)
- `frontend/` — Simulation dashboard preserved

---

## How to Run

```bash
# Terminal 1 — Start FastAPI backend
cd Nitesh/NCPS/backend
source venv/bin/activate
python -m webapp.server
# → Running on http://localhost:8000

# Terminal 2 — Start React frontend
cd Nitesh/NCPS/react-frontend
npm run dev
# → Running on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Dashboard + news feed with filters |
| `/map` | MapPage | Full-screen Leaflet map with credibility markers |
| `/create` | CreateNewsPage | Report creation with urgency detection |
| `/profile` | ProfilePage | User trust signals & weight decomposition |
| `/post/:postId` | PostDetailPage | Full credibility breakdown of a post |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 8, MUI 6, React Router 7 |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Algorithm | 14 signals, Bayesian credibility, graph trust, ML augmentation |
| Map | Leaflet.js 1.9 |
| HTTP | Axios |
| Notifications | React-Toastify |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
