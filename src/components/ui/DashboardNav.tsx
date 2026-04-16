"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  professor: "Professor",
  chair: "Dept Chair",
  dean: "Dean",
  admin: "Super Admin",
};

export default function DashboardNav({ session }: { session: Session }) {
  const role = session.user.role;

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold text-gray-900 leading-tight">
            UoC Faculty Clearance
          </Link>
          {role && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <span className="text-sm text-gray-700 hidden sm:block">
            {session.user.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
