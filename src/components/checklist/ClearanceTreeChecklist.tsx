"use client";

import { useMemo, useRef, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

type ClearanceItem = {
  id: string;
  status: string;
  driveFileId: string | null;
  driveFileName: string | null;
  submittedAt: Date | null;
  updatedAt: Date;
  requirementId: string;
  latestReview: {
    comment: string | null;
    decision: string;
    reviewedAt: Date;
  } | null;
};

type TreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  nodeType: string;
  typeTag: string | null;
  hasLabComponent: boolean;
  sortOrder: number;
  requirementIds: string | null;
};

type UINode = TreeNode & { children: UINode[] };

function buildTree(flat: TreeNode[]): UINode[] {
  const map = new Map<string, UINode>();
  for (const node of flat) map.set(node.id, { ...node, children: [] });

  const roots: UINode[] = [];
  for (const node of flat) {
    const current = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(current);
    } else {
      roots.push(current);
    }
  }

  return roots;
}

function countLeaves(
  node: UINode,
  itemMap: Map<string, ClearanceItem>
): { total: number; cleared: number; pending: number; returned: number } {
  if (node.nodeType === "leaf") {
    const requirementIds = node.requirementIds?.split(",").filter(Boolean) ?? [];
    let total = 0;
    let cleared = 0;
    let pending = 0;
    let returned = 0;

    for (const requirementId of requirementIds) {
      total += 1;
      const status = itemMap.get(requirementId)?.status;
      if (status === "dean_cleared") cleared += 1;
      if (status === "submitted" || status === "chair_approved") pending += 1;
      if (status === "returned") returned += 1;
    }

    return { total, cleared, pending, returned };
  }

  let total = 0;
  let cleared = 0;
  let pending = 0;
  let returned = 0;
  for (const child of node.children) {
    const counts = countLeaves(child, itemMap);
    total += counts.total;
    cleared += counts.cleared;
    pending += counts.pending;
    returned += counts.returned;
  }
  return { total, cleared, pending, returned };
}

const TAG_ACCENTS: Record<string, { badge: string; ring: string; icon: string }> = {
  Category: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    ring: "ring-slate-200",
    icon: "text-slate-500",
  },
  Subject: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    ring: "ring-blue-200",
    icon: "text-blue-500",
  },
  Term: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    ring: "ring-amber-200",
    icon: "text-amber-500",
  },
  DocType: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ring: "ring-emerald-200",
    icon: "text-emerald-500",
  },
};

function UploadRow({
  label,
  requirementId,
  item,
  treeNodeId,
  uploading,
  onUploadClick,
}: {
  label: string;
  requirementId: string;
  item: ClearanceItem | undefined;
  treeNodeId: string;
  uploading: string | null;
  onUploadClick: (requirementId: string, treeNodeId: string) => void;
}) {
  const isUploading = uploading === requirementId;
  const status = item?.status;
  const canUpload =
    status === undefined || status === "not_submitted" || status === "returned";
  const buttonLabel = isUploading
    ? "Uploading..."
    : status === "returned"
      ? "Replace file"
      : "Upload file";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
              {item ? <StatusBadge status={item.status} /> : <SoftBadge label="Ready for upload" tone="slate" />}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">
                {item?.driveFileName
                  ? "Current file on record"
                  : "No file submitted yet. Upload the required document to start review."}
              </p>

              {item?.driveFileName && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600 border border-slate-200">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate">{item.driveFileName}</span>
                </div>
              )}

              {item?.latestReview?.comment && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-semibold">Reviewer note</p>
                  <p className="mt-1 leading-relaxed">{item.latestReview.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[180px] lg:items-end">
          {item?.driveFileId && (
            <a
              href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 lg:w-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 012.152-3.592M6.223 6.223A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3" />
              </svg>
              Open file
            </a>
          )}

          {canUpload ? (
            <button
              onClick={() => onUploadClick(requirementId, treeNodeId)}
              disabled={isUploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
              </svg>
              {buttonLabel}
            </button>
          ) : (
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center text-sm font-medium text-gray-500 lg:w-auto">
              Waiting for review
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function TreeNodeRow({
  node,
  itemMap,
  depth,
  uploading,
  onUploadClick,
}: {
  node: UINode;
  itemMap: Map<string, ClearanceItem>;
  depth: number;
  uploading: string | null;
  onUploadClick: (requirementId: string, treeNodeId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.nodeType === "leaf") {
    const requirementIds = node.requirementIds?.split(",").filter(Boolean) ?? [];
    const [mainRequirementId, labRequirementId] = requirementIds;
    if (!mainRequirementId) return null;

    const marginClass = depth > 0 ? "ml-4 border-l border-dashed border-gray-200 pl-4" : "";

    return (
      <div className={marginClass}>
        <div className="space-y-3">
          <UploadRow
            label={node.hasLabComponent && labRequirementId ? `${node.name} - Lecture` : node.name}
            requirementId={mainRequirementId}
            item={itemMap.get(mainRequirementId)}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
          {node.hasLabComponent && labRequirementId && (
            <UploadRow
              label={`${node.name} - Lab`}
              requirementId={labRequirementId}
              item={itemMap.get(labRequirementId)}
              treeNodeId={node.id}
              uploading={uploading}
              onUploadClick={onUploadClick}
            />
          )}
        </div>
      </div>
    );
  }

  const counts = countLeaves(node, itemMap);
  const progressPct = counts.total > 0 ? Math.round((counts.cleared / counts.total) * 100) : 0;
  const accent = TAG_ACCENTS[node.typeTag ?? ""] ?? {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    ring: "ring-slate-200",
    icon: "text-slate-500",
  };

  return (
    <section className={depth === 0 ? "space-y-3" : "space-y-3 ml-4 border-l border-dashed border-gray-200 pl-4"}>
      <button
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-start gap-3 rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm shadow-gray-100/60 transition-all hover:border-gray-300 hover:shadow-md ${depth === 0 ? "" : "bg-white/90"}`}
      >
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white ring-2 ${accent.ring}`}>
          <svg className={`h-5 w-5 ${accent.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h5l2 2h11v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`truncate text-base ${depth === 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>{node.name}</h2>
            {node.typeTag && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${accent.badge}`}>
                {node.typeTag}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="Completed" value={`${counts.cleared}/${counts.total || 0}`} tone="emerald" />
            <MetricPill label="Pending" value={`${counts.pending}`} tone="blue" />
            <MetricPill label="Needs update" value={`${counts.returned}`} tone="amber" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Completion progress</span>
              <span className="font-semibold text-gray-700">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <svg className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-3">
          {node.children.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400">
              No documents inside this section yet.
            </div>
          ) : (
            node.children.map((child) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                itemMap={itemMap}
                depth={depth + 1}
                uploading={uploading}
                onUploadClick={onUploadClick}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function SoftBadge({
  label,
  tone,
}: {
  label: string;
  tone: "slate" | "blue" | "emerald" | "amber";
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const className =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-2xl px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

export default function ClearanceTreeChecklist({
  nodes,
  items,
  semesterId,
}: {
  nodes: TreeNode[];
  items: ClearanceItem[];
  semesterId: string;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ requirementId: string; treeNodeId: string } | null>(null);

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.requirementId, item])), [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const submitted = items.filter((item) => item.status === "submitted").length;
    const returned = items.filter((item) => item.status === "returned").length;
    const cleared = items.filter((item) => item.status === "dean_cleared").length;
    return { total, submitted, returned, cleared };
  }, [items]);

  function handleUploadClick(requirementId: string, treeNodeId: string) {
    pendingUpload.current = { requirementId, treeNodeId };
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const pending = pendingUpload.current;
    if (!file || !pending) return;

    event.target.value = "";
    setError(null);
    setUploading(pending.requirementId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("semesterId", semesterId);
      formData.append("requirementId", pending.requirementId);
      formData.append("treeNodeId", pending.treeNodeId);

      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? "Upload to Drive failed");
      }

      const saveRes = await fetch("/api/clearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: pending.requirementId,
          driveFileId: uploadData.fileId,
          driveFileName: uploadData.fileName,
          semesterId,
        }),
      });

      if (!saveRes.ok) {
        const saveErr = await saveRes.json();
        throw new Error(saveErr.error ?? "Failed to save submission record");
      }

      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
        No requirements have been set up for this semester yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <SoftBadge label="Submission workspace" tone="blue" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload each requirement section by section</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Open a section, check the reviewer note if one exists, then use the primary upload button on the right.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <MetricPill label="Cleared" value={`${stats.cleared}`} tone="emerald" />
            <MetricPill label="Pending" value={`${stats.submitted}`} tone="blue" />
            <MetricPill label="Returned" value={`${stats.returned}`} tone="amber" />
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
      />

      <div className="space-y-4">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            itemMap={itemMap}
            depth={0}
            uploading={uploading}
            onUploadClick={handleUploadClick}
          />
        ))}
      </div>
    </div>
  );
}
