"use client";

import { useState, useRef } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Build tree from flat list ────────────────────────────────────────────────

function buildTree(flat: TreeNode[]): UINode[] {
  const map = new Map<string, UINode>();
  for (const n of flat) map.set(n.id, { ...n, children: [] });
  const roots: UINode[] = [];
  for (const n of flat) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Count total requirement slots and how many are dean_cleared for a subtree
function countLeaves(
  node: UINode,
  itemMap: Map<string, ClearanceItem>
): { total: number; cleared: number } {
  if (node.nodeType === "leaf") {
    const reqIds = node.requirementIds?.split(",").filter(Boolean) ?? [];
    let total = 0,
      cleared = 0;
    for (const id of reqIds) {
      total++;
      if (itemMap.get(id)?.status === "dean_cleared") cleared++;
    }
    return { total, cleared };
  }
  let total = 0,
    cleared = 0;
  for (const child of node.children) {
    const c = countLeaves(child, itemMap);
    total += c.total;
    cleared += c.cleared;
  }
  return { total, cleared };
}

// ─── Tag accent styles ────────────────────────────────────────────────────────

const TAG_BORDER: Record<string, string> = {
  Category: "border-slate-400",
  Subject: "border-blue-400",
  Term: "border-amber-400",
  DocType: "border-emerald-400",
};

const TAG_BADGE: Record<string, string> = {
  Category: "bg-slate-100 text-slate-600",
  Subject: "bg-blue-100 text-blue-700",
  Term: "bg-amber-100 text-amber-700",
  DocType: "bg-emerald-100 text-emerald-700",
};

// ─── Upload row (leaf) ────────────────────────────────────────────────────────

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
  // Allow upload for brand-new items (no DB record yet) or after being returned
  const canUpload =
    status === undefined || status === "not_submitted" || status === "returned";
  const buttonLabel = isUploading
    ? "Uploading…"
    : status === "returned"
    ? "Replace"
    : "Upload";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 border-b border-gray-100 last:border-0 transition-colors">
      {/* Document icon */}
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 truncate">{label}</div>

        {item?.driveFileName && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg
              className="w-3 h-3 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            <span className="text-xs text-gray-400 truncate">
              {item.driveFileName}
            </span>
          </div>
        )}

        {item?.latestReview?.comment && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
              <svg
                className="w-3 h-3 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              {item.latestReview.comment}
            </span>
          </div>
        )}
      </div>

      {/* Status badge + action button */}
      <div className="flex items-center gap-2.5 shrink-0">
        {item && <StatusBadge status={item.status} />}
        {canUpload && (
          <button
            onClick={() => onUploadClick(requirementId, treeNodeId)}
            disabled={isUploading}
            className="text-xs font-medium bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Recursive tree node renderer ─────────────────────────────────────────────

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

  // ── Leaf ──────────────────────────────────────────────────────────────────
  if (node.nodeType === "leaf") {
    const reqIds = node.requirementIds?.split(",").filter(Boolean) ?? [];
    const [mainReqId, labReqId] = reqIds;

    if (!mainReqId) return null; // misconfigured node — skip

    const indentPx = depth * 20;

    if (node.hasLabComponent && labReqId) {
      return (
        <div style={{ paddingLeft: `${indentPx}px` }}>
          <UploadRow
            label={`${node.name} — Lecture`}
            requirementId={mainReqId}
            item={itemMap.get(mainReqId)}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
          <UploadRow
            label={`${node.name} — Lab`}
            requirementId={labReqId}
            item={itemMap.get(labReqId)}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
        </div>
      );
    }

    return (
      <div style={{ paddingLeft: `${indentPx}px` }}>
        <UploadRow
          label={node.name}
          requirementId={mainReqId}
          item={itemMap.get(mainReqId)}
          treeNodeId={node.id}
          uploading={uploading}
          onUploadClick={onUploadClick}
        />
      </div>
    );
  }

  // ── Folder ────────────────────────────────────────────────────────────────
  const counts = countLeaves(node, itemMap);
  const isRoot = depth === 0;
  const borderColor = TAG_BORDER[node.typeTag ?? ""] ?? "border-gray-300";
  const badgeClass =
    TAG_BADGE[node.typeTag ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <div className={isRoot ? `border-l-4 ${borderColor}` : ""}>
      {/* Folder header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 text-left transition-colors ${
          isRoot
            ? "px-4 py-3 bg-gray-50 hover:bg-gray-100"
            : "px-3 py-2.5 hover:bg-gray-50"
        }`}
        style={isRoot ? undefined : { paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Chevron */}
        <svg
          className={`shrink-0 transition-transform duration-150 ${
            open ? "rotate-90" : ""
          } ${isRoot ? "w-4 h-4 text-gray-500" : "w-3.5 h-3.5 text-gray-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>

        {/* Folder icon */}
        <svg
          className={`shrink-0 ${
            isRoot ? "w-4 h-4 text-gray-500" : "w-3.5 h-3.5 text-gray-400"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {open ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          ) : (
            <path
              fillRule="evenodd"
              d="M2 6a2 2 0 012-2h4.586A2 2 0 0110 4.586L11.414 6H16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
              clipRule="evenodd"
            />
          )}
        </svg>

        {/* Name */}
        <span
          className={`truncate ${
            isRoot
              ? "text-sm font-semibold text-gray-800"
              : "text-sm font-medium text-gray-700"
          }`}
        >
          {node.name}
        </span>

        {/* TypeTag badge */}
        {node.typeTag && (
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}
          >
            {node.typeTag}
          </span>
        )}

        {/* Progress count */}
        {counts.total > 0 && (
          <span className="ml-auto shrink-0 text-xs tabular-nums">
            <span
              className={
                counts.cleared === counts.total
                  ? "text-emerald-600 font-semibold"
                  : "text-gray-400"
              }
            >
              {counts.cleared}
            </span>
            <span className="text-gray-300">/{counts.total}</span>
          </span>
        )}
      </button>

      {/* Children */}
      {open && (
        <div
          className={
            isRoot ? "border-t border-gray-100" : "border-l-2 border-gray-100 ml-5"
          }
        >
          {node.children.length === 0 ? (
            <p
              className="text-xs text-gray-400 italic py-3 px-4"
              style={
                isRoot ? undefined : { paddingLeft: `${depth * 20 + 16}px` }
              }
            >
              Empty folder
            </p>
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
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const pendingUpload = useRef<{
    requirementId: string;
    treeNodeId: string;
  } | null>(null);

  const tree = buildTree(nodes);
  const itemMap = new Map(items.map((item) => [item.requirementId, item]));

  function handleUploadClick(requirementId: string, treeNodeId: string) {
    pendingUpload.current = { requirementId, treeNodeId };
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const pending = pendingUpload.current;
    if (!file || !pending) return;

    e.target.value = "";
    setError(null);
    setUploading(pending.requirementId);

    try {
      // Step 1: Upload file to Google Drive
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
      if (!uploadRes.ok)
        throw new Error(uploadData.error ?? "Upload to Drive failed");

      // Step 2: Save clearance submission record to database
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
      <div className="text-center py-12 text-sm text-gray-400">
        No requirements have been set up for this semester yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {error && (
        <div className="mx-4 mt-4 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
      />

      <div>
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
