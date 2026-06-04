"use client";

import { useParams } from "next/navigation";
import { TrackingView } from "@/components/TrackingView";
import { normalizeTrackingInput } from "@/lib/tracking";

export function TrackingNumberPageClient() {
  const params = useParams();
  const raw = typeof params.tracking === "string" ? params.tracking : "";
  const trackingNumber = normalizeTrackingInput(decodeURIComponent(raw));

  if (!trackingNumber) {
    return (
      <div className="px-4 py-16 text-center text-slate-600">
        Invalid tracking number.{" "}
        <a href="/" className="font-semibold text-brand-600 hover:underline">
          Go back
        </a>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-white">
      <TrackingView trackingNumber={trackingNumber} />
    </main>
  );
}
