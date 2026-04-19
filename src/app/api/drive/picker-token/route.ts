import { NextResponse } from "next/server";

// This endpoint was used by the Google Picker flow which has been replaced
// by direct file upload. Kept as a stub to avoid 404s from old clients.
export async function GET() {
  return NextResponse.json({ error: "Endpoint retired" }, { status: 410 });
}
