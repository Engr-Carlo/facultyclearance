"use client";

import { useMemo, useState } from "react";
import RequirementTreeEditor from "./RequirementTreeEditor";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  departmentId: string | null;
  createdAt: string;
};

type Department = {
  id: string;
  name: string;
  college: string;
  createdAt: string;
};

type Semester = {
  id: string;
  label: string;
  isActive: boolean;
  deadline: string | null;
  driveFolderId: string | null;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

type Tab = "users" | "departments" | "semesters" | "requirements" | "audit" | "drive";

type DriveFile = {
  id: string;
  professorId: string;
  professorName: string | null;
  professorEmail: string;
  driveFileId: string;
  driveFileName: string | null;
  status: string;
  submittedAt: string | null;
};

const inputCls =
  "h-8 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-full";
const btnPrimary =
  "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors whitespace-nowrap";
const btnSecondary =
  "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap";
const btnDanger =
  "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap";
const btnDark =
  "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors whitespace-nowrap";
const selCls =
  "h-8 px-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500";

const TABS: { key: Tab; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "departments", label: "Departments" },
  { key: "semesters", label: "Semesters" },
  { key: "requirements", label: "Requirements" },
  { key: "drive", label: "Drive Files" },
  { key: "audit", label: "Audit Logs" },
];

export default function AdminPanel({
  users,
  departments,
  semesters,
  auditLogs,
}: {
  users: User[];
  departments: Department[];
  semesters: Semester[];
  auditLogs: AuditLog[];
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(false);
  const [roleForm, setRoleForm] = useState<Record<string, { role: string; departmentId: string }>>({});
  const [deptName, setDeptName] = useState("");
  const [deptCollege, setDeptCollege] = useState("University of Cabuyao");
  const [semName, setSemName] = useState("");
  const [semDeadline, setSemDeadline] = useState("");
  const [treeSemId, setTreeSemId] = useState<string>("");
  const [driveFilterSemId, setDriveFilterSemId] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFilesLoading, setDriveFilesLoading] = useState(false);

  async function post(entity: string, body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?entity=${entity}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function del(entity: string, id: string) {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?entity=${entity}&id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert((await res.json()).error ?? "Delete failed");
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string) {
    const form = roleForm[userId];
    if (!form) return;
    try {
      await post("user-role", { userId, role: form.role, departmentId: form.departmentId || null });
      window.location.reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  async function createDept(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("department", { name: deptName, college: deptCollege });
      setDeptName("");
      setDeptCollege("University of Cabuyao");
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function createSemester(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("semester", { label: semName, deadline: semDeadline || null });
      setSemName("");
      setSemDeadline("");
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function activateSemester(id: string) {
    try {
      await post("activate-semester", { semesterId: id });
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function provisionDrive(semesterId: string) {
    try {
      await post("provision-drive", { semesterId });
      alert("Drive folders provisioned successfully!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function fetchDriveFiles(semesterId: string) {
    setDriveFilesLoading(true);
    try {
      const res = await fetch(`/api/admin?entity=drive-files&semesterId=${semesterId}`);
      if (!res.ok) throw new Error("Failed to load");
      setDriveFiles(await res.json());
    } catch {
      setDriveFiles([]);
    } finally {
      setDriveFilesLoading(false);
    }
  }

  async function handleDeleteDriveFile(id: string) {
    if (!confirm("Delete this file from Google Drive and clear the submission? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?entity=drive-file&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setDriveFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function runTreeMigration() {
    try {
      const res = await fetch("/api/admin?entity=migrate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Migration failed");
      alert("Migration successful! Requirement tree table is ready.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Migration failed");
    }
  }

  const pendingFilesCount = useMemo(
    () => driveFiles.filter((f) => f.status === "submitted" || f.status === "chair_approved").length,
    [driveFiles]
  );

  return (
    <div className="space-y-0">
      {/* GitHub-style tab bar */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="-mb-px flex gap-0 px-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.key === "drive" && driveFiles.length > 0 && pendingFilesCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-xs bg-amber-100 text-amber-700 rounded-full w-4 h-4 font-semibold">
                  {pendingFilesCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg">

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const form = roleForm[u.id] ?? { role: u.role, departmentId: u.departmentId ?? "" };
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name ?? "—"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={form.role}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              [u.id]: { ...form, role: e.target.value },
                            }))
                          }
                          className={selCls}
                        >
                          <option value="professor">Professor</option>
                          <option value="chair">Chair</option>
                          <option value="dean">Dean</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={form.departmentId}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              [u.id]: { ...form, departmentId: e.target.value },
                            }))
                          }
                          className={selCls}
                        >
                          <option value="">No department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateUserRole(u.id)}
                            disabled={loading}
                            className={btnPrimary}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => del("user", u.id)}
                            disabled={loading}
                            className={btnDanger}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Departments ── */}
        {tab === "departments" && (
          <div className="p-4 space-y-4">
            <form onSubmit={createDept} className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Department name</label>
                <input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  required
                  className={inputCls}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">College</label>
                <input
                  value={deptCollege}
                  onChange={(e) => setDeptCollege(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                Add department
              </button>
            </form>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-gray-500">{d.college}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => del("department", d.id)} disabled={loading} className={btnDanger}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Semesters ── */}
        {tab === "semesters" && (
          <div className="p-4 space-y-4">
            <form onSubmit={createSemester} className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                <input
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="e.g. S.Y. 2025–2026 1st Sem"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={semDeadline}
                  onChange={(e) => setSemDeadline(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                Create semester
              </button>
            </form>

            <div className="space-y-2">
              {semesters.map((sem) => (
                <div
                  key={sem.id}
                  className={`border rounded-lg p-4 ${sem.isActive ? "border-teal-200 bg-teal-50/30" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{sem.label}</span>
                        {sem.isActive && (
                          <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                            Active
                          </span>
                        )}
                      </div>
                      {sem.deadline && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Deadline: {new Date(sem.deadline).toLocaleDateString("en-PH", { dateStyle: "long" })}
                        </p>
                      )}
                      {sem.driveFolderId && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Drive folder: {sem.driveFolderId.slice(0, 12)}…
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {!sem.isActive && (
                        <button onClick={() => activateSemester(sem.id)} disabled={loading} className={btnPrimary}>
                          Activate
                        </button>
                      )}
                      <button onClick={() => provisionDrive(sem.id)} disabled={loading} className={btnSecondary}>
                        Provision Drive
                      </button>
                      <button onClick={() => del("semester", sem.id)} disabled={loading} className={btnDanger}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Requirements ── */}
        {tab === "requirements" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                First-time setup: run the tree migration to create the requirement nodes table.
              </div>
              <button onClick={runTreeMigration} className={btnDark}>
                Run migration
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700 shrink-0">Semester:</label>
              <select
                value={treeSemId}
                onChange={(e) => setTreeSemId(e.target.value)}
                className={selCls}
              >
                <option value="">Select a semester…</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {treeSemId && (
              <RequirementTreeEditor semesterId={treeSemId} departments={departments} />
            )}
          </div>
        )}

        {/* ── Drive Files ── */}
        {tab === "drive" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <select
                value={driveFilterSemId}
                onChange={(e) => setDriveFilterSemId(e.target.value)}
                className={selCls}
              >
                <option value="">Select a semester…</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => driveFilterSemId && fetchDriveFiles(driveFilterSemId)}
                disabled={!driveFilterSemId || driveFilesLoading}
                className={btnSecondary}
              >
                {driveFilesLoading ? "Loading…" : "Load files"}
              </button>
            </div>

            {driveFiles.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {driveFiles.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{f.professorName ?? "—"}</div>
                          <div className="text-xs text-gray-500">{f.professorEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://drive.google.com/file/d/${f.driveFileId}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-600 hover:underline text-sm"
                          >
                            {f.driveFileName ?? f.driveFileId.slice(0, 12) + "…"}
                          </a>
                          {f.submittedAt && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(f.submittedAt).toLocaleDateString("en-PH")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 capitalize">{f.status.replace("_", " ")}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteDriveFile(f.id)}
                            disabled={loading}
                            className={btnDanger}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Audit Logs ── */}
        {tab === "audit" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {new Date(log.createdAt).toLocaleString("en-PH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                    <td className="px-4 py-3 text-gray-500">{log.targetTable ?? "—"}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-500 font-mono">
                        {log.targetId ? log.targetId.slice(0, 8) + "…" : "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {log.metadata ? (
                        <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(log.metadata, null, 0)}
                        </pre>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
