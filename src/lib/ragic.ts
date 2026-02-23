// ---------------------------------------------------------------------------
// ragicRequest — central utility for all Ragic API calls.
// The API key is attached server-side only. Never import this in client code.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.RAGIC_BASE_URL!;
const API_KEY = process.env.RAGIC_API_KEY!;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RagicRequestOptions {
  method?: HttpMethod;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}

export async function ragicRequest<T = unknown>(
  path: string,
  { method = "GET", params = {}, body }: RagicRequestOptions = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}/${path}`);

  url.searchParams.set("v", "3");
  url.searchParams.set("api", "");
  url.searchParams.set("naming", "EID");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // --- DEBUG ---
  console.log("[DEBUG] ragicRequest — BASE_URL       :", BASE_URL);
  console.log("[DEBUG] ragicRequest — FULL URL        :", url.toString());
  console.log("[DEBUG] ragicRequest — API_KEY defined :", !!API_KEY);
  console.log("[DEBUG] ragicRequest — API_KEY length  :", API_KEY?.length ?? 0);
  console.log("[DEBUG] ragicRequest — API_KEY preview :", API_KEY ? API_KEY.substring(0, 10) + "..." : "UNDEFINED");
  // --- END DEBUG ---

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Basic ${API_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  // --- DEBUG ---
  console.log("[DEBUG] ragicRequest — HTTP status     :", res.status, res.statusText);
  // --- END DEBUG ---

  if (!res.ok) {
    throw new Error(`Ragic request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Ragic Password Auth
// Returns sessionId string on success, null on failure.
// ---------------------------------------------------------------------------
export async function ragicPasswordAuth(
  email: string,
  password: string
): Promise<string | null> {
  const server = new URL(BASE_URL).origin; // https://eu4.ragic.com
  const url = new URL(`${server}/AUTH`);

  url.searchParams.set("u", email);
  url.searchParams.set("p", password);
  url.searchParams.set("login_type", "sessionId");
  url.searchParams.set("json", "1");
  url.searchParams.set("api", "");

  const res = await fetch(url.toString(), { cache: "no-store" });

  const rawText = await res.text();
  if (!res.ok) return null;

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = rawText.trim();
  }

  // Ragic returns -1 on failure
  if (data === -1 || data === "-1" || (data as Record<string, unknown>)?.sessionId === -1) return null;

  const sid =
    typeof data === "string"
      ? data
      : ((data as Record<string, unknown>)?.sid ?? null);

  return sid && sid !== -1 && sid !== "-1" ? String(sid) : null;
}
