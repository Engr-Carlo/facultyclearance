import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  departments,
  semesters,
  requirements,
  professorRequirements,
  clearanceItems,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { provisionSemesterFolders } from "@/lib/drive/client";
import { writeAuditLog } from "@/lib/audit";

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const entity = searchParams.get("entity");

  if (entity === "users") {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        createdAt: users.createdAt,
      })
      .from(users);
    return NextResponse.json(rows);
  }

  if (entity === "departments") {
    const rows = await db.select().from(departments);
    return NextResponse.json(rows);
  }

  if (entity === "semesters") {
    const rows = await db.select().from(semesters);
    return NextResponse.json(rows);
  }

  if (entity === "audit") {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.createdAt)
      .limit(200);
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "entity param required" }, { status: 400 });
}

/**
 * POST /api/admin/users — create or update user role/dept
 * POST /api/admin/departments — create department
 * POST /api/admin/semesters — create / activate semester
 * POST /api/admin/requirements — create requirement
 * POST /api/admin/professor-requirements — assign requirement to professor
 * POST /api/admin/provision-drive — provision Drive folders for a semester
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const entity = searchParams.get("entity");
  const body = await req.json();

  if (entity === "user-role") {
    const { userId, role, departmentId } = body;
    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    }
    await db
      .update(users)
      .set({ role, departmentId: departmentId ?? null })
      .where(eq(users.id, userId));

    await writeAuditLog(session.user.id, "update_user_role", "users", userId, {
      role,
      departmentId,
    });
    return NextResponse.json({ success: true });
  }

  if (entity === "department") {
    const { name, college } = body;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const [dep] = await db
      .insert(departments)
      .values({ name, college: college ?? "University of Cabuyao" })
      .returning();
    await writeAuditLog(session.user.id, "create_department", "departments", dep.id, { name });
    return NextResponse.json(dep, { status: 201 });
  }

  if (entity === "semester") {
    const { label, deadline, activate } = body;
    if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

    // Deactivate all if activating new one
    if (activate) {
      await db.update(semesters).set({ isActive: false });
    }

    const [sem] = await db
      .insert(semesters)
      .values({
        label,
        isActive: activate ?? false,
        deadline: deadline ? new Date(deadline) : null,
      })
      .returning();

    await writeAuditLog(session.user.id, "create_semester", "semesters", sem.id, { label, activate });
    return NextResponse.json(sem, { status: 201 });
  }

  if (entity === "activate-semester") {
    const { semesterId } = body;
    if (!semesterId) return NextResponse.json({ error: "semesterId required" }, { status: 400 });

    await db.update(semesters).set({ isActive: false });
    await db.update(semesters).set({ isActive: true }).where(eq(semesters.id, semesterId));

    await writeAuditLog(session.user.id, "activate_semester", "semesters", semesterId, {});
    return NextResponse.json({ success: true });
  }

  if (entity === "requirement") {
    const { subjectCode, subjectName, term, docType, hasLabComponent, semesterId } = body;
    if (!subjectCode || !term || !docType || !semesterId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const [req2] = await db
      .insert(requirements)
      .values({ subjectCode, subjectName: subjectName ?? subjectCode, term, docType, hasLabComponent: hasLabComponent ?? false, semesterId })
      .returning();
    return NextResponse.json(req2, { status: 201 });
  }

  if (entity === "professor-requirement") {
    const { professorId, requirementId, semesterId } = body;
    if (!professorId || !requirementId || !semesterId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Idempotent insert
    const existing = await db
      .select()
      .from(professorRequirements)
      .where(
        and(
          eq(professorRequirements.professorId, professorId),
          eq(professorRequirements.requirementId, requirementId),
          eq(professorRequirements.semesterId, semesterId)
        )
      )
      .then((r) => r[0]);

    if (!existing) {
      const [pr] = await db
        .insert(professorRequirements)
        .values({ professorId, requirementId, semesterId })
        .returning();

      // Create a corresponding not_submitted clearance item
      await db.insert(clearanceItems).values({
        professorId,
        requirementId,
        semesterId,
        status: "not_submitted",
        updatedAt: new Date(),
      });

      return NextResponse.json(pr, { status: 201 });
    }

    return NextResponse.json({ message: "Already assigned" });
  }

  if (entity === "provision-drive") {
    const { semesterId } = body;
    if (!semesterId) return NextResponse.json({ error: "semesterId required" }, { status: 400 });

    try {
      const rootFolderId = await provisionSemesterFolders(semesterId);
      await db
        .update(semesters)
        .set({ driveFolderId: rootFolderId })
        .where(eq(semesters.id, semesterId));

      await writeAuditLog(session.user.id, "provision_drive_folders", "semesters", semesterId, { rootFolderId });
      return NextResponse.json({ rootFolderId });
    } catch (err) {
      console.error("[provision-drive]", err);
      return NextResponse.json({ error: "Drive provisioning failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

/**
 * DELETE /api/admin?entity=user&id=xxx
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const entity = searchParams.get("entity");
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (entity === "user") {
    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }
    await db.delete(users).where(eq(users.id, id));
    await writeAuditLog(session.user.id, "delete_user", "users", id, {});
    return NextResponse.json({ success: true });
  }

  if (entity === "department") {
    await db.delete(departments).where(eq(departments.id, id));
    await writeAuditLog(session.user.id, "delete_department", "departments", id, {});
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}
