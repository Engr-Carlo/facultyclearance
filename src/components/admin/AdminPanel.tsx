"use client";

import { useState } from "react";
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

  // User role/dept form
  const [roleForm, setRoleForm] = useState<Record<string, { role: string; departmentId: string }>>({});

  // Dept form
  const [deptName, setDeptName] = useState("");
  const [deptCollege, setDeptCollege] = useState("University of Cabuyao");

  // Semester form
  const [semName, setSemName] = useState("");
  const [semTerm, setSemTerm] = useState("first");
  const [semYear, setSemYear] = useState("");
  const [semDeadline, setSemDeadline] = useState("");


  // Tree editor semester selection
  const [treeSemId, setTreeSemId] = useState<string>("");

  // Drive files
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
      const res = await fetch(`/api/admin?entity=${entity}&id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Delete failed");
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
      await post("user-role", {
        userId,
        role: form.role,
        departmentId: form.departmentId || null,
      });
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
      await post("semester", {
        label: semName,
        deadline: semDeadline || null,
      });
      setSemName("");
      setSemYear("");
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



  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "users",        label: "Users",        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { key: "departments",  label: "Departments",  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { key: "semesters",    label: "Semesters",    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { key: "requirements", label: "Requirements", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { key: "drive",        label: "Drive Files",  icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
    { key: "audit",        label: "Audit Logs",   icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 bg-gray-100/80 p-1 rounded-2xl min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Name / Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const form = roleForm[u.id] ?? { role: u.role, departmentId: u.departmentId ?? "" };
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.name ?? "—"}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
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
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1"
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
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                      >
                        <option value="">No department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => updateUserRole(u.id)}
                        disabled={loading}
                        className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => del("user", u.id)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Departments tab */}
      {tab === "departments" && (
        <div className="space-y-4">
          <form
            onSubmit={createDept}
            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Department Name</label>
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">College</label>
              <input
                value={deptCollege}
                onChange={(e) => setDeptCollege(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                placeholder="e.g. University of Cabuyao"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="text-sm bg-teal-600 text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              Create Department
            </button>
          </form>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium">College</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500">{d.college}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => del("department", d.id)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:underline"
                      >
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

      {/* Semesters tab */}
      {tab === "semesters" && (
        <div className="space-y-4">
          <form
            onSubmit={createSemester}
            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Name</label>
              <input
                value={semName}
                onChange={(e) => setSemName(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                placeholder="e.g. 1st Semester 2024-2025"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Term</label>
              <select
                value={semTerm}
                onChange={(e) => setSemTerm(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
              >
                <option value="first">1st Semester</option>
                <option value="second">2nd Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">School Year</label>
              <input
                value={semYear}
                onChange={(e) => setSemYear(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                placeholder="2024-2025"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Deadline (optional)</label>
              <input
                type="datetime-local"
                value={semDeadline}
                onChange={(e) => setSemDeadline(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="text-sm bg-teal-600 text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
          </form>

          <div className="space-y-3">
            {semesters.map((s) => (
              <div
                key={s.id}
                className={`bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3 ${
                  s.isActive ? "border-teal-300" : "border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {s.label}
                    {s.isActive && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {s.deadline
                      ? `Deadline: ${new Date(s.deadline).toLocaleString()}`
                      : "No deadline set"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!s.isActive && (
                    <button
                      onClick={() => activateSemester(s.id)}
                      disabled={loading}
                      className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => provisionDrive(s.id)}
                    disabled={loading}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Provision Drive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements tab */}
      {tab === "requirements" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-800">First-time setup required</p>
              <p className="text-xs text-amber-600 mt-0.5">Run the DB migration once to create the requirement tree table.</p>
            </div>
            <button
              onClick={runTreeMigration}
              className="text-xs bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 shrink-0"
            >
              Run Migration
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Semester to Edit Tree
            </label>
            <select
              value={treeSemId}
              onChange={(e) => setTreeSemId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full max-w-sm"
            >
              <option value="">Choose a semester…</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {treeSemId ? (
            <RequirementTreeEditor semesterId={treeSemId} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Pick a semester above to view or edit its requirement tree.
            </p>
          )}
        </div>
      )}

      {/* Drive Files tab */}
      {tab === "drive" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Semester</label>
              <select
                value={driveFilterSemId}
                onChange={(e) => {
                  setDriveFilterSemId(e.target.value);
                  if (e.target.value) fetchDriveFiles(e.target.value);
                  else setDriveFiles([]);
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 min-w-[240px]"
              >
                <option value="">Choose a semester…</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}{s.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {driveFilterSemId && (
              <button
                onClick={() => fetchDriveFiles(driveFilterSemId)}
                disabled={driveFilesLoading}
                className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          {driveFilesLoading && (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          )}

          {!driveFilesLoading && driveFilterSemId && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Professor</th>
                    <th className="text-left px-4 py-3 font-medium">File</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {driveFiles.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{f.professorName ?? "—"}</div>
                        <div className="text-xs text-gray-400">{f.professorEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://drive.google.com/file/d/${f.driveFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {f.driveFileName ?? f.driveFileId}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{f.status.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteDriveFile(f.id)}
                          disabled={loading}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {driveFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                        No files uploaded for this semester
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit tab */}
      {tab === "audit" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Target</th>
                <th className="text-left px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {log.targetTable ?? "—"}{log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate font-mono">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No audit logs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
