import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Readable } from "stream";

/**
 * POST /api/drive/upload
 * Accepts multipart/form-data: { file, semesterId }
 *
 * Uploads the file to the professor's own Google Drive using their OAuth token
 * (service accounts have zero storage quota, so we use the user's token).
 * Returns { fileId, fileName }.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "professor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const semesterId = formData.get("semesterId") as string | null;

    if (!file || !semesterId) {
      return NextResponse.json(
        { error: "file and semesterId required" },
        { status: 400 }
      );
    }

    const professorId = session.user.id;

    // Get the professor's Google OAuth tokens from the accounts table
    const account = await db
      .select({
        accessToken: accounts.access_token,
        refreshToken: accounts.refresh_token,
        expiresAt: accounts.expires_at,
      })
      .from(accounts)
      .where(
        and(eq(accounts.userId, professorId), eq(accounts.provider, "google"))
      )
      .then((r) => r[0]);

    if (!account?.refreshToken) {
      return NextResponse.json(
        { error: "No Google token found. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    // Build an OAuth2 client with the professor's tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiresAt ? account.expiresAt * 1000 : undefined,
    });

    // If expired, refresh and persist the new token
    const tokenInfo = await oauth2Client.getAccessToken();
    if (tokenInfo.token && tokenInfo.token !== account.accessToken) {
      const creds = oauth2Client.credentials;
      await db
        .update(accounts)
        .set({
          access_token: creds.access_token,
          expires_at: creds.expiry_date
            ? Math.floor(creds.expiry_date / 1000)
            : null,
        })
        .where(
          and(
            eq(accounts.userId, professorId),
            eq(accounts.provider, "google")
          )
        );
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Upload file to the professor's own Drive
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id,name",
    });

    // Make it readable by anyone with the link (so chairs/deans can view)
    await drive.permissions.create({
      fileId: uploaded.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return NextResponse.json({
      fileId: uploaded.data.id,
      fileName: uploaded.data.name,
    });
  } catch (err) {
    console.error("[drive/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
