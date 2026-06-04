export interface Shipment {
  id: string;
  tracking_number: string;
  client_id: string;
  client_name?: string | null;
  client_address?: string | null;
  client_area?: string | null;
  client_city?: string | null;
  pickup_address: string;
  pickup_area: string;
  delivery_address: string;
  delivery_area: string;
  recipient_name: string;
  recipient_phone: string;
  status: string;
  payment_method: string;
  cod_amount: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusLogEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

export interface CodEntry {
  id: string;
  amount: number;
  reconciled: boolean;
  collected_at: string;
  reconciled_at: string | null;
  tracking_number?: string | null;
  recipient_name?: string | null;
}
