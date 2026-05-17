"use client";

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  not_submitted:  { label: "Not submitted",   cls: "bg-gray-100 text-gray-500",                        dot: "bg-gray-400" },
  submitted:      { label: "Pending review",  cls: "bg-blue-50 text-blue-700 border border-blue-200",   dot: "bg-blue-500 animate-pulse" },
  returned:       { label: "Returned",        cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  chair_approved: { label: "Chair approved",  cls: "bg-teal-50 text-teal-700 border border-teal-200",   dot: "bg-teal-500" },
  dean_cleared:   { label: "Dean cleared",    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  rejected:       { label: "Rejected",        cls: "bg-red-50 text-red-600 border border-red-200",      dot: "bg-red-500" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
