import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  clearanceItems,
  departments,
  semesters,
  requirements,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import DeanDashboardPanel from "@/components/review/DeanDashboardPanel";
import DeadlineBanner from "@/components/ui/DeadlineBanner";

export default async function DeanDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const activeSemester = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .then((r) => r[0] ?? null);

  // All departments
  const allDepts = await db.select().from(departments);

  // All professors
  const allProfessors = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(eq(users.role, "professor"));

  // All clearance items for active semester
  const allItems = activeSemester
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

  // Build department summaries
  const deptSummaries = allDepts.map((dept) => {
    const deptProfs = allProfessors.filter((p) => p.departmentId === dept.id);
    const deptItems = allItems.filter((i) =>
      deptProfs.some((p) => p.id === i.professorId)
    );
    const totalItems = deptItems.length;
    const clearedItems = deptItems.filter(
      (i) => i.status === "dean_cleared"
    ).length;
    const chairApprovedItems = deptItems.filter(
      (i) => i.status === "chair_approved"
    ).length;

    const professorSummaries = deptProfs.map((prof) => {
      const profItems = deptItems.filter((i) => i.professorId === prof.id);
      const allChairApproved =
        profItems.length > 0 &&
        profItems.every(
          (i) => i.status === "chair_approved" || i.status === "dean_cleared"
        );
      const allCleared =
        profItems.length > 0 && profItems.every((i) => i.status === "dean_cleared");
      return {
        ...prof,
        items: profItems,
        total: profItems.length,
        cleared: profItems.filter((i) => i.status === "dean_cleared").length,
        chairApproved: profItems.filter((i) => i.status === "chair_approved").length,
        completionPct:
          profItems.length > 0
            ? Math.round(
                (profItems.filter((i) => i.status === "dean_cleared").length /
                  profItems.length) *
                  100
              )
            : 0,
        allChairApproved,
        allCleared,
      };
    });

    return {
      ...dept,
      professors: professorSummaries,
      totalItems,
      clearedItems,
      chairApprovedItems,
      completionPct:
        totalItems > 0 ? Math.round((clearedItems / totalItems) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70 space-y-4">
        <div>
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Dean workspace
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">College-wide Clearance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeSemester?.label ?? "No active semester"} — University of Cabuyao
          </p>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Start from a department summary, then move into faculty details only when a sign-off or override decision is needed.
          </p>
        </div>

        {activeSemester && <DeadlineBanner deadline={activeSemester.deadline} />}
      </div>

      <DeanDashboardPanel
        deptSummaries={deptSummaries}
        semesterId={activeSemester?.id ?? ""}
        activeSemester={activeSemester}
      />
    </div>
  );
}
