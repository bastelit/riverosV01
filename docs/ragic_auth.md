# RIVEROS — Ragic Authentication Documentation

> Complete record of all authentication design decisions, implementation details,
> and Ragic API integration for the RIVEROS maritime operations system.

> **Last updated:** 2026-02-24
> **Auth status:** ✅ COMPLETE — login, JWT, route protection, sign out all working.

---

## 1. Project Context

| Item | Value |
|---|---|
| Application | RIVEROS — River Operations System |
| Company | River Advice — Competence on Inland Waterways |
| Domain | Maritime / Vessel Operations |
| Database | Ragic (EU4 region — `https://eu4.ragic.com/rtoperations`) |
| Auth strategy | Custom JWT — no third-party auth service |

**Key principle:** Ragic is the only data store. There is no PostgreSQL, Prisma, or local database.
All data lives in Ragic sheets. Auth validates against Ragic and we issue our own JWT.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.1.6 |
| React | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui | New York style, neutral base |
| Form handling | React Hook Form + Zod | Latest |
| Icons | Lucide React + Tabler Icons | Latest |
| JWT library | `jose` | Latest (Edge-compatible) |
| State | Zustand | 5.x |
| i18n | next-intl | 4.x (installed, not yet wired) |

> **Why `jose` instead of `jsonwebtoken`?**
> `jsonwebtoken` uses Node.js crypto APIs that are not available in the Next.js Edge Runtime.
> `jose` is Edge-compatible and works in both `proxy.ts` (middleware) and API routes.

---

## 3. Confirmed Design Decisions

Every item below was explicitly confirmed during the design conversation.

### 3.1 Auth Service
- ✅ **No third-party auth** — no Clerk, no NextAuth, no Auth.js
- ✅ Custom JWT issued by our own Next.js backend
- ✅ Ragic Password Auth endpoint used only to **validate credentials** — we do not use the Ragic session ID for anything after login

### 3.2 User Data Storage in JWT
- ✅ **Option A chosen**: all user fields stored directly in the JWT payload
- Payload at login: `{ email, name, vessel, vesselAbbr }`
- User profile data is fetched **once at login** from `ragic-setup/1` and embedded in the token
- **No re-fetch on every page load** — all downstream components read from the JWT cookie

### 3.3 Users with No Vessel Assigned
- ✅ **Option B chosen**: let them in with empty vessel fields
- If a user exists in Ragic's auth system but has **no record in `ragic-setup/1`**, they are allowed to log in
- `vessel` and `vesselAbbr` will be empty strings in the JWT
- The TopNav vessel badge is conditionally rendered (`{vessel && <...>}`) — not shown if empty

### 3.4 Root Route Behaviour
- ✅ `/` always redirects to `/login`
- If already authenticated, proxy passes through to `/dashboard`
- If not authenticated, proxy redirects to `/login`

### 3.5 Cookie
- ✅ Cookie name: **`riveros_token`**
- ✅ Storage: **httpOnly cookie** (never localStorage — protects against XSS)
- ✅ Expiry: **24 hours** (`maxAge: 86400`)
- ✅ `sameSite: "lax"`, `secure: true` in production only

### 3.6 Routing After Login
- ✅ Successful login redirects to `/dashboard`
- ✅ Sign out deletes the cookie and redirects to `/login`

### 3.7 Field IDs (ragic-setup/1)
- ✅ Confirmed field IDs:
  - Email: `"1"`
  - Name: `"4"`
  - Assigned Vessel: `"1000191"`
  - Vessel Abbreviation: `"1000543"`
- ✅ One email = one user — no duplicate email records in Ragic

### 3.8 shadcn/ui Components Added
- ✅ `button`, `card`, `input`, `label`, `form`
- Installed via: `node node_modules/shadcn/dist/index.js add <component>`

### 3.9 Next.js 16 Middleware Rename
- ✅ In Next.js 16, `middleware.ts` is renamed to `proxy.ts`
- The exported function must be named `proxy` (not `middleware`)
- See: https://nextjs.org/docs/messages/middleware-to-proxy

---

## 4. Ragic API — Documentation Reference

> Source: [Ragic API Developer Guide](https://www.ragic.com/intl/en/doc-api)

### 4.1 Password Authentication Endpoint

**Reference:** [Password Authentication](https://www.ragic.com/intl/en/doc-api/5/Password-authentication)

```
GET https://<server>/AUTH?u=<email>&p=<password>&login_type=sessionId&json=1&api=
```

| Parameter | Value | Description |
|---|---|---|
| `u` | user email | Login email address |
| `p` | password | User password |
| `login_type` | `sessionId` | Request a session ID token |
| `json` | `1` | Return response as JSON |
| `api` | (empty) | Marks this as an API call |

**Response on success:**
```json
{
  "sid": "node01e9n2x660xersf5gabszt5327634615",
  "email": "user@example.com",
  "2fa": { "is2faLogin": false },
  "accounts": {}
}
```
The key field is **`sid`** (not `sessionId` — confirmed from live debug output).
The `sid` value is only used to confirm the password is valid. It is discarded after that.

**Response on failure:**
```
-1
```
or
```json
{ "sessionId": -1 }
```

**Important:** The server subdomain must match the account's server.
- Our account is on `eu4.ragic.com` → auth URL is `https://eu4.ragic.com/AUTH`

### 4.2 HTTP Basic Authentication with API Key

**Reference:** [HTTP Basic Authentication](https://www.ragic.com/intl/en/doc-api/24/HTTP-Basic-authentication-with-Ragic-API-Key)

All Ragic sheet API calls (reading user profile at login) require:
```
Authorization: Basic <RAGIC_API_KEY>
```
The API key is pre-encoded base64 — use it directly in the header value.
This is handled automatically by `ragicRequest()` in `src/lib/ragic.ts`.

### 4.3 Sheet Query Format

**Reference:** [REST Interface](https://www.ragic.com/intl/en/doc-api/0/Ragic-REST-Web-Service-Interface)

```
GET /rtoperations/<tab>/<sheetId>?v=3&api&naming=EID&where=<fieldId>,eq,<value>
```

| Parameter | Value | Description |
|---|---|---|
| `v` | `3` | API version pin |
| `api` | (empty) | Marks as API call |
| `naming` | `EID` | Use numeric field IDs as JSON keys (not display labels) |
| `where` | `fieldId,eq,value` | Filter records by field value |

### 4.4 Ragic Error Code 106

Ragic returns HTTP 200 even for errors. Always check the response body.

```json
{
  "status": "ERROR",
  "msg": "This sheet is access right protected. You will need to provide an API key...",
  "code": 106
}
```

Error code 106 = Authorization header is missing, malformed, or the API key does not have
read access to that sheet. Fix: verify `RAGIC_API_KEY` in `.env.local` is the correct
pre-encoded base64 key from Ragic Account Settings → API Key.

---

## 5. Ragic Sheets Used in Auth

### 5.1 Users Sheet — `ragic-setup/1`

**URL:** `https://eu4.ragic.com/rtoperations/ragic-setup/1`

| Field | Field ID | Description |
|---|---|---|
| Email | `1` | User's login email (unique per user) |
| Name | `4` | User's full name |
| Assigned Vessel | `1000191` | Vessel name assigned to this user |
| Vessel Abbreviation | `1000543` | Short code for the vessel |

Query used at login:
```
GET /rtoperations/ragic-setup/1?v=3&api=&naming=EID&where=1,eq,<email>
```

**Important:** The response is a JSON object keyed by record ID, not an array:
```json
{
  "1023": {
    "1": "user@example.com",
    "4": "John Smith",
    "1000191": "MV Atlas",
    "1000543": "MVA"
  }
}
```
We call `Object.values(sheetData)` to get the rows array, then take `rows[0]`.

---

## 6. Complete Login Flow — What Happens at Login Time

This is the full step-by-step of what happens from the moment the user hits "Sign In".

```
USER BROWSER
│
│  1. Fills email + password on /login
│     React Hook Form validates client-side with Zod:
│       - email: must be valid email format
│       - password: must be non-empty (min 1 char)
│     On first invalid submit: inline field errors shown
│
│  2. Submits: POST /api/auth  { email, password }
│     fetch("/api/auth", { method: "POST", headers: {Content-Type: application/json}, body: JSON.stringify({email,password}) })
│
└─────────────────────────────────────────────────────────────────────────▼

NEXT.JS SERVER — POST /api/auth  (src/app/api/auth/route.ts)
│
│  STEP A — Validate credentials against Ragic
│  ─────────────────────────────────────────────────────────────────────
│  ragicPasswordAuth(email, password)
│    → GET https://eu4.ragic.com/AUTH?u={email}&p={password}&login_type=sessionId&json=1&api=
│    → No Authorization header needed (this is a public password endpoint)
│    → Response text is parsed:
│       • { sid: "node01..." } = success → extract sid string
│       • -1 or { sessionId: -1 }  = failure → return null
│    → If null: return 401 { error: "Invalid email or password." }
│    → The sid is only used to confirm validity. It is NOT stored anywhere.
│
│  STEP B — Fetch user profile from ragic-setup/1
│  ─────────────────────────────────────────────────────────────────────
│  ragicRequest("ragic-setup/1", { params: { where: "1,eq,{email}" } })
│    → GET https://eu4.ragic.com/rtoperations/ragic-setup/1
│        ?v=3&api=&naming=EID&where=1,eq,{email}
│    → Authorization: Basic {RAGIC_API_KEY}   ← from process.env (server only)
│    → Response: object keyed by record ID
│       { "1023": { "1": email, "4": name, "1000191": vessel, "1000543": abbr } }
│    → Object.values(sheetData).filter(v => typeof v === "object")
│       → rows[0] = first (and only) matching record
│    → Extract:
│       name       = rows[0]["4"]        or ""  (if not in sheet)
│       vessel     = rows[0]["1000191"]  or ""
│       vesselAbbr = rows[0]["1000543"]  or ""
│    → If user has no row in ragic-setup/1: all three are empty strings.
│      Login still succeeds — the user is authenticated via Ragic password.
│
│  STEP C — Sign JWT
│  ─────────────────────────────────────────────────────────────────────
│  signToken({ email, name, vessel, vesselAbbr })
│    → jose SignJWT
│    → Algorithm: HS256
│    → Expiry: 24h from issuedAt
│    → Secret: process.env.JWT_SECRET (min 32 chars)
│    → Returns signed token string
│
│  STEP D — Set httpOnly cookie
│  ─────────────────────────────────────────────────────────────────────
│  response.cookies.set("riveros_token", token, {
│    httpOnly: true,                         ← JS cannot read this cookie
│    secure: NODE_ENV === "production",      ← HTTPS only in prod
│    sameSite: "lax",                        ← CSRF protection
│    maxAge: 86400,                          ← 24 hours in seconds
│    path: "/",                              ← sent on all routes
│  })
│
│  STEP E — Return success
│  ─────────────────────────────────────────────────────────────────────
│  return NextResponse.json({ ok: true })
│
└─────────────────────────────────────────────────────────────────────────▼

USER BROWSER (receives { ok: true })
│
│  3. Login page receives 200 { ok: true }
│     router.push("/dashboard")
│
└─────────────────────────────────────────────────────────────────────────▼

PROXY.TS — intercepts GET /dashboard
│
│  4. Reads req.cookies.get("riveros_token")
│     verifyToken(token) → jose jwtVerify with JWT_SECRET
│     Valid → NextResponse.next()  (allow through to layout)
│
└─────────────────────────────────────────────────────────────────────────▼

DASHBOARD LAYOUT  (src/app/(dashboard)/layout.tsx)
│
│  5. Server Component runs
│     cookies().get("riveros_token")
│     verifyToken(token) → { email, name, vessel, vesselAbbr }
│     Passes to <TopNav name={} email={} vessel={} vesselAbbr={} />
│
└─────────────────────────────────────────────────────────────────────────▼

DASHBOARD PAGE  (src/app/(dashboard)/dashboard/page.tsx)
│
│  6. Server Component runs
│     cookies().get("riveros_token")
│     verifyToken(token) → firstName (first word of name)
│     Renders "Welcome back, {firstName}" + <ModuleGrid />
│
└─────────────────────────────────────────────────────────────────────────▼

BROWSER RENDERS DASHBOARD
│
│  TopNav shows:  vessel badge, user initials, first name
│  Dashboard shows: "Welcome back, {firstName}", 6 module cards
│
└─────────────────────────────────────────────────────────────────────────
```

---

## 7. Sign Out Flow

```
User clicks "Sign Out" in TopNav dropdown (or profile panel)
    │
    ▼
TopNav client component
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/login")
    │
    ▼
POST /api/auth/signout  (src/app/api/auth/signout/route.ts)
    response.cookies.delete("riveros_token")
    return { ok: true }
    │
    ▼
Browser navigates to /login
    │
    ▼
proxy.ts: no cookie → pathname is /login → public path → allow
```

---

## 8. Route Protection (proxy.ts)

Next.js 16 renamed `middleware.ts` → `proxy.ts`.
The exported function must be named `proxy`.

```typescript
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — skip JWT check
  const PUBLIC_PATHS = ["/login", "/api/auth"];
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  // Protected path — verify token
  const token = req.cookies.get("riveros_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = await verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("riveros_token");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg|.*\\.png|.*\\.svg).*)"],
};
```

**Public paths:**
- `/login`
- `/api/auth` and all sub-paths (includes `/api/auth/signout`)

**On invalid/expired token:** delete cookie + redirect to `/login`

---

## 9. File Structure — Auth-Related Files

```
src/
├── proxy.ts                          ← Route protection (Next.js 16 naming)
│                                       Exports: proxy() function
│
├── lib/
│   ├── auth.ts                       ← JWT sign + verify
│   │     signToken(payload)  → Promise<string>
│   │     verifyToken(token)  → Promise<JWTPayload | null>
│   │     COOKIE_NAME = "riveros_token"
│   │
│   └── ragic.ts                      ← Ragic HTTP utilities (server-only)
│         ragicRequest(path, opts)      → T
│         ragicPasswordAuth(email, pw)  → string | null
│         ⚠ Contains DEBUG console.log statements — remove before production
│
├── constants/
│   └── ragic-fields.ts               ← Named constants — never hardcode IDs inline
│         SHEETS.USERS = "ragic-setup/1"
│         USER_FIELDS.EMAIL = "1"
│         USER_FIELDS.NAME = "4"
│         USER_FIELDS.ASSIGNED_VESSEL = "1000191"
│         USER_FIELDS.VESSEL_ABBREVIATION = "1000543"
│
└── app/
    ├── api/
    │   └── auth/
    │       ├── route.ts              ← POST /api/auth — login (Steps A–E)
    │       └── signout/
    │           └── route.ts          ← POST /api/auth/signout — logout
    │
    ├── (auth)/
    │   └── login/
    │       └── page.tsx              ← Login UI — split panel, maritime design
    │
    └── (dashboard)/
        ├── layout.tsx                ← Reads JWT → TopNav (server component)
        └── dashboard/
            └── page.tsx              ← Reads JWT → firstName greeting (server component)
```

---

## 10. Environment Variables

File: `.env.local` (never committed — gitignored)

```env
# Ragic
RAGIC_BASE_URL=https://eu4.ragic.com/rtoperations
RAGIC_API_KEY=<base64-encoded-ragic-api-key>

# Auth
JWT_SECRET=<min-32-char-random-string>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Rules
- `RAGIC_API_KEY` — pre-encoded base64 string from Ragic Account Settings → API Key. Used directly in `Authorization: Basic <key>` header. Never send to browser.
- `JWT_SECRET` — minimum 32 characters. Any change invalidates ALL existing sessions (all users get logged out).
- **No `NEXT_PUBLIC_` prefix on secrets** — only `NEXT_PUBLIC_APP_URL` is safe client-side.

---

## 11. JWT Specification

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 24 hours |
| Library | `jose` (Edge-compatible) |
| Cookie name | `riveros_token` |
| Storage | httpOnly cookie — NOT localStorage |

**Payload shape:**
```typescript
interface JWTPayload {
  email: string;      // Ragic login email — primary identifier
  name: string;       // Full name from ragic-setup/1 field "4"
  vessel: string;     // Assigned vessel from field "1000191" — empty string if unassigned
  vesselAbbr: string; // Vessel abbreviation from field "1000543" — empty string if unassigned
}
```

**How the payload is used after login:**

| Consumer | Field used | How |
|---|---|---|
| `(dashboard)/layout.tsx` | `name`, `email`, `vessel`, `vesselAbbr` | Passed as props to TopNav |
| `TopNav` | `name` | Initials avatar, first name in header, full name in dropdown |
| `TopNav` | `email` | Shown in dropdown header + profile panel |
| `TopNav` | `vessel` | Vessel badge in header (hidden if empty) |
| `TopNav` | `vesselAbbr` | Shown in profile panel below vessel name |
| `dashboard/page.tsx` | `name` | firstName extracted for "Welcome back, {firstName}" |

---

## 12. Debug Findings (Resolved)

### Finding 1: Ragic AUTH response field name
**Expected by docs:** `data.sessionId`
**Actual live response:** `data.sid`

```json
{ "sid": "node01e9n2x660xersf5gabszt5327634615", "email": "...", "2fa": { "is2faLogin": false } }
```
**Resolution:** Code reads `data?.sid`. The `sid` value is only used to confirm password is valid. Discarded immediately.

### Finding 2: ragicRequest returning code 106
**Symptom:** `ragicRequest("ragic-setup/1", ...)` returns `{ status: "ERROR", code: 106 }` with HTTP 200.
**Root cause:** `RAGIC_API_KEY` in `.env.local` was either missing, malformed, or the key did not have read access to `ragic-setup/1` in Ragic's permission settings.
**Resolution checklist:**
1. Verify `.env.local` has `RAGIC_API_KEY=<key>` with no quotes, no spaces
2. The key must be the base64-encoded value from Ragic Account Settings → API Key
3. In Ragic: check that the API key user has at least read access to the `ragic-setup` sheet
4. Restart the Next.js dev server after changing `.env.local`

> **Note:** `ragic.ts` still contains DEBUG console.log statements. Remove before production:
> All lines marked `// --- DEBUG ---` through `// --- END DEBUG ---`.

---

## 13. Security Rules (Non-Negotiable)

1. **Never call Ragic from the frontend.** All Ragic requests go through `/api/` routes only.
2. **Never expose `RAGIC_API_KEY` to the client.** No `NEXT_PUBLIC_` prefix.
3. **Never store JWT in localStorage.** httpOnly cookie only.
4. **JWT validation lives in `proxy.ts`** — not repeated per route.
5. **One central `ragicRequest()` utility** — never raw `fetch` to Ragic inline.
6. **Never hardcode field IDs inline.** Always use constants from `src/constants/ragic-fields.ts`.

---

## 14. Key Reference Links

| Resource | URL |
|---|---|
| Ragic API overview | https://www.ragic.com/intl/en/doc-api/0/Ragic-REST-Web-Service-Interface |
| Password authentication | https://www.ragic.com/intl/en/doc-api/5/Password-authentication |
| HTTP Basic auth (API key) | https://www.ragic.com/intl/en/doc-api/24/HTTP-Basic-authentication-with-Ragic-API-Key |
| Authentication overview | https://www.ragic.com/intl/en/doc-api/23/Authentication |
| Finding API endpoints | https://www.ragic.com/intl/en/doc-api/7/Finding-API-endpoints |
| API limits | https://www.ragic.com/intl/en/doc-api/22/API-Limits |
| Next.js proxy (middleware) | https://nextjs.org/docs/messages/middleware-to-proxy |
| jose library | https://github.com/panva/jose |
| Ragic account (EU4) | https://eu4.ragic.com/rtoperations |
