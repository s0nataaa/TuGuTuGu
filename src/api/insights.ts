import type { InsightsRow } from './db';
import { unwrap } from './errors';
import { supabase } from './supabase';

export interface MerchantInsights {
  /** Uang yang sudah pasti masuk: e-wallet Paid + COD yang sudah diambil (tidak termasuk batal). */
  totalRevenue: number;
  /** COD yang masih menunggu uang tunai di counter. */
  pendingCodTotal: number;
  pendingCodCount: number;
  /** Order siap diambil (sudah dibayar / COD / gratis). */
  readyForPickupCount: number;
  /** Bag dipesan, tidak termasuk batal (setara "totalBagsSold" di UI lama). */
  bagsSold: number;
  /** Bag yang benar-benar sudah diambil (order Completed). */
  bagsRescued: number;
  /** Berat makanan dari bag yang sudah diambil (pakai weight_kg listing, default 0.85 kg/bag). */
  foodKgRescued: number;
  /** foodKgRescued x 2.5 */
  co2eKgPrevented: number;
  ewalletOrders: number;
  codOrders: number;
  freeOrders: number;
}

const ZERO: MerchantInsights = {
  totalRevenue: 0,
  pendingCodTotal: 0,
  pendingCodCount: 0,
  readyForPickupCount: 0,
  bagsSold: 0,
  bagsRescued: 0,
  foodKgRescued: 0,
  co2eKgPrevented: 0,
  ewalletOrders: 0,
  codOrders: 0,
  freeOrders: 0,
};

/** Insights toko user yang login. Selalu dihitung ulang dari order asli. */
export async function getMerchantInsights(): Promise<MerchantInsights> {
  const row = unwrap<InsightsRow | null>(
    await supabase.from('merchant_insights').select('*').maybeSingle()
  );
  if (!row) return ZERO;
  return {
    totalRevenue: Number(row.total_revenue),
    pendingCodTotal: Number(row.pending_cod_total),
    pendingCodCount: Number(row.pending_cod_count),
    readyForPickupCount: Number(row.ready_for_pickup_count),
    bagsSold: Number(row.bags_sold),
    bagsRescued: Number(row.bags_rescued),
    foodKgRescued: Number(row.food_kg_rescued),
    co2eKgPrevented: Number(row.co2e_kg_prevented),
    ewalletOrders: Number(row.ewallet_orders),
    codOrders: Number(row.cod_orders),
    freeOrders: Number(row.free_orders),
  };
}
