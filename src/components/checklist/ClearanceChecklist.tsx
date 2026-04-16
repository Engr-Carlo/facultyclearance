"use client";

import { useState } from "react";
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

  // Group items by term
  const grouped: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    if (!grouped[item.term]) grouped[item.term] = [];
    grouped[item.term].push(item);
  }

  async function handleUpload(item: ChecklistItem) {
    setError(null);
    setUploading(item.id);
    try {
      // Fetch a Picker OAuth token from our API
      const tokenRes = await fetch("/api/drive/picker-token");
      const { token } = await tokenRes.json();
      if (!token) throw new Error("Could not get Drive token");

      const pickerApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
      const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

      await loadPickerScript();

      // Open Google Picker
      const fileData = await openDrivePicker(token, pickerApiKey, appId);
      if (!fileData) {
        setUploading(null);
        return;
      }

      // Submit to our API
      const res = await fetch("/api/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: item.requirementId,
          driveFileId: fileData.id,
          driveFileName: fileData.name,
          semesterId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      // Refresh page to reflect new status
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
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
                          onClick={() => handleUpload(item)}
                          disabled={uploading === item.id}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {uploading === item.id ? "Uploading…" : item.status === "returned" ? "Resubmit" : "Upload"}
                        </button>
                      )}
                      {item.status === "submitted" && (
                        <button
                          onClick={() => handleUpload(item)}
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

// ─── Google Picker helpers ────────────────────────────────────────────────────

function loadPickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.picker) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      (window as any).gapi.load("picker", { callback: resolve });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function openDrivePicker(
  oauthToken: string,
  apiKey: string,
  appId: string
): Promise<{ id: string; name: string } | null> {
  return new Promise((resolve) => {
    const picker = new (window as any).google.picker.PickerBuilder()
      .addView(new (window as any).google.picker.DocsView())
      .setOAuthToken(oauthToken)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === "picked") {
          const doc = data.docs[0];
          resolve({ id: doc.id, name: doc.name });
        } else if (data.action === "cancel") {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
