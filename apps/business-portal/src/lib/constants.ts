export const KARACHI_AREAS = [
  "DHA",
  "Clifton",
  "Gulshan",
  "Saddar",
  "SITE",
  "Korangi",
  "North Karachi",
  "Malir",
] as const;

export const SHIPMENT_STATUSES = [
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
] as const;

export const TRACKING_URL =
  process.env.NEXT_PUBLIC_TRACKING_URL ?? "http://localhost:3003";
