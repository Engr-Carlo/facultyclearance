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
  nodeType: "folder" | "leaf";
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

// ─── Upload row ───────────────────────────────────────────────────────────────

function UploadRow({
  label,
  item,
  treeNodeId,
  uploading,
  onUploadClick,
}: {
  label: string;
  item: ClearanceItem | undefined;
  semesterId?: string;
  treeNodeId: string;
  uploading: string | null;
  onUploadClick: (requirementId: string, treeNodeId: string) => void;
}) {
  const isUploading = uploading === (item?.requirementId ?? treeNodeId);

  return (
    <div className="flex items-center justify-between py-2 px-4 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 truncate">{label}</span>
        {item?.driveFileName && (
          <div className="text-xs text-gray-400 truncate mt-0.5">{item.driveFileName}</div>
        )}
        {item?.latestReview?.comment && (
          <div className="text-xs text-amber-600 mt-0.5">
            Review: {item.latestReview.comment}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {item && <StatusBadge status={item.status} />}
        <button
          onClick={() => item && onUploadClick(item.requirementId, treeNodeId)}
          disabled={isUploading || !item}
          className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

// ─── Recursive folder/leaf renderer ──────────────────────────────────────────

function TreeNodeRow({
  node,
  itemMap,
  semesterId,
  depth,
  uploading,
  onUploadClick,
}: {
  node: UINode;
  itemMap: Map<string, ClearanceItem>;
  semesterId: string;
  depth: number;
  uploading: string | null;
  onUploadClick: (requirementId: string, treeNodeId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.nodeType === "leaf") {
    const reqIds = node.requirementIds?.split(",") ?? [];
    const [mainReqId, labReqId] = reqIds;

    if (node.hasLabComponent && labReqId) {
      return (
        <div style={{ paddingLeft: `${depth * 16}px` }}>
          <UploadRow
            label={`${node.name} — Lecture`}
            item={itemMap.get(mainReqId)}
            semesterId={semesterId}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
          <UploadRow
            label={`${node.name} — Lab`}
            item={itemMap.get(labReqId)}
            semesterId={semesterId}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
        </div>
      );
    }

    return (
      <div style={{ paddingLeft: `${depth * 16}px` }}>
        <UploadRow
          label={node.name}
          item={itemMap.get(mainReqId)}
          semesterId={semesterId}
          treeNodeId={node.id}
          uploading={uploading}
          onUploadClick={onUploadClick}
        />
      </div>
    );
  }

  // Folder node
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <span className="text-gray-400 text-xs">{open ? "▾" : "▸"}</span>
        <span className="text-sm font-medium text-gray-700">{node.name}</span>
        {node.typeTag && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              node.typeTag === "Subject"
                ? "bg-blue-100 text-blue-700"
                : node.typeTag === "Term"
                ? "bg-amber-100 text-amber-700"
                : node.typeTag === "DocType"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {node.typeTag}
          </span>
        )}
      </button>

      {open && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              itemMap={itemMap}
              semesterId={semesterId}
              depth={depth + 1}
              uploading={uploading}
              onUploadClick={onUploadClick}
            />
          ))}
          {node.children.length === 0 && (
            <div
              className="text-xs text-gray-400 py-2"
              style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
            >
              (empty folder)
            </div>
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
  const pendingUpload = useRef<{ requirementId: string; treeNodeId: string } | null>(null);

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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("semesterId", semesterId);
      formData.append("requirementId", pending.requirementId);
      formData.append("treeNodeId", pending.treeNodeId);

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      // Reload to refresh statuses
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
        <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
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

      <div className="divide-y divide-gray-100">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            itemMap={itemMap}
            semesterId={semesterId}
            depth={0}
            uploading={uploading}
            onUploadClick={handleUploadClick}
          />
        ))}
      </div>
    </div>
  );
}
