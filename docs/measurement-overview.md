# FLGO Measurement — Complete Workflow Overview

This document covers every step of how the FLGO Measurement screen works: where data comes from, how it is stored, how it is displayed, and how it is submitted back to Ragic.

---

## 1. High-Level Flow

```
USER LOGS IN
     │
     ▼
POST /api/auth
  ├─ Ragic auth (SID)
  ├─ Fetch user profile   → vessel, vesselAbbr, name   → JWT cookie (httpOnly)
  ├─ Fetch vessel list    → masterdata/3                ─┐
  └─ Fetch tanks          → masterdata/10               ─┤─ returned in JSON body
                                                         │
LOGIN PAGE (client)                                      │
  └─ useVesselStore.setAll({ vesselList, tanks, assignedVessel })
       └─ persisted to localStorage ("riveros-vessel-store")
                                                         │
USER NAVIGATES TO /dashboard/flgo                        │
     │                                                   │
     ▼                                                   │
FlgoPage (server component)                              │
  └─ reads JWT cookie → user.vessel, user.vesselAbbr     │
  └─ renders <FlgoModule vessel vesselAbbr />             │
                                                         │
FlgoModule (client)                                      │
  └─ useEffect → useLayoutStore.setModule("FLGO","flgo") │ (TopNav shows breadcrumb)
  └─ renders sub-header tabs: Measurement | Bunkering    │
  └─ renders <MeasurementView vessel vesselAbbr />        │
                                                         │
MeasurementView (client)                                 │
  └─ reads useVesselStore → tanks, vesselList ◄──────────┘
  └─ renders vessel strip, progress bar, tank table
  └─ user fills Actual Volume inputs
  └─ Submit → POST /api/ragic/flgo/measurement
                   └─ ragicRequest → Ragic flgo/28
```

---

## 2. Phase 1 — Login: Fetching and Storing Data

### File: `src/app/api/auth/route.ts`

When the user logs in, **five things happen in sequence**:

| Step | Action | Ragic Sheet | Field IDs Used |
|------|--------|-------------|----------------|
| 1 | Password auth → get SID | `https://eu4.ragic.com/AUTH` | email, password |
| 2 | Fetch user profile | `ragic-setup/1` | EMAIL=`1`, NAME=`4`, ASSIGNED_VESSEL=`1000191`, VESSEL_ABBREVIATION=`1000543` |
| 3 | Sign JWT | — | `{ email, name, vessel, vesselAbbr }` — 24h, HS256 |
| 4 | Fetch all vessels | `masterdata/3` | VESSEL NAME=`1000064` |
| 5 | Fetch tanks for assigned vessel | `masterdata/10` | VESSEL_NAME filter=`1022111`, TANK_NAME=`1000079`, FUEL_TYPE=`1000078`, MAX_CAPACITY=`1000080`, LAST_ROB=`1000795` |

The route returns:
```json
{
  "ok": true,
  "vesselList": ["Test Vessel", "Vessel B", ...],
  "tanks": [
    { "tankName": "FO Tank 1", "fuelType": "Fuel", "maxCapacity": "500", "lastRob": "320" },
    { "tankName": "FW Tank 1", "fuelType": "Fresh Water", "maxCapacity": "100", "lastRob": "80" }
  ],
  "assignedVessel": "Test Vessel"
}
```

The JWT is set as an **httpOnly cookie** (`riveros_token`, 24h, SameSite=lax).

---

### File: `src/app/(auth)/login/page.tsx`

After the API call succeeds, the login page client calls:

```ts
setAll({
  vesselList: data.vesselList ?? [],
  tanks: data.tanks ?? [],
  assignedVessel: data.assignedVessel ?? "",
});
router.push("/dashboard");
```

---

### File: `src/store/vessel-store.ts`

Zustand store with `persist` middleware — data survives **page refreshes**.

```
localStorage key: "riveros-vessel-store"

State shape:
  vesselList:      string[]   — all vessel names (for admin dropdown)
  tanks:           Tank[]     — tanks for the logged-in user's vessel
  assignedVessel:  string     — the user's vessel name

Tank interface:
  { tankName, fuelType, maxCapacity, lastRob }  (all strings)

Actions:
  setAll({ vesselList, tanks, assignedVessel })  — called once at login
  clear()                                        — called on logout
```

**Logout**: `top-nav.tsx` → `handleSignOut` calls `useVesselStore.getState().clear()` after the signout API call, wiping localStorage before redirecting to `/login`.

---

## 3. Phase 2 — Navigating to FLGO

### File: `src/app/(dashboard)/dashboard/flgo/page.tsx`

Server component. Reads the JWT cookie and passes `vessel` + `vesselAbbr` as props:

```ts
const user = token ? await verifyToken(token) : null;
return (
  <div className="-mt-10 -mb-10">   {/* cancels dashboard layout py-10 */}
    <FlgoModule vessel={user?.vessel ?? ""} vesselAbbr={user?.vesselAbbr ?? ""} />
  </div>
);
```

The `-mt-10 -mb-10` is needed because the dashboard layout applies `py-10` padding. Removing it lets `FlgoModule` fill the exact viewport height below the TopNav.

---

### File: `src/components/features/flgo/flgo-module.tsx`

Client component. On mount:

```ts
useEffect(() => {
  setModule("FLGO", "flgo");   // tells TopNav to show FLGO breadcrumb + Back link
  return () => clearModule();  // clears on unmount (back to dashboard)
}, [setModule, clearModule]);
```

Renders a full-height container (`height: calc(100vh - 56px)`) with:
- A sub-header tab bar: **Measurement** | **Bunkering** (Bunkering = coming soon)
- The active tab's content fills the remaining space

---

### File: `src/store/layout-store.ts`

Transient Zustand store — **no `persist`**, resets on page refresh.

```
State:
  moduleName: string   — e.g. "FLGO"
  moduleKey:  string   — e.g. "flgo" (used to look up icon + accent colour in TopNav)

Actions:
  setModule(name, key)
  clearModule()
```

`top-nav.tsx` reads this store. When `moduleName` is set, TopNav shows:
`RIVEROS → ← Back → [Droplets icon] FLGO — Fuel & Lubrication Grade Operations`

---

## 4. Phase 3 — Measurement View

### File: `src/components/features/flgo/measurement-view.tsx`

This is the main UI component. It has two modes depending on the user type.

---

#### 4.1 Normal User vs Admin

```ts
const isAdmin = !vessel;  // vessel comes from JWT via FlgoModule prop
```

| | Normal User | Admin |
|---|---|---|
| `vessel` prop | Filled (e.g. "Test Vessel") | Empty string `""` |
| Vessel display | Read-only text | `<select>` dropdown from `vesselList` |
| Tanks source | `useVesselStore → tanks` (pre-loaded at login) | Fetched on vessel selection via API |

---

#### 4.2 Data Sources in the Component

```ts
const storeTanks  = useVesselStore((s) => s.tanks);      // normal user tanks
const vesselList  = useVesselStore((s) => s.vesselList);  // admin dropdown options

const [activeTanks, setActiveTanks] = useState<Tank[]>(
  isAdmin ? [] : storeTanks  // normal user: immediate; admin: empty until vessel chosen
);
```

---

#### 4.3 Admin Vessel Selection — API Call

When an admin picks a vessel from the dropdown:

```ts
async function handleVesselSelect(v: string) {
  setLoadingTanks(true);
  const res  = await fetch(`/api/ragic/flgo/tanks?vessel=${encodeURIComponent(v)}`);
  const data = await res.json();
  setActiveTanks(data.tanks ?? []);
  setLoadingTanks(false);
}
```

**Route**: `src/app/api/ragic/flgo/tanks/route.ts`
- Verifies JWT cookie
- Queries `masterdata/10` with `where=1022111,eq,<vessel>`
- Returns `{ tanks: Tank[] }`

This is a **live fetch** — not stored in Zustand. Admin tank data is local to the component and resets on vessel change.

---

#### 4.4 UI Layout (no-scroll, fixed height)

```
┌────────────────────────────────────────────────────────┐
│  VESSEL  [Test Vessel]  ABBR. [TRV]  DATE [input]  TIME [input]  │  ← vessel strip
├────────────────────────────────────────────────────────┤
│  PROGRESS  [━━━━━━━━🚢━━━━] 3 / 8                     │  ← progress bar
├────────────────────────────────────────────────────────┤
│                    TANK DETAILS                        │  ← dark header
│  FUEL TYPE  │  TANK NAME  │  MAX CAPACITY  │  LAST ROB  │  ACTUAL VOLUME  │
│  [badge]    │  FO Tank 1  │  500           │  320       │  [   input   ]  │
│  ...        │  ...        │  ...           │  ...       │  [   input   ]  │
├────────────────────────────────────────────────────────┤
│                  [ Submit Measurement ]                │  ← always anchored
└────────────────────────────────────────────────────────┘
```

The outer `div` is `flex flex-col h-full`. Tank table section uses `flex-1 min-h-0` so it fills all remaining space without introducing scroll.

---

#### 4.5 Fuel Type Badge Colours

```ts
function fuelBadgeStyle(fuelType: string): React.CSSProperties {
  // Fresh Water / water  → light blue bg  rgba(51,102,255,0.10) + #3366ff text + border
  // Lube Oil / schmierstoff → solid #666666 + white text
  // Fuel / diesel / MGO / HFO → light red bg  rgba(255,102,102,0.10) + #ff6666 text + border
  // Unknown → light slate
}
```

---

#### 4.6 Enter Key Navigation

```ts
const inputRefs    = useRef<(HTMLInputElement | null)[]>([]);
const submitBtnRef = useRef<HTMLButtonElement>(null);

function handleKeyDown(e: React.KeyboardEvent, index: number) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const next = index + 1;
  if (next < activeTanks.length) {
    inputRefs.current[next]?.focus();  // move to next row input
  } else {
    submitBtnRef.current?.focus();     // last row → focus submit button
  }
}
```

Each `<input>` gets `ref={(el) => { inputRefs.current[i] = el; }}` and `onKeyDown={(e) => handleKeyDown(e, i)}`.

---

#### 4.7 Submit Button Enable Condition

The Submit button is **disabled** unless every single Actual Volume input has been filled:

```ts
const allFilled = totalCount > 0 && filledCount === totalCount;
// button: disabled={!allFilled || submitting}
```

Partially filled forms cannot be submitted — the user must enter Actual Volume for every tank row before the button becomes active.

---

#### 4.8 Progress Bar

```ts
const filledCount = activeTanks.filter((_, i) => (actualVolumes[i] ?? "").trim() !== "").length;
const totalCount  = activeTanks.length;
const progress    = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;
const allFilled   = totalCount > 0 && filledCount === totalCount;
```

- Bar fills left-to-right with a navy→blue gradient
- Ship icon (`lucide-react Ship`) tracks position along the bar
- Shows `"Done ✓"` (green) when all filled, else `"N / total"` (slate)
- Submit button is **disabled** until `allFilled === true`

---

## 5. Phase 4 — Submitting to Ragic

### File: `src/components/features/flgo/measurement-view.tsx` — `handleSubmit`

```ts
const res = await fetch("/api/ragic/flgo/measurement", {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    date,
    time,
    vessel: selectedVessel,
    tanks: activeTanks.map((t, i) => ({
      ...t,
      actualVolume: actualVolumes[i] ?? "",
    })),
  }),
});
```

States managed: `submitting` (shows spinner), `submitSuccess` (green banner + input reset), `submitError` (red banner).

---

### File: `src/app/api/ragic/flgo/measurement/route.ts`

Server-side handler that translates the request into the correct Ragic API payload.

**Ragic Sheet**: `flgo/28`
**Params**: `?doLinkLoad=true&doFormula=true`
- `doLinkLoad=true` — resolves all link & load fields in the sheet
- `doFormula=true` — recalculates all formula fields (including `PERCENTAGE_FILLED`)

#### Main (Header) Fields

| Ragic Field ID | Value |
|---|---|
| `1008768` DATE | user-selected date |
| `1008771` TIME | user-selected time |
| `1008766` ENTRY_TYPE | `"Measurement"` (static) |
| `1008767` FUEL_TYPE_FILTER | `"ALL"` (static) |
| `1008761` DONE_BY | `user.name` from JWT |
| `1008756` ASSIGNED_TO | vessel name |
| `1008755` HEADER_VESSEL | vessel name (link field) |

> **Note**: `PERCENTAGE_FILLED` (`1011855`) is a **formula field** in Ragic — it is **not written** in the POST body. `doFormula=true` triggers Ragic to auto-calculate it after the record is created.

#### Subtable Fields

Ragic JSON subtable format requires:
- Key: `_subtable_<subtableContainerFieldId>` → `_subtable_1008797`
- Row keys: **negative integers** (`"-1"`, `"-2"`, ...) — negative = new row
- Each row: `{ fieldId: value }`

```ts
const subtableRows: Record<string, Record<string, string>> = {};
tanks.forEach((tank, i) => {
  const rowKey = String(-(i + 1));  // "-1", "-2", "-3", …
  subtableRows[rowKey] = {
    "1008778": vessel,             // SUB_VESSEL_NAME
    "1008779": tank.fuelType,      // SUB_FUEL_TYPE
    "1008780": tank.tankName,      // SUB_TANK_NAME
    "1008781": tank.maxCapacity,   // SUB_MAX_CAPACITY
    "1008782": tank.lastRob,       // SUB_LAST_ROB
    "1008798": tank.actualVolume,  // SUB_ACTUAL_VOLUME
  };
});

const body = {
  ...mainFields,
  "_subtable_1008797": subtableRows,
};
```

The full JSON body sent to Ragic for a 2-tank measurement looks like:
```json
{
  "1008768": "2025-02-24",
  "1008771": "09:30",
  "1008766": "Measurement",
  "1008767": "ALL",
  "1008761": "John Smith",
  "1008756": "Test Vessel",
  "1008755": "Test Vessel",
  "_subtable_1008797": {
    "-1": {
      "1008778": "Test Vessel",
      "1008779": "Fuel",
      "1008780": "FO Tank 1",
      "1008781": "500",
      "1008782": "320",
      "1008798": "410"
    },
    "-2": {
      "1008778": "Test Vessel",
      "1008779": "Fresh Water",
      "1008780": "FW Tank 1",
      "1008781": "100",
      "1008782": "80",
      "1008798": "95"
    }
  }
}
```

---

### File: `src/lib/ragic.ts` — `ragicRequest`

The central HTTP client. Always appends `?v=3&api&naming=EID` (EID = numeric field IDs as response keys). Sends the body as `Content-Type: application/json`. Authorization header uses `Basic <RAGIC_API_KEY>` (server-side only, never exposed to client).

---

## 6. Ragic Field ID Reference (flgo/28)

### Header Fields

| Constant | Field ID | Description |
|---|---|---|
| `FLGO_FIELDS.DATE` | `1008768` | Measurement date |
| `FLGO_FIELDS.TIME` | `1008771` | Measurement time |
| `FLGO_FIELDS.ENTRY_TYPE` | `1008766` | Static: `"Measurement"` |
| `FLGO_FIELDS.FUEL_TYPE_FILTER` | `1008767` | Static: `"ALL"` |
| `FLGO_FIELDS.PERCENTAGE_FILLED` | `1011855` | Formula field — do NOT write, Ragic calculates |
| `FLGO_FIELDS.DONE_BY` | `1008761` | Logged-in user name (from JWT) |
| `FLGO_FIELDS.ASSIGNED_TO` | `1008756` | Vessel name |
| `FLGO_FIELDS.HEADER_VESSEL` | `1008755` | Link field — vessel name |

### Subtable Fields (Container ID: `1008797`)

| Constant | Field ID | Description |
|---|---|---|
| `FLGO_FIELDS.SUB_TABLE_ID` | `1008797` | Subtable container — used in `_subtable_1008797` key |
| `FLGO_FIELDS.SUB_VESSEL_NAME` | `1008778` | Vessel name per row |
| `FLGO_FIELDS.SUB_FUEL_TYPE` | `1008779` | Fuel type per row |
| `FLGO_FIELDS.SUB_TANK_NAME` | `1008780` | Tank name per row |
| `FLGO_FIELDS.SUB_MAX_CAPACITY` | `1008781` | Max capacity per row |
| `FLGO_FIELDS.SUB_LAST_ROB` | `1008782` | Last ROB per row |
| `FLGO_FIELDS.SUB_ACTUAL_VOLUME` | `1008798` | Actual volume entered by user |

---

## 7. Complete File Map

| File | Role |
|---|---|
| `src/app/(auth)/login/page.tsx` | Calls `/api/auth`, calls `setAll()` on the vessel store |
| `src/app/api/auth/route.ts` | Authenticates + fetches vessels + tanks + signs JWT |
| `src/store/vessel-store.ts` | Zustand + localStorage — holds vesselList, tanks, assignedVessel |
| `src/store/layout-store.ts` | Transient Zustand — tells TopNav which module is active |
| `src/app/(dashboard)/dashboard/flgo/page.tsx` | Server component — reads JWT, renders FlgoModule |
| `src/components/features/flgo/flgo-module.tsx` | Tab shell (Measurement / Bunkering), sets layout store |
| `src/components/features/flgo/measurement-view.tsx` | Full Measurement UI — reads store, handles input, submits |
| `src/app/api/ragic/flgo/measurement/route.ts` | POST handler — builds Ragic payload + calls ragicRequest |
| `src/app/api/ragic/flgo/tanks/route.ts` | GET handler — admin vessel change → returns tanks |
| `src/lib/ragic.ts` | Central Ragic HTTP client (server-only) |
| `src/constants/ragic-fields.ts` | All Ragic sheet paths + field ID constants |
| `src/components/global/layout/top-nav.tsx` | Reads layout store — shows module breadcrumb + Back link |

---

## 8. Key Design Decisions

| Decision | Reason |
|---|---|
| Tanks fetched **at login**, not on page load | Avoids API call on every FLGO visit; data is stable per session |
| Vessel store **persisted** to localStorage | Survives page refresh without re-login |
| Layout store **not persisted** | Module context is only valid when inside the module; refreshing should reset it |
| `PERCENTAGE_FILLED` not written in POST body | It is a Ragic formula field — writing a value would conflict; `doFormula=true` recalculates it |
| Subtable uses `_subtable_<id>` with negative row keys | Ragic JSON POST convention for creating new subtable rows |
| `isAdmin = !vessel` | Users with no assigned vessel (empty field in Ragic) are treated as admins with vessel select |
| No-scroll layout with `flex-1 min-h-0` | Tank table fills all remaining height; no page-level scroll |
| `-mt-10 -mb-10` on FLGO page wrapper | Cancels dashboard layout `py-10` to give FlgoModule true full-height |
