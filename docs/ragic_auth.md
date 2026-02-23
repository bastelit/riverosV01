# RIVEROS — Ragic Authentication Documentation

> Complete record of all authentication design decisions, implementation details,
> and Ragic API integration for the RIVEROS maritime operations system.

---

## 1. Project Context

| Item | Value |
|---|---|
| Application | RIVEROS — River Operations System |
| Company | River Advice — Competence on Inland Waterways |
| Domain | Maritime / Vessel Operations |
| Database | Ragic (EU4 region — `https://eu4.ragic.com/rtoperations`) |
| Auth strategy | Custom JWT — no third-party auth service |

**Key principle:** Ragic is the only data store. There is no PostgreSQL, Prisma, or local database. All data lives in Ragic sheets.

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
| Icons | Lucide React | Latest |
| JWT library | `jose` | Latest (Edge-compatible) |
| State | Zustand | 5.x |
| i18n | next-intl | 4.x |

> **Why `jose` instead of `jsonwebtoken`?**
> `jsonwebtoken` uses Node.js crypto APIs that are not available in the Next.js Edge Runtime.
> `jose` is Edge-compatible and works in both `proxy.ts` (middleware) and API routes.

---

## 3. Confirmed Design Decisions

Every item below was explicitly confirmed during the design conversation.

### 3.1 Auth Service
- ✅ **No third-party auth** — no Clerk, no NextAuth, no Auth.js
- ✅ Custom JWT issued by our own Next.js backend
- ✅ Ragic Password Auth endpoint used only to **validate credentials** — we do not use the Ragic session ID beyond login

### 3.2 User Data Storage in JWT
- ✅ **Option A chosen**: all user fields stored directly in the JWT payload
- Payload at login: `{ email, name, vessel, vesselAbbr }`
- User profile data is fetched **once at login** from `ragic-setup/1` and embedded in the token
- **No re-fetch on every page load** — all downstream components read from the JWT cookie

### 3.3 Users with No Vessel Assigned
- ✅ **Option B chosen**: let them in with empty vessel fields
- If a user exists in Ragic's auth system but has **no record in `ragic-setup/1`**, they are allowed to log in
- `vessel` and `vesselAbbr` will be empty strings in the JWT

### 3.4 Root Route Behaviour
- ✅ `/` always redirects to `/login`
- If already authenticated, the proxy passes through to `/dashboard`
- If not authenticated, proxy redirects to `/login`

### 3.5 Cookie
- ✅ Cookie name: **`riveros_token`**
- ✅ Storage: **httpOnly cookie** (never localStorage — protects against XSS)
- ✅ Expiry: **24 hours**
- ✅ `sameSite: "lax"`, `secure: true` in production

### 3.6 Routing After Login
- ✅ Successful login redirects to `/dashboard`
- ✅ Sign out deletes the cookie and redirects to `/login`

### 3.7 Field IDs
- ✅ Confirmed field IDs for `ragic-setup/1`:
  - Email: `"1"`
  - Name: `"4"`
  - Assigned Vessel: `"1000191"`
  - Vessel Abbreviation: `"1000543"`
- ✅ One email = one user — no duplicate email records in Ragic

### 3.8 shadcn/ui Components Added
- ✅ `button`, `card`, `input`, `label`, `form`
- Installed via: `node node_modules/shadcn/dist/index.js add <component>` (no npx — not available in this environment)

### 3.9 Next.js 16 Middleware Rename
- ✅ In Next.js 16, `middleware.ts` is renamed to `proxy.ts`
- The exported function must be named `proxy` (not `middleware`)
- See: `https://nextjs.org/docs/messages/middleware-to-proxy`

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

All Ragic sheet API calls require:
```
Authorization: Basic <RAGIC_API_KEY>
```
The API key is pre-encoded base64 — use it directly in the header value.

### 4.3 Sheet Query Format

**Reference:** [REST Interface](https://www.ragic.com/intl/en/doc-api/0/Ragic-REST-Web-Service-Interface)

```
GET /rtoperations/<tab>/<sheetId>?v=3&api&naming=EID&where=<fieldId>,eq,<value>
```

| Parameter | Value | Description |
|---|---|---|
| `v` | `3` | API version |
| `api` | (empty) | Marks as API call |
| `naming` | `EID` | Use field IDs (not display names) as JSON keys |
| `where` | `fieldId,eq,value` | Filter records by field value |

### 4.4 Ragic Error Code 106

During debug, the sheet query returned:
```json
{
  "status": "ERROR",
  "msg": "This sheet is access right protected. You will need to provide an API key...",
  "code": 106
}
```

**Note:** Ragic returns HTTP 200 even for error responses — the error is in the JSON body.
Error code 106 = the Authorization header is missing, malformed, or the API key does not have read access to that sheet.

---

## 5. Ragic Sheets Used in Auth

### 5.1 Users Sheet — `ragic-setup/1`

**URL:** `https://eu4.ragic.com/rtoperations/ragic-setup/1?PAGEID=bpd`

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

---

## 6. Authentication Flow — Step by Step

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  1. Fills email + password on /login page                       │
│  2. Submits form → POST /api/auth                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POST /api/auth  (server-side)                 │
│                                                                  │
│  Step 1: Call Ragic AUTH endpoint                               │
│    GET https://eu4.ragic.com/AUTH?u=email&p=pwd&...             │
│    → Returns { sid: "..." } on success, or -1 on failure        │
│    → If -1: return 401 "Invalid email or password"              │
│                                                                  │
│  Step 2: Fetch user profile from ragic-setup/1                  │
│    GET /rtoperations/ragic-setup/1?where=1,eq,<email>           │
│    Authorization: Basic <RAGIC_API_KEY>                         │
│    → Returns sheet rows as JSON object keyed by record ID       │
│    → Extract: name (field 4), vessel (1000191), abbr (1000543)  │
│    → If not found: use empty strings (user still logs in)       │
│                                                                  │
│  Step 3: Sign JWT                                               │
│    Payload: { email, name, vessel, vesselAbbr }                 │
│    Algorithm: HS256                                             │
│    Expiry: 24h                                                  │
│    Secret: JWT_SECRET (from env)                                │
│                                                                  │
│  Step 4: Set httpOnly cookie                                    │
│    Name:     riveros_token                                       │
│    httpOnly: true                                               │
│    sameSite: lax                                                │
│    secure:   true (production only)                             │
│    maxAge:   86400 (24 hours)                                   │
│    path:     /                                                  │
│                                                                  │
│  Step 5: Return { ok: true }                                    │
│    Client redirects to /dashboard                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Subsequent Requests                             │
│                                                                  │
│  proxy.ts intercepts every request                              │
│  → Reads riveros_token cookie                                   │
│  → Verifies JWT with JWT_SECRET                                 │
│  → Invalid/missing → redirect to /login + delete cookie         │
│  → Valid → allow request through                                │
│                                                                  │
│  Public paths (no JWT required):                                │
│  → /login                                                       │
│  → /api/auth  (and all sub-paths)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. File Structure — Auth-Related Files

```
src/
├── proxy.ts                          ← Route protection (Next.js 16 naming)
│                                       Replaces middleware.ts
│                                       Exports: proxy() function
│
├── lib/
│   ├── auth.ts                       ← JWT sign + verify
│   │     signToken(payload)  → string
│   │     verifyToken(token)  → JWTPayload | null
│   │     COOKIE_NAME exported
│   │
│   └── ragic.ts                      ← Ragic HTTP utilities
│         ragicRequest(path, opts)   → T
│         ragicPasswordAuth(email, pw) → string | null
│
├── constants/
│   └── ragic-fields.ts               ← All sheet paths + field IDs
│         SHEETS.USERS = "ragic-setup/1"
│         USER_FIELDS.EMAIL, NAME, ASSIGNED_VESSEL, VESSEL_ABBREVIATION
│
└── app/
    ├── api/
    │   └── auth/
    │       ├── route.ts              ← POST /api/auth (login)
    │       └── signout/
    │           └── route.ts          ← POST /api/auth/signout (logout)
    │
    └── (auth)/
        └── login/
            └── page.tsx              ← Login UI page
```

---

## 8. Environment Variables

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
- `RAGIC_API_KEY` — pre-encoded base64 string provided by Ragic. Used directly in `Authorization: Basic <key>` header.
- `JWT_SECRET` — minimum 32 characters. Any change invalidates all existing sessions.
- **No `NEXT_PUBLIC_` prefix on secrets** — they must stay server-side only.
- The API key is **never sent to the browser**. All Ragic calls go through `/api/` routes.

---

## 9. JWT Specification

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 24 hours |
| Library | `jose` (Edge-compatible) |
| Cookie name | `riveros_token` |
| Storage | httpOnly cookie (not localStorage) |

**Payload shape:**
```typescript
interface JWTPayload {
  email: string;      // User's Ragic login email
  name: string;       // Full name from ragic-setup/1, field "4"
  vessel: string;     // Assigned vessel from field "1000191"
  vesselAbbr: string; // Vessel abbreviation from field "1000543"
}
```

**Why httpOnly cookie over localStorage?**
- localStorage is accessible from JavaScript → vulnerable to XSS attacks
- httpOnly cookies cannot be read by JavaScript → XSS-safe
- Automatically sent on every request by the browser

---

## 10. Route Protection (proxy.ts)

Next.js 16 renamed `middleware.ts` → `proxy.ts` and requires the exported function to be named `proxy`.

```typescript
export async function proxy(req: NextRequest) { ... }
```

**Matcher pattern** — covers all routes except static files:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg|.*\\.png|.*\\.svg).*)"],
};
```

**Public paths** (no JWT required):
- `/login`
- `/api/auth` and all sub-paths (includes `/api/auth/signout`)

**On invalid/expired token:**
1. Delete the cookie
2. Redirect to `/login`

---

## 11. Sign Out Flow

```
User clicks "Sign Out" in TopNav dropdown
    ↓
Client: POST /api/auth/signout
    ↓
Server: response.cookies.delete("riveros_token")
    ↓
Client: router.push("/login")
    ↓
proxy.ts: no cookie → redirect to /login
```

---

## 12. Debug Findings

### Issue: Ragic AUTH response field name
**Expected:** `data.sessionId`
**Actual:** `data.sid`

The live response from `https://eu4.ragic.com/AUTH` is:
```json
{
  "sid": "node01e9n2x660xersf5gabszt5327634615",
  "email": "user@example.com",
  "2fa": { "is2faLogin": false },
  "accounts": {}
}
```
The field is `sid`, not `sessionId`. Code was corrected to read `data?.sid`.

### Issue: User sheet returning "guest account" error (code 106)
**Symptom:** `ragicRequest` to `ragic-setup/1` returns `{ status: "ERROR", code: 106 }` with HTTP 200.
**Root cause under investigation:** API key may not be attached correctly, or key lacks sheet access permission.
**Debug logs added to identify:** `ragicRequest` now logs `API_KEY defined`, `API_KEY length`, `API_KEY preview`, full URL, and HTTP status.

---

## 13. Security Rules (Non-Negotiable)

1. **Never call Ragic from the frontend.** All Ragic requests go through `/api/` routes only.
2. **Never expose `RAGIC_API_KEY` to the client.** No `NEXT_PUBLIC_` prefix.
3. **Never store JWT in localStorage.** httpOnly cookie only.
4. **JWT validation in `proxy.ts`** — not repeated per route.
5. **One central `ragicRequest` utility** — never raw `fetch` to Ragic inline.
6. **Never hardcode field IDs inline.** Always use named constants from `src/constants/ragic-fields.ts`.

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
