import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ragicRequest } from "@/lib/ragic";
import { SHEETS, FLGO_FIELDS } from "@/constants/ragic-fields";
import type { FlgoRecord, TankEntry } from "@/store/flgo-store";

// GET /api/ragic/flgo/records
// Returns all FLGO records for the logged-in user's assigned vessel (up to 200),
// sorted newest-first. Both Measurement and Bunkering entries are included —
// the client store splits them by entryType.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("riveros_token")?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const vessel = user.vessel;

    // Admin users (no assigned vessel) — return empty for now
    if (!vessel) {
      return NextResponse.json({ records: [] });
    }

    const data = await ragicRequest<Record<string, Record<string, unknown>>>(
      SHEETS.FLGO_MEASUREMENT,
      {
        params: {
          // HEADER_VESSEL (1008755) is the link field — correct field for vessel filtering.
          // ASSIGNED_TO (1008756) is a load-from-link display field and cannot be used in where.
          where:     `${FLGO_FIELDS.HEADER_VESSEL},eq,${vessel}`,
          limit:     "200",
          sortField: FLGO_FIELDS.DATE,
          desc:      "1",
        },
      }
    );

    console.log("[/api/ragic/flgo/records] Raw record count:", Object.keys(data).filter(k => !k.startsWith("_")).length);

    const subTableKey = `_subtable_${FLGO_FIELDS.SUB_TABLE_ID}`;

    // Ragic response is keyed by row ID — filter out meta keys (_ragicAnnotation_ etc.)
    const records: FlgoRecord[] = Object.entries(data)
      .filter(([id]) => !id.startsWith("_"))
      .map(([id, row]) => {
        // Parse subtable rows — each key is the subtable row ID (positive integer)
        const subtable = row[subTableKey] as Record<string, Record<string, string>> | undefined;
        const tanks: TankEntry[] = subtable
          ? Object.entries(subtable)
              .filter(([k]) => !k.startsWith("_"))
              .map(([rowKey, t]) => ({
                subtableRowId:  rowKey,
                tankName:       t[FLGO_FIELDS.SUB_TANK_NAME]        ?? "",
                fuelType:       t[FLGO_FIELDS.SUB_FUEL_TYPE]        ?? "",
                maxCapacity:    t[FLGO_FIELDS.SUB_MAX_CAPACITY]      ?? "",
                lastRob:        t[FLGO_FIELDS.SUB_LAST_ROB]          ?? "",
                actualVolume:   t[FLGO_FIELDS.SUB_ACTUAL_VOLUME]     ?? "",
                bunkeredVolume: t[FLGO_FIELDS.SUB_BUNKERED_VOLUME]   ?? "",
                reportVolume:   t[FLGO_FIELDS.REPORT_VOLUME]         ?? "",
              }))
          : [];

        const r = row as Record<string, string>;
        return {
          ragicId:           id,
          date:              r[FLGO_FIELDS.DATE]               ?? "",
          time:              r[FLGO_FIELDS.TIME]               ?? "",
          vessel:            r[FLGO_FIELDS.HEADER_VESSEL]      ?? "",
          entryType:         r[FLGO_FIELDS.ENTRY_TYPE]         ?? "",
          percentageFilled:  r[FLGO_FIELDS.PERCENTAGE_FILLED]  ?? "",
          doneBy:            r[FLGO_FIELDS.DONE_BY]            ?? "",
          waterTotalVolume:  r[FLGO_FIELDS.WATER_TOTAL_VOLUME]  ?? "",
          fuelTotalVolume:   r[FLGO_FIELDS.FUEL_TOTAL_VOLUME]   ?? "",
          lubeTotalVolume:   r[FLGO_FIELDS.LUBE_TOTAL_VOLUME]   ?? "",
          adBlueTotalVolume: r[FLGO_FIELDS.ADBLUE_TOTAL_VOLUME] ?? "",
          tanks,
        };
      });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[/api/ragic/flgo/records] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch FLGO records." },
      { status: 500 }
    );
  }
}
