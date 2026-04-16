import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  reviews,
  clearanceItems,
  notifications,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

/**
 * POST /api/reviews
 * Chair or Dean submits a review decision on a clearance item.
 * Body: { clearanceItemId, decision, comment? }
 *
 * Chair decisions:  "approved" | "returned" | "rejected"
 * Dean decisions:   "dean_cleared" | "dean_override" | "returned" | "rejected"
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== "chair" && session.user.role !== "dean")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { clearanceItemId, decision, comment } = body;

  if (!clearanceItemId || !decision) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const role = session.user.role;
  const reviewerId = session.user.id;

  // Load the item
  const item = await db
    .select()
    .from(clearanceItems)
    .where(eq(clearanceItems.id, clearanceItemId))
    .then((r) => r[0]);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // ── Chair review ────────────────────────────────────────────────────────────
  if (role === "chair") {
    if (!["approved", "returned", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision for chair" }, { status: 400 });
    }
    if (item.status !== "submitted") {
      return NextResponse.json(
        { error: "Item is not in a reviewable state" },
        { status: 409 }
      );
    }

    const newStatus =
      decision === "approved"
        ? "chair_approved"
        : decision === "returned"
        ? "returned"
        : "rejected";

    await db
      .update(clearanceItems)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(clearanceItems.id, clearanceItemId));

    await db.insert(reviews).values({
      clearanceItemId,
      reviewerId,
      decision,
      comment: comment ?? null,
    });

    // Notify professor
    const notifType =
      decision === "approved"
        ? "approved"
        : decision === "returned"
        ? "returned"
        : "rejected";

    const professorName = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, item.professorId))
      .then((r) => r[0]?.name ?? "Professor");

    await db.insert(notifications).values({
      userId: item.professorId,
      clearanceItemId,
      type: notifType,
      message:
        decision === "approved"
          ? "Your document was approved by the department chair."
          : decision === "returned"
          ? `Your document was returned. Comment: ${comment ?? "No comment provided."}`
          : "Your document was rejected by the department chair.",
    });

    await writeAuditLog(reviewerId, `chair_${decision}`, "clearance_items", clearanceItemId, { comment });

    return NextResponse.json({ success: true, newStatus });
  }

  // ── Dean review ─────────────────────────────────────────────────────────────
  if (role === "dean") {
    if (!["dean_cleared", "dean_override", "returned", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision for dean" }, { status: 400 });
    }

    // dean_cleared: item must be chair_approved
    if (decision === "dean_cleared" && item.status !== "chair_approved") {
      return NextResponse.json(
        { error: "Item must be chair-approved before dean can clear it" },
        { status: 409 }
      );
    }

    // dean_override: can override any status, but comment is required
    if (decision === "dean_override" && !comment) {
      return NextResponse.json(
        { error: "Audit note (comment) is required for overrides" },
        { status: 400 }
      );
    }

    const newStatus =
      decision === "dean_cleared" || decision === "dean_override"
        ? "dean_cleared"
        : decision === "returned"
        ? "returned"
        : "rejected";

    await db
      .update(clearanceItems)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(clearanceItems.id, clearanceItemId));

    await db.insert(reviews).values({
      clearanceItemId,
      reviewerId,
      decision,
      comment: comment ?? null,
    });

    if (newStatus === "dean_cleared") {
      await db.insert(notifications).values({
        userId: item.professorId,
        clearanceItemId,
        type: "dean_cleared",
        message: "Your clearance document has been cleared by the Dean.",
      });
    } else {
      await db.insert(notifications).values({
        userId: item.professorId,
        clearanceItemId,
        type: decision === "returned" ? "returned" : "rejected",
        message:
          decision === "returned"
            ? `The Dean returned your document. ${comment ?? ""}`
            : "Your document was rejected by the Dean.",
      });
    }

    await writeAuditLog(reviewerId, `dean_${decision}`, "clearance_items", clearanceItemId, { comment });

    return NextResponse.json({ success: true, newStatus });
  }
}

/**
 * GET /api/reviews?clearanceItemId=xxx
 * Returns all reviews for a given clearance item.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clearanceItemId = req.nextUrl.searchParams.get("clearanceItemId");
  if (!clearanceItemId) {
    return NextResponse.json({ error: "clearanceItemId required" }, { status: 400 });
  }

  const itemReviews = await db
    .select({
      id: reviews.id,
      decision: reviews.decision,
      comment: reviews.comment,
      reviewedAt: reviews.reviewedAt,
      reviewerName: users.name,
      reviewerRole: users.role,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.clearanceItemId, clearanceItemId));

  return NextResponse.json(itemReviews);
}
