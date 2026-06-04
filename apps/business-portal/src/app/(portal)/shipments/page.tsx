"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "@/lib/api";
import { SHIPMENT_STATUSES, TRACKING_URL } from "@/lib/constants";
import type { Shipment, StatusLogEntry } from "@/types";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<StatusLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const res = await apiFetch<{ shipments: Shipment[] }>(
        `/api/shipments${q}`,
      );
      setShipments(res.shipments);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(s: Shipment) {
    setSelected(s);
    setPanelLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/shipments/${encodeURIComponent(s.tracking_number)}`,
      );
      const data = await res.json();
      setHistory(data.status_history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setPanelLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Shipments</h1>
          <p className="mt-1 text-sm text-slate-500">All your booked parcels</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <Link
            href="/shipments/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New
          </Link>
        </div>
      </div>

      <div
        className={`mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
          selected ? "lg:mr-[380px]" : ""
        }`}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Pickup</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">COD</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openDetail(s)}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        selected?.id === s.id ? "bg-brand-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-700">
                        {s.tracking_number}
                      </td>
                      <td className="px-4 py-3">{s.recipient_name}</td>
                      <td className="px-4 py-3 text-slate-600">{s.pickup_area}</td>
                      <td className="px-4 py-3 text-slate-600">{s.delivery_area}</td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3">
                        {s.payment_method === "cod" && s.cod_amount != null
                          ? formatCurrencyPkr(Number(s.cod_amount))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/shipments/${s.id}/slip`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          Print
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl lg:top-14">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-mono text-sm font-bold text-brand-700">
              {selected.tracking_number}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="mt-0.5">{statusBadge(selected.status)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Recipient</dt>
                <dd>
                  {selected.recipient_name} · {selected.recipient_phone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Route</dt>
                <dd>
                  {selected.pickup_area} → {selected.delivery_area}
                </dd>
              </div>
            </dl>

            <a
              href={`${TRACKING_URL}/${encodeURIComponent(selected.tracking_number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-sm font-medium text-brand-600 hover:underline"
            >
              Customer tracking link ↗
            </a>

            <h3 className="mt-6 font-semibold text-slate-900">Status history</h3>
            {panelLoading ? (
              <div className="mt-4 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {[...history].reverse().map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="font-medium capitalize">
                      {h.status.replace(/_/g, " ")}
                    </p>
                    {h.note && (
                      <p className="text-xs text-slate-600">{h.note}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(h.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href={`/shipments/${selected.id}/slip`}
              className="mt-6 flex w-full justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Print Waybill Slip
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
