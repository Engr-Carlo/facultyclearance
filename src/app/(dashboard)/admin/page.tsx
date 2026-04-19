import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments, semesters, auditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import AdminPanel from "@/components/admin/AdminPanel";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-xl font-bold">Session not found</h1>
        <p>getServerSession returned null. Please sign out and sign back in.</p>
      </div>
    );
  }

  if (session.user.role !== "admin") {
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p>Your role is &quot;{session.user.role}&quot; — admin required.</p>
      </div>
    );
  }

  try {
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
          targetId: auditLogs.targetId,
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
          <h1 className="text-2xl font-bold text-gray-900">
            System Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            University of Cabuyao — Admin Panel
          </p>
        </div>

        <AdminPanel
          users={JSON.parse(JSON.stringify(allUsers))}
          departments={JSON.parse(JSON.stringify(allDepts))}
          semesters={JSON.parse(JSON.stringify(allSemesters))}
          auditLogs={JSON.parse(JSON.stringify(recentLogs))}
        />
      </div>
    );
  } catch (err) {
    console.error("[admin page] Error loading data:", err);
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-xl font-bold">Error loading admin data</h1>
        <pre className="mt-2 text-sm bg-red-50 p-4 rounded overflow-auto">
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </div>
    );
  }
}
