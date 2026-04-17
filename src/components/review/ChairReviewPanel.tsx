"use client";

import { useState } from "react";
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

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Professors" value={professors.length} />
        <Stat label="Pending review" value={pendingTotal} highlight />
        <Stat
          label="Fully approved"
          value={professors.filter((p) => p.total > 0 && p.approved === p.total).length}
        />
      </div>

      {/* Professor list */}
      {professors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No professors in your department</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Professor</th>
                <th className="text-left px-4 py-3 font-medium">Progress</th>
                <th className="text-left px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {professors.map((prof) => (
                <>
                  <tr
                    key={prof.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() =>
                      setExpanded(expanded === prof.id ? null : prof.id)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{prof.name}</div>
                      <div className="text-xs text-gray-400">{prof.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${prof.completionPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {prof.completionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {prof.pending > 0 ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {prof.pending} pending
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {expanded === prof.id ? "▲" : "▼"}
                    </td>
                  </tr>

                  {/* Expanded items */}
                  {expanded === prof.id && (
                    <tr key={`${prof.id}-items`}>
                      <td colSpan={4} className="bg-gray-50 px-4 py-4">
                        {/* Filters */}
                        <div className="flex gap-2 mb-3">
                          <select
                            value={filterTerm}
                            onChange={(e) => setFilterTerm(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                          >
                            <option value="all">All terms</option>
                            <option value="prelim">Prelim</option>
                            <option value="midterm">Midterm</option>
                            <option value="finals">Finals</option>
                          </select>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                          >
                            <option value="all">All statuses</option>
                            <option value="submitted">Submitted</option>
                            <option value="returned">Returned</option>
                            <option value="chair_approved">Approved</option>
                            <option value="not_submitted">Not submitted</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          {prof.items
                            .filter(
                              (item) =>
                                (filterTerm === "all" || item.term === filterTerm) &&
                                (filterStatus === "all" || item.status === filterStatus)
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                className="bg-white border border-gray-100 rounded-lg p-3 flex flex-wrap gap-3 items-start"
                              >
                                <div className="flex-1 min-w-[200px]">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.subjectCode} — {item.docType}
                                  </div>
                                  <div className="text-xs text-gray-400 capitalize">
                                    {item.term} · {item.subjectName}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <StatusBadge status={item.status} />
                                  {item.driveFileId && (
                                    <button
                                      onClick={() =>
                                        setPreview(
                                          preview?.fileId === item.driveFileId
                                            ? null
                                            : {
                                                fileId: item.driveFileId!,
                                                name: item.driveFileName ?? "File",
                                              }
                                        )
                                      }
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      {preview?.fileId === item.driveFileId
                                        ? "Close"
                                        : "View file"}
                                    </button>
                                  )}
                                </div>

                                {item.status === "submitted" && (
                                  <div className="w-full flex flex-col gap-2">
                                    <textarea
                                      placeholder="Comment (required if returning or rejecting)"
                                      value={comment[item.id] ?? ""}
                                      onChange={(e) =>
                                        setComment((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                      rows={2}
                                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => submitReview(item.id, "approved")}
                                        disabled={submitting === item.id}
                                        className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => submitReview(item.id, "returned")}
                                        disabled={submitting === item.id}
                                        className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                      >
                                        Return
                                      </button>
                                      <button
                                        onClick={() => submitReview(item.id, "rejected")}
                                        disabled={submitting === item.id}
                                        className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Inline Drive preview */}
                                {preview?.fileId === item.driveFileId && (
                                  <div className="w-full mt-2">
                                    <iframe
                                      src={`https://drive.google.com/file/d/${item.driveFileId}/preview`}
                                      className="w-full h-80 rounded-lg border border-gray-200"
                                      title={preview.name}
                                      allow="autoplay"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`text-2xl font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
