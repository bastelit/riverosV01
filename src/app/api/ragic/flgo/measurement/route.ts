import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ragicRequest } from "@/lib/ragic";
import { SHEETS, FLGO_FIELDS } from "@/constants/ragic-fields";

interface TankRow {
  subtableRowId?: string;  // present when editing an existing record
  tankName: string;
  fuelType: string;
  maxCapacity: string;
  lastRob: string;
  actualVolume: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const cookieStore = await cookies();
    const token = cookieStore.get("riveros_token")?.value;
    const user = token ? await verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { date, time, vessel, tanks, editRagicId } = (await req.json()) as {
      date: string;
      time: string;
      vessel: string;
      tanks: TankRow[];
      editRagicId?: string;
    };

    if (!vessel || !tanks?.length) {
      return NextResponse.json({ error: "vessel and tanks are required." }, { status: 400 });
    }

    // Build main header fields.
    // PERCENTAGE_FILLED is a formula field — omit it; doFormula=true lets Ragic recalculate it.
    const mainFields: Record<string, string> = {
      [FLGO_FIELDS.DATE]:             date,
      [FLGO_FIELDS.TIME]:             time,
      [FLGO_FIELDS.ENTRY_TYPE]:       "Measurement",
      [FLGO_FIELDS.FUEL_TYPE_FILTER]: "ALL",
      [FLGO_FIELDS.DONE_BY]:          user.name,
      [FLGO_FIELDS.ASSIGNED_TO]:      vessel,
      [FLGO_FIELDS.HEADER_VESSEL]:    vessel,
    };

    // Build subtable rows.
    // Create: negative keys "-1", "-2" … (Ragic convention for new rows).
    // Edit:   use the existing subtableRowId (positive int) so Ragic updates in-place.
    const subtableRows: Record<string, Record<string, string>> = {};
    tanks.forEach((tank, i) => {
      const rowKey = tank.subtableRowId && editRagicId
        ? tank.subtableRowId          // update existing row
        : String(-(i + 1));           // new row
      subtableRows[rowKey] = {
        [FLGO_FIELDS.SUB_VESSEL_NAME]:   vessel,
        [FLGO_FIELDS.SUB_FUEL_TYPE]:     tank.fuelType,
        [FLGO_FIELDS.SUB_TANK_NAME]:     tank.tankName,
        [FLGO_FIELDS.SUB_MAX_CAPACITY]:  tank.maxCapacity,
        [FLGO_FIELDS.SUB_LAST_ROB]:      tank.lastRob,
        [FLGO_FIELDS.SUB_ACTUAL_VOLUME]: tank.actualVolume,
      };
    });

    const body = {
      ...mainFields,
      [`_subtable_${FLGO_FIELDS.SUB_TABLE_ID}`]: subtableRows,
    };

    // For edit: POST to sheet/<rowId> (Ragic update semantics).
    // For create: POST to sheet (no row ID).
    const path = editRagicId
      ? `${SHEETS.FLGO_MEASUREMENT}/${editRagicId}`
      : SHEETS.FLGO_MEASUREMENT;

    const result = await ragicRequest(path, {
      method: "POST",
      params: {
        doLinkLoad: "true",
        doFormula:  "true",
      },
      body,
    });

    console.log("[/api/ragic/flgo/measurement] Ragic response:", JSON.stringify(result, null, 2));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/ragic/flgo/measurement] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit measurement. Please try again." },
      { status: 500 }
    );
  }
}
