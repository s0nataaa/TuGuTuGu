import type { FoodCategory, FoodListing } from '../types/marketplace';
import type { ListingRow } from './db';
import { ApiError, unwrap } from './errors';
import { rowToListing } from './mappers';
import { requireUserId, supabase } from './supabase';

/** Titik tengah Jakarta Selatan-Pusat, dipakai kalau user belum memberi lokasi. */
export const DEFAULT_CENTER = { lat: -6.2297, lng: 106.8112 };

export interface NearbyOptions {
  lat: number;
  lng: number;
  /** default 15 km */
  radiusKm?: number;
  /** true = hanya yang stok > 0 dan jam pickup belum lewat. default false */
  onlyOpen?: boolean;
}

interface NearbyRow {
  listing: ListingRow;
  distance_km: number;
}

/** Listing aktif di sekitar titik (lat,lng), diurutkan dari yang terdekat. */
export async function getNearby(opts: NearbyOptions): Promise<FoodListing[]> {
  const rows = unwrap<NearbyRow[]>(
    await supabase.rpc('listings_nearby', {
      p_lat: opts.lat,
      p_lng: opts.lng,
      p_radius_km: opts.radiusKm ?? 15,
      p_only_open: opts.onlyOpen ?? false,
    })
  );
  return (rows ?? []).map((r) => rowToListing(r.listing, r.distance_km));
}

/** Semua listing aktif (radius 100 km dari pusat Jakarta). Untuk Home/Search sebelum ada geolocation. */
export function list(onlyOpen = false): Promise<FoodListing[]> {
  return getNearby({ ...DEFAULT_CENTER, radiusKm: 100, onlyOpen });
}

export async function getById(
  id: string,
  from?: { lat: number; lng: number }
): Promise<FoodListing | null> {
  const row = unwrap<ListingRow | null>(
    await supabase.from('listings_feed').select('*').eq('id', id).maybeSingle()
  );
  if (!row) return null;
  return rowToListing(row, from ? haversineKm(from.lat, from.lng, row.lat, row.lng) : 0);
}

/** Listing milik toko user yang login (merchant), termasuk yang dinonaktifkan jika diminta. */
export async function listMine(includeInactive = false): Promise<FoodListing[]> {
  const uid = await requireUserId();
  const merchant = unwrap<{ id: string } | null>(
    await supabase.from('merchants').select('id').eq('owner_id', uid).maybeSingle()
  );
  if (!merchant) throw new ApiError('no_merchant');

  let q = supabase
    .from('listings_feed')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });
  if (!includeInactive) q = q.eq('is_active', true);

  const rows = unwrap<ListingRow[]>(await q);
  return (rows ?? []).map((r) => rowToListing(r));
}

export interface NewListingInput {
  title: string;
  description?: string;
  category: FoodCategory;
  whatsInside?: string[];
  dietaryTags?: string[];
  /** URL publik, mis. dari storage.uploadListingImage() */
  imageUrl?: string;
  originalPrice: number;
  /** 0 = gratis (free claim) */
  discountedPrice: number;
  stock: number;
  maxClaimPerUser?: number;
  /** ISO string atau Date. Bisa dibuat dari teks form dengan parsePickupWindow() */
  pickupStart: string | Date;
  pickupEnd: string | Date;
  isMidnightDeal?: boolean;
  isWeekendSpecial?: boolean;
  halal?: boolean;
  vegetarian?: boolean;
  nutFree?: boolean;
  weightKg?: number;
  /** kosong = ikut lokasi & alamat toko */
  lat?: number;
  lng?: number;
  pickupAddress?: string;
  neighborhood?: string;
}

const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : v);

function toColumns(input: Partial<NewListingInput>): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) c[k] = v;
  };
  set('title', input.title);
  set('description', input.description);
  set('category', input.category);
  set('whats_inside', input.whatsInside);
  set('dietary_tags', input.dietaryTags);
  set('image_url', input.imageUrl);
  set('original_price', input.originalPrice);
  set('discounted_price', input.discountedPrice);
  set('max_claim_per_user', input.maxClaimPerUser);
  set('lat', input.lat);
  set('lng', input.lng);
  set('pickup_address', input.pickupAddress);
  set('neighborhood', input.neighborhood);
  if (input.pickupStart !== undefined) c.pickup_start = iso(input.pickupStart);
  if (input.pickupEnd !== undefined) c.pickup_end = iso(input.pickupEnd);
  set('is_midnight_deal', input.isMidnightDeal);
  set('is_weekend_special', input.isWeekendSpecial);
  set('halal', input.halal);
  set('vegetarian', input.vegetarian);
  set('nut_free', input.nutFree);
  set('weight_kg', input.weightKg);
  return c;
}

export async function create(input: NewListingInput): Promise<FoodListing> {
  const uid = await requireUserId();
  const merchant = unwrap<{ id: string } | null>(
    await supabase.from('merchants').select('id').eq('owner_id', uid).maybeSingle()
  );
  if (!merchant) throw new ApiError('no_merchant');

  const inserted = unwrap<{ id: string }>(
    await supabase
      .from('listings')
      .insert({ ...toColumns(input), merchant_id: merchant.id, stock: Math.max(0, input.stock) })
      .select('id')
      .single()
  );
  const full = await getById(inserted.id);
  if (!full) throw new ApiError('listing_not_found');
  return full;
}

/**
 * Ubah listing. Kalau `stock` ada di patch, stok diubah lewat selisih atomik
 * (adjust_listing_stock) supaya pesanan yang masuk bersamaan tidak tertimpa.
 */
export async function update(
  id: string,
  patch: Partial<NewListingInput>
): Promise<FoodListing> {
  const { stock, ...rest } = patch;
  const cols = toColumns(rest);

  if (Object.keys(cols).length > 0) {
    unwrap(await supabase.from('listings').update(cols).eq('id', id).select('id').single());
  }
  if (stock !== undefined) {
    const current = unwrap<{ stock: number }>(
      await supabase.from('listings').select('stock').eq('id', id).single()
    );
    const delta = Math.max(0, stock) - current.stock;
    if (delta !== 0) await adjustStock(id, delta);
  }

  const full = await getById(id);
  if (!full) throw new ApiError('listing_not_found');
  return full;
}

/** Tambah/kurangi stok secara atomik (tombol +/-). Tidak bisa di bawah 0. */
export async function adjustStock(id: string, delta: number): Promise<FoodListing> {
  unwrap(await supabase.rpc('adjust_listing_stock', { p_listing_id: id, p_delta: delta }));
  const full = await getById(id);
  if (!full) throw new ApiError('listing_not_found');
  return full;
}

/** "Hapus" = nonaktifkan (soft delete) agar riwayat order tetap utuh. */
export async function remove(id: string): Promise<void> {
  unwrap(await supabase.from('listings').update({ is_active: false }).eq('id', id).select('id').single());
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
