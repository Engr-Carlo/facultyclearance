"use client";

import { useState } from "react";

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

type Requirement = {
  id: string;
  docType: string;
  subjectCode: string;
  subjectName: string;
  term: string;
  description: string | null;
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

type Tab = "users" | "departments" | "semesters" | "requirements" | "audit";

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

  // Requirement form
  const [reqDocType, setReqDocType] = useState("");
  const [reqSubjectCode, setReqSubjectCode] = useState("");
  const [reqSubjectName, setReqSubjectName] = useState("");
  const [reqTerm, setReqTerm] = useState("prelim");
  const [reqDesc, setReqDesc] = useState("");
  const [reqUserId, setReqUserId] = useState("");
  const [reqSemId, setReqSemId] = useState("");
  const [reqId, setReqId] = useState("");

  // Requirements list (fetched on demand)
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [reqsFetched, setReqsFetched] = useState(false);

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

  async function createRequirement(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("requirement", {
        docType: reqDocType,
        subjectCode: reqSubjectCode,
        subjectName: reqSubjectName,
        term: reqTerm,
        description: reqDesc || null,
      });
      setReqDocType("");
      setReqSubjectCode("");
      setReqSubjectName("");
      setReqDesc("");
      alert("Requirement created");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function assignRequirement(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("professor-requirement", {
        professorId: reqUserId,
        requirementId: reqId,
        semesterId: reqSemId,
      });
      setReqUserId("");
      setReqId("");
      setReqSemId("");
      alert("Requirement assigned to professor");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function fetchRequirements() {
    if (reqsFetched) return;
    const res = await fetch("/api/admin?entity=requirements");
    const data = await res.json();
    // API returns all entities; we fetch by searching for requirements
    // The admin route returns them under the requirements key when entity=requirements
    if (Array.isArray(data)) setRequirements(data);
    else if (data.requirements) setRequirements(data.requirements);
    setReqsFetched(true);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "departments", label: "Departments" },
    { key: "semesters", label: "Semesters" },
    { key: "requirements", label: "Requirements" },
    { key: "audit", label: "Audit Logs" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "requirements") fetchRequirements();
            }}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
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
          <div className="grid md:grid-cols-2 gap-4">
            {/* Create requirement */}
            <form
              onSubmit={createRequirement}
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-gray-800">New Requirement</h3>
              <input
                value={reqDocType}
                onChange={(e) => setReqDocType(e.target.value)}
                required
                placeholder="Document type (e.g. Grade Sheet)"
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <input
                value={reqSubjectCode}
                onChange={(e) => setReqSubjectCode(e.target.value)}
                required
                placeholder="Subject code (e.g. CS101)"
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <input
                value={reqSubjectName}
                onChange={(e) => setReqSubjectName(e.target.value)}
                required
                placeholder="Subject name"
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <select
                value={reqTerm}
                onChange={(e) => setReqTerm(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full"
              >
                <option value="prelim">Prelim</option>
                <option value="midterm">Midterm</option>
                <option value="finals">Finals</option>
              </select>
              <textarea
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="text-sm bg-teal-600 text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 w-full transition-colors"
              >
                Create Requirement
              </button>
            </form>

            {/* Assign requirement */}
            <form
              onSubmit={assignRequirement}
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-gray-800">Assign to Professor</h3>
              <select
                value={reqUserId}
                onChange={(e) => setReqUserId(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full"
              >
                <option value="">Select professor...</option>
                {users
                  .filter((u) => u.role === "professor")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email}
                    </option>
                  ))}
              </select>
              <select
                value={reqSemId}
                onChange={(e) => setReqSemId(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full"
              >
                <option value="">Select semester...</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={reqId}
                onChange={(e) => setReqId(e.target.value)}
                required
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-full"
              >
                <option value="">Select requirement...</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.subjectCode} — {r.docType} ({r.term})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full transition-colors"
              >
                Assign
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Doc Type</th>
                  <th className="text-left px-4 py-3 font-medium">Term</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requirements.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.subjectCode}</div>
                      <div className="text-xs text-gray-400">{r.subjectName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.docType}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{r.term}</td>
                  </tr>
                ))}
                {requirements.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs">
                      No requirements created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
