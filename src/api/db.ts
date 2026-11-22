/** Bentuk baris tabel/view di database (snake_case). Hanya dipakai di dalam src/api. */

export type DbCategory = 'Bakery' | 'Meals' | 'Drinks' | 'Desserts' | 'Groceries' | 'Snacks & Deli';

export interface ProfileRow {
  id: string;
  role: 'consumer' | 'merchant';
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface MerchantRow {
  id: string;
  owner_id: string | null;
  slug: string | null;
  store_name: string;
  category: DbCategory;
  business_type: string | null;
  email: string | null;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  rating: number;
  is_open: boolean;
}

/** Baris view public.listings_feed (listing + info toko). */
export interface ListingRow {
  id: string;
  merchant_id: string;
  title: string;
  description: string;
  category: DbCategory;
  whats_inside: string[];
  dietary_tags: string[];
  image_url: string | null;
  original_price: number;
  discounted_price: number;
  stock: number;
  max_claim_per_user: number | null;
  lat: number;
  lng: number;
  pickup_address: string;
  neighborhood: string;
  pickup_start: string;
  pickup_end: string;
  rating: number;
  review_count: number;
  rescued_count: number;
  is_midnight_deal: boolean;
  is_weekend_special: boolean;
  is_popular: boolean;
  is_new: boolean;
  is_best_deal: boolean;
  is_recommended: boolean;
  halal: boolean;
  vegetarian: boolean;
  nut_free: boolean;
  weight_kg: number | null;
  is_active: boolean;
  created_at: string;
  merchant_name: string;
  merchant_business_type: string | null;
  merchant_category: DbCategory;
}

export interface OrderRow {
  id: string;
  code: string;
  qr_token: string;
  consumer_id: string;
  listing_id: string;
  merchant_id: string;
  quantity: number;
  listing_title: string;
  listing_image: string | null;
  merchant_name: string;
  pickup_address: string;
  pickup_start: string;
  pickup_end: string;
  customer_name: string;
  unit_original_price: number;
  unit_paid_price: number;
  total_amount: number;
  total_savings: number;
  payment_method: 'ewallet' | 'cod' | 'free';
  ewallet_provider: 'GoPay' | 'OVO' | 'DANA' | 'ShopeePay' | null;
  payment_status: 'awaiting_payment' | 'paid' | 'cod_pending' | 'free' | 'failed';
  pickup_status: 'ready' | 'completed' | 'cancelled';
  payment_ref: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface InsightsRow {
  merchant_id: string;
  total_revenue: number;
  pending_cod_total: number;
  pending_cod_count: number;
  ready_for_pickup_count: number;
  bags_sold: number;
  bags_rescued: number;
  food_kg_rescued: number;
  co2e_kg_prevented: number;
  ewallet_orders: number;
  cod_orders: number;
  free_orders: number;
}
