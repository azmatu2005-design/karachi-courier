export type OrderStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface Address {
  line1: string;
  line2?: string;
  area: string;
  city: string;
  postalCode?: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  status: OrderStatus;
  pickup: Address;
  dropoff: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: "bike" | "car" | "van";
  isActive: boolean;
}
