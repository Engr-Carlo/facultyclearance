"use client";

import { useEffect, useState } from "react";

export default function DeadlineBanner({
  deadline,
}: {
  deadline: Date | null | undefined;
}) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!deadline) return;
    const dl = new Date(deadline);

    const update = () => {
      const diff = dl.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("DEADLINE PASSED");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft(`${days}d ${hours}h ${mins}m remaining`);
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;

  const dl = new Date(deadline);
  const isUrgent = dl.getTime() - Date.now() < 3 * 86_400_000; // < 3 days

  return (
    <div
      className={`rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
        isUrgent
          ? "bg-red-50 border border-red-200 text-red-700"
          : "bg-amber-50 border border-amber-200 text-amber-700"
      }`}
    >
      <span>⏰</span>
      <span>
        Clearance deadline: {dl.toLocaleDateString("en-PH", { dateStyle: "long" })} —{" "}
        <span className="font-semibold">{timeLeft}</span>
      </span>
    </div>
  );
}
