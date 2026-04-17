import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clearanceItems,
  notifications,
  professorRequirements,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/clearance
 * Professor submits or resubmits a clearance item.
 * Body: { requirementId, driveFileId, driveFileName, semesterId }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "professor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { requirementId, driveFileId, driveFileName, semesterId } = body;

  if (!requirementId || !driveFileId || !semesterId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const professorId = session.user.id;

  // Verify professor is assigned this requirement
  const assignment = await db
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

  if (!assignment) {
    return NextResponse.json(
      { error: "Requirement not assigned to you" },
      { status: 403 }
    );
  }

  // Upsert clearance item
  const existing = await db
    .select()
    .from(clearanceItems)
    .where(
      and(
        eq(clearanceItems.professorId, professorId),
        eq(clearanceItems.requirementId, requirementId),
        eq(clearanceItems.semesterId, semesterId)
      )
    )
    .then((r) => r[0]);

  if (existing) {
    // Only allow resubmission if status is not_submitted or returned
    if (
      existing.status !== "not_submitted" &&
      existing.status !== "returned"
    ) {
      return NextResponse.json(
        { error: "Cannot resubmit an item that is already under review or cleared" },
        { status: 409 }
      );
    }

    await db
      .update(clearanceItems)
      .set({
        driveFileId,
        driveFileName: driveFileName ?? null,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clearanceItems.id, existing.id));

    // Notify professor's chair
    await notifyChair(professorId, existing.id, semesterId);

    return NextResponse.json({ id: existing.id, resubmitted: true });
  } else {
    const [created] = await db
      .insert(clearanceItems)
      .values({
        professorId,
        requirementId,
        semesterId,
        driveFileId,
        driveFileName: driveFileName ?? null,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: clearanceItems.id });

    await notifyChair(professorId, created.id, semesterId);

    return NextResponse.json({ id: created.id, resubmitted: false }, { status: 201 });
  }
}

/**
 * GET /api/clearance?semesterId=xxx
 * Returns all clearance items for the current professor in the given semester.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "professor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const semesterId = req.nextUrl.searchParams.get("semesterId");
  if (!semesterId) {
    return NextResponse.json({ error: "semesterId required" }, { status: 400 });
  }

  const items = await db
    .select()
    .from(clearanceItems)
    .where(
      and(
        eq(clearanceItems.professorId, session.user.id),
        eq(clearanceItems.semesterId, semesterId)
      )
    );

  return NextResponse.json(items);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function notifyChair(
  professorId: string,
  clearanceItemId: string,
  _semesterId: string
) {
  // Find the professor's department chair
  const prof = await db
    .select({ departmentId: users.departmentId, name: users.name })
    .from(users)
    .where(eq(users.id, professorId))
    .then((r) => r[0]);

  if (!prof?.departmentId) return;

  const chair = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.departmentId, prof.departmentId), eq(users.role, "chair"))
    )
    .then((r) => r[0]);

  if (!chair) return;

  await db.insert(notifications).values({
    userId: chair.id,
    clearanceItemId,
    type: "submitted",
    message: `${prof.name} submitted a clearance document for your review.`,
  });
}
