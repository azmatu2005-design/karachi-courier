export interface Shipment {
  id: string;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  pickup_address: string;
  pickup_area: string;
  delivery_address: string;
  delivery_area: string;
  status: string;
  payment_method: string;
  cod_amount: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
}

export interface RiderProfile {
  id: string;
  name: string | null;
  phone: string | null;
  zone: string | null;
  bike_number: string | null;
  is_on_shift: boolean;
}

export interface Shift {
  id: string;
  rider_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  total_deliveries?: number;
  total_cod_collected?: number;
}

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { shipment: Shipment };
  DeliverySuccess: { trackingNumber: string };
};

export type MainTabParamList = {
  Home: undefined;
  JobsTab: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};
