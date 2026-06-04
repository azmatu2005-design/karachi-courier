"use client";

import { useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "@/lib/api";
import type { CodEntry } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CodReportsPage() {
  const [entries, setEntries] = useState<CodEntry[]>([]);
  const [totalReconciled, setTotalReconciled] = useState(0);
  const [totalUnreconciled, setTotalUnreconciled] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{
      entries: CodEntry[];
      total_reconciled: number;
      total_unreconciled: number;
    }>("/api/cod/client")
      .then((res) => {
        setEntries(res.entries);
        setTotalReconciled(res.total_reconciled);
        setTotalUnreconciled(res.total_unreconciled);
      })
      .finally(() => setLoading(false));
  }, []);

  const unreconciled = entries.filter((e) => !e.reconciled);
  const reconciled = entries.filter((e) => e.reconciled);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">COD Reports</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cash collected from your customers on delivery
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-800">Pending settlement</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {formatCurrencyPkr(totalUnreconciled)}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {unreconciled.length} unreconciled entr
            {unreconciled.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Reconciled (settled)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrencyPkr(totalReconciled)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {reconciled.length} entries
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total COD volume</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrencyPkr(totalReconciled + totalUnreconciled)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-900">Unreconciled</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {unreconciled.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No pending COD — all settlements up to date
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unreconciled.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-mono text-xs text-brand-700">
                      {e.tracking_number ?? "—"}
                    </td>
                    <td className="px-4 py-3">{e.recipient_name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrencyPkr(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(e.collected_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-900">Reconciled</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {reconciled.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No reconciled entries yet
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciled.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {e.tracking_number ?? "—"}
                    </td>
                    <td className="px-4 py-3">{e.recipient_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {formatCurrencyPkr(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.reconciled_at
                        ? formatDate(e.reconciled_at)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
