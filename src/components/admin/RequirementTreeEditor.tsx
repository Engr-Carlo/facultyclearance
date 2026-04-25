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

// ─── Flatten tree back to ordered list ───────────────────────────────────────

function flattenTree(nodes: UINode[], out: UINode[] = []): UINode[] {
  for (const n of nodes) {
    out.push(n);
    flattenTree(n.children, out);
  }
  return out;
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
        className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 group ${
          isLeaf ? "border-l-2 border-green-400 ml-1" : ""
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 text-xs pr-1"
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Expand/collapse toggle (folders only) */}
        {!isLeaf ? (
          <button
            onClick={() => onToggle(node.id)}
            className="w-4 text-gray-400 hover:text-gray-600 text-xs"
          >
            {expanded.has(node.id) ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 text-green-500 text-xs">📄</span>
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
            className="border border-blue-400 rounded px-1 text-sm flex-1 min-w-0"
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-800 cursor-pointer truncate"
            onDoubleClick={() => { onEdit(node.id); setEditVal(node.name); }}
            title="Double-click to rename"
          >
            {node.name}
          </span>
        )}

        {/* TypeTag badge */}
        {!isEditing && (
          <select
            value={node.typeTag ?? ""}
            onChange={(e) => onTagChange(node.id, (e.target.value as TypeTag) || null)}
            className={`text-xs rounded px-1 py-0.5 border-0 outline-none cursor-pointer ${
              node.typeTag ? TAG_COLORS[node.typeTag] : "bg-gray-50 text-gray-400"
            }`}
          >
            <option value="">— tag —</option>
            <option value="Category">Category</option>
            <option value="Subject">Subject</option>
            <option value="Term">Term</option>
            <option value="DocType">DocType</option>
          </select>
        )}

        {/* Lab toggle (leaf only) */}
        {isLeaf && !isEditing && (
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={node.hasLabComponent}
              onChange={(e) => onLabToggle(node.id, e.target.checked)}
              className="accent-blue-600"
            />
            Lab
          </label>
        )}

        {/* Action buttons (visible on hover) */}
        {!isEditing && (
          <span className="hidden group-hover:flex items-center gap-1 ml-1">
            {!isLeaf && (
              <>
                <button
                  onClick={() => onAdd(node.id, "folder")}
                  className="text-xs text-gray-400 hover:text-blue-600 px-1"
                  title="Add sub-folder"
                >
                  +📁
                </button>
                <button
                  onClick={() => onAdd(node.id, "leaf")}
                  className="text-xs text-gray-400 hover:text-green-600 px-1"
                  title="Add upload slot"
                >
                  +📄
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(node.id)}
              className="text-xs text-gray-300 hover:text-red-500 px-1"
              title="Delete"
            >
              🗑
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
      if (parentId) setExpanded((prev) => new Set([...prev, parentId]));
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
                      next.has(id) ? next.delete(id) : next.add(id);
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
