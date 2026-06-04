export const SHIPMENT_STATUSES = [
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export interface Shipment {
  id: string;
  tracking_number: string;
  client_id: string;
  client_name?: string | null;
  pickup_address: string;
  pickup_area: string;
  delivery_address: string;
  delivery_area: string;
  recipient_name: string;
  recipient_phone: string;
  status: ShipmentStatus;
  rider_id: string | null;
  rider_name?: string | null;
  payment_method: string;
  cod_amount: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusLogEntry {
  id: string;
  shipment_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  name: string | null;
  phone: string | null;
  zone: string | null;
  is_on_shift: boolean;
  today_deliveries?: number;
  vehicle_type?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
}

export interface CodEntry {
  id: string;
  rider_id: string;
  shipment_id: string;
  amount: number;
  collected_at: string;
  reconciled: boolean;
  rider_name?: string | null;
  tracking_number?: string | null;
  recipient_name?: string | null;
}
