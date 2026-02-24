import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ragicRequest } from "@/lib/ragic";
import { SHEETS, FLGO_FIELDS } from "@/constants/ragic-fields";

interface TankRow {
  tankName: string;
  fuelType: string;
  maxCapacity: string;
  lastRob: string;
  actualVolume: string;
  bunkeredVolume: string;
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

    const { date, time, vessel, fuelType, tanks } = (await req.json()) as {
      date: string;
      time: string;
      vessel: string;
      fuelType: string;
      tanks: TankRow[];
    };

    if (!vessel || !fuelType || !tanks?.length) {
      return NextResponse.json(
        { error: "vessel, fuelType, and tanks are required." },
        { status: 400 }
      );
    }

    // Build main header fields.
    // ENTRY_TYPE = "Bunkering" (differs from Measurement).
    // FUEL_TYPE_FILTER = selected fuel type (not "ALL").
    // PERCENTAGE_FILLED is a formula field — omit it; doFormula=true lets Ragic recalculate it.
    const mainFields: Record<string, string> = {
      [FLGO_FIELDS.DATE]:             date,
      [FLGO_FIELDS.TIME]:             time,
      [FLGO_FIELDS.ENTRY_TYPE]:       "Bunkering",
      [FLGO_FIELDS.FUEL_TYPE_FILTER]: fuelType,
      [FLGO_FIELDS.DONE_BY]:          user.name,
      [FLGO_FIELDS.ASSIGNED_TO]:      vessel,
      [FLGO_FIELDS.HEADER_VESSEL]:    vessel,
    };

    // Build subtable using Ragic JSON format:
    //   _subtable_<subtableId>: { "-1": { fieldId: value }, "-2": { … }, … }
    // Negative row keys = new rows.
    const subtableRows: Record<string, Record<string, string>> = {};
    tanks.forEach((tank, i) => {
      const rowKey = String(-(i + 1)); // "-1", "-2", "-3", …
      subtableRows[rowKey] = {
        [FLGO_FIELDS.SUB_VESSEL_NAME]:    vessel,
        [FLGO_FIELDS.SUB_FUEL_TYPE]:      tank.fuelType,
        [FLGO_FIELDS.SUB_TANK_NAME]:      tank.tankName,
        [FLGO_FIELDS.SUB_MAX_CAPACITY]:   tank.maxCapacity,
        [FLGO_FIELDS.SUB_LAST_ROB]:       tank.lastRob,
        [FLGO_FIELDS.SUB_ACTUAL_VOLUME]:  tank.actualVolume,
        [FLGO_FIELDS.SUB_BUNKERED_VOLUME]: tank.bunkeredVolume,
      };
    });

    const body = {
      ...mainFields,
      [`_subtable_${FLGO_FIELDS.SUB_TABLE_ID}`]: subtableRows,
    };

    // POST to Ragic.
    // doFormula=true  → recalculates formula fields (PERCENTAGE_FILLED etc.)
    // doLinkLoad=true → resolves link & load fields
    const result = await ragicRequest(SHEETS.FLGO_MEASUREMENT, {
      method: "POST",
      params: {
        doLinkLoad: "true",
        doFormula:  "true",
      },
      body,
    });

    console.log("[/api/ragic/flgo/bunkering] Ragic response:", JSON.stringify(result, null, 2));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/ragic/flgo/bunkering] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit bunkering. Please try again." },
      { status: 500 }
    );
  }
}
