"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { apiFetch } from "@/lib/api";
import {
  SHIPMENT_STATUSES,
  type Shipment,
  type ShipmentStatus,
  type StatusLogEntry,
} from "@/types";
import type { Rider } from "@/types";

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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? "bg-slate-100"}`}
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
  const [riders, setRiders] = useState<Rider[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<StatusLogEntry[]>([]);
  const [assignRiderId, setAssignRiderId] = useState("");
  const [newStatus, setNewStatus] = useState<ShipmentStatus>("assigned");
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [panelError, setPanelError] = useState("");

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const res = await apiFetch<{ shipments: Shipment[] }>(
        `/api/shipments${query}`,
      );
      setShipments(res.shipments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadShipments();
    apiFetch<{ riders: Rider[] }>("/api/riders")
      .then((res) => setRiders(res.riders))
      .catch(() => {});
  }, [loadShipments]);

  async function openPanel(shipment: Shipment) {
    setSelected(shipment);
    setAssignRiderId(shipment.rider_id ?? "");
    setNewStatus(shipment.status);
    setPanelError("");
    setPanelLoading(true);
    try {
      const res = await apiFetch<{
        status_history: StatusLogEntry[];
      }>(`/api/shipments/${shipment.tracking_number}`);
      setHistory(res.status_history);
    } catch (err) {
      setPanelError(
        err instanceof Error ? err.message : "Failed to load details",
      );
      setHistory([]);
    } finally {
      setPanelLoading(false);
    }
  }

  async function handleAssign() {
    if (!selected || !assignRiderId) return;
    setActionLoading(true);
    setPanelError("");
    try {
      await apiFetch(`/api/shipments/${selected.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ rider_id: assignRiderId }),
      });
      await loadShipments();
      const updated = shipments.find((s) => s.id === selected.id);
      if (updated) openPanel({ ...updated, rider_id: assignRiderId });
      setSelected((s) =>
        s ? { ...s, rider_id: assignRiderId, status: "assigned" } : s,
      );
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!selected) return;
    setActionLoading(true);
    setPanelError("");
    try {
      await apiFetch(`/api/shipments/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await loadShipments();
      setSelected((s) => (s ? { ...s, status: newStatus } : s));
      const res = await apiFetch<{ status_history: StatusLogEntry[] }>(
        `/api/shipments/${selected.tracking_number}`,
      );
      setHistory(res.status_history);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage pickups, assignments, and delivery status
          </p>
        </div>
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
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        className={`mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-[margin] ${
          selected ? "lg:mr-[420px]" : ""
        }`}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tracking</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Pickup</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rider</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openPanel(s)}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        selected?.id === s.id ? "bg-brand-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">
                        {s.tracking_number}
                      </td>
                      <td className="px-4 py-3">{s.client_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.pickup_area}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.delivery_area}
                      </td>
                      <td className="px-4 py-3">{s.recipient_name}</td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3">{s.rider_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(s.created_at)}
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
        <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl lg:top-14">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              {selected.tracking_number}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
            {panelLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <dl className="space-y-3">
                  <Detail label="Status">{statusBadge(selected.status)}</Detail>
                  <Detail label="Client">{selected.client_name ?? "—"}</Detail>
                  <Detail label="Pickup">
                    {selected.pickup_area} — {selected.pickup_address}
                  </Detail>
                  <Detail label="Delivery">
                    {selected.delivery_area} — {selected.delivery_address}
                  </Detail>
                  <Detail label="Recipient">
                    {selected.recipient_name} ({selected.recipient_phone})
                  </Detail>
                  <Detail label="Payment">
                    {selected.payment_method}
                    {selected.cod_amount
                      ? ` · ${formatCurrencyPkr(Number(selected.cod_amount))}`
                      : ""}
                  </Detail>
                  {selected.notes && (
                    <Detail label="Notes">{selected.notes}</Detail>
                  )}
                </dl>

                <h3 className="mt-6 font-semibold text-slate-900">
                  Status history
                </h3>
                <ul className="mt-2 space-y-2">
                  {history.length === 0 ? (
                    <li className="text-slate-500">No history</li>
                  ) : (
                    history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          {statusBadge(h.status)}
                          <span className="text-xs text-slate-400">
                            {formatDate(h.created_at)}
                          </span>
                        </div>
                        {h.note && (
                          <p className="mt-1 text-xs text-slate-600">
                            {h.note}
                          </p>
                        )}
                      </li>
                    ))
                  )}
                </ul>

                <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Assign rider
                    </label>
                    <select
                      value={assignRiderId}
                      onChange={(e) => setAssignRiderId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="">Select rider</option>
                      {riders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.zone ?? "no zone"})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={actionLoading || !assignRiderId}
                      onClick={handleAssign}
                      className="mt-2 w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Assign rider
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Update status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as ShipmentStatus)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {SHIPMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleStatusUpdate}
                      className="mt-2 w-full rounded-lg border border-brand-500 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    >
                      Update status
                    </button>
                  </div>
                </div>

                {panelError && (
                  <p className="mt-4 text-sm text-red-600">{panelError}</p>
                )}
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{children}</dd>
    </div>
  );
}
