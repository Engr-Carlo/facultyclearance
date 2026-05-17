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

  const dept = deptSummaries.find((d) => d.id === selectedDept);
  const prof = dept?.professors.find((p) => p.id === selectedProf);

  async function signOff(professorId: string) {
    const p = dept?.professors.find((pp) => pp.id === professorId);
    if (!p) return;
    const pendingItems = p.items.filter((i) => i.status === "chair_approved");
    if (pendingItems.length === 0) return;
    setSubmitting(professorId);
    try {
      await Promise.all(
        pendingItems.map((item) =>
          fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clearanceItemId: item.id,
              decision: "dean_cleared",
            }),
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
        body: JSON.stringify({
          clearanceItemId: itemId,
          decision: "dean_override",
          comment: overrideComment,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Override failed");
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
    for (const d of deptSummaries) {
      for (const p of d.professors) {
        rows.push(
          [
            d.name,
            p.name,
            p.email,
            p.cleared,
            p.total,
            p.allCleared ? "Fully Cleared" : p.allChairApproved ? "Pending Dean" : "In Progress",
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

  // College-wide stats
  const allProfs = deptSummaries.flatMap((d) => d.professors);
  const totalProfs = allProfs.length;
  const fullyCleared = allProfs.filter((p) => p.allCleared).length;
  const pendingDean = allProfs.filter((p) => p.allChairApproved && !p.allCleared).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Faculty" value={totalProfs} icon="users" />
        <StatCard label="Awaiting Dean Sign-off" value={pendingDean} icon="clock" color="blue" />
        <StatCard label="Fully Cleared" value={fullyCleared} icon="check" color="green" />
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Department overview ── */}
      {!selectedDept && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Departments</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deptSummaries.map((d) => {
              const deptFullyCleared = d.professors.filter((p) => p.allCleared).length;
              const deptPending = d.professors.filter((p) => p.allChairApproved && !p.allCleared).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDept(d.id)}
                  className="text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-teal-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{d.name}</div>
                      <div className="text-xs text-gray-400">{d.professors.length} professor{d.professors.length !== 1 ? "s" : ""}</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${d.completionPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{d.completionPct}% cleared</span>
                    <div className="flex gap-3">
                      {deptPending > 0 && (
                        <span className="text-blue-600 font-medium">{deptPending} pending sign-off</span>
                      )}
                      {deptFullyCleared > 0 && (
                        <span className="text-emerald-600 font-medium">{deptFullyCleared} cleared</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Professor list within dept ── */}
      {selectedDept && !selectedProf && dept && (
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setSelectedDept(null)} className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Departments
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-semibold">{dept.name}</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">{dept.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{dept.professors.length} faculty member{dept.professors.length !== 1 ? "s" : ""}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold">Professor</th>
                  <th className="text-left px-5 py-3 font-semibold">Progress</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dept.professors.map((p) => {
                  const pct = p.total > 0 ? Math.round((p.cleared / p.total) * 100) : 0;
                  const initials = (p.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums">{p.cleared}/{p.total}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.allCleared ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Fully cleared
                          </span>
                        ) : p.allChairApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Awaiting sign-off
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">In progress</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.allChairApproved && !p.allCleared && (
                            <button
                              onClick={() => signOff(p.id)}
                              disabled={submitting === p.id}
                              className="text-xs font-semibold bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            >
                              Sign off
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedProf(p.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Item-level drill-down ── */}
      {selectedProf && prof && dept && (
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button onClick={() => setSelectedDept(null)} className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Departments
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => setSelectedProf(null)} className="text-teal-600 hover:text-teal-800 font-medium">
              {dept.name}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-semibold">{prof.name}</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">{prof.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{prof.email} · {dept.name}</p>
            </div>
            <div className="p-4 space-y-2">
              {prof.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex flex-wrap items-start gap-3"
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.subjectCode}
                      <span className="font-normal text-gray-300 mx-1.5">·</span>
                      <span className="font-normal text-gray-700">{item.docType}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs capitalize text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md">{item.term}</span>
                      <span className="text-xs text-gray-400">{item.subjectName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={item.status} />
                    {item.driveFileId && (
                      <a
                        href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open file
                      </a>
                    )}
                  </div>

                  {item.status !== "dean_cleared" && item.status !== "not_submitted" && (
                    overrideItem === item.id ? (
                      <div className="w-full flex flex-col gap-2">
                        <textarea
                          placeholder="Override reason (required)"
                          value={overrideComment}
                          onChange={(e) => setOverrideComment(e.target.value)}
                          rows={2}
                          className="text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 w-full bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitOverride(item.id)}
                            disabled={submitting === item.id}
                            className="text-xs font-semibold bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            Confirm Override
                          </button>
                          <button
                            onClick={() => { setOverrideItem(null); setOverrideComment(""); }}
                            className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setOverrideItem(item.id)}
                        className="text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-colors"
                      >
                        Override
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: "users" | "clock" | "check";
  color?: "blue" | "green";
}) {
  const bg     = color === "blue"  ? "bg-blue-50 border-blue-100"     : color === "green" ? "bg-emerald-50 border-emerald-100"   : "bg-white border-gray-200";
  const numCls = color === "blue"  ? "text-blue-700"                  : color === "green" ? "text-emerald-700"                   : "text-gray-900";
  const iconBg = color === "blue"  ? "bg-blue-100 text-blue-600"      : color === "green" ? "bg-emerald-100 text-emerald-600"    : "bg-gray-100 text-gray-500";

  const icons = {
    users: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${bg}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icons[icon]}
      </div>
      <div>
        <div className={`text-3xl font-bold leading-none ${numCls}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
      </div>
    </div>
  );
}

