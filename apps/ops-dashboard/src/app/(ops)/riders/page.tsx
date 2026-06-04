"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Rider, Shipment } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selected, setSelected] = useState<Rider | null>(null);
  const [jobs, setJobs] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ riders: Rider[] }>("/api/riders")
      .then((res) => setRiders(res.riders))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load riders"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function openRider(rider: Rider) {
    setSelected(rider);
    setPanelLoading(true);
    try {
      const res = await apiFetch<{ jobs: Shipment[] }>(
        `/api/riders/${rider.id}/jobs`,
      );
      setJobs(res.jobs);
    } catch {
      setJobs([]);
    } finally {
      setPanelLoading(false);
    }
  }

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold text-slate-900">Riders</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fleet overview and today&apos;s active jobs
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        className={`mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
          selected ? "lg:mr-[400px]" : ""
        }`}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No riders registered
                    </td>
                  </tr>
                ) : (
                  riders.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openRider(r)}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        selected?.id === r.id ? "bg-brand-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                      <td className="px-4 py-3">{r.zone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.is_on_shift
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.is_on_shift ? "On shift" : "Off shift"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.today_deliveries ?? 0} deliveries
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
            <h2 className="font-semibold text-slate-900">{selected.name}</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd>{selected.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Zone</dt>
                <dd>{selected.zone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Vehicle</dt>
                <dd>{selected.vehicle_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Shift</dt>
                <dd>{selected.is_on_shift ? "On shift" : "Off shift"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Deliveries today</dt>
                <dd>{selected.today_deliveries ?? 0}</dd>
              </div>
            </dl>

            <h3 className="mt-6 font-semibold text-slate-900">
              Today&apos;s jobs
            </h3>
            {panelLoading ? (
              <div className="mt-4 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : jobs.length === 0 ? (
              <p className="mt-2 text-slate-500">No active jobs</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {jobs.map((j) => (
                  <li
                    key={j.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="font-mono text-xs font-medium text-brand-700">
                      {j.tracking_number}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {j.pickup_area} → {j.delivery_area}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {j.status.replace(/_/g, " ")} · {formatDate(j.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
