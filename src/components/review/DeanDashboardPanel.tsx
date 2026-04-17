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
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total professors" value={totalProfs} />
        <StatCard label="Fully cleared" value={fullyCleared} color="green" />
        <StatCard label="Awaiting sign-off" value={pendingDean} color="blue" highlight />
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Department cards */}
      {!selectedDept && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deptSummaries.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition-all"
            >
              <div className="font-semibold text-gray-900 mb-1">{d.name}</div>
              <div className="text-xs text-gray-400 mb-3">
                {d.professors.length} professor{d.professors.length !== 1 ? "s" : ""}
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${d.completionPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{d.completionPct}% cleared</div>
            </button>
          ))}
        </div>
      )}

      {/* Prof list within dept */}
      {selectedDept && !selectedProf && dept && (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedDept(null)}
            className="text-xs text-teal-600 hover:underline"
          >
            ← Back to departments
          </button>
          <h2 className="font-semibold text-gray-800">{dept.name}</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium">Professor</th>
                  <th className="text-left px-4 py-3 font-medium">Progress</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dept.professors.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{
                              width: `${p.total > 0 ? Math.round((p.cleared / p.total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {p.cleared}/{p.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.allCleared ? (
                        <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                          Fully cleared
                        </span>
                      ) : p.allChairApproved ? (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          Awaiting sign-off
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">In progress</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.allChairApproved && !p.allCleared && (
                        <button
                          onClick={() => signOff(p.id)}
                          disabled={submitting === p.id}
                          className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                          Sign off
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedProf(p.id);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item-level drill down */}
      {selectedProf && prof && dept && (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedProf(null)}
            className="text-xs text-teal-600 hover:underline"
          >
            ← Back to {dept.name}
          </button>
          <h2 className="font-semibold text-gray-800">
            {prof.name} — {dept.name}
          </h2>
          <div className="space-y-2">
            {prof.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-lg p-3 flex flex-wrap items-start gap-3"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-medium text-gray-900">
                    {item.subjectCode} — {item.docType}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    {item.term} · {item.subjectName}
                  </div>
                </div>
                <StatusBadge status={item.status} />
                {item.driveFileId && (
                  <a
                    href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open file
                  </a>
                )}
                {item.status !== "dean_cleared" && item.status !== "not_submitted" && (
                  <>
                    {overrideItem === item.id ? (
                      <div className="w-full flex flex-col gap-2">
                        <textarea
                          placeholder="Override reason (required)"
                          value={overrideComment}
                          onChange={(e) => setOverrideComment(e.target.value)}
                          rows={2}
                          className="text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitOverride(item.id)}
                            disabled={submitting === item.id}
                            className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            Confirm Override
                          </button>
                          <button
                            onClick={() => {
                              setOverrideItem(null);
                              setOverrideComment("");
                            }}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setOverrideItem(item.id)}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Override
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "blue";
  highlight?: boolean;
}) {
  const bg =
    color === "green"
      ? "bg-teal-50 border-teal-200"
      : color === "blue"
      ? "bg-blue-50 border-blue-200"
      : "bg-white border-gray-200";
  const text =
    color === "green"
      ? "text-teal-700"
      : color === "blue"
      ? "text-blue-700"
      : "text-gray-900";

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
