import type {
  FoodCategory,
  FoodListing,
  MerchantAccount,
  OrderRecord,
  PaymentStatus,
  PickupStatus,
} from '../types/marketplace';
import type { ListingRow, MerchantRow, OrderRow } from './db';
import { formatOrderTimestamp, formatPickupWindow } from './time';

const FALLBACK_IMAGE = '/src/assets/images/hero_surplus_bag_1795103366612.jpg';

/**
 * SHIM sementara: UI lama masih memakai FoodListing.coordinates {x,y} (persen 0-100).
 * Dihitung dari lat/lng asli di area Jakarta Selatan-Pusat supaya peta lama tetap
 * jalan sampai Orang C mengganti dengan Leaflet. Hapus bersama peta persen.
 */
const BBOX = { north: -6.195, south: -6.28, west: 106.795, east: 106.84 };
const clamp = (v: number) => Math.min(96, Math.max(4, v));
export function legacyXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BBOX.west) / (BBOX.east - BBOX.west)) * 84 + 8;
  const y = ((BBOX.north - lat) / (BBOX.north - BBOX.south)) * 84 + 8;
  return { x: Math.round(clamp(x)), y: Math.round(clamp(y)) };
}

export function rowToListing(row: ListingRow, distanceKm = 0): FoodListing {
  const original = row.original_price;
  const discounted = row.discounted_price;
  const createdMs = Date.parse(row.created_at);
  const isFresh = Number.isFinite(createdMs) && Date.now() - createdMs < 3 * 24 * 60 * 60 * 1000;

  return {
    id: row.id,
    title: row.title,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    merchantCategory: row.merchant_business_type ?? row.merchant_category,
    category: row.category as FoodCategory,
    description: row.description,
    whatsInside: row.whats_inside ?? [],
    dietaryTags: row.dietary_tags ?? [],
    image: row.image_url || FALLBACK_IMAGE,
    originalPrice: original,
    discountedPrice: discounted,
    discountPercent: original > 0 ? Math.round((1 - discounted / original) * 100) : 0,
    stock: row.stock,
    maxClaimPerUser: row.max_claim_per_user ?? undefined,
    distanceKm: Math.round(distanceKm * 10) / 10,
    neighborhood: row.neighborhood,
    pickupAddress: row.pickup_address,
    pickupWindow: formatPickupWindow(row.pickup_start, row.pickup_end),
    expiresAtMs: Date.parse(row.pickup_end),
    rating: Number(row.rating),
    reviewCount: row.review_count,
    rescuedCount: row.rescued_count,
    isMidnightDeal: row.is_midnight_deal,
    isPopular: row.is_popular,
    isNew: row.is_new || isFresh,
    isWeekendSpecial: row.is_weekend_special,
    isBestDeal: row.is_best_deal,
    isRecommended: row.is_recommended,
    halal: row.halal,
    vegetarian: row.vegetarian,
    nutFree: row.nut_free,
    weightKg: row.weight_kg == null ? undefined : Number(row.weight_kg),
    lat: row.lat,
    lng: row.lng,
    isActive: row.is_active,
    coordinates: legacyXY(row.lat, row.lng),
  };
}

const PAYMENT_LABEL: Record<OrderRow['payment_status'], PaymentStatus> = {
  paid: 'Paid',
  cod_pending: 'Pending (Cash on Pickup)',
  free: 'Free Claim',
  awaiting_payment: 'Awaiting Payment',
  failed: 'Failed',
};

const PICKUP_LABEL: Record<OrderRow['pickup_status'], PickupStatus> = {
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * OrderRecord.id = KODE order (TG-123456) supaya UI lama tetap menampilkan ID yang
 * enak dibaca. UUID di DB ada di `orderId`, isi QR di `qrToken`.
 */
export function rowToOrder(row: OrderRow): OrderRecord {
  return {
    id: row.code,
    orderId: row.id,
    qrToken: row.qr_token,
    type: row.payment_method === 'free' ? 'free' : 'paid',
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingImage: row.listing_image || FALLBACK_IMAGE,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    pickupAddress: row.pickup_address,
    pickupWindow: formatPickupWindow(row.pickup_start, row.pickup_end),
    quantity: row.quantity,
    unitOriginalPrice: row.unit_original_price,
    unitPaidPrice: row.unit_paid_price,
    totalAmount: row.total_amount,
    totalSavings: row.total_savings,
    paymentMethod: row.payment_method === 'free' ? undefined : row.payment_method,
    ewalletProvider: row.ewallet_provider ?? undefined,
    paymentStatus: PAYMENT_LABEL[row.payment_status],
    pickupStatus: PICKUP_LABEL[row.pickup_status],
    customerName: row.customer_name,
    createdAt: formatOrderTimestamp(row.created_at),
    createdAtIso: row.created_at,
  };
}

export function rowToMerchant(row: MerchantRow, fallbackEmail = ''): MerchantAccount {
  return {
    id: row.id,
    storeName: row.store_name,
    category: row.category as FoodCategory,
    email: row.email ?? fallbackEmail,
    address: row.address,
    neighborhood: row.neighborhood,
    rating: Number(row.rating),
    lat: row.lat,
    lng: row.lng,
    isOpen: row.is_open,
  };
}
