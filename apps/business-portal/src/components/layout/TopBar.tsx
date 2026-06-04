"use client";

import { getStoredClient, getStoredUser, clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const user = getStoredUser();
  const client = getStoredClient();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="print:hidden flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden text-sm text-slate-500 lg:block">
        Same-day courier for Karachi businesses
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {client?.business_name ?? user?.name ?? "Business"}
          </span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-600 hover:text-brand-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
