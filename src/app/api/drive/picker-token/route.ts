import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDrivePickerToken } from "@/lib/drive/client";

/**
 * GET /api/drive/picker-token
 * Returns a short-lived OAuth access token scoped to Drive for the Picker API.
 * The token is derived from the session's stored account access token.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "professor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getDrivePickerToken(session.user.id);
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[drive/picker-token]", err);
    return NextResponse.json(
      { error: "Could not retrieve Drive token" },
      { status: 500 }
    );
  }
}
