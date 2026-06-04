"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrencyPkr } from "@karachi-courier/shared";
import { BrandingHeader } from "@/components/BrandingHeader";
import { StatusTimeline } from "@/components/StatusTimeline";
import { fetchTracking, type TrackingResponse } from "@/lib/api";
import {
  formatStatusLabel,
  getFailureReason,
  isTerminalFailure,
} from "@/lib/tracking";

const REFRESH_MS = 30_000;

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function paymentLabel(method: string, codAmount: number | null) {
  if (method === "cod" && codAmount != null) {
    return `Cash on delivery · ${formatCurrencyPkr(Number(codAmount))}`;
  }
  const labels: Record<string, string> = {
    cod: "Cash on delivery",
    jazzcash: "JazzCash",
    easypaisa: "EasyPaisa",
    prepaid: "Prepaid",
  };
  return labels[method] ?? method;
}

export function TrackingView({ trackingNumber }: { trackingNumber: string }) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const result = await fetchTracking(trackingNumber);

      if (!result.ok) {
        setData(null);
        setError(result.message);
      } else {
        setData(result.data);
        setError(null);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [trackingNumber],
  );

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading tracking info…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-8">
        <BrandingHeader compact />
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <a
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            Track another parcel
          </a>
        </div>
      </div>
    );
  }

  const { shipment, status_history, proof_of_delivery } = data;
  const terminal = isTerminalFailure(shipment.status);
  const failureReason = getFailureReason(
    shipment.status,
    status_history,
    shipment.notes,
  );

  return (
    <div className="px-4 pb-10 pt-2">
      <div className="flex items-start justify-between gap-2">
        <BrandingHeader compact />
        {refreshing && (
          <span className="mt-4 text-xs text-slate-400">Updating…</span>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-6 text-white shadow-lg shadow-brand-900/20">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-100">
          Tracking number
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-wide sm:text-3xl">
          {shipment.tracking_number}
        </p>
        <p className="mt-3 text-sm capitalize text-brand-100">
          Status: {formatStatusLabel(shipment.status)}
        </p>
      </div>

      {terminal && failureReason && (
        <div
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
          role="alert"
        >
          <p className="text-sm font-semibold text-red-800 capitalize">
            Shipment {formatStatusLabel(shipment.status)}
          </p>
          <p className="mt-1 text-sm text-red-700">{failureReason}</p>
        </div>
      )}

      <div className="mt-4">
        <StatusTimeline
          status={shipment.status}
          statusHistory={status_history}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Shipment details
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">Recipient</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {shipment.recipient_name}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Route</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {shipment.pickup_area}
              <span className="mx-2 text-slate-400">→</span>
              {shipment.delivery_area}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Payment</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {paymentLabel(shipment.payment_method, shipment.cod_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Estimated delivery</dt>
            <dd className="mt-0.5 font-medium text-emerald-700">Today</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Status history
        </h2>
        {status_history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No updates yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {[...status_history].reverse().map((entry) => (
              <li
                key={entry.id}
                className="flex gap-3 border-l-2 border-slate-200 pl-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-slate-900">
                    {formatStatusLabel(entry.status)}
                  </p>
                  {entry.note && (
                    <p className="mt-0.5 text-sm text-slate-600">{entry.note}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatTimestamp(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {shipment.status === "delivered" && proof_of_delivery?.photo_url && (
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Proof of delivery
          </h2>
          <img
            src={proof_of_delivery.photo_url}
            alt="Proof of delivery"
            className="mt-4 w-full rounded-xl border border-slate-100 object-cover"
          />
          {proof_of_delivery.delivered_at && (
            <p className="mt-2 text-xs text-slate-500">
              Delivered {formatTimestamp(proof_of_delivery.delivered_at)}
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Updates automatically every 30 seconds
      </p>
    </div>
  );
}
