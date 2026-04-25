"use client";

import { useState, useRef } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

type ChecklistItem = {
  id: string;
  status: string;
  driveFileId: string | null;
  driveFileName: string | null;
  submittedAt: Date | null;
  updatedAt: Date;
  requirementId: string;
  subjectCode: string;
  subjectName: string;
  term: string;
  docType: string;
  hasLabComponent: boolean;
  latestReview: {
    comment: string | null;
    decision: string;
    reviewedAt: Date;
  } | null;
};

const TERM_ORDER = ["prelim", "midterm", "finals"];
const TERM_LABELS: Record<string, string> = {
  prelim: "Prelim",
  midterm: "Midterm",
  finals: "Finals",
};

export default function ClearanceChecklist({
  items,
  semesterId,
}: {
  items: ChecklistItem[];
  semesterId: string;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingItemRef = useRef<ChecklistItem | null>(null);

  // Group items by term
  const grouped: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    if (!grouped[item.term]) grouped[item.term] = [];
    grouped[item.term].push(item);
  }

  function handleUploadClick(item: ChecklistItem) {
    pendingItemRef.current = item;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const item = pendingItemRef.current;
    if (!file || !item) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    setError(null);
    setUploading(item.id);
    try {
      // Upload file to Drive via service account backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("semesterId", semesterId);
      formData.append("requirementId", item.requirementId);

      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      // Submit clearance item record
      const res = await fetch("/api/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: item.requirementId,
          driveFileId: uploadData.fileId,
          driveFileName: uploadData.fileName,
          semesterId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }

      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
      pendingItemRef.current = null;
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No requirements assigned</p>
        <p className="text-sm mt-1">Contact your admin to assign clearance requirements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {TERM_ORDER.filter((t) => grouped[t]).map((term) => (
        <div key={term}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {TERM_LABELS[term]}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Document</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Comment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped[term].map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.subjectCode}
                      {item.hasLabComponent && (
                        <span className="ml-1.5 text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">
                          +Lab
                        </span>
                      )}
                      <div className="text-xs text-gray-400 font-normal">{item.subjectName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.driveFileName ? (
                        <a
                          href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs truncate max-w-[160px] block"
                        >
                          {item.driveFileName}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                      <div className="text-xs text-gray-400">{item.docType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                      {item.latestReview?.comment ? (
                        <span className="italic">{item.latestReview.comment}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(item.status === "not_submitted" || item.status === "returned") && (
                        <button
                          onClick={() => handleUploadClick(item)}
                          disabled={uploading === item.id}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {uploading === item.id ? "Uploading…" : item.status === "returned" ? "Resubmit" : "Upload"}
                        </button>
                      )}
                      {item.status === "submitted" && (
                        <button
                          disabled
                          className="text-xs text-gray-400 cursor-default"
                        >
                          Under review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
