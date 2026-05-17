"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Image from "next/image";

const ROLE_CONFIG: Record<string, { label: string; badge: string }> = {
  professor: { label: "Professor", badge: "bg-blue-100 text-blue-700" },
  chair:     { label: "Dept Chair", badge: "bg-violet-100 text-violet-700" },
  dean:      { label: "Dean", badge: "bg-amber-100 text-amber-700" },
  admin:     { label: "System Admin", badge: "bg-rose-100 text-rose-700" },
};

export default function DashboardNav({ session }: { session: Session }) {
  const role = session.user.role ?? "professor";
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.professor;
  const initials = (session.user.name ?? "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-600 rounded-md flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">Faculty Clearance</span>
          <span className="hidden sm:block text-gray-300">·</span>
          <span className="hidden sm:block text-sm text-gray-500">University of Cabuyao</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-400">{cfg.label}</span>
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
            )}
            <span className="text-sm text-gray-700 hidden md:block max-w-[160px] truncate">
              {session.user.name}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center h-7 px-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
