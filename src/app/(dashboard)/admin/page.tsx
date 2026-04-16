import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments, semesters, requirements, auditLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import AdminPanel from "@/components/admin/AdminPanel";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [allUsers, allDepts, allSemesters, recentLogs] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),

    db.select().from(departments).orderBy(departments.name),

    db.select().from(semesters).orderBy(desc(semesters.createdAt)),

    db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">University of Cabuyao — Admin Panel</p>
      </div>

      <AdminPanel
        users={allUsers}
        departments={allDepts}
        semesters={allSemesters}
        auditLogs={recentLogs}
      />
    </div>
  );
}
