import { NextRequest, NextResponse } from "next/server";
import { ragicPasswordAuth, ragicRequest } from "@/lib/ragic";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { SHEETS, USER_FIELDS } from "@/constants/ragic-fields";

interface UserSheetRow {
  [key: string]: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // 1. Validate credentials against Ragic
    const sessionId = await ragicPasswordAuth(email, password);
    console.log("[DEBUG] Step 1 — Ragic auth SID:", sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 2. Fetch user profile from ragic-setup/1
    const sheetData = await ragicRequest<Record<string, UserSheetRow>>(
      SHEETS.USERS,
      {
        params: {
          where: `${USER_FIELDS.EMAIL},eq,${email}`,
        },
      }
    );
    console.log("[DEBUG] Step 2 — Raw sheet response:", JSON.stringify(sheetData, null, 2));

    // Extract first matching record (email is unique per user)
    const rows = Object.values(sheetData).filter(
      (v) => typeof v === "object" && v !== null
    );
    console.log("[DEBUG] Step 3 — Filtered rows count:", rows.length);
    console.log("[DEBUG] Step 3 — First row:", JSON.stringify(rows[0], null, 2));

    const userRow = rows[0] as UserSheetRow | undefined;

    const name = userRow?.[USER_FIELDS.NAME] ?? "";
    const vessel = userRow?.[USER_FIELDS.ASSIGNED_VESSEL] ?? "";
    const vesselAbbr = userRow?.[USER_FIELDS.VESSEL_ABBREVIATION] ?? "";

    console.log("[DEBUG] Step 4 — Extracted fields:");
    console.log("  email      :", email);
    console.log("  name       :", name, "  (field id:", USER_FIELDS.NAME, ")");
    console.log("  vessel     :", vessel, "  (field id:", USER_FIELDS.ASSIGNED_VESSEL, ")");
    console.log("  vesselAbbr :", vesselAbbr, "  (field id:", USER_FIELDS.VESSEL_ABBREVIATION, ")");

    // 3. Sign JWT
    const token = await signToken({ email, name, vessel, vesselAbbr });
    console.log("[DEBUG] Step 5 — JWT signed successfully");

    // 4. Set httpOnly cookie and return
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[/api/auth] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
