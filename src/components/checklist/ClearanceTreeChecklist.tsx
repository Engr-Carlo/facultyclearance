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
  latestReview: { comment: string | null; decision: string; reviewedAt: Date } | null;
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
  for (const n of flat) map.set(n.id, { ...n, children: [] });
  const roots: UINode[] = [];
  for (const n of flat) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function countLeaves(node: UINode, itemMap: Map<string, ClearanceItem>): { total: number; cleared: number } {
  if (node.nodeType === "leaf") {
    const ids = node.requirementIds?.split(",").filter(Boolean) ?? [];
    let cleared = 0;
    for (const id of ids) if (itemMap.get(id)?.status === "dean_cleared") cleared++;
    return { total: ids.length, cleared };
  }
  let total = 0, cleared = 0;
  for (const child of node.children) {
    const c = countLeaves(child, itemMap);
    total += c.total;
    cleared += c.cleared;
  }
  return { total, cleared };
}

const TAG_COLOR: Record<string, string> = {
  Category: "text-slate-500",
  Subject: "text-blue-600",
  Term: "text-violet-600",
  DocType: "text-teal-600",
};

function UploadRow({
  label, requirementId, item, treeNodeId, uploading, onUploadClick,
}: {
  label: string;
  requirementId: string;
  item: ClearanceItem | undefined;
  treeNodeId: string;
  uploading: string | null;
  onUploadClick: (r: string, t: string) => void;
}) {
  const isUploading = uploading === requirementId;
  const status = item?.status;
  const canUpload = !status || status === "not_submitted" || status === "returned";
  const btnLabel = isUploading ? "Uploading…" : status === "returned" ? "Replace" : "Upload";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm text-gray-800">{label}</span>
          {item?.driveFileName && (
            <span className="text-xs text-gray-400 truncate">{item.driveFileName}</span>
          )}
        </div>
        {item?.latestReview?.comment && (
          <p className="text-xs text-amber-600 mt-0.5 truncate">{item.latestReview.comment}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item && <StatusBadge status={item.status} />}
        {item?.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Open file"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        {canUpload && (
          <button
            onClick={() => onUploadClick(requirementId, treeNodeId)}
            disabled={isUploading}
            className="h-7 px-2.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            {btnLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function TreeNodeRow({
  node, itemMap, depth, uploading, onUploadClick,
}: {
  node: UINode;
  itemMap: Map<string, ClearanceItem>;
  depth: number;
  uploading: string | null;
  onUploadClick: (r: string, t: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.nodeType === "leaf") {
    const ids = node.requirementIds?.split(",").filter(Boolean) ?? [];
    const [mainId, labId] = ids;
    if (!mainId) return null;

    return (
      <div style={depth > 0 ? { paddingLeft: `${depth * 20}px` } : undefined}>
        <UploadRow
          label={node.hasLabComponent && labId ? `${node.name} — Lecture` : node.name}
          requirementId={mainId}
          item={itemMap.get(mainId)}
          treeNodeId={node.id}
          uploading={uploading}
          onUploadClick={onUploadClick}
        />
        {node.hasLabComponent && labId && (
          <UploadRow
            label={`${node.name} — Lab`}
            requirementId={labId}
            item={itemMap.get(labId)}
            treeNodeId={node.id}
            uploading={uploading}
            onUploadClick={onUploadClick}
          />
        )}
      </div>
    );
  }

  const { total, cleared } = countLeaves(node, itemMap);
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const isRoot = depth === 0;
  const tagColor = TAG_COLOR[node.typeTag ?? ""] ?? "text-gray-400";

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 text-left px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isRoot ? "bg-gray-50/70" : ""}`}
        style={isRoot ? undefined : { paddingLeft: `${depth * 20 + 16}px` }}
      >
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <svg className={`h-4 w-4 shrink-0 ${tagColor}`} fill="currentColor" viewBox="0 0 20 20">
          {open
            ? <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            : <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4.586A2 2 0 0110 4.586L11.414 6H16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />}
        </svg>

        <span className={`flex-1 truncate ${isRoot ? "text-sm font-semibold text-gray-900" : "text-sm font-medium text-gray-700"}`}>
          {node.name}
        </span>

        {node.typeTag && (
          <span className={`text-xs font-medium shrink-0 ${tagColor}`}>{node.typeTag}</span>
        )}

        {total > 0 && (
          <>
            <span className="text-xs text-gray-400 tabular-nums shrink-0">
              <span className={cleared === total ? "text-emerald-600 font-semibold" : ""}>{cleared}</span>/{total}
            </span>
            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden shrink-0">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </button>

      {open && (
        <div className={depth > 0 ? "border-l border-gray-100 ml-5" : ""}>
          {node.children.length === 0
            ? <p className="text-xs text-gray-400 italic px-8 py-2">Empty section</p>
            : node.children.map((child) => (
                <TreeNodeRow
                  key={child.id}
                  node={child}
                  itemMap={itemMap}
                  depth={depth + 1}
                  uploading={uploading}
                  onUploadClick={onUploadClick}
                />
              ))}
        </div>
      )}
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
  const itemMap = useMemo(() => new Map(items.map((i) => [i.requirementId, i])), [items]);

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

      const uploadRes = await fetch("/api/drive/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

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
        const d = await saveRes.json();
        throw new Error(d.error ?? "Save failed");
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
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center">
        <p className="text-sm text-gray-500">No requirements configured for this semester.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
