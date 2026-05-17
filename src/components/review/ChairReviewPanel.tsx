"use client";

import { useState } from "react";
import Image from "next/image";
import StatusBadge from "@/components/ui/StatusBadge";

type ProfessorSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  completionPct: number;
  total: number;
  approved: number;
  pending: number;
  items: {
    id: string;
    status: string;
    driveFileId: string | null;
    driveFileName: string | null;
    submittedAt: Date | null;
    subjectCode: string;
    subjectName: string;
    term: string;
    docType: string;
  }[];
};

export default function ChairReviewPanel({
  professors,
  semesterId: _semesterId,
}: {
  professors: ProfessorSummary[];
  semesterId: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ fileId: string; name: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTerm, setFilterTerm] = useState<string>("all");

  async function submitReview(
    itemId: string,
    decision: "approved" | "returned" | "rejected"
  ) {
    const c = comment[itemId] ?? "";
    if ((decision === "returned" || decision === "rejected") && !c.trim()) {
      alert("Please add a comment when returning or rejecting a document.");
      return;
    }
    setSubmitting(itemId);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearanceItemId: itemId, decision, comment: c }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Review failed");
        return;
      }
      window.location.reload();
    } finally {
      setSubmitting(null);
    }
  }

  const pendingTotal = professors.reduce((sum, p) => sum + p.pending, 0);
  const fullyApproved = professors.filter((p) => p.total > 0 && p.approved === p.total).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Faculty Members" value={professors.length} icon="users" />
        <StatCard label="Documents Pending Review" value={pendingTotal} icon="clock" color="amber" />
        <StatCard label="Fully Approved" value={fullyApproved} icon="check" color="green" />
      </div>

      {professors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <svg className="w-14 h-14 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-600 font-semibold">No professors in your department</p>
          <p className="text-gray-400 text-sm mt-1">Faculty will appear here once assigned to your department.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Faculty Members</p>
          {professors.map((prof) => {
            const initials = (prof.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            const isOpen = expanded === prof.id;
            const filteredItems = prof.items.filter(
              (item) =>
                (filterTerm === "all" || item.term === filterTerm) &&
                (filterStatus === "all" || item.status === filterStatus)
            );

            return (
              <div key={prof.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : prof.id)}
                >
                  {prof.image ? (
                    <Image src={prof.image} alt={prof.name} width={46} height={46} className="rounded-full ring-2 ring-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{prof.name}</span>
                      {prof.pending > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          {prof.pending} to review
                        </span>
                      )}
                      {prof.total > 0 && prof.approved === prof.total && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ All approved</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{prof.email}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${prof.completionPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{prof.approved}/{prof.total} approved</span>
                    </div>
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-slate-50/60 p-4 space-y-4">
                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="text-xs text-gray-400 font-medium">Filter:</span>
                      <select
                        value={filterTerm}
                        onChange={(e) => setFilterTerm(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        <option value="all">All Terms</option>
                        <option value="prelim">Prelim</option>
                        <option value="midterm">Midterm</option>
                        <option value="finals">Finals</option>
                      </select>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        <option value="all">All Statuses</option>
                        <option value="submitted">Pending Review</option>
                        <option value="returned">Returned</option>
                        <option value="chair_approved">Approved</option>
                        <option value="not_submitted">Not Submitted</option>
                      </select>
                    </div>

                    {filteredItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No items match the filter.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className={`bg-white rounded-xl border p-4 transition-shadow ${
                              item.status === "submitted"
                                ? "border-amber-200 shadow-sm shadow-amber-50"
                                : "border-gray-100"
                            }`}
                          >
                            <div className="flex flex-wrap items-start gap-3">
                              <div className="flex-1 min-w-[180px]">
                                <div className="text-sm font-semibold text-gray-900">
                                  {item.subjectCode}
                                  <span className="font-normal text-gray-300 mx-1.5">·</span>
                                  <span className="font-normal text-gray-700">{item.docType}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs capitalize text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{item.term}</span>
                                  <span className="text-xs text-gray-400 truncate">{item.subjectName}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={item.status} />
                                {item.driveFileId && (
                                  <button
                                    onClick={() =>
                                      setPreview(
                                        preview?.fileId === item.driveFileId
                                          ? null
                                          : { fileId: item.driveFileId!, name: item.driveFileName ?? "File" }
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    {preview?.fileId === item.driveFileId ? "Close preview" : "View file"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.status === "submitted" && (
                              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                <textarea
                                  placeholder="Add a comment (required for Return or Reject)"
                                  value={comment[item.id] ?? ""}
                                  onChange={(e) => setComment((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  rows={2}
                                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 w-full resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitReview(item.id, "approved")}
                                    disabled={submitting === item.id}
                                    className="flex-1 sm:flex-none text-xs font-semibold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => submitReview(item.id, "returned")}
                                    disabled={submitting === item.id}
                                    className="flex-1 sm:flex-none text-xs font-semibold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                  >
                                    ↩ Return
                                  </button>
                                  <button
                                    onClick={() => submitReview(item.id, "rejected")}
                                    disabled={submitting === item.id}
                                    className="flex-1 sm:flex-none text-xs font-semibold bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </div>
                            )}

                            {preview?.fileId === item.driveFileId && (
                              <div className="mt-3">
                                <iframe
                                  src={`https://drive.google.com/file/d/${item.driveFileId}/preview`}
                                  className="w-full h-96 rounded-xl border border-gray-200"
                                  title={preview.name}
                                  allow="autoplay"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
  color?: "amber" | "green";
}) {
  const bg      = color === "amber" ? "bg-amber-50 border-amber-100"   : color === "green" ? "bg-emerald-50 border-emerald-100"   : "bg-white border-gray-200";
  const numCls  = color === "amber" ? "text-amber-600"                 : color === "green" ? "text-emerald-600"                   : "text-gray-900";
  const iconBg  = color === "amber" ? "bg-amber-100 text-amber-600"    : color === "green" ? "bg-emerald-100 text-emerald-600"    : "bg-gray-100 text-gray-500";

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
