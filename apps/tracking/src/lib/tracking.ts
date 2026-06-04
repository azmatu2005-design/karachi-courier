export const TIMELINE_STEPS = [
  "Order Placed",
  "Picked Up",
  "In Transit",
  "Delivered",
] as const;

export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

export function normalizeTrackingInput(input: string): string {
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("KHI-")) return trimmed;
  if (trimmed.startsWith("KHI")) {
    const rest = trimmed.slice(3).replace(/^-/, "");
    return rest ? `KHI-${rest}` : trimmed;
  }
  return `KHI-${trimmed}`;
}

/** 0–3 = active step index; -1 = terminal failure before delivery */
export function getTimelineStepIndex(status: string): number {
  switch (status) {
    case "pending":
    case "assigned":
      return 0;
    case "picked_up":
      return 1;
    case "in_transit":
      return 2;
    case "delivered":
      return 3;
    case "failed":
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

export function isTerminalFailure(status: string): boolean {
  return status === "failed" || status === "cancelled";
}

export function getMaxReachedStep(
  status: string,
  history: { status: string }[],
): number {
  if (status === "delivered") return 3;

  let max = 0;
  for (const entry of history) {
    const step = getTimelineStepIndex(entry.status);
    if (step >= 0) max = Math.max(max, step);
  }

  const current = getTimelineStepIndex(status);
  if (current >= 0) max = Math.max(max, current);

  if (isTerminalFailure(status)) {
    return max;
  }

  return current >= 0 ? current : 0;
}

export function getFailureReason(
  status: string,
  history: { note: string | null; status: string }[],
  shipmentNotes: string | null,
): string | null {
  if (!isTerminalFailure(status)) return null;

  const match = [...history]
    .reverse()
    .find((e) => e.status === status && e.note);
  if (match?.note) return match.note;
  if (shipmentNotes) return shipmentNotes;
  return status === "failed"
    ? "Delivery could not be completed."
    : "This shipment was cancelled.";
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
