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

const selCls =
  "h-7 px-2 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

function InlineStat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${color ?? "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");

  async function submitReview(itemId: string, decision: "approved" | "returned" | "rejected") {
    const c = comment[itemId] ?? "";
    if ((decision === "returned" || decision === "rejected") && !c.trim()) {
      alert("Please add a comment when returning or rejecting.");
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
        alert((await res.json()).error ?? "Review failed");
        return;
      }
      window.location.reload();
    } finally {
      setSubmitting(null);
    }
  }

  const pendingTotal = professors.reduce((s, p) => s + p.pending, 0);
  const fullyApproved = professors.filter((p) => p.total > 0 && p.approved === p.total).length;

  if (professors.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center">
        <p className="text-sm font-medium text-gray-900">No faculty in your department</p>
        <p className="text-sm text-gray-500 mt-1">Faculty will appear here once assigned by an admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Inline stats */}
      <div className="flex items-center gap-6">
        <InlineStat value={professors.length} label="Faculty members" />
        <div className="w-px h-10 bg-gray-200" />
        <InlineStat value={pendingTotal} label="Pending review" color="text-amber-600" />
        <div className="w-px h-10 bg-gray-200" />
        <InlineStat value={fullyApproved} label="Fully approved" color="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Filter:</span>
        <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className={selCls}>
          <option value="all">All terms</option>
          <option value="prelim">Prelim</option>
          <option value="midterm">Midterm</option>
          <option value="finals">Finals</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selCls}>
          <option value="all">All statuses</option>
          <option value="submitted">Pending review</option>
          <option value="returned">Returned</option>
          <option value="chair_approved">Approved</option>
          <option value="not_submitted">Not submitted</option>
        </select>
      </div>

      {/* Faculty accordion list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {professors.map((prof) => {
          const isOpen = expanded === prof.id;
          const initials = (prof.name ?? "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          const filteredItems = prof.items.filter(
            (item) =>
              (filterTerm === "all" || item.term === filterTerm) &&
              (filterStatus === "all" || item.status === filterStatus)
          );

          return (
            <div key={prof.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : prof.id)}
              >
                {prof.image ? (
                  <Image
                    src={prof.image}
                    alt={prof.name}
                    width={32}
                    height={32}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{prof.name}</span>
                    {prof.pending > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        {prof.pending} pending
                      </span>
                    )}
                    {prof.total > 0 && prof.approved === prof.total && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        All approved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{prof.email}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${prof.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums">
                        {prof.approved}/{prof.total}
                      </span>
                    </div>
                  </div>
                </div>

                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/40 divide-y divide-gray-100">
                  {filteredItems.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">
                      No items match the current filter.
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`px-4 py-3 ${item.status === "submitted" ? "bg-amber-50/20" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {item.subjectCode}
                              </span>
                              <span className="text-sm text-gray-500">{item.docType}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                                {item.term}
                              </span>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.subjectName}</p>
                          </div>
                          {item.driveFileId && (
                            <button
                              onClick={() =>
                                setPreview(
                                  preview?.fileId === item.driveFileId
                                    ? null
                                    : { fileId: item.driveFileId!, name: item.driveFileName ?? "File" }
                                )
                              }
                              className="h-7 px-2.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors shrink-0"
                            >
                              {preview?.fileId === item.driveFileId ? "Close" : "View file"}
                            </button>
                          )}
                        </div>

                        {item.status === "submitted" && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              placeholder="Comment (required for Return or Reject)"
                              value={comment[item.id] ?? ""}
                              onChange={(e) =>
                                setComment((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              rows={2}
                              className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitReview(item.id, "approved")}
                                disabled={submitting === item.id}
                                className="h-8 px-3 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => submitReview(item.id, "returned")}
                                disabled={submitting === item.id}
                                className="h-8 px-3 text-xs font-medium rounded-md border border-amber-300 text-amber-700 bg-white hover:bg-amber-50 disabled:opacity-40 transition-colors"
                              >
                                Return
                              </button>
                              <button
                                onClick={() => submitReview(item.id, "rejected")}
                                disabled={submitting === item.id}
                                className="h-8 px-3 text-xs font-medium rounded-md border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {preview?.fileId === item.driveFileId && (
                          <div className="mt-3">
                            <iframe
                              src={`https://drive.google.com/file/d/${item.driveFileId}/preview`}
                              className="w-full h-96 rounded-lg border border-gray-200"
                              title={preview.name}
                              allow="autoplay"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
