# RIVEROS — Project Overview

Maritime Operations Web Application — custom UI layer over Ragic database.

---

## What This Project Is

Ragic is used as the database backend. Ragic provides its own interface but it is not suitable for operational use.
This project replaces the Ragic native UI with a fast, multilingual, role-aware custom web application
built on Next.js — while keeping Ragic as the single source of truth for all data.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Pages, routing, server proxy, API routes |
| Build | Turbopack | Fast dev server (`next dev --turbopack`) |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS + Shadcn/ui | UI primitives and utility classes |
| SCSS | Sass | Available for complex styles if needed |
| Forms | React Hook Form + Zod | Form state, validation, schema reuse |
| State | Zustand | Client-side cache + UI state |
| HTTP | Axios | Centralized HTTP client (`createApiAction`) |
| i18n | next-intl | English and German translations |
| Icons | Lucide React | Icon system |
| Database | Ragic (external) | All persistent data, accessed via REST API |

---

## Folder Structure

```
RIVEROS/
├── messages/                        Translation JSON files
│   ├── en.json                      English strings
│   └── de.json                      German strings
│
├── docs/                            Project documentation (this folder)
│
├── public/                          Static assets (images, logos, fonts)
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/               Login page  →  /login
│   │   │
│   │   ├── (dashboard)/
│   │   │   └── modules/             All module pages under one route group
│   │   │       ├── flgo/
│   │   │       │   ├── measurement/ Page  →  /modules/flgo/measurement
│   │   │       │   └── bunkering/   Page  →  /modules/flgo/bunkering
│   │   │       ├── module-2/
│   │   │       ├── module-3/
│   │   │       ├── module-4/
│   │   │       ├── module-5/
│   │   │       ├── module-6/
│   │   │       ├── module-7/
│   │   │       └── module-8/
│   │   │
│   │   └── api/
│   │       └── ragic/               Proxy layer — Next.js backend to Ragic
│   │           ├── flgo/
│   │           │   ├── measurement/ Route handler for Measurement API calls
│   │           │   └── bunkering/
│   │           ├── module-2/
│   │           └── ...
│   │
│   ├── components/
│   │   ├── ui/                      Shadcn primitives (Button, Input, Badge...)
│   │   ├── global/
│   │   │   ├── forms/               GlobalFormProvider, FormField, FormSelect
│   │   │   └── layout/              AppShell, Sidebar, TopNav
│   │   └── features/
│   │       └── modules/             Feature components — ALL modules under one roof
│   │           ├── flgo/
│   │           │   ├── measurement/
│   │           │   └── bunkering/
│   │           └── module-2/ ...
│   │
│   ├── lib/
│   │   ├── api-client.ts            Single axios instance + createApiAction()
│   │   ├── ragic.ts                 Ragic base URL + API key (server-only)
│   │   └── utils.ts                 cn() helper (clsx + tailwind-merge)
│   │
│   ├── hooks/                       Custom hooks — data fetching per module
│   │   ├── flgo/
│   │   │   ├── use-measurement.ts
│   │   │   └── use-bunkering.ts
│   │   └── module-2/ ...
│   │
│   ├── actions/                     Server Actions — mutations per module
│   │   ├── flgo/
│   │   │   ├── measurement.actions.ts
│   │   │   └── bunkering.actions.ts
│   │   └── module-2/ ...
│   │
│   ├── store/                       Zustand stores — cache + UI state
│   │   └── measurement.store.ts     (one store per module)
│   │
│   ├── types/                       TypeScript interfaces
│   │   ├── ragic.ts                 Ragic response shapes
│   │   └── modules/
│   │       └── flgo.ts
│   │
│   ├── validations/                 Zod schemas — shared frontend + server
│   │   └── modules/
│   │       └── flgo.ts
│   │
│   ├── i18n/
│   │   └── routing.ts               next-intl locale config (en, de)
│   │
│   └── styles/
│       └── globals.scss             Global SCSS (available if Tailwind is not enough)
│
├── .env.example                     Template — copy to .env and fill values
├── components.json                  Shadcn configuration
└── middleware.ts                    next-intl locale routing middleware
```

---

## Architecture — The Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — BROWSER (Client)                                     │
│                                                                 │
│   React Components                                              │
│   ├── Read UI state from Zustand store                          │
│   ├── Read cached data from Zustand store                       │
│   ├── Call hook functions (fetch, create, update, delete)       │
│   └── Render output                                             │
│                                                                 │
│   Zustand Store                                                 │
│   ├── Cached Ragic data (avoids repeat API calls)               │
│   ├── UI state (modal open, selected row, active tab)           │
│   ├── Request state (isLoading, isSubmitting, error)            │
│   └── hasFetched flag (skip fetch if data already in cache)     │
└────────────────────────┬────────────────────────────────────────┘
                         │  axios via createApiAction()
                         │  calls /api/ragic/...
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — NEXT.JS SERVER (Proxy)                               │
│                                                                 │
│   /api/ragic/flgo/measurement/route.ts                          │
│   ├── Receives request from browser                             │
│   ├── Reads RAGIC_API_KEY from process.env (never sent to       │
│   │   browser — this is why the proxy exists)                   │
│   ├── Forwards request to Ragic REST API                        │
│   └── Returns Ragic response to the browser                     │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS with Authorization header
                         │  Basic Auth: API Key
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — RAGIC (Database)                                     │
│                                                                 │
│   https://ap12.ragic.com/{account}/{tab}/{sheet_index}          │
│   ├── GET    → returns records as JSON                          │
│   ├── POST   → creates new record                               │
│   ├── PUT    → updates existing record                          │
│   └── DELETE → deletes record                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow — Read (GET)

```
1.  Component mounts
        │
        ▼
2.  Hook runs → checks Zustand: hasFetched = false?
        │  YES — no data yet
        ▼
3.  createApiAction('get', '/flgo/measurement')
        │  calls axios → hits /api/ragic/flgo/measurement
        ▼
4.  Next.js proxy route
        │  adds Authorization: Basic {RAGIC_API_KEY}
        │  forwards to Ragic
        ▼
5.  Ragic returns JSON array of records
        ▼
6.  Hook calls setMeasurements(data) → saved in Zustand
        │  hasFetched = true
        ▼
7.  Component re-renders → table shows data

--- user navigates away and comes back ---

1.  Component mounts again
        │
        ▼
2.  Hook runs → checks Zustand: hasFetched = true
        │  data already in cache
        ▼
3.  Table renders instantly from Zustand ← NO API call made
```

---

## Data Flow — Write (POST / PUT / DELETE)

```
1.  User fills form and clicks Save
        │
        ▼
2.  Zod schema validates form data (client-side)
        │  invalid → show field errors, stop here
        │  valid → continue
        ▼
3.  Hook function called (e.g. updateMeasurement)
        │
        ▼
4.  isSubmitting = true in Zustand → button disables (prevents double click)
        │
        ▼
5.  createApiAction('put', '/flgo/measurement/123', data)
        │  axios → /api/ragic/flgo/measurement/123
        ▼
6.  Next.js proxy → adds API key → PUT to Ragic
        │
        ▼
        ├── SUCCESS ──────────────────────────────────────────────
        │   Ragic returns updated record
        │       ▼
        │   updateMeasurementInStore(id, updatedRecord)
        │       Zustand updates the record in the array in place
        │       NO refetch from Ragic needed
        │       ▼
        │   closeEditModal() → modal closes
        │   isSubmitting = false → button re-enables
        │   UI shows new data instantly
        │
        └── FAILURE ──────────────────────────────────────────────
            Network error or Ragic error
                ▼
            Zustand store unchanged — old data preserved
                ▼
            submitError = 'Update failed. Please retry.'
            isSubmitting = false → button re-enables
            Modal stays open with user's typed values
                ▼
            User clicks Save again → retries safely
```

---

## Zustand Store — What Lives Where

```
┌──────────────────────────────────────────────────────┐
│  measurement.store.ts                                │
│                                                      │
│  SERVER DATA (cache)                                 │
│  ├── measurements: Measurement[]   ← Ragic records   │
│  └── hasFetched: boolean           ← skip re-fetch   │
│                                                      │
│  REQUEST STATE                                       │
│  ├── isLoading: boolean            ← page spinner    │
│  ├── isSubmitting: boolean         ← form button     │
│  ├── error: string | null          ← fetch error     │
│  └── submitError: string | null    ← mutation error  │
│                                                      │
│  UI STATE                                            │
│  ├── selectedMeasurement           ← clicked row     │
│  ├── isEditModalOpen: boolean      ← modal visible   │
│  └── activeFilter: string          ← active tab      │
└──────────────────────────────────────────────────────┘

RULE: Server data (Ragic records) lives in Zustand as a cache.
      After a successful mutation Zustand is updated directly.
      Ragic is NOT re-fetched unless the user explicitly refreshes.
      If mutation fails, Zustand is untouched — old data is preserved for retry.
```

---

## i18n — How Translations Work

```
messages/
├── en.json    { "flgo": { "measurement": { "title": "Measurement" } } }
└── de.json    { "flgo": { "measurement": { "title": "Messung" } } }

src/i18n/routing.ts     → defines locales: ['en', 'de'], defaultLocale: 'en'
middleware.ts           → intercepts requests, routes /en/... or /de/...

In components:
  const t = useTranslations('flgo.measurement')
  <h1>{t('title')}</h1>   → "Measurement" or "Messung" depending on locale
```

---

## Module Structure — All 8 Under One Roof

```
src/components/features/modules/
├── flgo/
│   ├── measurement/     MeasurementTable, MeasurementForm, MeasurementDetailPanel
│   └── bunkering/       BunkeringTable, BunkeringForm ...
├── module-2/
├── module-3/
├── module-4/
├── module-5/
├── module-6/
├── module-7/
└── module-8/
```

Every module follows the same pattern. The folder is the boundary.
Components for FLGO Measurement never cross into FLGO Bunkering.
Both pull shared primitives from `components/ui/` and `components/global/`.

---

## Where To Put Things — Quick Reference

| What you are building | Where it goes |
|---|---|
| New UI primitive (button, badge, spinner) | `src/components/ui/` |
| App shell, sidebar, top nav | `src/components/global/layout/` |
| Form system, form fields | `src/components/global/forms/` |
| FLGO Measurement component | `src/components/features/modules/flgo/measurement/` |
| Any module page | `src/app/(dashboard)/modules/<module>/page.tsx` |
| Ragic proxy route for a module | `src/app/api/ragic/<module>/route.ts` |
| axios instance and createApiAction | `src/lib/api-client.ts` |
| Ragic config — base URL, API key | `src/lib/ragic.ts` |
| Data hook for a module | `src/hooks/<module>/use-<task>.ts` |
| Server Action (mutation needing revalidation) | `src/actions/<module>/<task>.actions.ts` |
| Zustand store | `src/store/<module>.store.ts` |
| Zod schema | `src/validations/modules/<module>.ts` |
| TypeScript interfaces | `src/types/modules/<module>.ts` |
| Translation strings | `messages/en.json` and `messages/de.json` |
| Pure helper function | `src/lib/utils.ts` |

---

## Complete Example Workflow — FLGO Measurement

This is a full end-to-end trace of the Measurement module:
- User opens the page → sees a list of measurements
- Clicks a row → detail panel opens
- Clicks Edit → modal opens with pre-filled form
- Changes quantity → saves → list updates instantly

---

### Files Involved

```
src/types/modules/flgo.ts                              Interface
src/validations/modules/flgo.ts                        Zod schema
src/store/measurement.store.ts                         Zustand cache + UI state
src/lib/api-client.ts                                  axios dispatcher
src/app/api/ragic/flgo/measurement/route.ts            Proxy to Ragic
src/hooks/flgo/use-measurement.ts                      Data hook
src/components/features/modules/flgo/measurement/      UI components
src/app/(dashboard)/modules/flgo/measurement/page.tsx  Page
messages/en.json                                       English text
messages/de.json                                       German text
```

---

### 1. Type Definition

```ts
// src/types/modules/flgo.ts
export interface Measurement {
  id: string
  vesselName: string
  portName: string
  quantity: number
  status: 'pending' | 'completed'
  measuredAt: string
}
```

---

### 2. Zod Schema (shared frontend + server)

```ts
// src/validations/modules/flgo.ts
export const measurementSchema = z.object({
  vesselName: z.string().min(1, 'Required'),
  portName:   z.string().min(1, 'Required'),
  quantity:   z.number().positive('Must be greater than 0'),
})
export type MeasurementFormData = z.infer<typeof measurementSchema>
```

---

### 3. Zustand Store

```ts
// src/store/measurement.store.ts
export const useMeasurementStore = create<MeasurementStore>((set) => ({
  measurements:        [],
  hasFetched:          false,
  isLoading:           false,
  isSubmitting:        false,
  error:               null,
  submitError:         null,
  selectedMeasurement: null,
  isEditModalOpen:     false,

  setMeasurements:          (data) => set({ measurements: data, hasFetched: true }),
  addMeasurement:           (m)    => set((s) => ({ measurements: [...s.measurements, m] })),
  updateMeasurementInStore: (id, updated) =>
    set((s) => ({
      measurements: s.measurements.map((m) => m.id === id ? updated : m),
      selectedMeasurement: updated,
    })),
  setSubmitting: (v) => set({ isSubmitting: v }),
  setError:      (e) => set({ error: e }),
  setSubmitError:(e) => set({ submitError: e }),
  openEditModal: ()  => set({ isEditModalOpen: true }),
  closeEditModal:()  => set({ isEditModalOpen: false }),
  selectMeasurement: (m) => set({ selectedMeasurement: m }),
}))
```

---

### 4. Proxy Route

```ts
// src/app/api/ragic/flgo/measurement/route.ts
export async function GET() {
  const res = await fetch(`${process.env.RAGIC_BASE_URL}/flgo/measurement?v=3&api`, {
    headers: { Authorization: `Basic ${process.env.RAGIC_API_KEY}` },
  })
  return NextResponse.json(await res.json())
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const res = await fetch(`${process.env.RAGIC_BASE_URL}/flgo/measurement/${params.id}?v=3&api`, {
    method: 'PUT',
    headers: { Authorization: `Basic ${process.env.RAGIC_API_KEY}` },
    body: JSON.stringify(body),
  })
  return NextResponse.json(await res.json())
}
```

---

### 5. Hook

```ts
// src/hooks/flgo/use-measurement.ts
export function useMeasurements() {
  const store = useMeasurementStore()

  useEffect(() => {
    if (store.hasFetched) return         // cache hit — skip API call
    store.setLoading(true)
    createApiAction<Measurement[]>('get', '/flgo/measurement')
      .then(store.setMeasurements)
      .catch(() => store.setError('Failed to load'))
      .finally(() => store.setLoading(false))
  }, [store.hasFetched])

  async function updateMeasurement(id: string, data: MeasurementFormData) {
    if (store.isSubmitting) return       // block double click
    store.setSubmitting(true)
    store.setSubmitError(null)
    try {
      const updated = await createApiAction<Measurement>('put', `/flgo/measurement/${id}`, data)
      store.updateMeasurementInStore(id, updated)  // update cache, no refetch
      store.closeEditModal()
    } catch {
      store.setSubmitError('Update failed. Your data is safe — please retry.')
    } finally {
      store.setSubmitting(false)
    }
  }

  return { ...store, updateMeasurement }
}
```

---

### 6. Page

```ts
// src/app/(dashboard)/modules/flgo/measurement/page.tsx
export default function MeasurementPage() {
  const { measurements, isLoading, error } = useMeasurements()
  const t = useTranslations('flgo.measurement')

  if (isLoading) return <Spinner />
  if (error)     return <ErrorMessage message={error} />

  return (
    <div>
      <h1>{t('title')}</h1>
      <MeasurementTable data={measurements} />
      <MeasurementDetailPanel />
      <MeasurementEditModal />
    </div>
  )
}
```

---

### Full Flow Diagram

```
① Page loads
   Component mounts
        │
        ▼
   useMeasurements() → hasFetched = false
        │
        ▼
   createApiAction GET /flgo/measurement
        │
        ▼
   /api/ragic/flgo/measurement (proxy adds API key)
        │
        ▼
   Ragic returns 5 records
        │
        ▼
   setMeasurements([5 records]) → Zustand cache
   hasFetched = true
        │
        ▼
   Table renders 5 rows ✅

② User clicks row 3
   selectMeasurement(row3) → Zustand
   Detail panel reads selectedMeasurement → renders ✅

③ User clicks Edit
   openEditModal() → Zustand: isEditModalOpen = true
   Modal reads selectedMeasurement → pre-fills form ✅

④ User changes quantity 300 → 450, clicks Save
        │
        ▼
   Zod validates → passes
        │
        ▼
   updateMeasurement('id3', { quantity: 450 })
        │
        ▼
   isSubmitting = true → button disables ✅
        │
        ▼
   PUT /api/ragic/flgo/measurement/id3
        │
   ┌────┴────┐
SUCCESS    FAIL
   │           │
   ▼           ▼
Zustand    Zustand
updated    unchanged
row3=450   row3=300 (safe)
   │           │
   ▼           ▼
Modal      submitError shown
closes     Modal stays open
Button     Button re-enables
re-enables User retries ✅
List
shows 450 ✅
```

---

## Environment Variables

```bash
# .env  (copy from .env.example — never commit real values)

RAGIC_BASE_URL=https://ap12.ragic.com/your-account   # server-only
RAGIC_API_KEY=your_api_key_here                       # server-only — never in browser
NEXT_PUBLIC_APP_URL=http://localhost:3000             # safe for browser
```

`RAGIC_BASE_URL` and `RAGIC_API_KEY` have no `NEXT_PUBLIC_` prefix — Next.js will never
send them to the browser. Only proxy routes in `src/app/api/ragic/` use these.

---

## Running the Project

```bash
cp .env.example .env       # fill in RAGIC_BASE_URL and RAGIC_API_KEY
npm run dev                # starts with Turbopack at http://localhost:3000
npm run build              # production build
npm run lint               # ESLint check
```
