import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDriveClient, getProfessorFolderId } from "@/lib/drive/client";
import { Readable } from "stream";

/**
 * POST /api/drive/upload
 * Accepts a multipart/form-data with:
 *   - file: the file to upload
 *   - semesterId: the semester ID (for folder structure)
 *
 * Uploads the file to the professor's Drive folder via service account.
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
      return NextResponse.json({ error: "file and semesterId required" }, { status: 400 });
    }

    const professorId = session.user.id;

    // Get or create the professor's folder in Drive
    const folderId = await getProfessorFolderId(professorId, semesterId);

    // Upload via service account
    const drive = getDriveClient();
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
