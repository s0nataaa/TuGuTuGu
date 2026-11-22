import type { FoodCategory, MerchantAccount } from '../types/marketplace';
import type { MerchantRow } from './db';
import { ApiError, unwrap } from './errors';
import { rowToMerchant } from './mappers';
import { requireUserId, supabase } from './supabase';

/** Toko milik user yang login (merchant), atau null. */
export async function getMine(): Promise<MerchantAccount | null> {
  const uid = await requireUserId();
  const row = unwrap<MerchantRow | null>(
    await supabase.from('merchants').select('*').eq('owner_id', uid).maybeSingle()
  );
  return row ? rowToMerchant(row) : null;
}

export interface MerchantPatch {
  storeName?: string;
  category?: FoodCategory;
  businessType?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  isOpen?: boolean;
}

export async function update(patch: MerchantPatch): Promise<MerchantAccount> {
  const uid = await requireUserId();
  const cols: Record<string, unknown> = {};
  if (patch.storeName !== undefined) cols.store_name = patch.storeName;
  if (patch.category !== undefined) cols.category = patch.category;
  if (patch.businessType !== undefined) cols.business_type = patch.businessType;
  if (patch.email !== undefined) cols.email = patch.email;
  if (patch.address !== undefined) cols.address = patch.address;
  if (patch.neighborhood !== undefined) cols.neighborhood = patch.neighborhood;
  if (patch.lat !== undefined) cols.lat = patch.lat;
  if (patch.lng !== undefined) cols.lng = patch.lng;
  if (patch.isOpen !== undefined) cols.is_open = patch.isOpen;

  if (Object.keys(cols).length === 0) {
    const current = await getMine();
    if (!current) throw new ApiError('no_merchant');
    return current;
  }

  const row = unwrap<MerchantRow>(
    await supabase.from('merchants').update(cols).eq('owner_id', uid).select('*').single()
  );
  return rowToMerchant(row);
}
