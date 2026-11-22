import type { EWalletProvider, OrderRecord, PaymentMethod } from '../types/marketplace';
import type { OrderRow } from './db';
import { ApiError, unwrap } from './errors';
import { rowToOrder } from './mappers';
import { requireUserId, supabase } from './supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9-]{3,128}$/;

export interface CreateOrderInput {
  listingId: string;
  quantity: number;
  /** Diabaikan oleh server untuk bag gratis (otomatis 'free'). */
  paymentMethod: PaymentMethod;
  ewalletProvider?: EWalletProvider;
}

/**
 * Pesan bag. Stok dikurangi atomik di database; kalau stok habis (mis. diambil
 * orang lain di detik yang sama) dilempar ApiError('insufficient_stock').
 *
 * Status awal yang dikembalikan:
 *  - COD     -> paymentStatus 'Pending (Cash on Pickup)'
 *  - Gratis  -> 'Free Claim'
 *  - E-wallet-> 'Awaiting Payment' (jadi 'Paid' setelah webhook / mark_order_paid)
 *
 * order.id = kode order (TG-123456) ; order.qrToken = isi QR.
 */
export async function create(input: CreateOrderInput): Promise<OrderRecord> {
  const row = unwrap<OrderRow>(
    await supabase.rpc('create_order', {
      p_listing_id: input.listingId,
      p_quantity: input.quantity,
      p_payment_method: input.paymentMethod,
      p_ewallet_provider: input.ewalletProvider ?? null,
    })
  );
  return rowToOrder(row);
}

/** Batalkan order & kembalikan stok. Menerima uuid ATAU kode order. Consumer pemilik / merchant toko. */
export async function cancel(orderIdOrCode: string): Promise<OrderRecord> {
  const uuid = await resolveOrderUuid(orderIdOrCode);
  const row = unwrap<OrderRow>(await supabase.rpc('cancel_order', { p_order_id: uuid }));
  return rowToOrder(row);
}

/**
 * Selesaikan order (merchant). `token` = isi QR hasil scan ATAU kode order yang
 * diketik manual. COD otomatis menjadi 'Paid' (uang tunai diterima saat pickup).
 */
export async function complete(token: string): Promise<OrderRecord> {
  const row = unwrap<OrderRow>(await supabase.rpc('complete_order', { p_token: token.trim() }));
  return rowToOrder(row);
}

/** Riwayat order milik user yang login (consumer), terbaru dulu. */
export async function listMine(): Promise<OrderRecord[]> {
  const uid = await requireUserId();
  const rows = unwrap<OrderRow[]>(
    await supabase
      .from('orders')
      .select('*')
      .eq('consumer_id', uid)
      .order('created_at', { ascending: false })
  );
  return (rows ?? []).map(rowToOrder);
}

/**
 * Order masuk untuk toko user yang login (merchant), terbaru dulu.
 * Order e-wallet yang belum dibayar disembunyikan kecuali includeUnpaid = true.
 */
export async function listForMerchant(includeUnpaid = false): Promise<OrderRecord[]> {
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (!includeUnpaid) q = q.neq('payment_status', 'awaiting_payment');
  const rows = unwrap<OrderRow[]>(await q);
  return (rows ?? []).map(rowToOrder);
}

/**
 * Cari order di toko sendiri dari isi QR / kode order, untuk ditampilkan sebelum
 * merchant menekan konfirmasi. RLS memastikan order toko lain tidak ketemu.
 */
export async function findByToken(token: string): Promise<OrderRecord | null> {
  const t = token.trim();
  if (!TOKEN_RE.test(t)) return null;
  const row = unwrap<OrderRow | null>(
    await supabase
      .from('orders')
      .select('*')
      .or(`qr_token.eq.${t},code.eq.${t.toUpperCase()}`)
      .maybeSingle()
  );
  return row ? rowToOrder(row) : null;
}

async function resolveOrderUuid(idOrCode: string): Promise<string> {
  if (UUID_RE.test(idOrCode)) return idOrCode;
  const row = unwrap<{ id: string } | null>(
    await supabase.from('orders').select('id').eq('code', idOrCode.trim().toUpperCase()).maybeSingle()
  );
  if (!row) throw new ApiError('order_not_found');
  return row.id;
}
