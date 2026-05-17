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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-gray-900 tracking-tight">Faculty Clearance</div>
            <div className="text-xs text-gray-400">University of Cabuyao</div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Role badge */}
          <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-gray-200" />

          {/* User */}
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={34}
                height={34}
                className="rounded-full ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-gray-800 hidden md:block max-w-[160px] truncate">
              {session.user.name}
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
