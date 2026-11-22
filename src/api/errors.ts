/**
 * Semua error dari src/api dilempar sebagai ApiError dengan `code` yang stabil
 * dan `message` berbahasa Indonesia yang siap ditampilkan ke user.
 *
 *   try { await orders.create(...) }
 *   catch (e) { if (e instanceof ApiError && e.code === 'insufficient_stock') ... }
 */
export type ApiErrorCode =
  // dari fungsi database (supabase/migrations/0003_functions.sql)
  | 'not_authenticated'
  | 'only_consumer_can_order'
  | 'invalid_quantity'
  | 'invalid_payment_method'
  | 'listing_not_found'
  | 'listing_unavailable'
  | 'pickup_window_closed'
  | 'insufficient_stock'
  | 'claim_limit_exceeded'
  | 'order_not_found'
  | 'order_not_cancellable'
  | 'order_already_completed'
  | 'order_cancelled'
  | 'payment_not_confirmed'
  | 'stock_would_go_negative'
  // dari Supabase Auth / RLS / client
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'wrong_role'
  | 'forbidden'
  | 'no_merchant'
  | 'invalid_image'
  | 'unknown';

const MESSAGES: Record<ApiErrorCode, string> = {
  not_authenticated: 'Silakan masuk dulu.',
  only_consumer_can_order: 'Hanya akun consumer yang bisa memesan.',
  invalid_quantity: 'Jumlah pesanan tidak valid (1–10).',
  invalid_payment_method: 'Metode pembayaran tidak valid.',
  listing_not_found: 'Bag tidak ditemukan.',
  listing_unavailable: 'Bag ini sudah tidak tersedia.',
  pickup_window_closed: 'Jam pengambilan bag ini sudah lewat.',
  insufficient_stock: 'Stok tidak cukup. Mungkin baru saja diambil orang lain.',
  claim_limit_exceeded: 'Kamu sudah mencapai batas klaim untuk bag ini.',
  order_not_found: 'Order tidak ditemukan.',
  order_not_cancellable: 'Order ini sudah tidak bisa dibatalkan.',
  order_already_completed: 'Order ini sudah selesai diambil.',
  order_cancelled: 'Order ini sudah dibatalkan.',
  payment_not_confirmed: 'Pembayaran order ini belum terkonfirmasi.',
  stock_would_go_negative: 'Stok tidak boleh kurang dari 0.',
  invalid_credentials: 'Email atau password salah.',
  email_taken: 'Email ini sudah terdaftar.',
  email_not_confirmed: 'Email belum dikonfirmasi. Cek inbox kamu.',
  weak_password: 'Password terlalu lemah (minimal 6 karakter).',
  wrong_role: 'Akun ini tidak bisa masuk dari halaman ini.',
  forbidden: 'Kamu tidak punya akses untuk aksi ini.',
  no_merchant: 'Akun ini belum punya toko.',
  invalid_image: 'Foto harus JPG, PNG, atau WebP dan maksimal 5 MB.',
  unknown: 'Terjadi kesalahan. Coba lagi.',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly cause?: unknown;

  constructor(code: ApiErrorCode, cause?: unknown) {
    super(MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
    this.cause = cause;
  }
}

interface SupabaseLikeError {
  message?: string;
  code?: string;
}

/** Ubah error Supabase (Postgrest / Auth / Storage) jadi ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const e = (err ?? {}) as SupabaseLikeError;
  const msg = (e.message ?? '').trim();

  // Fungsi database melempar message == kode (mis. 'insufficient_stock')
  if (msg in MESSAGES && msg !== 'unknown') return new ApiError(msg as ApiErrorCode, err);

  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return new ApiError('invalid_credentials', err);
  if (lower.includes('already registered')) return new ApiError('email_taken', err);
  if (lower.includes('email not confirmed')) return new ApiError('email_not_confirmed', err);
  if (lower.includes('password should be') || lower.includes('weak password'))
    return new ApiError('weak_password', err);
  if (lower.includes('row-level security') || e.code === '42501') return new ApiError('forbidden', err);

  return new ApiError('unknown', err);
}

/** Buka hasil {data, error} dari supabase-js: lempar ApiError kalau error. */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw toApiError(res.error);
  return res.data as T;
}
