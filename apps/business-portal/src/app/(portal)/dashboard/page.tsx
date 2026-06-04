"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch, todayDateParam } from "@/lib/api";
import type { Shipment } from "@/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800",
    assigned: "bg-blue-50 text-blue-800",
    picked_up: "bg-indigo-50 text-indigo-800",
    in_transit: "bg-purple-50 text-purple-800",
    delivered: "bg-green-50 text-green-800",
    failed: "bg-red-50 text-red-800",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-slate-100"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [inTransit, setInTransit] = useState(0);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [unreconciledCod, setUnreconciledCod] = useState(0);
  const [recent, setRecent] = useState<Shipment[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const today = todayDateParam();
        const [allRes, pendingRes, transitRes, deliveredRes, codRes] =
          await Promise.all([
            apiFetch<{ shipments: Shipment[] }>("/api/shipments"),
            apiFetch<{ shipments: Shipment[] }>(
              "/api/shipments?status=pending",
            ),
            apiFetch<{ shipments: Shipment[] }>(
              "/api/shipments?status=in_transit",
            ),
            apiFetch<{ shipments: Shipment[] }>(
              `/api/shipments?status=delivered&date=${today}`,
            ),
            apiFetch<{ total_unreconciled: number }>("/api/cod/client"),
          ]);

        const pickedRes = await apiFetch<{ shipments: Shipment[] }>(
          "/api/shipments?status=picked_up",
        );

        setTotal(allRes.shipments.length);
        setPending(pendingRes.shipments.length);
        setInTransit(
          transitRes.shipments.length + pickedRes.shipments.length,
        );
        setDeliveredToday(deliveredRes.shipments.length);
        setUnreconciledCod(codRes.total_unreconciled);
        setRecent(allRes.shipments.slice(0, 10));
      } catch {
        /* AuthGuard handles redirect */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your shipments and COD
          </p>
        </div>
        <Link
          href="/shipments/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Shipment
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total shipments" value={String(total)} />
        <StatCard label="Pending" value={String(pending)} />
        <StatCard label="In transit" value={String(inTransit)} />
        <StatCard label="Delivered today" value={String(deliveredToday)} />
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
                <th className="px-4 py-3 font-medium">Tracking</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">COD</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No shipments yet.{" "}
                    <Link href="/shipments/new" className="text-brand-600 hover:underline">
                      Create your first
                    </Link>
                  </td>
                </tr>
              ) : (
                recent.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">
                      {s.tracking_number}
                    </td>
                    <td className="px-4 py-3">{s.recipient_name}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      {s.payment_method === "cod" && s.cod_amount != null
                        ? formatCurrencyPkr(Number(s.cod_amount))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/shipments/${s.id}/slip`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        Print Slip
                      </Link>
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
