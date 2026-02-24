import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ragicRequest } from "@/lib/ragic";
import { SHEETS, TANK_FIELDS } from "@/constants/ragic-fields";

export async function GET(req: NextRequest) {
  try {
    // Verify auth
    const cookieStore = await cookies();
    const token = cookieStore.get("riveros_token")?.value;
    const user = token ? await verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const vessel = req.nextUrl.searchParams.get("vessel");
    if (!vessel) {
      return NextResponse.json({ error: "vessel query param required." }, { status: 400 });
    }

    const data = await ragicRequest<Record<string, Record<string, string>>>(SHEETS.TANKS, {
      params: { where: `${TANK_FIELDS.VESSEL_NAME},eq,${vessel}` },
    });

    const tanks = Object.values(data)
      .filter((v) => typeof v === "object" && v !== null)
      .map((row) => ({
        tankName:    row[TANK_FIELDS.TANK_NAME]    ?? "",
        fuelType:    row[TANK_FIELDS.FUEL_TYPE]    ?? "",
        maxCapacity: row[TANK_FIELDS.MAX_CAPACITY] ?? "",
        lastRob:     row[TANK_FIELDS.LAST_ROB]     ?? "",
      }));

    return NextResponse.json({ tanks });
  } catch (err) {
    console.error("[/api/ragic/flgo/tanks] Error:", err);
    return NextResponse.json({ error: "Failed to fetch tanks." }, { status: 500 });
  }
}
