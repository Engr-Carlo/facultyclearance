import { google } from "googleapis";
import { db } from "@/lib/db";
import { accounts, departments, users, semesters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Service Account ─────────────────────────────────────────────────────────

function getServiceAccountAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(
        /\\n/g,
        "\n"
      ),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return auth;
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getServiceAccountAuth() });
}

// ─── Folder Provisioning ─────────────────────────────────────────────────────

/**
 * Creates the folder tree for a semester:
 * /ClearanceSystem/<semester-label>/<dept-name>/<prof-name>/
 *
 * Returns the semester root folder ID.
 */
export async function provisionSemesterFolders(semesterId: string): Promise<string> {
  const drive = getDriveClient();

  const semester = await db
    .select()
    .from(semesters)
    .where(eq(semesters.id, semesterId))
    .then((r) => r[0]);

  if (!semester) throw new Error("Semester not found");

  // Ensure root /ClearanceSystem folder exists
  const rootId = await getOrCreateFolder(drive, "ClearanceSystem", null);

  // Create semester folder under root
  const semFolderId = await getOrCreateFolder(drive, semester.label, rootId);

  // For each department and its professors, create nested folders
  const allDepts = await db.select().from(departments);
  for (const dept of allDepts) {
    const deptFolderId = await getOrCreateFolder(drive, dept.name, semFolderId);

    const deptProfs = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.departmentId, dept.id), eq(users.role, "professor")));

    for (const prof of deptProfs) {
      const safeName = prof.name.replace(/[^a-zA-Z0-9 _-]/g, "");
      await getOrCreateFolder(drive, `Prof-${safeName}`, deptFolderId);
    }
  }

  return semFolderId;
}

/**
 * Returns the Drive folder ID for a professor's folder within a semester/dept tree.
 * Creates the folder chain if it doesn't exist yet.
 */
export async function getProfessorFolderId(
  professorId: string,
  semesterId: string
): Promise<string> {
  const drive = getDriveClient();

  const [professor, semester] = await Promise.all([
    db
      .select({ name: users.name, departmentId: users.departmentId })
      .from(users)
      .where(eq(users.id, professorId))
      .then((r) => r[0]),
    db
      .select({ label: semesters.label, driveFolderId: semesters.driveFolderId })
      .from(semesters)
      .where(eq(semesters.id, semesterId))
      .then((r) => r[0]),
  ]);

  if (!professor) throw new Error("Professor not found");
  if (!semester) throw new Error("Semester not found");

  const dept = professor.departmentId
    ? await db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, professor.departmentId))
        .then((r) => r[0])
    : null;

  const rootId = await getOrCreateFolder(drive, "ClearanceSystem", null);
  const semFolderId = await getOrCreateFolder(drive, semester.label, rootId);
  const deptFolderId = await getOrCreateFolder(
    drive,
    dept?.name ?? "Unassigned",
    semFolderId
  );
  const safeName = professor.name.replace(/[^a-zA-Z0-9 _-]/g, "");
  const profFolderId = await getOrCreateFolder(
    drive,
    `Prof-${safeName}`,
    deptFolderId
  );

  return profFolderId;
}

/**
 * Returns a short-lived OAuth access token for the user's Google account,
 * scoped for the Picker API. Reads the stored account access_token.
 */
export async function getDrivePickerToken(userId: string): Promise<string> {
  const account = await db
    .select({ accessToken: accounts.accessToken })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .then((r) => r[0]);

  if (!account?.accessToken) {
    throw new Error("No Google OAuth token found for user");
  }

  return account.accessToken;
}

/**
 * Grant read permission on a file to a given email.
 * Used to give chairs/deans read access to submitted files.
 */
export async function grantReadAccess(fileId: string, email: string) {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "user",
      emailAddress: email,
    },
    sendNotificationEmail: false,
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string | null
): Promise<string> {
  const query = parentId
    ? `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`
    : `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    },
    fields: "id",
  });

  return created.data.id!;
}
