"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandingHeader } from "@/components/BrandingHeader";
import { normalizeTrackingInput } from "@/lib/tracking";

export default function HomePage() {
  const router = useRouter();
  const [tracking, setTracking] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeTrackingInput(tracking);
    if (!normalized) return;
    router.push(`/${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5">
      <BrandingHeader />

      <div className="flex flex-1 flex-col justify-center pb-20 pt-4">
        <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Track your parcel
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-slate-600">
          Enter your tracking number to see real-time delivery status for your
          Karachi same-day shipment.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <label htmlFor="tracking" className="sr-only">
            Tracking number
          </label>
          <input
            id="tracking"
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="KHI-XXXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center font-mono text-lg tracking-wide text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={!tracking.trim()}
            className="w-full rounded-xl bg-brand-600 py-4 text-base font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Track
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Secure tracking · No account required
        </p>
      </div>
    </main>
  );
}
