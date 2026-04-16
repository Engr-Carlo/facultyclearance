"use client";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  not_submitted: { label: "Not submitted", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Pending review", className: "bg-blue-100 text-blue-700" },
  returned: { label: "Returned", className: "bg-amber-100 text-amber-700" },
  chair_approved: { label: "Chair-approved", className: "bg-teal-100 text-teal-700" },
  dean_cleared: { label: "Dean-cleared ✓", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_LABELS[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${meta.className}`}>
      {meta.label}
    </span>
  );
}
