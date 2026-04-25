import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { accounts, users, requirementTreeNodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getRequirementFolderId,
  getProfessorFolderId,
  shareFolderWithProfessor,
  getDriveClient,
} from "@/lib/drive/client";
import { Readable } from "stream";

/**
 * POST /api/drive/upload
 * Accepts multipart/form-data: { file, semesterId }
 *
 * 1. Service account creates/gets the centralized folder:
 *    /ClearanceSystem/<semester>/<department>/Prof-<name>/
 * 2. Service account shares that folder with the professor (writer)
 * 3. Professor's OAuth token uploads the file INTO the system folder
 *    (uses professor's 15 GB quota, but file lives in the system tree)
 * 4. Professor's token sets "anyone with link" reader permission
 *
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
    const requirementId = formData.get("requirementId") as string | null;
    const treeNodeId = formData.get("treeNodeId") as string | null;

    if (!file || !semesterId || !requirementId) {
      return NextResponse.json(
        { error: "file, semesterId, and requirementId required" },
        { status: 400 }
      );
    }

    const professorId = session.user.id;

    // ── 1. Fetch professor's OAuth tokens + email ───────────────────────
    const [account, professor] = await Promise.all([
      db
        .select({
          accessToken: accounts.access_token,
          refreshToken: accounts.refresh_token,
          expiresAt: accounts.expires_at,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, professorId),
            eq(accounts.provider, "google")
          )
        )
        .then((r) => r[0]),
      db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, professorId))
        .then((r) => r[0]),
    ]);

    if (!account?.refreshToken) {
      return NextResponse.json(
        { error: "No Google token found. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    // ── 2. Get/create the leaf folder (service account) ──────────────────────────
    let folderId: string;

    if (treeNodeId) {
      // Build path from tree node ancestors
      const allNodes = await db
        .select()
        .from(requirementTreeNodes)
        .where(eq(requirementTreeNodes.semesterId, semesterId));

      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      const profFolderId = await getProfessorFolderId(professorId, semesterId);
      const driveClient = getDriveClient();

      // Walk ancestor chain to build path segments
      const segments: string[] = [];
      let cur = nodeMap.get(treeNodeId);
      while (cur) {
        segments.unshift(cur.name);
        cur = cur.parentId ? nodeMap.get(cur.parentId) : undefined;
      }

      // Create each folder segment under profFolderId
      let parentId = profFolderId;
      for (const seg of segments) {
        const query = `mimeType='application/vnd.google-apps.folder' and name='${seg.replace(/'/g, "\\'")}'  and '${parentId}' in parents and trashed=false`;
        const res = await driveClient.files.list({ q: query, fields: "files(id)", spaces: "drive" });
        if (res.data.files && res.data.files.length > 0) {
          parentId = res.data.files[0].id!;
        } else {
          const created = await driveClient.files.create({
            requestBody: { name: seg, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
            fields: "id",
          });
          parentId = created.data.id!;
        }
      }
      folderId = parentId;
    } else {
      folderId = await getRequirementFolderId(professorId, semesterId, requirementId);
    }

    // ── 3. Share the folder with the professor so they can write ───────
    if (professor?.email) {
      await shareFolderWithProfessor(folderId, professor.email);
    }

    // ── 4. Build OAuth2 client with professor's tokens ─────────────────
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiresAt ? account.expiresAt * 1000 : undefined,
    });

    // Auto-refresh expired tokens and persist
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

    // ── 5. Upload file into the system folder via professor's token ────
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id,name",
    });

    // ── 6. Make it readable by anyone with the link ────────────────────
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
