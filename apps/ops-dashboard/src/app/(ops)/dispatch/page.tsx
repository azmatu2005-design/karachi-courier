"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Rider } from "@/types";

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export default function DispatchPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ riders: Rider[] }>("/api/riders")
      .then((res) => setRiders(res.riders.filter((r) => r.is_on_shift)))
      .finally(() => setLoading(false));
  }, []);

  const active = riders;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dispatch</h1>
      <p className="mt-1 text-sm text-slate-500">
        Live rider positions and route overview
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            {mapsKey && mapsKey !== "your_google_maps_key_here" ? (
              <iframe
                title="Karachi map"
                className="h-[360px] w-full rounded-xl"
                src={`https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=24.8607,67.0011&zoom=11`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="px-6 text-center text-slate-500">
                <p className="font-medium text-slate-700">Map placeholder</p>
                <p className="mt-2 text-sm">
                  Set <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>{" "}
                  in <code className="text-xs">.env.local</code> to enable the
                  embedded map.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">On shift</h2>
            <p className="text-xs text-slate-500">{active.length} riders active</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : active.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No riders on shift
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {active.map((r) => (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-slate-500">{r.zone ?? "No zone"}</p>
                  {r.current_lat != null && r.current_lng != null && (
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {Number(r.current_lat).toFixed(4)},{" "}
                      {Number(r.current_lng).toFixed(4)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
