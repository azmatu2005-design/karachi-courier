"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WaybillSlip } from "@/components/WaybillSlip";
import { apiFetch } from "@/lib/api";
import { getStoredClient } from "@/lib/auth";
import type { Shipment } from "@/types";

export default function SlipPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const storedClient = getStoredClient();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    apiFetch<{ shipment: Shipment }>(`/api/shipments/detail/${id}`)
      .then((res) => setShipment(res.shipment))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load shipment"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || "Shipment not found"}</p>
        <Link href="/shipments" className="mt-4 inline-block text-brand-600 hover:underline">
          Back to shipments
        </Link>
      </div>
    );
  }

  const businessName =
    shipment.client_name ?? storedClient?.business_name ?? "Sender";
  const businessAddress =
    shipment.client_address ?? storedClient?.address ?? shipment.pickup_address;
  const businessArea =
    shipment.client_area ?? storedClient?.area ?? shipment.pickup_area;

  return (
    <div className="waybill-print-root min-h-screen px-4 py-8 print:p-0">
      <div className="print:hidden mx-auto mb-6 flex max-w-[148mm] flex-wrap items-center justify-between gap-3">
        <Link
          href="/shipments"
          className="text-sm font-medium text-slate-600 hover:text-brand-600"
        >
          ← Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Print
        </button>
      </div>

      <WaybillSlip
        shipment={shipment}
        businessName={businessName}
        businessAddress={businessAddress}
        businessArea={businessArea}
      />

      <p className="print:hidden mx-auto mt-4 max-w-[148mm] text-center text-xs text-slate-500">
        Optimized for A5 / half A4. Use &quot;Print&quot; and select your label
        printer.
      </p>
    </div>
  );
}
