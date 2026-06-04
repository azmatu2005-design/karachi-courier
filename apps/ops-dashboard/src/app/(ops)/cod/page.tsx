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

export default function CodPage() {
  const [entries, setEntries] = useState<CodEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ entries: CodEntry[] }>(
        "/api/cod/ledger?reconciled=false",
      );
      setEntries(res.entries);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  }

  async function bulkReconcile() {
    if (selected.size === 0) return;
    setReconciling(true);
    setError("");
    setSuccess("");
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          apiFetch(`/api/cod/${id}/reconcile`, { method: "PATCH" }),
        ),
      );
      setSuccess(`Reconciled ${selected.size} entr${selected.size === 1 ? "y" : "ies"}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconcile failed");
    } finally {
      setReconciling(false);
    }
  }

  const selectedTotal = entries
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">COD Ledger</h1>
          <p className="mt-1 text-sm text-slate-500">
            Unreconciled cash-on-delivery collections
          </p>
        </div>
        <button
          type="button"
          disabled={selected.size === 0 || reconciling}
          onClick={bulkReconcile}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {reconciling
            ? "Reconciling…"
            : `Reconcile selected (${selected.size})`}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </p>
      )}

      {selected.size > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Selected total:{" "}
          <span className="font-semibold">
            {formatCurrencyPkr(selectedTotal)}
          </span>
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        entries.length > 0 &&
                        selected.size === entries.length
                      }
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Rider</th>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      All COD entries reconciled
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          aria-label={`Select ${e.tracking_number}`}
                        />
                      </td>
                      <td className="px-4 py-3">{e.rider_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-700">
                        {e.tracking_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrencyPkr(Number(e.amount))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(e.collected_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
