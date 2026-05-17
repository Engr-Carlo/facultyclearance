"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeTag = "Category" | "Subject" | "DocType" | "Term" | null;

type TreeNodeData = {
  id: string;
  semesterId: string;
  parentId: string | null;
  name: string;
  nodeType: "folder" | "leaf";
  typeTag: TypeTag;
  hasLabComponent: boolean;
  sortOrder: number;
  requirementIds: string | null;
};

type UINode = TreeNodeData & {
  children: UINode[];
};

const TAG_COLORS: Record<string, string> = {
  Category: "bg-gray-100 text-gray-600",
  Subject: "bg-blue-100 text-blue-700",
  Term: "bg-amber-100 text-amber-700",
  DocType: "bg-green-100 text-green-700",
};

// ─── Build tree from flat list ────────────────────────────────────────────────

function buildTree(flat: TreeNodeData[]): UINode[] {
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

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  node,
  depth,
  expanded,
  editingId,
  onToggle,
  onEdit,
  onSave,
  onCancelEdit,
  onAdd,
  onDelete,
  onTagChange,
  onLabToggle,
}: {
  node: UINode;
  depth: number;
  expanded: Set<string>;
  editingId: string | null;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onSave: (id: string, name: string) => void;
  onCancelEdit: () => void;
  onAdd: (parentId: string | null, nodeType: "folder" | "leaf") => void;
  onDelete: (id: string) => void;
  onTagChange: (id: string, tag: TypeTag) => void;
  onLabToggle: (id: string, val: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editVal, setEditVal] = useState(node.name);
  const isEditing = editingId === node.id;
  const isLeaf = node.nodeType === "leaf";

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      <div
        className={`flex items-center gap-1.5 rounded-lg group transition-colors ${
          isLeaf
            ? "hover:bg-gray-50"
            : depth === 0
            ? "bg-slate-50 hover:bg-slate-100 border-l-4 border-slate-300 rounded-l-none mt-0.5"
            : "hover:bg-gray-50 border-l-2 border-gray-200 rounded-l-none"
        }`}
        style={{
          paddingLeft: `${depth * 20 + 8}px`,
          paddingRight: "8px",
          paddingTop: isLeaf ? "5px" : depth === 0 ? "8px" : "6px",
          paddingBottom: isLeaf ? "5px" : depth === 0 ? "8px" : "6px",
        }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0 flex items-center"
          title="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.2" />
            <circle cx="5" cy="8" r="1.2" />
            <circle cx="5" cy="12" r="1.2" />
            <circle cx="11" cy="4" r="1.2" />
            <circle cx="11" cy="8" r="1.2" />
            <circle cx="11" cy="12" r="1.2" />
          </svg>
        </span>

        {/* Expand/collapse (folders) or dot indicator (leaves) */}
        {!isLeaf ? (
          <button
            onClick={() => onToggle(node.id)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-150 ${
                expanded.has(node.id) ? "rotate-90" : ""
              }`}
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
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
        )}

        {/* Folder / document icon */}
        {!isLeaf ? (
          <svg
            className={`shrink-0 ${depth === 0 ? "w-4 h-4 text-slate-500" : "w-3.5 h-3.5 text-gray-400"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            {expanded.has(node.id) ? (
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            ) : (
              <path
                fillRule="evenodd"
                d="M2 6a2 2 0 012-2h4.586A2 2 0 0110 4.586L11.414 6H16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                clipRule="evenodd"
              />
            )}
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 text-gray-300 shrink-0"
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
        )}

        {/* Name (editable inline) */}
        {isEditing ? (
          <input
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={() => onSave(node.id, editVal)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(node.id, editVal);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="border border-blue-400 rounded-md px-2 py-0.5 text-sm flex-1 min-w-0 outline-none"
          />
        ) : (
          <span
            className={`flex-1 text-sm cursor-pointer truncate ${
              isLeaf
                ? "text-gray-700"
                : depth === 0
                ? "text-gray-800 font-semibold"
                : "text-gray-800 font-medium"
            }`}
            onDoubleClick={() => {
              onEdit(node.id);
              setEditVal(node.name);
            }}
            title="Double-click to rename"
          >
            {node.name}
          </span>
        )}

        {/* TypeTag select */}
        {!isEditing && (
          <select
            value={node.typeTag ?? ""}
            onChange={(e) =>
              onTagChange(node.id, (e.target.value as TypeTag) || null)
            }
            className={`text-xs rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer font-medium shrink-0 ${
              node.typeTag ? TAG_COLORS[node.typeTag] : "bg-gray-100 text-gray-400"
            }`}
          >
            <option value="">— tag —</option>
            <option value="Category">Category</option>
            <option value="Subject">Subject</option>
            <option value="Term">Term</option>
            <option value="DocType">DocType</option>
          </select>
        )}

        {/* Lab toggle (leaves only) */}
        {isLeaf && !isEditing && (
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={node.hasLabComponent}
              onChange={(e) => onLabToggle(node.id, e.target.checked)}
              className="accent-emerald-600"
            />
            Lab
          </label>
        )}

        {/* Hover action buttons */}
        {!isEditing && (
          <span className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0">
            {!isLeaf && (
              <>
                <button
                  onClick={() => onAdd(node.id, "folder")}
                  className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                  title="Add sub-folder"
                >
                  + Folder
                </button>
                <button
                  onClick={() => onAdd(node.id, "leaf")}
                  className="text-xs text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                  title="Add upload slot"
                >
                  + Item
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(node.id)}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
              title="Delete"
            >
              Remove
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function RequirementTreeEditor({ semesterId }: { semesterId: string }) {
  const [flat, setFlat] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin?entity=tree&semesterId=${semesterId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setFlat(data);
      // Auto-expand all on first load
      setExpanded(new Set(data.map((n: TreeNodeData) => n.id)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const tree = buildTree(flat);

  // Build visible (expanded) flat list for sortable context
  function getVisible(nodes: UINode[], depth = 0): { node: UINode; depth: number }[] {
    const out: { node: UINode; depth: number }[] = [];
    for (const n of nodes) {
      out.push({ node: n, depth });
      if (!n.nodeType || !expanded.has(n.id)) continue;
      out.push(...getVisible(n.children, depth + 1));
    }
    return out;
  }
  const visible = getVisible(tree);

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch("/api/admin?entity=tree-node", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    return res.json();
  }

  async function apiPatch(body: Record<string, unknown>) {
    const res = await fetch("/api/admin?entity=tree-node", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    return res.json();
  }

  async function apiDelete(id: string) {
    const res = await fetch(`/api/admin?entity=tree-node&id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
  }

  async function handleAdd(parentId: string | null, nodeType: "folder" | "leaf") {
    try {
      const node = await apiPost({
        semesterId,
        parentId,
        name: nodeType === "leaf" ? "New Upload Slot" : "New Folder",
        nodeType,
        sortOrder: flat.filter((n) => n.parentId === parentId).length,
      });
      setFlat((prev) => [...prev, node]);
      if (parentId) setExpanded((prev) => { const s = new Set(prev); s.add(parentId); return s; });
      setEditingId(node.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function handleSave(id: string, name: string) {
    setEditingId(null);
    if (!name.trim()) return;
    try {
      const updated = await apiPatch({ id, name: name.trim() });
      setFlat((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this node and all its children?")) return;
    try {
      await apiDelete(id);
      // Remove node and all descendants from local state
      const allIds = new Set<string>();
      function collectIds(nodeId: string) {
        allIds.add(nodeId);
        flat.filter((n) => n.parentId === nodeId).forEach((n) => collectIds(n.id));
      }
      collectIds(id);
      setFlat((prev) => prev.filter((n) => !allIds.has(n.id)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleTagChange(id: string, tag: TypeTag) {
    try {
      const updated = await apiPatch({ id, typeTag: tag });
      setFlat((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleLabToggle(id: string, val: boolean) {
    try {
      const updated = await apiPatch({ id, hasLabComponent: val });
      setFlat((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleClearAll() {
    if (!confirm("Delete ALL nodes in this tree? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/admin?entity=tree-all&semesterId=${semesterId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Clear failed");
      setFlat([]);
      setExpanded(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = visible.map((v) => v.node.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const reordered = arrayMove(ids, oldIndex, newIndex);

    // Update sortOrder for siblings of the moved node
    const movedNode = flat.find((n) => n.id === active.id);
    if (!movedNode) return;

    const siblings = reordered.filter((id) =>
      flat.find((n) => n.id === id)?.parentId === movedNode.parentId
    );

    setFlat((prev) =>
      prev.map((n) => {
        const idx = siblings.indexOf(n.id);
        return idx >= 0 ? { ...n, sortOrder: idx } : n;
      })
    );

    // Persist new sort orders
    await Promise.all(
      siblings.map((id, idx) => apiPatch({ id, sortOrder: idx }).catch(() => null))
    );
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading tree…</div>;

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Requirement Tree</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleAdd(null, "folder")}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            + Add Root Folder
          </button>
          <button
            onClick={() => handleAdd(null, "leaf")}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
          >
            + Add Root Upload Slot
          </button>
          {flat.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs bg-white border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 px-4 pt-3 pb-1 text-xs text-gray-400">
        {Object.entries(TAG_COLORS).map(([tag, cls]) => (
          <span key={tag} className={`px-2 py-0.5 rounded ${cls}`}>{tag}</span>
        ))}
        <span className="ml-auto">⠿ drag · double-click to rename · hover for actions</span>
      </div>

      {/* Tree */}
      <div className="px-2 pb-4 min-h-[200px]">
        {visible.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">
            No nodes yet. Click &quot;+ Add Root Folder&quot; to start building.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={visible.map((v) => v.node.id)}
              strategy={verticalListSortingStrategy}
            >
              {visible.map(({ node, depth }) => (
                <SortableRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  expanded={expanded}
                  editingId={editingId}
                  onToggle={(id) =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) { next.delete(id); } else { next.add(id); }
                      return next;
                    })
                  }
                  onEdit={setEditingId}
                  onSave={handleSave}
                  onCancelEdit={() => setEditingId(null)}
                  onAdd={handleAdd}
                  onDelete={handleDelete}
                  onTagChange={handleTagChange}
                  onLabToggle={handleLabToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
