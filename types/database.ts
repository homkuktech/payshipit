export type UserRole = 'sender' | 'rider' | 'merchant' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type TransactionType = 'payment' | 'refund' | 'withdrawal' | 'commission';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  avatar_url?: string;
  rating: number;
  total_ratings: number;
  is_verified: boolean;
  is_available: boolean;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_plate: string;
  license_number: string;
  current_lat?: number;
  current_lng?: number;
  last_location_update?: string;
  created_at: string;
}

export interface Order {
  id: string;
  sender_id: string;
  rider_id?: string;
  status: OrderStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  recipient_name: string;
  recipient_phone: string;
  package_description: string;
  package_value: number;
  delivery_fee: number;
  estimated_distance: number;
  estimated_duration: number;
  pickup_time?: string;
  delivery_time?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderWithProfiles extends Order {
  sender?: Profile;
  rider?: Profile;
}

export interface Transaction {
  id: string;
  order_id?: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  payment_provider?: string;
  payment_reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Rating {
  id: string;
  order_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface LocationTracking {
  id: string;
  order_id: string;
  rider_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  polyline: string;
}
