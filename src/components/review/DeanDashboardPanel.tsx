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

  const dept = deptSummaries.find((entry) => entry.id === selectedDept) ?? null;
  const prof = dept?.professors.find((entry) => entry.id === selectedProf) ?? null;

  async function signOff(professorId: string) {
    const professor = dept?.professors.find((entry) => entry.id === professorId);
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

    for (const department of deptSummaries) {
      for (const professor of department.professors) {
        rows.push(
          [
            department.name,
            professor.name,
            professor.email,
            professor.cleared,
            professor.total,
            professor.allCleared
              ? "Fully Cleared"
              : professor.allChairApproved
                ? "Pending Dean"
                : "In Progress",
          ].join(",")
        );
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `clearance_${activeSemester?.label ?? "export"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const allProfs = deptSummaries.flatMap((entry) => entry.professors);
  const totalProfs = allProfs.length;
  const fullyCleared = allProfs.filter((entry) => entry.allCleared).length;
  const pendingDean = allProfs.filter((entry) => entry.allChairApproved && !entry.allCleared).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Faculty" value={totalProfs} icon="users" />
        <StatCard label="Awaiting Sign-off" value={pendingDean} icon="clock" color="blue" />
        <StatCard label="Fully Cleared" value={fullyCleared} icon="check" color="green" />
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {!selectedDept && (
        <div className="space-y-4">
          <SectionIntro
            eyebrow="Departments"
            title="Choose a department to review faculty status"
            description="Each card summarizes what still needs dean action so you can go directly to pending sign-offs."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {deptSummaries.map((entry) => {
              const pendingCount = entry.professors.filter((faculty) => faculty.allChairApproved && !faculty.allCleared).length;
              const clearedCount = entry.professors.filter((faculty) => faculty.allCleared).length;
              const borderTone = entry.completionPct === 100 ? "border-emerald-300" : entry.completionPct >= 50 ? "border-teal-300" : "border-amber-300";

              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedDept(entry.id)}
                  className={`rounded-3xl border bg-white p-5 text-left shadow-sm shadow-gray-100/70 transition-all hover:-translate-y-0.5 hover:shadow-md ${borderTone}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{entry.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {entry.professors.length} faculty member{entry.professors.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <MiniMetric label="Cleared" value={`${clearedCount}`} tone="emerald" />
                        <MiniMetric label="Pending" value={`${pendingCount}`} tone="blue" />
                        <MiniMetric label="Progress" value={`${entry.completionPct}%`} tone="slate" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Department completion</span>
                          <span className="font-semibold text-gray-700">{entry.completionPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${entry.completionPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <svg className="mt-1 h-5 w-5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDept && !selectedProf && dept && (
        <div className="space-y-4">
          <Breadcrumb
            items={[
              { label: "All Departments", onClick: () => setSelectedDept(null) },
              { label: dept.name },
            ]}
          />

          <SectionIntro
            eyebrow="Faculty Review"
            title={`Review ${dept.name} faculty one by one`}
            description="Use the sign-off button only when every item is already chair-approved. Open a faculty card to inspect all uploaded requirements."
          />

          <div className="space-y-4">
            {dept.professors.map((entry) => {
              const progressPct = entry.total > 0 ? Math.round((entry.cleared / entry.total) * 100) : 0;
              const initials = (entry.name ?? "?")
                .split(" ")
                .map((chunk) => chunk[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <article key={entry.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-sm font-bold text-white">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{entry.name}</h3>
                          <p className="text-sm text-gray-500">{entry.email}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <MiniMetric label="Cleared" value={`${entry.cleared}/${entry.total}`} tone="emerald" />
                          <MiniMetric label="Awaiting dean" value={`${entry.items.filter((item) => item.status === "chair_approved").length}`} tone="blue" />
                          <MiniMetric label="Progress" value={`${progressPct}%`} tone="slate" />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Faculty completion</span>
                            <span className="font-semibold text-gray-700">{progressPct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      {entry.allCleared ? (
                        <Badge label="Fully cleared" tone="emerald" />
                      ) : entry.allChairApproved ? (
                        <Badge label="Ready for dean sign-off" tone="blue" />
                      ) : (
                        <Badge label="Still in progress" tone="slate" />
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:w-[180px]">
                        {entry.allChairApproved && !entry.allCleared && (
                          <button
                            onClick={() => signOff(entry.id)}
                            disabled={submitting === entry.id}
                            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Sign off all
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedProf(entry.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          Open details
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {selectedProf && prof && dept && (
        <div className="space-y-4">
          <Breadcrumb
            items={[
              { label: "All Departments", onClick: () => setSelectedDept(null) },
              { label: dept.name, onClick: () => setSelectedProf(null) },
              { label: prof.name ?? "Faculty member" },
            ]}
          />

          <SectionIntro
            eyebrow="Faculty Requirements"
            title={`Inspect ${prof.name ?? "faculty member"}'s uploaded documents`}
            description="Open the file when needed, then use override only if you need to clear an exception with an audit comment."
          />

          <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{prof.name}</h3>
                <p className="text-sm text-gray-500">{prof.email} • {dept.name}</p>
              </div>
              <Badge
                label={prof.allCleared ? "Fully cleared" : prof.allChairApproved ? "Awaiting dean sign-off" : "Mixed review states"}
                tone={prof.allCleared ? "emerald" : prof.allChairApproved ? "blue" : "slate"}
              />
            </div>

            {prof.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900">
                        {item.subjectCode}
                        <span className="mx-1.5 font-normal text-gray-300">•</span>
                        <span className="font-medium text-gray-700">{item.docType}</span>
                      </h4>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium capitalize text-gray-600">
                        {item.term}
                      </span>
                      <span>{item.subjectName}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:w-[280px] lg:flex-col">
                    {item.driveFileId && (
                      <a
                        href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Open file
                      </a>
                    )}

                    {item.status !== "dean_cleared" && item.status !== "not_submitted" && (
                      overrideItem === item.id ? (
                        <div className="space-y-2 rounded-2xl border border-purple-200 bg-white p-3">
                          <textarea
                            placeholder="Explain the override for the audit trail"
                            value={overrideComment}
                            onChange={(e) => setOverrideComment(e.target.value)}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitOverride(item.id)}
                              disabled={submitting === item.id}
                              className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Confirm override
                            </button>
                            <button
                              onClick={() => {
                                setOverrideItem(null);
                                setOverrideComment("");
                              }}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setOverrideItem(item.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100"
                        >
                          Override with comment
                        </button>
                      )
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="max-w-2xl text-sm text-gray-500">{description}</p>
    </div>
  );
}

function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; onClick?: () => void }>;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-300">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="font-medium text-teal-700 transition-colors hover:text-teal-800">
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-gray-800">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "emerald" | "slate";
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "slate";
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-2xl px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
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
  const bg =
    color === "blue"
      ? "bg-blue-50 border-blue-100"
      : color === "green"
        ? "bg-emerald-50 border-emerald-100"
        : "bg-white border-gray-200";
  const numCls =
    color === "blue"
      ? "text-blue-700"
      : color === "green"
        ? "text-emerald-700"
        : "text-gray-900";
  const iconBg =
    color === "blue"
      ? "bg-blue-100 text-blue-600"
      : color === "green"
        ? "bg-emerald-100 text-emerald-600"
        : "bg-gray-100 text-gray-500";

  const icons = {
    users: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    clock: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`flex items-center gap-4 rounded-3xl border p-5 ${bg}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        {icons[icon]}
      </div>
      <div>
        <div className={`text-3xl font-bold leading-none ${numCls}`}>{value}</div>
        <div className="mt-1 text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
