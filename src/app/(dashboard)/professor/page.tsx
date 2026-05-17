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
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Professor workspace
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Clearance Checklist</h1>
              <p className="mt-1 text-sm text-gray-500">
                {activeSemester ? activeSemester.label : "No active semester"}
              </p>
              <p className="mt-2 max-w-2xl text-sm text-gray-500">
                Work through each section below, upload the requested file, and watch the status badge for review updates.
              </p>
            </div>
          </div>
          <NotificationBell userId={professorId} unreadCount={unreadCount} />
        </div>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-[24px] border border-gray-200 p-5 shadow-sm shadow-gray-100/60">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Overall Progress</span>
            <span className="text-gray-500">
              {cleared} / {total} fully cleared
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${total > 0 ? (cleared / total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {cleared} Dean-cleared
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {chairApproved} Chair-approved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              {total - cleared - chairApproved} Remaining
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
