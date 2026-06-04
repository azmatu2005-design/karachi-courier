"use client";

import { useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch, todayDateParam } from "@/lib/api";
import type { Shipment } from "@/types";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    assigned: "bg-blue-100 text-blue-800",
    picked_up: "bg-indigo-100 text-indigo-800",
    in_transit: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalToday, setTotalToday] = useState(0);
  const [pending, setPending] = useState(0);
  const [activeRiders, setActiveRiders] = useState(0);
  const [unreconciledCod, setUnreconciledCod] = useState(0);
  const [recent, setRecent] = useState<Shipment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const today = todayDateParam();

        const [todayRes, pendingRes, ridersRes, codRes, recentRes] =
          await Promise.all([
            apiFetch<{ shipments: Shipment[] }>(
              `/api/shipments?date=${today}`,
            ),
            apiFetch<{ shipments: Shipment[] }>(
              `/api/shipments?status=pending`,
            ),
            apiFetch<{ riders: { is_on_shift: boolean }[] }>("/api/riders"),
            apiFetch<{
              entries: { amount: number; reconciled: boolean }[];
            }>("/api/cod/ledger?reconciled=false"),
            apiFetch<{ shipments: Shipment[] }>("/api/shipments"),
          ]);

        setTotalToday(todayRes.shipments.length);
        setPending(pendingRes.shipments.length);
        setActiveRiders(
          ridersRes.riders.filter((r) => r.is_on_shift).length,
        );
        setUnreconciledCod(
          codRes.entries.reduce((sum, e) => sum + Number(e.amount), 0),
        );
        setRecent(recentRes.shipments.slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Live overview of today&apos;s operations
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Shipments today" value={String(totalToday)} />
        <StatCard label="Pending shipments" value={String(pending)} />
        <StatCard label="Active riders" value={String(activeRiders)} sub="On shift now" />
        <StatCard
          label="Unreconciled COD"
          value={formatCurrencyPkr(unreconciledCod)}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent shipments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tracking</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Area</th>
                <th className="px-5 py-3 font-medium">Rider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No shipments yet
                  </td>
                </tr>
              ) : (
                recent.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-brand-700">
                      {s.tracking_number}
                    </td>
                    <td className="px-5 py-3">{statusBadge(s.status)}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.delivery_area}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.rider_name ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
