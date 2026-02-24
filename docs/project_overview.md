# RIVEROS — Project Overview

Maritime Operations Web Application — custom UI layer over Ragic database.

> **Last updated:** 2026-02-24
> **Auth status:** ✅ COMPLETE

---

## What This Project Is

**RIVEROS** (River Operations System) is built for **River Advice — Competence on Inland Waterways**.

Ragic is used as the database backend. Ragic provides its own interface but it is not suitable for operational use.
This project replaces the Ragic native UI with a fast, custom web application built on Next.js —
while keeping Ragic as the single source of truth for all data.

- **Ragic account:** `https://eu4.ragic.com/rtoperations` (EU4 region)
- **No separate SQL/Postgres/MongoDB database.** All data lives in Ragic sheets.

---

## Tech Stack

| Layer | Technology | Version | Status |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 | In use |
| Build | Turbopack | (bundled) | Dev server |
| Language | TypeScript | 5 | In use |
| Styling | Tailwind CSS | v4 | In use |
| UI Components | shadcn/ui (New York, neutral) | Latest | In use |
| Forms | React Hook Form + Zod | Latest | In use (login) |
| JWT | `jose` | Latest | In use (Edge-compatible) |
| Icons | Lucide React | Latest | In use |
| Fonts | Geist Sans / Geist Mono | (Next.js bundled) | In use |
| Utilities | clsx + tailwind-merge (`cn()`) | Latest | In use |
| Database | Ragic (external) | REST API v3 | In use |
| State | Zustand | 5.x | **Installed — not yet used** |
| HTTP client | Axios | 1.x | **Installed — not yet used** |
| i18n | next-intl | 4.x | **Installed — not yet used** |

> **Note on `jose` vs `jsonwebtoken`:** `jsonwebtoken` uses Node.js crypto APIs not available
> in the Next.js Edge Runtime. `jose` is Edge-compatible and works in both `proxy.ts`
> (middleware) and API routes.

> **Note on package.json:** All dependencies are declared in `package.json` and installed
> in `node_modules`. Run `npm install` after cloning if `node_modules` is absent.

---

## Completion Status

| Feature | Status | Notes |
|---|---|---|
| Auth — Login page | ✅ Done | Full UI, form validation, error handling |
| Auth — JWT sign/verify | ✅ Done | `jose`, HS256, 24h expiry, httpOnly cookie |
| Auth — Ragic password validation | ✅ Done | `ragicPasswordAuth()` in `src/lib/ragic.ts` |
| Auth — User profile fetch at login | ✅ Done | Reads name, vessel, vesselAbbr from `ragic-setup/1` |
| Auth — Route protection (proxy) | ✅ Done | `src/proxy.ts` (Next.js 16 naming) |
| Auth — Sign out | ✅ Done | Cookie deleted, redirect to /login |
| Dashboard shell | ✅ Done | TopNav, vessel badge, user dropdown, profile slide-over |
| Dashboard — Module grid | ✅ Done | 6 module cards with hover interactivity |
| Root redirect (/ → /login) | ✅ Done | `src/app/page.tsx` |
| Module pages (stub) | ✅ Done | All 6 modules show "coming soon" placeholder |
| Ragic proxy routes (data) | ⬜ Pending | No `/api/ragic/` data routes yet |
| Module content (tables, forms) | ⬜ Pending | All modules are stubs |
| Zustand stores | ⬜ Pending | Planned, not yet created |
| Axios / createApiAction | ⬜ Pending | Planned, not yet created |
| i18n / next-intl | ⬜ Pending | `messages/en.json` and `de.json` exist but are empty `{}` |
| Custom hooks | ⬜ Pending | No `src/hooks/` folder yet |
| Server actions | ⬜ Pending | No `src/actions/` folder yet |
| TypeScript types | ⬜ Pending | No `src/types/` folder yet |
| Zod schemas (modules) | ⬜ Pending | No `src/validations/` folder yet |

---

## Actual Folder Structure

```
RIVEROS/
│
├── .claude/
│   └── commands/
│       └── nextjs-setup.md              Claude Code custom command
│
├── docs/
│   ├── project_overview.md              ← This file
│   ├── ragic.md                         Ragic API reference + limitations
│   └── ragic_auth.md                    Full auth design decisions + Ragic auth docs
│
├── messages/                            i18n translation files (empty — not yet used)
│   ├── en.json                          English strings  {}
│   └── de.json                          German strings   {}
│
├── public/
│   ├── logo.jpg                         River Advice company logo
│   ├── file.svg                         Next.js default asset
│   ├── globe.svg                        Next.js default asset
│   ├── next.svg                         Next.js default asset
│   ├── vercel.svg                       Next.js default asset
│   └── window.svg                       Next.js default asset
│
├── src/
│   │
│   ├── app/
│   │   ├── page.tsx                     Root route → redirects to /login
│   │   ├── layout.tsx                   Root layout (Geist fonts, global CSS)
│   │   ├── globals.css                  Tailwind CSS v4 base + shadcn CSS variables
│   │   ├── favicon.ico
│   │   │
│   │   ├── (auth)/                      Auth route group (no shared layout)
│   │   │   ├── layout.tsx               Passthrough layout (just renders children)
│   │   │   └── login/
│   │   │       └── page.tsx             ✅ Login page — /login
│   │   │
│   │   ├── (dashboard)/                 Dashboard route group
│   │   │   ├── layout.tsx               ✅ Dashboard layout — reads JWT cookie,
│   │   │   │                              renders TopNav with user data
│   │   │   └── dashboard/
│   │   │       ├── page.tsx             ✅ /dashboard — Welcome + ModuleGrid
│   │   │       ├── flgo/
│   │   │       │   └── page.tsx         ⬜ /dashboard/flgo — "coming soon" stub
│   │   │       ├── maintenance/
│   │   │       │   └── page.tsx         ⬜ /dashboard/maintenance — stub
│   │   │       ├── certificate/
│   │   │       │   └── page.tsx         ⬜ /dashboard/certificate — stub
│   │   │       ├── material/
│   │   │       │   └── page.tsx         ⬜ /dashboard/material — stub
│   │   │       ├── qhse/
│   │   │       │   └── page.tsx         ⬜ /dashboard/qhse — stub
│   │   │       └── repair/
│   │   │           └── page.tsx         ⬜ /dashboard/repair — stub
│   │   │
│   │   └── api/
│   │       └── auth/
│   │           ├── route.ts             ✅ POST /api/auth — login handler
│   │           └── signout/
│   │               └── route.ts         ✅ POST /api/auth/signout — logout handler
│   │
│   ├── components/
│   │   ├── ui/                          shadcn/ui primitives (do not hand-edit)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   └── label.tsx
│   │   │
│   │   ├── global/
│   │   │   └── layout/
│   │   │       └── top-nav.tsx          ✅ TopNav — sticky header, vessel badge,
│   │   │                                  user dropdown, profile slide-over, sign out
│   │   │
│   │   └── features/
│   │       └── modules/
│   │           └── module-grid.tsx      ✅ Dashboard module card grid (6 modules)
│   │
│   ├── constants/
│   │   └── ragic-fields.ts              ✅ Sheet paths + field ID constants
│   │                                      SHEETS.USERS, USER_FIELDS.*
│   │
│   ├── lib/
│   │   ├── auth.ts                      ✅ JWT sign/verify using jose
│   │   │                                  signToken(), verifyToken(), COOKIE_NAME
│   │   ├── ragic.ts                     ✅ Ragic HTTP utility (server-only)
│   │   │                                  ragicRequest(), ragicPasswordAuth()
│   │   └── utils.ts                     ✅ cn() helper (clsx + tailwind-merge)
│   │
│   ├── proxy.ts                         ✅ Route protection (Next.js 16 middleware)
│   │                                      Exported as proxy() not middleware()
│   │                                      Public paths: /login, /api/auth
│   │
│   └── styles/
│       └── globals.scss                 Global SCSS (available for complex styles)
│
├── .env.example                         Template — copy to .env.local and fill values
├── .env.local                           ← Real secrets (gitignored)
├── .gitignore
├── components.json                      shadcn/ui config (New York, neutral, RSC)
├── eslint.config.mjs
├── next.config.ts                       Next.js config (currently default/empty)
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json
```

---

## Architecture — The Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — BROWSER (Client)                                     │
│                                                                 │
│   React Components (Client or Server)                           │
│   ├── Server components read JWT from cookie server-side        │
│   ├── Client components use React Hook Form, local state        │
│   ├── [Future] Read cached data from Zustand store              │
│   └── Render output                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │  fetch() / axios (planned)
                         │  calls /api/auth or /api/ragic/...
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — NEXT.JS SERVER (API Routes + Proxy)                  │
│                                                                 │
│   /api/auth/route.ts       — validates credentials, issues JWT  │
│   /api/auth/signout/       — deletes cookie                     │
│   [Future] /api/ragic/**   — proxy to Ragic data API           │
│                                                                 │
│   proxy.ts (middleware)    — JWT verification on every request  │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS with Authorization header
                         │  Basic Auth: RAGIC_API_KEY
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — RAGIC (Database)                                     │
│                                                                 │
│   https://eu4.ragic.com/rtoperations/{tab}/{sheet_index}        │
│   ├── AUTH endpoint   → validates user credentials              │
│   ├── ragic-setup/1   → users sheet (name, vessel info)         │
│   ├── GET             → returns records as JSON (keyed by ID)   │
│   ├── POST            → creates new record                      │
│   ├── PUT             → updates existing record (merge)         │
│   └── DELETE          → deletes record                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Auth Flow (Completed) — Step by Step

```
1.  User visits / → proxy.ts → no cookie → redirect /login
         │
         ▼
2.  User fills email + password on /login
    React Hook Form + Zod validates client-side
         │
         ▼
3.  POST /api/auth  { email, password }
         │
         ▼  STEP A — Validate credentials
4.  ragicPasswordAuth(email, password)
    → GET https://eu4.ragic.com/AUTH?u=email&p=pwd&login_type=sessionId&json=1&api=
    → Returns { sid: "..." } on success, or -1 on failure
    → If -1: return 401 "Invalid email or password"
         │
         ▼  STEP B — Fetch user profile
5.  ragicRequest("ragic-setup/1", { params: { where: "1,eq,<email>" } })
    → Authorization: Basic <RAGIC_API_KEY>
    → Returns sheet rows as object keyed by record ID
    → Extracts: name (field "4"), vessel (field "1000191"), vesselAbbr (field "1000543")
    → If user not in sheet: empty strings — login still succeeds
         │
         ▼  STEP C — Issue JWT
6.  signToken({ email, name, vessel, vesselAbbr })
    → jose SignJWT, algorithm HS256, expiry 24h
    → Cookie: riveros_token, httpOnly, sameSite:lax, secure:prod, maxAge:86400
         │
         ▼
7.  Client receives { ok: true } → router.push("/dashboard")
         │
         ▼
8.  proxy.ts intercepts /dashboard request
    → reads riveros_token cookie
    → verifyToken() with JWT_SECRET
    → valid → allow through
         │
         ▼
9.  (dashboard)/layout.tsx — server component
    → reads cookie, verifies token
    → passes { name, email, vessel, vesselAbbr } to TopNav
         │
         ▼
10. Dashboard renders with user's name, vessel badge in TopNav
```

---

## Auth — Key Files

| File | Role |
|---|---|
| `src/proxy.ts` | Route protection — intercepts all requests, verifies JWT, redirects unauthenticated users to /login |
| `src/lib/auth.ts` | `signToken()`, `verifyToken()`, exports `COOKIE_NAME = "riveros_token"` |
| `src/lib/ragic.ts` | `ragicRequest()` — central Ragic API utility (server-only). `ragicPasswordAuth()` — credential validation |
| `src/constants/ragic-fields.ts` | Named constants for all sheet paths and field IDs |
| `src/app/api/auth/route.ts` | POST /api/auth — orchestrates login (Steps A-C above) |
| `src/app/api/auth/signout/route.ts` | POST /api/auth/signout — deletes cookie |
| `src/app/(auth)/login/page.tsx` | Login UI — split-panel design, maritime theme |

---

## Dashboard — What Exists

### TopNav (`src/components/global/layout/top-nav.tsx`)
- Sticky header with RIVEROS brand
- Vessel badge (shows assigned vessel from JWT)
- User dropdown: name initials, name, email, Profile, Settings, Sign Out
- Profile slide-over panel: avatar with initials, email row, vessel row with abbreviation
- Keyboard: Escape closes profile panel
- Click outside closes dropdown
- Sign out: POST /api/auth/signout → router.push("/login")

### Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)
- Server component — reads JWT cookie, extracts first name
- Greeting: "Welcome back, {firstName}"
- Renders `<ModuleGrid />` client component

### Module Grid (`src/components/features/modules/module-grid.tsx`)
6 modules defined, each as a card linking to `/dashboard/{slug}`:

| Slug | Name | Icon | Color Theme |
|---|---|---|---|
| `flgo` | FLGO | Droplets | Cyan |
| `maintenance` | Maintenance | Wrench | Blue |
| `certificate` | Certificate | Award | Purple |
| `material` | Material | Package | Amber |
| `qhse` | QHSE | ShieldCheck | Green |
| `repair` | Repair | Hammer | Red |

Each card: hover lift + border color change + icon scale, "Open module" CTA with arrow.

### Module Stub Pages
All 6 module pages exist with a back link, icon, title, and "Module content coming soon." placeholder.

---

## What Needs To Be Built Next

### 1. Ragic Data Proxy Routes
For each module, create `src/app/api/ragic/{module}/route.ts`:
- Read `RAGIC_BASE_URL` and `RAGIC_API_KEY` from `process.env`
- Append `?v=3&api&naming=EID`
- Set `Authorization: Basic {API_KEY}`
- Convert Ragic object response → array with `Object.values()`
- Map Ragic field IDs → camelCase TypeScript keys (normalization)
- Never expose API key in responses

### 2. Zustand Stores (`src/store/`)
One store per module:
- `measurements: T[]` + `hasFetched: boolean` (data cache)
- `isLoading`, `isSubmitting`, `error`, `submitError` (request state)
- `selectedRecord`, `isEditModalOpen`, etc. (UI state)

### 3. Custom Hooks (`src/hooks/`)
One hook per module task — fetch + mutate:
- On mount: check `hasFetched` → if false, call proxy route → populate store
- `updateRecord()`, `createRecord()` etc. → update store on success, preserve on failure

### 4. TypeScript Types (`src/types/modules/`)
One file per module — interfaces matching Ragic sheet fields.

### 5. Zod Schemas (`src/validations/modules/`)
One file per module — shared between frontend validation and server-side processing.

### 6. Module UI Components (`src/components/features/modules/`)
Per module: table, form, detail panel, edit modal.

### 7. i18n (next-intl)
- `messages/en.json` and `messages/de.json` are empty — need to be populated
- `src/i18n/routing.ts` needs to be created
- `proxy.ts` needs locale routing logic added

---

## Environment Variables

File: `.env.local` — never committed (gitignored).

```env
# Ragic
RAGIC_BASE_URL=https://eu4.ragic.com/rtoperations
RAGIC_API_KEY=<base64-encoded-api-key>    # Pre-encoded, used directly in Authorization: Basic header

# Auth
JWT_SECRET=<min-32-char-random-string>    # Changing this invalidates ALL existing sessions

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Rules
- `RAGIC_API_KEY` — never expose to browser. No `NEXT_PUBLIC_` prefix.
- `JWT_SECRET` — minimum 32 characters. Server-side only.
- Only `NEXT_PUBLIC_APP_URL` is safe to use in client code.

---

## Ragic Field IDs (Auth-Related)

Sheet: `ragic-setup/1`

| Field | Field ID | Value in JWT |
|---|---|---|
| Email | `"1"` | `email` |
| Name | `"4"` | `name` |
| Assigned Vessel | `"1000191"` | `vessel` |
| Vessel Abbreviation | `"1000543"` | `vesselAbbr` |

---

## Security Rules (Non-Negotiable)

1. **Never call Ragic from the frontend.** All Ragic requests go through `/api/` routes only.
2. **Never expose `RAGIC_API_KEY` to the client.** No `NEXT_PUBLIC_` prefix.
3. **Never store JWT in localStorage.** httpOnly cookie only (`riveros_token`).
4. **JWT validation lives in `proxy.ts`** — not repeated per route.
5. **One central `ragicRequest()` utility** — never raw `fetch` to Ragic inline.
6. **Never hardcode field IDs inline.** Always use constants from `src/constants/ragic-fields.ts`.

---

## Important Implementation Notes

### Next.js 16 Middleware Renamed
In Next.js 16, `middleware.ts` is renamed to `proxy.ts`.
The exported function must be named `proxy` (not `middleware`).
See: https://nextjs.org/docs/messages/middleware-to-proxy

### Ragic GET Response Is an Object, Not an Array
```json
{ "1001": { ...fields }, "1002": { ...fields } }
```
Always call `Object.values(ragicData)` in proxy routes before sending to frontend.

### Ragic Uses Field IDs with `naming=EID`
Always append `&naming=EID` to use numeric field IDs as response keys (not display labels).
This makes normalization predictable and immune to label changes in Ragic.

### Ragic Returns HTTP 200 for Errors
Always check the response body for `{ status: "ERROR", code: 106 }` — do not rely on HTTP status alone.
Error code 106 = Authorization header missing or API key lacks sheet access.

### Ragic AUTH Response
The live response field is `sid` (not `sessionId`):
```json
{ "sid": "node01e9n2x660xersf5gabszt5327634615", "email": "...", "2fa": { ... } }
```

---

## Running the Project

```bash
# First time setup
cp .env.example .env.local     # fill in RAGIC_BASE_URL, RAGIC_API_KEY, JWT_SECRET

npm install
npm run dev                    # starts dev server at http://localhost:3000
npm run build                  # production build
npm run lint                   # ESLint
```

---

## Where To Put Things — Quick Reference

| What you are building | Where it goes |
|---|---|
| New UI primitive (button, badge, spinner) | `src/components/ui/` (via shadcn) |
| App-wide layout (header, nav) | `src/components/global/layout/` |
| Feature component for a module | `src/components/features/modules/{module}/` |
| Module page | `src/app/(dashboard)/dashboard/{module}/page.tsx` |
| Ragic proxy route for a module | `src/app/api/ragic/{module}/route.ts` |
| JWT utilities | `src/lib/auth.ts` |
| Ragic API utility | `src/lib/ragic.ts` |
| Pure helper (cn, etc.) | `src/lib/utils.ts` |
| Sheet paths + field IDs | `src/constants/ragic-fields.ts` |
| Route protection / middleware | `src/proxy.ts` |
| Data hook for a module | `src/hooks/{module}/use-{task}.ts` |
| Zustand store | `src/store/{module}.store.ts` |
| Zod schema | `src/validations/modules/{module}.ts` |
| TypeScript interfaces | `src/types/modules/{module}.ts` |
| Translation strings | `messages/en.json` + `messages/de.json` |

---

## Docs In This Folder

| File | Contents |
|---|---|
| `project_overview.md` | This file — current state, structure, what's done, what's next |
| `ragic.md` | Ragic REST API reference, limitations, and how this project handles each |
| `ragic_auth.md` | Full auth design decisions, complete login flow step-by-step, JWT spec, debug findings |
| `dashboard.md` | Dashboard implementation reference — layout, TopNav, ModuleGrid, design system, reuse guide |
