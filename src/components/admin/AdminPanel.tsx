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
      setDriveFiles((prev) => prev.filter((file) => file.id !== id));
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

  const tabs: { key: Tab; label: string; icon: string; hint: string }[] = [
    { key: "users", label: "Users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", hint: "Assign roles and departments" },
    { key: "departments", label: "Departments", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", hint: "Manage colleges and offices" },
    { key: "semesters", label: "Semesters", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", hint: "Create active clearance windows" },
    { key: "requirements", label: "Requirements", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", hint: "Edit the submission tree" },
    { key: "drive", label: "Drive Files", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", hint: "Review uploaded files" },
    { key: "audit", label: "Audit Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", hint: "Track administrative activity" },
  ];

  const activeTab = tabs.find((entry) => entry.key === tab) ?? tabs[0];
  const activeSemesterCount = semesters.filter((semester) => semester.isActive).length;
  const pendingFilesCount = useMemo(
    () => driveFiles.filter((file) => file.status === "submitted" || file.status === "chair_approved").length,
    [driveFiles]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Admin workspace
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage users, semesters, requirements, and submissions from one place</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Pick a tab below. Each workspace focuses on one task so you do not have to scan a giant table before taking action.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
            <MetricCard label="Users" value={`${users.length}`} tone="slate" />
            <MetricCard label="Departments" value={`${departments.length}`} tone="blue" />
            <MetricCard label="Active semesters" value={`${activeSemesterCount}`} tone="emerald" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 rounded-3xl bg-gray-100/90 p-1.5">
          {tabs.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setTab(entry.key)}
              className={`rounded-2xl px-4 py-3 text-left transition-all ${tab === entry.key ? "bg-white shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:bg-white/60 hover:text-gray-700"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tab === entry.key ? "bg-teal-50 text-teal-600" : "bg-white text-gray-400"}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={entry.icon} />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${tab === entry.key ? "text-gray-900" : "text-gray-600"}`}>{entry.label}</p>
                  <p className="text-xs text-gray-400">{entry.hint}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title={activeTab.label} description={activeTab.hint} />

        {tab === "users" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => {
                const form = roleForm[user.id] ?? { role: user.role, departmentId: user.departmentId ?? "" };
                const initials = (user.name ?? user.email)
                  .split(" ")
                  .map((chunk) => chunk[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <article key={user.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-gray-900">{user.name ?? "Unnamed user"}</h3>
                        <p className="truncate text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Field label="Role">
                        <select
                          value={form.role}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              [user.id]: { ...form, role: e.target.value },
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="professor">Professor</option>
                          <option value="chair">Chair</option>
                          <option value="dean">Dean</option>
                          <option value="admin">Admin</option>
                        </select>
                      </Field>

                      <Field label="Department">
                        <select
                          value={form.departmentId}
                          onChange={(e) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              [user.id]: { ...form, departmentId: e.target.value },
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="">No department</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => updateUserRole(user.id)}
                        disabled={loading}
                        className={primaryButtonClass}
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => del("user", user.id)}
                        disabled={loading}
                        className={dangerButtonClass}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === "departments" && (
          <div className="space-y-4">
            <form onSubmit={createDept} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
                <Field label="Department name">
                  <input value={deptName} onChange={(e) => setDeptName(e.target.value)} required className={inputClass} placeholder="e.g. Computer Science" />
                </Field>
                <Field label="College">
                  <input value={deptCollege} onChange={(e) => setDeptCollege(e.target.value)} className={inputClass} placeholder="e.g. University of Cabuyao" />
                </Field>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  Create department
                </button>
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {departments.map((department) => (
                <article key={department.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{department.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{department.college}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Department</span>
                  </div>
                  <button onClick={() => del("department", department.id)} disabled={loading} className={`mt-4 ${dangerButtonClass}`}>
                    Delete department
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "semesters" && (
          <div className="space-y-4">
            <form onSubmit={createSemester} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
              <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_auto] md:items-end">
                <Field label="Semester label">
                  <input value={semName} onChange={(e) => setSemName(e.target.value)} required className={inputClass} placeholder="e.g. 1st Semester 2024-2025" />
                </Field>
                <Field label="Deadline (optional)">
                  <input type="datetime-local" value={semDeadline} onChange={(e) => setSemDeadline(e.target.value)} className={inputClass} />
                </Field>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  Create semester
                </button>
              </div>
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              {semesters.map((semester) => (
                <article key={semester.id} className={`rounded-3xl border bg-white p-5 shadow-sm shadow-gray-100/60 ${semester.isActive ? "border-teal-300" : "border-gray-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{semester.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {semester.deadline ? `Deadline: ${new Date(semester.deadline).toLocaleString()}` : "No deadline set"}
                      </p>
                    </div>
                    {semester.isActive ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {!semester.isActive && (
                      <button onClick={() => activateSemester(semester.id)} disabled={loading} className={primaryButtonClass}>
                        Activate semester
                      </button>
                    )}
                    <button onClick={() => provisionDrive(semester.id)} disabled={loading} className={secondaryAccentButtonClass}>
                      Provision Drive folders
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "requirements" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-base font-bold text-amber-900">First-time setup</h3>
                  <p className="mt-1 text-sm text-amber-700">Run the migration once if the requirement tree table has not been created yet.</p>
                </div>
                <button onClick={runTreeMigration} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700">
                  Run migration
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60 space-y-3">
              <Field label="Select semester to edit">
                <select value={treeSemId} onChange={(e) => setTreeSemId(e.target.value)} className={`${inputClass} max-w-md`}>
                  <option value="">Choose a semester...</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}{semester.isActive ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-sm text-gray-500">After you pick a semester, the editor below will let you add folders and document nodes in the exact order professors will see.</p>
            </div>

            {treeSemId ? (
              <RequirementTreeEditor semesterId={treeSemId} />
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                Pick a semester above to edit its requirement tree.
              </div>
            )}
          </div>
        )}

        {tab === "drive" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60 space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                <Field label="Semester">
                  <select
                    value={driveFilterSemId}
                    onChange={(e) => {
                      setDriveFilterSemId(e.target.value);
                      if (e.target.value) fetchDriveFiles(e.target.value);
                      else setDriveFiles([]);
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose a semester...</option>
                    {semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.label}{semester.isActive ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {driveFilterSemId && (
                  <button onClick={() => fetchDriveFiles(driveFilterSemId)} disabled={driveFilesLoading} className={secondaryButtonClass}>
                    Refresh list
                  </button>
                )}
                <MetricCard label="Pending files" value={`${pendingFilesCount}`} tone="blue" compact />
              </div>
            </div>

            {driveFilesLoading && (
              <div className="rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">Loading files...</div>
            )}

            {!driveFilesLoading && driveFilterSemId && (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {driveFiles.map((file) => (
                  <article key={file.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{file.professorName ?? "Unnamed professor"}</h3>
                        <p className="text-sm text-gray-500">{file.professorEmail}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">File</p>
                        <a
                          href={`https://drive.google.com/file/d/${file.driveFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          {file.driveFileName ?? file.driveFileId}
                        </a>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                          {file.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">
                          {file.submittedAt ? new Date(file.submittedAt).toLocaleString() : "No date"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button onClick={() => handleDeleteDriveFile(file.id)} disabled={loading} className={dangerButtonClass}>
                        Delete file
                      </button>
                    </div>
                  </article>
                ))}

                {driveFiles.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500 lg:col-span-2 xl:col-span-3">
                    No files uploaded for this semester.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
                No audit logs yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <article key={log.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Target: <span className="font-semibold text-gray-800">{log.targetTable ?? "N/A"}</span>
                        {log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
                      </p>
                    </div>

                    <pre className="max-w-full overflow-x-auto rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500 lg:min-w-[320px]">
                      {log.metadata ? JSON.stringify(log.metadata, null, 2) : "No metadata"}
                    </pre>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald";
  compact?: boolean;
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-2xl px-4 ${compact ? "py-3" : "py-3.5"} ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-200";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryAccentButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";
