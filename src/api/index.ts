/**
 * Kontrak API TuGuTuGu (Orang A). Komponen UI cukup:
 *
 *   import { auth, listings, orders, merchants, insights, storage, ApiError } from '../api';
 *
 * Semua fungsi async dan melempar ApiError (code stabil + message Indonesia).
 */
export { supabase } from './supabase';
export { ApiError } from './errors';
export type { ApiErrorCode } from './errors';
export { parsePickupWindow, formatPickupWindow } from './time';

export * as auth from './auth';
export * as merchants from './merchants';
export * as listings from './listings';
export * as orders from './orders';
export * as insights from './insights';
export * as storage from './storage';

export type { AppUser, UserRole, SignUpResult } from './auth';
export type { NewListingInput, NearbyOptions } from './listings';
export type { CreateOrderInput } from './orders';
export type { MerchantInsights } from './insights';
export type { MerchantPatch } from './merchants';
