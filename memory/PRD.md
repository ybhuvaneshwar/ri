# Namma Kavacha — Product Requirements Document

**Project:** AI Crime Intelligence Platform for Karnataka State Police
**Started:** 2026-07-25
**Status:** MVP shipped — full end-to-end functional

---

## Original Problem Statement
Build **Namma Kavacha**, a single, cohesive, enterprise-grade AI crime intelligence platform — a command-center product (Palantir Gotham / IBM i2 / Splunk-caliber) with premium Stripe/Linear/Vercel-level polish. The embedded AI is **Kavacha AI**. Converts static police records into live actionable intelligence: instant case search, criminal history reconstruction, relationship-network mapping, geospatial hotspot prediction, similar-case discovery, AI-generated investigation reports, and district-level analytics.

## User Choices Confirmed
1. **AI:** Claude Sonnet 4.5 via Emergent Universal LLM key (streamed via SSE)
2. **Map:** Leaflet + OpenStreetMap (no key)
3. **Auth:** JWT + bcrypt with 3 idempotently seeded demo accounts
4. **Scope:** Full MVP end-to-end (landing, auth, dashboard, cases, AI copilot, analytics, 3D network, map, predictions, reports, uploads, users, audit, cmdk, notifications)
5. **Data:** 80 synthetic Karnataka FIRs across 8 districts (deterministic seed)

## Architecture
- **Frontend:** React 19 + Tailwind + Framer Motion + GSAP + Three.js (hero) + react-force-graph-3d (network) + Leaflet (map) + Recharts + cmdk + jsPDF + xlsx
- **Backend:** FastAPI + Motor (MongoDB) + PyJWT + bcrypt + emergentintegrations (Claude Sonnet 4.5) + openpyxl + pypdf
- **State:** localStorage token + React context

## Core Requirements (Static)
- Deep-navy glassmorphic dark-only aesthetic (Satoshi font, Cyber Cyan #00E5FF accents)
- 3-clicks-max navigation, flat sidebar
- WCAG AA + `prefers-reduced-motion` respected
- All actions audited server-side
- Every interactive element has `data-testid`

## User Personas
- **Administrator** — full CRUD, user management, uploads, system settings
- **Crime Analyst** — dashboards, cases, AI, uploads (no user delete, no settings)
- **Supervisor** — read-only + report export

## What's Been Implemented (2026-07-25)

### Backend (`/app/backend/server.py`)
- JWT auth (7-day) + bcrypt password hashing; idempotent seed of 3 demo users
- 80 synthetic Karnataka FIRs across 8 districts with victims/accused/arrests/chargesheets
- Endpoints: `/api/auth/login`, `/auth/me`, `/users` (CRUD, admin), `/cases` (list+search+CRUD), `/cases/{id}`, `/cases/{id}/similar`, `/dashboard/kpis`, `/analytics/by-district`, `/analytics/by-category`, `/analytics/timeline`, `/map/hotspots`, `/network/graph`, `/predictions/hotspots`, `/kavacha/chat` (SSE stream, Claude Sonnet 4.5), `/kavacha/report/{cid}`, `/upload/excel`, `/upload/pdf-extract` (AI extraction), `/audit`, `/notifications`
- Role-based access enforced server-side (require_role dependency)
- Audit logging middleware on all mutations

### Frontend
- **Landing** (`/`) — GSAP scroll reveals + Three.js hero network + CountUp KPIs + module grid
- **Login** (`/login`) — one-click demo account buttons for all 3 roles
- **App Shell** — sidebar nav + role-filtered menu + ⌘K command palette + notification bell
- **Dashboard** — 4 KPI tiles with count-up, timeline chart, priority alerts, district/category panels
- **Cases** — search + district/status filters, 80-row dense table
- **Case Detail** — narrative, timeline, victims/accused, similar cases, "Generate AI Report" (Claude)
- **Kavacha AI** — SSE streaming chat with FIR citation highlighting + suggestions
- **Analytics** — line, bar, pie charts
- **Criminal Network** — react-force-graph-3d with fly-to camera + click-to-open case
- **Map Intelligence** — Leaflet dark theme + case density layer + prediction hotspot layer
- **Predictions** — confidence-scored per-district cards with explanations
- **Reports** — PDF (jsPDF+autotable) & Excel (xlsx) export, plus per-case AI report PDF
- **Uploads** — Excel sync + PDF AI extraction with review-and-confirm
- **Users** — admin CRUD with role assignment
- **Audit** — immutable log with color-coded actions

### Verified (testing_agent_v3 iteration 1 + fix pass)
- Backend: auth, KPIs, cases, network, and Kavacha AI SSE streaming real Claude tokens end-to-end ✓
- Frontend: landing, login→dashboard, cases, analytics, network 3D, Kavacha AI chat, predictions ✓
- Fixed HIGH bugs: `useEffect(load, [])` returning Promise → wrapped; StrictMode removed to unblock Leaflet double-init
- Post-fix screenshot verified Map Intelligence + Users pages render ✓

## Prioritized Backlog

### P1 — Recommended next
- Real-time WebSocket sync layer (dashboard/AI copilot live push)
- Contextual AI side-panel available from any screen (right-click entity → "Ask Kavacha AI")
- Offline-first / degraded-network mode with queued writes
- Full test coverage: Reports export flows, Uploads Excel/PDF flow, supervisor role restrictions, audit log filtering

### P2
- 3D-tilt / extruded map view (deck.gl) beyond Leaflet 2.5D
- User profile picture upload (object storage integration)
- Advanced case search with semantic embeddings
- Multi-language (Kannada) UI toggle
- SMS/email alert delivery for critical hotspots

## Test Credentials
See `/app/memory/test_credentials.md`

## Deployment Notes
- All URLs come from env vars (`REACT_APP_BACKEND_URL`, `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`, `JWT_SECRET`)
- Supervisor auto-restarts backend on code change; frontend has hot reload
- StrictMode intentionally disabled in `index.js` (react-leaflet incompat) — documented in code comment
