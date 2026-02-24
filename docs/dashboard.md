# RIVEROS — Dashboard Implementation Reference

> Complete technical record of the dashboard shell, TopNav, and module card grid.
> Written as a reuse reference — adapt this for any future Next.js SaaS project.

> **Last updated:** 2026-02-24
> **Status:** ✅ Dashboard shell complete. Module content (tables, forms) pending.

---

## 1. What the Dashboard Is

The dashboard is the authenticated home screen that a user lands on after login.
It consists of three distinct pieces:

| Piece | File | Type | Purpose |
|---|---|---|---|
| Layout wrapper | `src/app/(dashboard)/layout.tsx` | Server Component | Reads JWT cookie, renders TopNav, wraps all child routes |
| Dashboard page | `src/app/(dashboard)/dashboard/page.tsx` | Server Component | Greeting header + ModuleGrid |
| TopNav | `src/components/global/layout/top-nav.tsx` | Client Component | Sticky header, vessel badge, user dropdown, profile slide-over |
| ModuleGrid | `src/components/features/modules/module-grid.tsx` | Client Component | 6 clickable module cards |

---

## 2. Route Group Structure

```
src/app/
├── (auth)/                    ← Auth group — no shared layout beyond passthrough
│   ├── layout.tsx             Passthrough (just renders {children})
│   └── login/
│       └── page.tsx           /login
│
└── (dashboard)/               ← Dashboard group — shared layout with TopNav
    ├── layout.tsx             Reads JWT → TopNav → wraps all pages below
    └── dashboard/
        ├── page.tsx           /dashboard  (welcome + module grid)
        ├── flgo/page.tsx      /dashboard/flgo
        ├── maintenance/       /dashboard/maintenance
        ├── certificate/       /dashboard/certificate
        ├── material/          /dashboard/material
        ├── qhse/              /dashboard/qhse
        └── repair/            /dashboard/repair
```

**Why route groups?**
Next.js route groups (`(name)`) create a shared layout boundary without affecting the URL.
`(dashboard)/layout.tsx` wraps every route under `/dashboard/**` with the TopNav automatically.
`(auth)/layout.tsx` is a bare passthrough — login has no shared chrome.

---

## 3. Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

```typescript
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import TopNav from "@/components/global/layout/top-nav";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("riveros_token")?.value;
  const user = token ? await verifyToken(token) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        vessel={user?.vessel ?? ""}
        vesselAbbr={user?.vesselAbbr ?? ""}
      />
      <main className="max-w-screen-xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
```

### What it does step by step

```
1. Server Component runs on every request to /dashboard/**
        │
        ▼
2. Reads the httpOnly cookie "riveros_token" using next/headers cookies()
        │
        ▼
3. Calls verifyToken(token) — jose jwtVerify with JWT_SECRET
   Returns { email, name, vessel, vesselAbbr } or null if invalid/missing
        │
        ▼
4. Passes user data as props to <TopNav />
   If token is null/invalid: all props are empty strings
   (proxy.ts has already blocked invalid tokens — this is just defensive)
        │
        ▼
5. Renders TopNav (sticky header) + main content wrapper
   Children (dashboard page, module pages) render inside <main>
```

### Key design decisions
- **Layout reads JWT directly** — no client fetch, no useState, no useEffect
- **Proxy.ts has already verified** the token before this layout even runs
- Reading the token again in the layout is just to extract the user's name/vessel for display
- If `verifyToken` returns null here (edge case), TopNav receives empty strings — not a crash

---

## 4. Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)

```typescript
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import ModuleGrid from "@/components/features/modules/module-grid";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("riveros_token")?.value;
  const user = token ? await verifyToken(token) : null;

  const firstName = user?.name?.split(" ")[0] || user?.name || "there";

  return (
    <div>
      <div className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400 mb-2">
          Operations Dashboard
        </p>
        <h1 className="text-[28px] font-bold text-[#04111f] tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500">
          Select a module to get started.
        </p>
      </div>
      <ModuleGrid />
    </div>
  );
}
```

### Notes
- Also a Server Component — reads JWT cookie the same way as the layout
- Extracts only `firstName` (splits on space, takes first word: "John Smith" → "John")
- `<ModuleGrid />` is a Client Component (handles hover state) — imported and rendered here

---

## 5. TopNav (`src/components/global/layout/top-nav.tsx`)

### What it renders

```
┌──────────────────────────────────────────────────────────────────────┐
│  [⚓ RIVEROS]              [Anchor MV Atlas]  ─  [N ▾ Name ▾]       │
└──────────────────────────────────────────────────────────────────────┘
     Brand                  Vessel badge             User dropdown
```

### Props

```typescript
interface TopNavProps {
  name: string;        // Full name from JWT — used for initials + display
  email: string;       // Email from JWT — shown in dropdown header
  vessel: string;      // Assigned vessel from JWT — shown in badge
  vesselAbbr: string;  // Short vessel code from JWT — shown in profile panel
}
```

### Components inside TopNav

#### Brand
- Ship icon (Lucide) in a dark navy gradient square
- "RIVEROS" text in bold tracked caps

#### Vessel Badge
- Only rendered if `vessel` prop is non-empty
- Anchor icon (Lucide) + vessel name
- Blue glass gradient pill
- Hidden on mobile (`hidden sm:flex`)
- Truncates at 180px max-width for long vessel names

#### User Dropdown
- Trigger: avatar circle (navy gradient, initials) + first name + chevron
- Click-outside closes via `useRef` + `document.addEventListener("mousedown", ...)`
- Dropdown panel: name/email header + Profile button + Settings button + Sign Out
- Sign Out calls `POST /api/auth/signout` then `router.push("/login")`

#### Profile Slide-Over Panel
- Triggered by clicking "Profile" in the dropdown
- Covers right side of screen: fixed, `w-80`, `translateX(100%)` → `translateX(0)` on open
- Backdrop: semi-transparent blur overlay, click-to-close
- Keyboard: `Escape` key closes (event listener on `document`)
- Shows: large initials avatar, full name, email row, vessel row + abbreviation
- Sign Out button also in panel footer

### State managed

```typescript
const [dropdownOpen, setDropdownOpen] = useState(false);  // user menu dropdown
const [profileOpen, setProfileOpen] = useState(false);    // profile slide-over
```

### Icon library used
**Lucide React** — Ship, Anchor, User, Settings, LogOut, ChevronDown, X, Mail

### Styling approach
- All inline `style={{}}` for animation values and dynamic CSS (transforms, box-shadows)
- Tailwind for structural layout, spacing, responsive classes
- `sticky top-0 z-40` — stays at top while scrolling
- `bg-white/95 backdrop-blur-sm` — frosted glass header

---

## 6. ModuleGrid (`src/components/features/modules/module-grid.tsx`)

### Architecture pattern: Config-driven rendering

All 6 modules are declared in a single `MODULES` array of `ModuleConfig` objects.
The `ModuleCard` component renders from the config — no per-module JSX duplication.

**To add a new module:** add one object to the `MODULES` array.
**To change a module's colour:** edit only the config object.

### ModuleConfig interface

```typescript
interface ModuleConfig {
  slug: string;        // URL segment: /dashboard/{slug}
  name: string;        // Display name on card (e.g. "FLGO")
  label: string;       // Category pill text (e.g. "Fuel Operations")
  Icon: ComponentType; // Tabler icon component
  accent: string;      // Hex — used for icon, pill text, CTA, hover border
  iconBg: string;      // CSS gradient for icon container background
  iconGlow: string;    // box-shadow for icon container (outer glow + inner highlight)
  cardWash: string;    // Radial gradient overlay on card bg — module colour identity
  hoverBorder: string; // Border colour when hovered
  hoverShadow: string; // box-shadow when hovered (coloured, deep)
  pillBg: string;      // Category pill background (accent at ~8% opacity)
}
```

### Card anatomy (visual layers)

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 0: Card base                                            │
│   linear-gradient(158deg, #ffffff → #f8fafd)                  │
│                                                               │
│ Layer 1: Per-module radial wash (absolute, pointer-events:none│
│   radial-gradient(ellipse at 95% 5%, accent@9% → transparent)│
│                                                               │
│ Layer 2: Content (relative z-10)                             │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  p-8 (32px)                                          │    │
│  │                                                      │    │
│  │  [ICON BOX 64×64]              [PILL LABEL]          │    │
│  │   rounded-[14px]               accent text           │    │
│  │   gradient bg                  accent@8% bg          │    │
│  │   outer glow + inner highlight                       │    │
│  │                                                      │    │
│  │  MODULE NAME  22px bold  #0f172a                     │    │
│  │                                                      │    │
│  │  [flex-1 spacer — pins CTA to bottom]                │    │
│  │                                                      │    │
│  │  ──────────────────────── (gradient divider)         │    │
│  │  Open module  → (accent colour, arrow slides 4px)    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Hover state (applied to card wrapper div via inline style)

| Property | Rest | Hover | Transition |
|---|---|---|---|
| `transform` | `translateY(0)` | `translateY(-5px)` | 220ms spring |
| `borderColor` | `rgba(15,23,42,0.08)` | `mod.hoverBorder` (accent@42%) | 220ms ease-out |
| `boxShadow` | soft 2-layer dark | `mod.hoverShadow` (deep coloured) | 220ms ease-out |
| icon scale | `scale(1)` | `scale(1.10)` | 220ms spring |
| arrow | `translateX(0)` | `translateX(4px)` | 220ms spring |

**Transition easing:** `cubic-bezier(0.22,1,0.36,1)` — ease-in-slow, ease-out-fast (spring feel).

### Hover state implementation

```typescript
// useState tracks hover — entire card is wrapped in the hover zone
const [hovered, setHovered] = useState(false);

<div
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    transform: hovered ? "translateY(-5px)" : "translateY(0px)",
    // ...etc
  }}
>
```

### Module colour palette

| Module | Slug | Accent | Theme |
|---|---|---|---|
| FLGO | `flgo` | `#0E7490` | Deep Teal |
| Maintenance | `maintenance` | `#1D4ED8` | Navy Blue |
| Certificate | `certificate` | `#6D28D9` | Deep Violet |
| Material | `material` | `#92400E` | Dark Amber |
| QHSE | `qhse` | `#047857` | Forest Green |
| Repair | `repair` | `#9F1239` | Deep Rose |

**Design principle:** all accents are dark/desaturated — not neon. At low opacity they give
a calm maritime tone. At full opacity (text/icons) they have clear colour identity.

---

## 7. Icon Library — Tabler Icons

**Package:** `@tabler/icons-react`

### Why Tabler over Lucide for module cards

| Need | Lucide | Tabler |
|---|---|---|
| Certificate icon | `BadgeCheck` — looks like a badge/approval | `IconCertificate` — looks like an actual diploma with ribbon |
| Fuel icon | `Fuel` — generic fuel | `IconGasStation` — recognisable gas pump silhouette |
| Maintenance | `Wrench` | `IconTool` — same concept, consistent Tabler stroke style |

### Tabler icon prop API

```typescript
// Props: size, stroke (= strokeWidth), plus standard SVG/HTML props
<IconGasStation
  size={30}          // number — default 24
  stroke={1.5}       // number — stroke width (default 2). NOTE: "stroke" not "strokeWidth"
  style={{ color: mod.accent }}   // color via CSS currentColor
/>
```

> **Important:** In Tabler's API, `stroke` is the **stroke width** (not color).
> Color is set via `style={{ color: "..." }}` because icons use `currentColor` internally.
> This is different from Lucide where the prop is `strokeWidth`.

### Icons used

| Module | Icon name | Visual |
|---|---|---|
| FLGO | `IconGasStation` | Gas pump station |
| Maintenance | `IconTool` | Single wrench/tool |
| Certificate | `IconCertificate` | Diploma with ribbon seal |
| Material | `IconPackages` | Multiple stacked boxes |
| QHSE | `IconShieldCheck` | Shield with checkmark |
| Repair | `IconHammer` | Hammer |
| CTA arrow | `IconArrowRight` | Simple right arrow |

---

## 8. Module Stub Pages

All 6 module pages exist and are identical in structure:

```typescript
// src/app/(dashboard)/dashboard/{slug}/page.tsx
export default function FlgoPage() {
  return (
    <div>
      {/* Back link, icon, title, "Module content coming soon." */}
    </div>
  );
}
```

These are Server Components (no `"use client"` directive) with placeholder content.
They will be filled with data tables, forms, and Ragic proxy calls in later phases.

---

## 9. Data Flow — How User Info Gets to the UI

```
LOGIN  (POST /api/auth)
  │
  ├─ Ragic AUTH endpoint validates credentials
  ├─ Ragic ragic-setup/1 sheet provides: name, vessel, vesselAbbr
  ├─ signToken({ email, name, vessel, vesselAbbr })  ← jose HS256
  └─ Set httpOnly cookie "riveros_token"  ← 24h expiry
          │
          ▼
EVERY REQUEST  (proxy.ts)
  │
  └─ verifyToken(cookie) → valid? → allow │ invalid? → delete cookie + /login
          │
          ▼
DASHBOARD LAYOUT  (server component, per request)
  │
  ├─ cookies().get("riveros_token")
  ├─ verifyToken(token) → { email, name, vessel, vesselAbbr }
  └─ <TopNav name={} email={} vessel={} vesselAbbr={} />
          │
          ▼
TOPNAV  (client component)
  │
  ├─ Displays: initials avatar, first name, vessel badge
  ├─ Dropdown: full name, email
  └─ Profile panel: full name, email, vessel, vesselAbbr
          │
          ▼
DASHBOARD PAGE  (server component)
  │
  ├─ cookies().get("riveros_token")  ← reads again (independent from layout)
  ├─ verifyToken(token) → firstName (first word of name)
  └─ "Welcome back, {firstName}" heading
```

**Key point:** User data is read from the JWT cookie on the server — zero client API calls
for user info. Everything the dashboard displays about the user comes directly from the token.

---

## 10. Page Background and Layout Tokens

### Dashboard page background
```
<div className="min-h-screen bg-slate-50">
```
Slate-50 (`#f8fafc`) — off-white, prevents harsh white contrast.

### Content container
```
<main className="max-w-screen-xl mx-auto px-6 py-10">
```
- `max-w-screen-xl` = 1280px max width
- `px-6` = 24px horizontal padding
- `py-10` = 40px vertical padding

### Module grid
```
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
```
- 1 column on mobile
- 2 columns on tablet (640px+)
- 3 columns on desktop (1024px+)
- 24px gap

---

## 11. How to Reuse This in a New Project

### Step 1 — Copy the route group structure

```bash
src/app/
├── (auth)/layout.tsx          # bare passthrough
├── (auth)/login/page.tsx
├── (dashboard)/layout.tsx     # reads JWT → TopNav
└── (dashboard)/dashboard/page.tsx
```

### Step 2 — Copy the auth library files

```
src/lib/auth.ts            # signToken(), verifyToken(), COOKIE_NAME
src/proxy.ts               # route protection (Next.js 16 naming)
```

Change:
- `COOKIE_NAME` to your app name
- `JWTPayload` fields to match your user model
- Public paths in `proxy.ts` to match your app's public routes

### Step 3 — Copy TopNav and adapt

`src/components/global/layout/top-nav.tsx`

Change:
- Brand name and icon (currently "RIVEROS" + Ship icon)
- The badge (currently vessel — replace with team/org/plan)
- Props to match your JWT payload fields

### Step 4 — Copy ModuleGrid and adapt

`src/components/features/modules/module-grid.tsx`

Change:
- `MODULES` array — update slugs, names, labels, icons, accent colors
- Keep the `ModuleConfig` interface and `ModuleCard` component unchanged
- Only the data in `MODULES` needs to change for a different product

### Step 5 — Install required packages

```bash
npm install jose @tabler/icons-react lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install clsx tailwind-merge class-variance-authority
```

### Step 6 — Environment variables

```env
JWT_SECRET=<min-32-char-random>
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Add your own data backend keys here
```

### Summary of what you get

- Authenticated route group with shared TopNav
- JWT read server-side — no client fetch needed
- Sticky header with user avatar, badge, dropdown, profile slide-over
- Sign out (deletes cookie, redirects to /login)
- Config-driven module card grid
- Per-module colour identity
- Hover animations with spring easing
- Fully responsive (1/2/3 column grid)
- TypeScript throughout

---

## 12. Files Reference

| File | Description |
|---|---|
| `src/app/(dashboard)/layout.tsx` | Layout wrapper — reads JWT, renders TopNav |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard page — greeting + ModuleGrid |
| `src/app/(dashboard)/dashboard/{module}/page.tsx` | 6 stub pages (flgo, maintenance, certificate, material, qhse, repair) |
| `src/components/global/layout/top-nav.tsx` | Sticky header component (Client Component) |
| `src/components/features/modules/module-grid.tsx` | 6-card module grid (Client Component) |
| `src/lib/auth.ts` | JWT sign + verify utilities |
| `src/proxy.ts` | Route protection (Next.js 16 middleware) |
| `src/constants/ragic-fields.ts` | Named constants for Ragic sheet paths + field IDs |
