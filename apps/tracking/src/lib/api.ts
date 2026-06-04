const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface TrackingShipment {
  id: string;
  tracking_number: string;
  recipient_name: string;
  pickup_area: string;
  delivery_area: string;
  payment_method: string;
  cod_amount: number | null;
  status: string;
  notes: string | null;
}

export interface StatusLogEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

export interface ProofOfDelivery {
  id: string;
  photo_url: string | null;
  signature_url: string | null;
  delivered_at: string | null;
  notes: string | null;
}

export interface TrackingResponse {
  shipment: TrackingShipment;
  status_history: StatusLogEntry[];
  proof_of_delivery: ProofOfDelivery | null;
}

export type FetchTrackingResult =
  | { ok: true; data: TrackingResponse }
  | { ok: false; kind: "not_found" | "error"; message: string };

export async function fetchTracking(
  trackingNumber: string,
): Promise<FetchTrackingResult> {
  try {
    const res = await fetch(
      `${API_URL}/api/shipments/${encodeURIComponent(trackingNumber)}`,
      { cache: "no-store" },
    );

    const body = await res.json().catch(() => ({}));

    if (res.status === 404) {
      return {
        ok: false,
        kind: "not_found",
        message: "No shipment found for this tracking number",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        kind: "error",
        message: "Unable to fetch tracking info, please try again",
      };
    }

    return { ok: true, data: body as TrackingResponse };
  } catch {
    return {
      ok: false,
      kind: "error",
      message: "Unable to fetch tracking info, please try again",
    };
  }
}
