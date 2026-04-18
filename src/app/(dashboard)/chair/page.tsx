import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  clearanceItems,
  requirements,
  semesters,
  departments,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import ChairReviewPanel from "@/components/review/ChairReviewPanel";
import DeadlineBanner from "@/components/ui/DeadlineBanner";

export default async function ChairDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const chairDeptId = session.user.departmentId;
  if (!chairDeptId) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No department assigned</p>
        <p className="text-sm mt-1">Contact an admin to assign your department.</p>
      </div>
    );
  }

  const activeSemester = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .then((r) => r[0] ?? null);

  // Get all professors in this department
  const professors = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(and(eq(users.departmentId, chairDeptId), eq(users.role, "professor")));

  // Get clearance items for all those professors in active semester
  const profIds = professors.map((p) => p.id);

  const allItems = activeSemester && profIds.length > 0
    ? await db
        .select({
          id: clearanceItems.id,
          professorId: clearanceItems.professorId,
          status: clearanceItems.status,
          driveFileId: clearanceItems.driveFileId,
          driveFileName: clearanceItems.driveFileName,
          submittedAt: clearanceItems.submittedAt,
          updatedAt: clearanceItems.updatedAt,
          subjectCode: requirements.subjectCode,
          subjectName: requirements.subjectName,
          term: requirements.term,
          docType: requirements.docType,
          requirementId: clearanceItems.requirementId,
        })
        .from(clearanceItems)
        .innerJoin(requirements, eq(clearanceItems.requirementId, requirements.id))
        .where(eq(clearanceItems.semesterId, activeSemester.id))
    : [];

  // Build per-professor summary
  const professorMap = professors.map((prof) => {
    const profItems = allItems.filter((i) => i.professorId === prof.id);
    const total = profItems.length;
    const approved = profItems.filter(
      (i) => i.status === "chair_approved" || i.status === "dean_cleared"
    ).length;
    const pending = profItems.filter((i) => i.status === "submitted").length;
    return {
      ...prof,
      name: prof.name ?? prof.email,
      items: profItems,
      total,
      approved,
      pending,
      completionPct: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  });

  const dept = await db
    .select({ name: departments.name })
    .from(departments)
    .where(eq(departments.id, chairDeptId))
    .then((r) => r[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Department Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {dept?.name} — {activeSemester?.label ?? "No active semester"}
        </p>
      </div>

      {activeSemester && (
        <DeadlineBanner deadline={activeSemester.deadline} />
      )}

      <ChairReviewPanel
        professors={professorMap}
        semesterId={activeSemester?.id ?? ""}
      />
    </div>
  );
}
