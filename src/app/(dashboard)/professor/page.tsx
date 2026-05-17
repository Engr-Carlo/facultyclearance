import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clearanceItems,
  requirements,
  requirementTreeNodes,
  semesters,
  reviews,
  notifications,
} from "@/lib/db/schema";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import ClearanceTreeChecklist from "@/components/checklist/ClearanceTreeChecklist";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ensureProfessorFoldersFromTree } from "@/lib/drive/client";

export default async function ProfessorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const professorId = session.user.id;

  // Get active semester
  const activeSemester = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .then((r) => r[0] ?? null);

  // Get tree nodes for active semester (gracefully handles missing table)
  let treeNodes: typeof import("@/lib/db/schema").requirementTreeNodes.$inferSelect[] = [];
  if (activeSemester) {
    try {
      treeNodes = await db
        .select()
        .from(requirementTreeNodes)
        .where(eq(requirementTreeNodes.semesterId, activeSemester.id))
        .orderBy(requirementTreeNodes.sortOrder);
    } catch {
      // Table may not exist yet — page still renders with empty tree
    }
  }

  // Provision Drive folders lazily (fire-and-forget)
  if (activeSemester && treeNodes.length > 0) {
    ensureProfessorFoldersFromTree(professorId, activeSemester.id).catch(console.error);
  }

  // Get clearance items with requirement info
  const items = activeSemester
    ? await db
        .select({
          id: clearanceItems.id,
          status: clearanceItems.status,
          driveFileId: clearanceItems.driveFileId,
          driveFileName: clearanceItems.driveFileName,
          submittedAt: clearanceItems.submittedAt,
          updatedAt: clearanceItems.updatedAt,
          requirementId: clearanceItems.requirementId,
          subjectCode: requirements.subjectCode,
          subjectName: requirements.subjectName,
          term: requirements.term,
          docType: requirements.docType,
          hasLabComponent: requirements.hasLabComponent,
        })
        .from(clearanceItems)
        .innerJoin(requirements, eq(clearanceItems.requirementId, requirements.id))
        .where(
          and(
            eq(clearanceItems.professorId, professorId),
            eq(clearanceItems.semesterId, activeSemester.id)
          )
        )
    : [];

  // Get latest review comment per item
  const itemIds = items.map((i) => i.id);
  const latestReviews =
    itemIds.length > 0
      ? await db
          .select({
            clearanceItemId: reviews.clearanceItemId,
            comment: reviews.comment,
            decision: reviews.decision,
            reviewedAt: reviews.reviewedAt,
          })
          .from(reviews)
          .where(inArray(reviews.clearanceItemId, itemIds))
          .orderBy(desc(reviews.reviewedAt))
      : [];

  // Build a map: itemId → latest review
  const reviewMap = new Map<string, (typeof latestReviews)[0]>();
  for (const r of latestReviews) {
    if (!reviewMap.has(r.clearanceItemId)) {
      reviewMap.set(r.clearanceItemId, r);
    }
  }

  // Unread notifications count
  const unreadCount = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.userId, professorId), isNull(notifications.readAt))
    )
    .then((r) => r.length);

  // Progress calculation
  const total = items.length;
  const cleared = items.filter((i) => i.status === "dean_cleared").length;
  const chairApproved = items.filter((i) => i.status === "chair_approved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
            {activeSemester?.label ?? "No active semester"}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-gray-900">Clearance Checklist</h1>
        </div>
        <NotificationBell userId={professorId} unreadCount={unreadCount} />
      </div>

      {total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progress</span>
              <span className="font-medium text-gray-700 tabular-nums">{cleared}/{total} cleared</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${total > 0 ? (cleared / total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0 hidden sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {cleared} dean-cleared
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              {chairApproved} chair-approved
            </span>
          </div>
        </div>
      )}

      {activeSemester ? (
        <ClearanceTreeChecklist
          nodes={treeNodes}
          items={items.map((item) => ({
            ...item,
            latestReview: reviewMap.get(item.id) ?? null,
          }))}
          semesterId={activeSemester.id}
        />
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No active semester</p>
          <p className="text-sm mt-1">Please wait for the admin to activate a semester.</p>
        </div>
      )}
    </div>
  );
}
