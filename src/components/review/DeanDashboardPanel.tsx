"use client";

import { useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

type ProfessorItem = {
  id: string;
  status: string;
  driveFileId: string | null;
  driveFileName: string | null;
  subjectCode: string;
  subjectName: string;
  term: string;
  docType: string;
};

type ProfessorRow = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  allChairApproved: boolean;
  allCleared: boolean;
  total: number;
  cleared: number;
  items: ProfessorItem[];
  [key: string]: unknown;
};

type DeptSummary = {
  id: string;
  name: string;
  professors: ProfessorRow[];
  completionPct: number;
  [key: string]: unknown;
};

type Semester = {
  id: string;
  label: string;
  deadline: Date | null;
  [key: string]: unknown;
};

function InlineStat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${color ?? "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function DeanDashboardPanel({
  deptSummaries,
  semesterId: _semesterId,
  activeSemester,
}: {
  deptSummaries: DeptSummary[];
  semesterId: string;
  activeSemester: Semester | null;
}) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedProf, setSelectedProf] = useState<string | null>(null);
  const [overrideItem, setOverrideItem] = useState<string | null>(null);
  const [overrideComment, setOverrideComment] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const dept = deptSummaries.find((e) => e.id === selectedDept) ?? null;
  const prof = dept?.professors.find((e) => e.id === selectedProf) ?? null;

  async function signOff(professorId: string) {
    const professor = dept?.professors.find((e) => e.id === professorId);
    if (!professor) return;
    const pendingItems = professor.items.filter((item) => item.status === "chair_approved");
    if (pendingItems.length === 0) return;
    setSubmitting(professorId);
    try {
      await Promise.all(
        pendingItems.map((item) =>
          fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clearanceItemId: item.id, decision: "dean_cleared" }),
          })
        )
      );
      window.location.reload();
    } finally {
      setSubmitting(null);
    }
  }

  async function submitOverride(itemId: string) {
    if (!overrideComment.trim()) {
      alert("Override requires a comment.");
      return;
    }
    setSubmitting(itemId);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearanceItemId: itemId, decision: "dean_override", comment: overrideComment }),
      });
      if (!res.ok) {
        alert((await res.json()).error ?? "Override failed");
        return;
      }
      setOverrideItem(null);
      setOverrideComment("");
      window.location.reload();
    } finally {
      setSubmitting(null);
    }
  }

  function exportCsv() {
    const rows: string[] = [
      ["Department", "Professor", "Email", "Cleared", "Total", "Status"].join(","),
    ];
    for (const department of deptSummaries) {
      for (const professor of department.professors) {
        rows.push(
          [
            department.name,
            professor.name,
            professor.email,
            professor.cleared,
            professor.total,
            professor.allCleared ? "Fully Cleared" : professor.allChairApproved ? "Pending Dean" : "In Progress",
          ].join(",")
        );
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clearance_${activeSemester?.label ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allProfs = deptSummaries.flatMap((e) => e.professors);
  const totalProfs = allProfs.length;
  const fullyCleared = allProfs.filter((e) => e.allCleared).length;
  const pendingDean = allProfs.filter((e) => e.allChairApproved && !e.allCleared).length;

  return (
    <div className="space-y-5">
      {/* Stats + Export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <InlineStat value={totalProfs} label="Total faculty" />
          <div className="w-px h-10 bg-gray-200" />
          <InlineStat value={pendingDean} label="Awaiting sign-off" color="text-blue-600" />
          <div className="w-px h-10 bg-gray-200" />
          <InlineStat value={fullyCleared} label="Fully cleared" color="text-emerald-600" />
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Breadcrumb */}
      {selectedDept && (
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => { setSelectedDept(null); setSelectedProf(null); }}
            className="text-teal-600 hover:underline"
          >
            Departments
          </button>
          <span className="text-gray-400">›</span>
          {selectedProf ? (
            <button onClick={() => setSelectedProf(null)} className="text-teal-600 hover:underline">
              {dept?.name}
            </button>
          ) : (
            <span className="text-gray-700 font-medium">{dept?.name}</span>
          )}
          {selectedProf && (
            <>
              <span className="text-gray-400">›</span>
              <span className="text-gray-700 font-medium">{prof?.name ?? prof?.email}</span>
            </>
          )}
        </nav>
      )}

      {/* Department cards */}
      {!selectedDept && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {deptSummaries.map((entry) => {
            const pendingCount = entry.professors.filter((f) => f.allChairApproved && !f.allCleared).length;
            const clearedCount = entry.professors.filter((f) => f.allCleared).length;
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedDept(entry.id)}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{entry.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{entry.professors.length} faculty</p>
                  </div>
                  <svg
                    className="h-4 w-4 text-gray-400 mt-0.5 shrink-0 group-hover:text-gray-600 transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{clearedCount} cleared · {pendingCount} pending sign-off</span>
                    <span className="tabular-nums font-medium text-gray-700">{entry.completionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${entry.completionPct === 100 ? "bg-emerald-500" : "bg-teal-500"}`}
                      style={{ width: `${entry.completionPct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Faculty table */}
      {selectedDept && !selectedProf && dept && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dept.professors.map((faculty) => {
                const pct = faculty.total > 0 ? Math.round((faculty.cleared / faculty.total) * 100) : 0;
                const statusLabel = faculty.allCleared
                  ? "Fully cleared"
                  : faculty.allChairApproved
                  ? "Awaiting sign-off"
                  : "In progress";
                const statusCls = faculty.allCleared
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : faculty.allChairApproved
                  ? "text-blue-700 bg-blue-50 border-blue-200"
                  : "text-gray-600 bg-gray-100 border-gray-200";
                const canSignOff = faculty.allChairApproved && !faculty.allCleared;

                return (
                  <tr key={faculty.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{faculty.name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{faculty.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">
                          {faculty.cleared}/{faculty.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedProf(faculty.id)}
                          className="h-7 px-2.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Details
                        </button>
                        {canSignOff && (
                          <button
                            onClick={() => signOff(faculty.id)}
                            disabled={submitting === faculty.id}
                            className="h-7 px-2.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
                          >
                            {submitting === faculty.id ? "Signing…" : "Sign off"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Professor item drill-down */}
      {selectedProf && prof && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{prof.name}</p>
              <p className="text-xs text-gray-500">{prof.email}</p>
            </div>
            {prof.allChairApproved && !prof.allCleared && (
              <button
                onClick={() => signOff(prof.id)}
                disabled={submitting === prof.id}
                className="h-8 px-3 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                {submitting === prof.id ? "Signing…" : "Sign off all"}
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {prof.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{item.subjectCode}</span>
                    <span className="text-sm text-gray-500">{item.docType}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                      {item.term}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.subjectName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.driveFileId && (
                    <a
                      href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 px-2.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors inline-flex items-center"
                    >
                      Open file
                    </a>
                  )}
                  {item.status !== "dean_cleared" && (
                    <button
                      onClick={() => setOverrideItem(overrideItem === item.id ? null : item.id)}
                      className="h-7 px-2.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Override
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {overrideItem && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">Dean override</p>
              <textarea
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                placeholder="Reason for override (required)"
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => submitOverride(overrideItem)}
                  disabled={submitting === overrideItem}
                  className="h-8 px-3 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Confirm override
                </button>
                <button
                  onClick={() => { setOverrideItem(null); setOverrideComment(""); }}
                  className="h-8 px-3 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
