# Namma Kavacha — Product Requirements Document

**Project:** AI Crime Intelligence Platform for Karnataka State Police
**Started:** 2026-07-25
**Status:** Production-ready — real dataset loaded, bilingual AI, live sync, contextual copilot

---

## Original Problem Statement
Build **Namma Kavacha**, a single, cohesive, enterprise-grade AI crime intelligence platform — a command-center product (Palantir Gotham / IBM i2 / Splunk-caliber) with premium Stripe/Linear/Vercel-level polish. The embedded AI is **Kavacha AI**. Converts static police records into live actionable intelligence: instant case search, criminal history reconstruction, relationship-network mapping, geospatial hotspot prediction, similar-case discovery, AI-generated investigation reports, and district-level analytics.

## Architecture
- **Frontend:** React 19 + Tailwind + Framer Motion + GSAP + Three.js (hero) + react-force-graph-3d (network) + Leaflet (2D + pseudo-3D bars) + Recharts + cmdk + jsPDF + xlsx
- **Backend:** FastAPI + Motor (MongoDB) + PyJWT + bcrypt + emergentintegrations (Claude Sonnet 4.5, bilingual EN/KN) + openpyxl + pypdf + native WebSocket

## What's Been Implemented

### Iteration 1 (2026-07-25)
- Landing (Three.js hero + GSAP), Auth JWT (3 roles), Dashboard, Cases, Case Detail w/ AI report, Kavacha AI SSE chat, Analytics, 3D Network, Leaflet Map, Predictions, Reports (PDF/Excel), Uploads (Excel/PDF), Users mgmt, Audit log, ⌘K palette, notifications
- Fixed HIGH bugs: useEffect Promise return, StrictMode leaflet double-init, ObjectId serialization

### Iteration 2 (2026-07-25) — P1 + P2 delivery
- **Real-time WebSocket sync** (`/api/ws/live`) — case:created/updated/deleted, alert:dispatched, data:reimported events broadcast to all connected sessions; frontend reconnects with backoff.
- **Contextual AI side-panel** — global drawer (⌘J) available from every screen, injects current route as AI context.
- **Offline-first mode** — axios interceptors cache GETs in localStorage, queue writes; auto-flush on reconnect; visible offline banner.
- **Kannada UI** — full nav labels + common strings translated, EN/ಕನ್ನಡ toggle in sidebar.
- **Bilingual Kavacha AI** — auto-detects Kannada input, responds in Kannada; language toggle (Auto/EN/KN); strict "no markdown bold" system prompt + frontend strip as safety net.
- **SMS/Email alerts** — `/api/alerts/send` with MOCK transport; UI at `/app/alerts` with channels, recipients, subject, body; dispatch history + audit trail.
- **Semantic-lite search ranking** — weighted field scoring on `/api/cases?q=...`.
- **3D-tilt map** — added "3D extrusion" layer with district bars + CSS transform tilt toggle (deck.gl-alternative that ships without heavy deps).
- **Enhanced Analytics** — added monthly stacked-severity chart, status distribution, severity donut, top-10 police stations, repeat offenders (top-15 accused), gender breakdown (victims + accused).
- **Enhanced Criminal Network** — filter panel: District, Crime Category, Entity (accused/victim/IO/FIR). Click a person node → refilters graph on them; click a case node → opens case detail. Legend + selected node summary. Facets endpoint.
- **Real dataset loaded** — auto-imports 4891 FIRs from provided Excel on startup (fallback to synthetic seed if URL fails). `/api/data/reimport` for admin refresh.

## Data Ingestion
- **Excel:** columns supported: FIRNo, CrimeRegisteredDate, PoliceName, PoliceStationName, CaseCategoryName, GravityName (→ severity), CrimeMajorHeadName, CrimeMinorHeadName, CaseStatusName, CourtID, Latitude, Longitude, BriefFacts, VictimName/Age/Gender, AccusedName/Age/Gender.
- **Auto-import:** URL `https://customer-assets-0z36b82j.emergentagent.net/job_kavacha-ai-police/artifacts/q3uj4w6j_Police_FIR_Dataset_5000.xlsx` on startup when cases < 1000.
- **PDF:** AI-extracted structured fields with review-and-confirm.
- **All ingestion propagates live** via WebSocket broadcast; dashboards, network, analytics, and map refresh on next fetch.

## User Personas
- **Administrator** — full CRUD, user management, uploads, reimport, alert dispatch, system settings
- **Crime Analyst** — dashboards, cases, AI, uploads, alerts (no user delete)
- **Supervisor** — read-only + report export

## Key API Endpoints
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/cases`, `GET /api/cases/{id}/similar`
- `GET /api/dashboard/kpis`, `GET /api/analytics/*` (by-district, by-category, by-status, by-severity, top-stations, top-accused, monthly-trend, gender-breakdown, timeline)
- `GET /api/network/graph?district=&crime_head=&entity=`, `GET /api/network/facets`
- `GET /api/map/hotspots`, `GET /api/predictions/hotspots`
- `POST /api/kavacha/chat` (SSE stream, bilingual), `POST /api/kavacha/report/{cid}`
- `POST /api/upload/excel`, `POST /api/upload/pdf-extract`, `POST /api/data/reimport`
- `POST /api/alerts/send` (MOCK), `GET /api/alerts`
- `GET /api/audit`, `GET /api/notifications`
- `WS /api/ws/live?token=...`

## Test Credentials
See `/app/memory/test_credentials.md` — admin/analyst/supervisor accounts idempotently seeded.

## Prioritized Backlog (Remaining)
### P2
- Real SMS/email transports (Twilio + SendGrid) — currently MOCKED at `/api/alerts/send`
- Real deck.gl HexagonLayer extrusion (currently pseudo-3D bars with CSS tilt)
- Service Worker for true offline (currently localStorage best-effort)
- Semantic embeddings via OpenAI/Claude embeddings for case search (currently weighted-field scoring)
- Vector similarity for similar-case discovery
