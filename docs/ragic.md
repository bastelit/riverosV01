# Ragic — API Reference, Limitations & Project Considerations

This document covers how Ragic works as a database backend, how API calls are made,
its known limitations, and how this project handles each of them.

Source: https://www.ragic.com/intl/en/doc-api

---

## What Ragic Is

Ragic is a no-code database platform. It provides a spreadsheet-style interface for
managing structured data and exposes a REST API so external applications can read and
write records programmatically.

In this project, Ragic is the **only database**. There is no separate SQL or MongoDB
database. All data originates from and is written back to Ragic.

---

## How Ragic API Calls Work

### Base URL Structure

```
https://{server}.ragic.com/{account_name}/{tab_folder}/{sheet_index}
https://{server}.ragic.com/{account_name}/{tab_folder}/{sheet_index}/{record_id}
```

| Part | Example | Description |
|---|---|---|
| `server` | `ap12` | Your regional server — ap5, ap12, na3, eu2, etc. |
| `account_name` | `maritime-ops` | Your Ragic account slug |
| `tab_folder` | `flgo` | The tab or folder name in Ragic |
| `sheet_index` | `1` | The sheet number (found in the Ragic URL) |
| `record_id` | `1001` | The specific record (row) ID |

Always append `?v=3&api` to every request:

```
https://ap12.ragic.com/maritime-ops/flgo/1?v=3&api          ← all records
https://ap12.ragic.com/maritime-ops/flgo/1/1001?v=3&api     ← one record
```

`v=3` pins the API version — protects against breaking changes if Ragic updates.

---

### Authentication

Ragic uses **HTTP Basic Authentication** with your API key as the username.
No password is required.

```
Authorization: Basic {base64(API_KEY:)}
```

In practice with fetch:

```ts
fetch('https://ap12.ragic.com/...?v=3&api', {
  headers: {
    Authorization: `Basic ${process.env.RAGIC_API_KEY}`
  }
})
```

**Critical:** The API key must never be sent to the browser. In this project it lives
exclusively in `.env` and is only used inside `src/app/api/ragic/` proxy routes.

---

### HTTP Methods

| Method | What it does | Ragic behaviour |
|---|---|---|
| `GET` | Read records | Returns JSON. Defaults to 1000 records max. |
| `POST` | Create new record | Body is JSON of field values. Returns new record ID. |
| `PUT` | Update existing record | Body is JSON of only the fields you want to change. |
| `DELETE` | Delete a record | Deletes the record permanently. |

---

### How Ragic Returns Data

A GET response returns a flat JSON object where the **keys are numeric record IDs**
and the values are the record's field data:

```json
{
  "1001": {
    "Vessel Name": "Vessel Alpha",
    "Port": "Hamburg",
    "Quantity": 300,
    "_ragicId": 1001
  },
  "1002": {
    "Vessel Name": "Vessel Beta",
    "Port": "Rotterdam",
    "Quantity": 150,
    "_ragicId": 1002
  }
}
```

This is **not an array** — it is an object keyed by ID. You need to convert this
in your proxy route before sending it to the frontend:

```ts
// In your proxy route — convert Ragic object to array
const ragicData = await res.json()
const records = Object.values(ragicData)
return NextResponse.json(records)
```

---

### Filtering, Sorting, Pagination

These are controlled via query parameters:

```
?v=3&api&limit=100&offset=0          ← pagination
?v=3&api&sortField=Quantity&desc=1   ← sort descending
?v=3&api&where[Vessel Name]=Alpha    ← filter by field value
```

---

### Finding Your Sheet Index

1. Open your Ragic sheet in the browser
2. Look at the URL: `https://ap12.ragic.com/your-account/flgo/1`
3. The last number (`1`) is the sheet index
4. Use that number in your API URL

---

## API Limits

### Rate Limit

- No hard cap on API calls under **reasonable use**
- If usage exceeds **5 requests per second** from a single account, a manual review is triggered
- Throttling may be applied following that review

### Queue System

- Ragic processes requests through a per-account queue
- Maximum queue size: **50 requests**
- When the queue is full, Ragic **stops accepting new requests** until the queue clears
- This applies primarily to GET requests
- **Best practice: wait for a response before sending the next request — do not fire parallel calls**

### Entry Limit Per Response

- Default: **1000 entries** per GET request
- Use `limit` and `offset` to paginate beyond 1000
- Fetching large datasets significantly degrades response performance

---

## Known Limitations

### 1. No Bulk Create or Update

You cannot create or update multiple records in a single API call.
Each record requires its own individual request.

**Impact on this project:**
If a user needs to create 50 measurement entries at once, that requires 50 separate
POST requests. Combined with the 5 req/sec soft limit and queue of 50, this is a
hard architectural constraint.

**Workaround:** Queue requests sequentially with a delay between each, or limit batch
operations in the UI and warn users that bulk imports will take time.

---

### 2. No Schema / Metadata Endpoint

There is no API endpoint to programmatically retrieve a sheet's field definitions,
field types, or structure. You cannot ask Ragic "what fields does this sheet have?"

**Impact on this project:**
Field names, types, and validation rules must be known in advance and hardcoded in:
- `src/types/modules/*.ts` — TypeScript interfaces
- `src/validations/modules/*.ts` — Zod schemas

If Ragic sheet structure changes (a field is renamed or added), these files must be
manually updated to match.

---

### 3. Response Keys Are Ragic Field Labels (Not Code-Friendly)

Ragic returns field values using the **display label** from the sheet as the key.
These are often capitalized, spaced, or non-standard:

```json
{ "Vessel Name": "Alpha", "Port of Loading": "Hamburg", "Quantity (MT)": 300 }
```

These do not map cleanly to camelCase TypeScript interfaces.

**Workaround:** Normalize the response in your proxy route before returning it to
the frontend:

```ts
// In proxy route — map Ragic field names to clean TypeScript keys
function normalizeRecord(ragicRecord: any): Measurement {
  return {
    id:          String(ragicRecord._ragicId),
    vesselName:  ragicRecord['Vessel Name'],
    port:        ragicRecord['Port of Loading'],
    quantity:    ragicRecord['Quantity (MT)'],
  }
}
```

This means the frontend always works with clean camelCase interfaces. If Ragic
renames a field, you fix it in one place — the proxy route normalizer.

---

### 4. Data Response Format Is an Object, Not an Array

As described above, GET responses are objects keyed by record ID, not arrays.
Components and hooks expect arrays.

**Workaround:** Always call `Object.values(ragicData)` in the proxy route.

---

### 5. No Real-Time / Webhook Push to Frontend

Ragic supports outbound webhooks (it can POST to your server when a record changes),
but there is no WebSocket or server-sent events system. The frontend cannot receive
live updates when another user changes a record in Ragic.

**Impact on this project:**
If two users edit the same record simultaneously, the second save will overwrite the
first without any conflict warning.

**Workaround options:**
- Add a `forceRefresh()` button the user can click to manually re-sync from Ragic
- Use Ragic webhooks to hit a Next.js API route and invalidate the Zustand cache flag
  (`hasFetched = false`) which triggers a fresh fetch on next component mount

---

### 6. File Uploads Require Form Data, Not JSON

For any file or image upload, Ragic requires `multipart/form-data`.
JSON bodies are not accepted for file fields.

**Impact on this project:**
If any module needs file attachments, the proxy route for that endpoint must use
`FormData` instead of `JSON.stringify`. This is a separate implementation pattern
from all other routes.

---

### 7. PUT Updates the Entire Record by Default

Ragic's PUT behaviour merges the fields you send with the existing record.
You only need to send the fields you want to change. However, sending an empty
string `""` for a field **clears that field** in Ragic.

**Impact on this project:**
Ensure forms never submit empty strings for fields the user did not touch.
Use Zod `.optional()` or `.nullable()` carefully and strip empty strings before
sending the PUT body.

---

### 8. Subtables (Related Records)

Some Ragic sheets contain subtables — child records nested inside a parent record.
These are returned as nested arrays inside the GET response:

```json
{
  "1001": {
    "Vessel Name": "Alpha",
    "Cargo Items": [
      { "Item": "Oil", "Volume": 500 },
      { "Item": "Gas", "Volume": 200 }
    ]
  }
}
```

Subtable entries cannot be independently created or updated via the standard REST
endpoint. They must be sent as part of the parent record's POST or PUT body.

---

## How This Project Handles Ragic

```
Browser
  │  never sees Ragic URL or API key
  │  calls /api/ragic/* (your own server)
  ▼
Next.js Proxy Routes  (src/app/api/ragic/)
  │  reads RAGIC_API_KEY from process.env
  │  normalizes response (object → array, field names → camelCase)
  │  adds v=3&api to every request
  │  handles errors and returns consistent error shapes
  ▼
Ragic REST API
  │  returns raw data
  ▼
Zustand Store
  │  caches normalized data client-side
  │  hasFetched flag prevents repeat calls
  │  updates in place on successful mutations
  │  preserves old data if mutation fails
  ▼
Components
     render from Zustand — never call Ragic directly
```

---

## Proxy Route Responsibilities Checklist

Every proxy route in `src/app/api/ragic/` should do all of the following:

- [ ] Read `RAGIC_BASE_URL` and `RAGIC_API_KEY` from `process.env`
- [ ] Append `?v=3&api` to the Ragic URL
- [ ] Set `Authorization: Basic {API_KEY}` header
- [ ] Convert Ragic object response to array with `Object.values()`
- [ ] Map Ragic field label keys to camelCase TypeScript keys
- [ ] Catch errors and return a consistent `{ error: string, status: number }` shape
- [ ] Never log or return the API key in any response

---

## Environment Variables Required

```bash
# .env
RAGIC_BASE_URL=https://ap12.ragic.com/your-account
RAGIC_API_KEY=your_ragic_api_key_here
```

How to find your API key in Ragic:
`Account Settings → API Key → Copy`

How to find your server region:
Look at your Ragic URL — the subdomain before `.ragic.com` is your server (ap12, na3, eu2, etc.)

---

## Useful Ragic API Links

- Full API Reference: https://www.ragic.com/intl/en/doc-api
- Authentication: https://www.ragic.com/intl/en/doc-api/23/Authentication
- Finding Endpoints: https://www.ragic.com/intl/en/doc-api/7/Finding-API-endpoints
- API Limits: https://www.ragic.com/intl/en/doc-api/22/API-Limits
- Common Q&A: https://www.ragic.com/intl/en/doc-api/36/Common-Q&A
