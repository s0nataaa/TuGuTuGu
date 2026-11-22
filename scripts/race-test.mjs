/**
 * Uji anti-dobel-klaim di Supabase SUNGGUHAN (bukan mock).
 *
 * Prasyarat:
 *  - migrasi 0001-0004 sudah dijalankan
 *  - Authentication -> Providers -> Email -> "Confirm email" = OFF (agar signup langsung dapat session)
 *  - .env berisi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
 *
 * Jalankan:  npm run test:race
 * Script membuat akun & listing uji baru setiap dijalankan (email race-*@example.com).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env');
  process.exit(2);
}

const stamp = Date.now();
const password = 'race-test-123';
const newClient = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) failures++;
}

async function signUp(label, role, extra = {}) {
  const c = newClient();
  const email = `race-${label}-${stamp}@example.com`;
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: `Race ${label}`, ...extra } },
  });
  if (error) throw new Error(`signup ${label}: ${error.message}`);
  if (!data.session) {
    throw new Error('Signup tidak mengembalikan session. Matikan "Confirm email" di Supabase Auth settings.');
  }
  return c;
}

const rpcCreate = (c, listingId) =>
  c.rpc('create_order', { p_listing_id: listingId, p_quantity: 1, p_payment_method: 'cod' });

async function stockOf(c, id) {
  const { data, error } = await c.from('listings').select('stock').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data.stock;
}

async function newListing(merchant, stock) {
  const { data: { user } } = await merchant.auth.getUser();
  const { data: m, error: mErr } = await merchant.from('merchants').select('id').eq('owner_id', user.id).single();
  if (mErr) throw new Error('merchant fetch: ' + mErr.message);
  const now = Date.now();
  const { data, error } = await merchant
    .from('listings')
    .insert({
      merchant_id: m.id,
      title: `Race test bag ${stock}`,
      category: 'Bakery',
      original_price: 20000,
      discounted_price: 10000,
      stock,
      pickup_start: new Date(now - 5 * 60_000).toISOString(),
      pickup_end: new Date(now + 2 * 3600_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error('create listing: ' + error.message);
  return data.id;
}

const merchant = await signUp('merchant', 'merchant', { store_name: `Race Store ${stamp}`, category: 'Bakery', address: 'Jl. Uji 1' });
const a = await signUp('a', 'consumer');
const b = await signUp('b', 'consumer');

// ---- 1. stok 1, dua akun bersamaan ----
{
  const id = await newListing(merchant, 1);
  const [ra, rb] = await Promise.all([rpcCreate(a, id), rpcCreate(b, id)]);
  const wins = [ra, rb].filter((r) => !r.error);
  const losses = [ra, rb].filter((r) => r.error);
  check('stok 1, 2 akun bersamaan: tepat 1 berhasil', wins.length === 1, `berhasil=${wins.length}`);
  check('yang kalah dapat insufficient_stock', losses.length === 1 && losses[0].error.message === 'insufficient_stock', losses[0]?.error?.message);
  check('stok akhir = 0', (await stockOf(merchant, id)) === 0);

  // ---- 2. cancel mengembalikan stok, dan tidak bisa dobel ----
  const winner = wins[0].data;
  const winnerClient = ra.error ? b : a;
  const c1 = await winnerClient.rpc('cancel_order', { p_order_id: winner.id });
  check('cancel_order berhasil', !c1.error, c1.error?.message);
  check('stok kembali 1', (await stockOf(merchant, id)) === 1);
  const c2 = await winnerClient.rpc('cancel_order', { p_order_id: winner.id });
  check('cancel kedua ditolak (tidak dobel restore)', c2.error?.message === 'order_not_cancellable', c2.error?.message);
  check('stok tetap 1', (await stockOf(merchant, id)) === 1);
}

// ---- 3. stok 3, 10 request paralel dari 2 akun ----
{
  const id = await newListing(merchant, 3);
  const results = await Promise.all([
    ...Array.from({ length: 5 }, () => rpcCreate(a, id)),
    ...Array.from({ length: 5 }, () => rpcCreate(b, id)),
  ]);
  const ok = results.filter((r) => !r.error);
  check('stok 3, 10 request paralel: tepat 3 berhasil', ok.length === 3, `berhasil=${ok.length}`);
  check('stok akhir = 0 (tidak minus)', (await stockOf(merchant, id)) === 0);

  // ---- 4. hak akses complete_order ----
  const order = ok[0].data;
  const owner = ok[0].data.consumer_id === (await a.auth.getUser()).data.user.id ? a : b;
  const byConsumer = await owner.rpc('complete_order', { p_token: order.qr_token });
  check('consumer TIDAK bisa complete_order', !!byConsumer.error, byConsumer.error?.message);

  const other = await signUp('merchant2', 'merchant', { store_name: `Other Store ${stamp}`, category: 'Meals', address: 'Jl. Uji 2' });
  const byOther = await other.rpc('complete_order', { p_token: order.qr_token });
  check('merchant TOKO LAIN tidak bisa complete_order', byOther.error?.message === 'order_not_found', byOther.error?.message);

  const byOwner = await merchant.rpc('complete_order', { p_token: order.qr_token });
  check('merchant pemilik bisa complete_order', !byOwner.error && byOwner.data.pickup_status === 'completed', byOwner.error?.message);
  check('COD jadi paid saat complete', byOwner.data?.payment_status === 'paid');

  const again = await merchant.rpc('complete_order', { p_token: order.code });
  check('complete kedua ditolak', again.error?.message === 'order_already_completed', again.error?.message);

  // ---- 5. RLS: consumer tidak bisa tulis order langsung ----
  const forge = await a.from('orders').update({ pickup_status: 'completed' }).eq('id', order.id).select();
  check('consumer tidak bisa UPDATE orders langsung', !!forge.error || (forge.data ?? []).length === 0);

  // ---- 6. insights ----
  const ins = await merchant.from('merchant_insights').select('*').single();
  check('insights: total_revenue = 10000 (1 COD selesai)', Number(ins.data?.total_revenue) === 10000, JSON.stringify(ins.data));
}

console.log(failures === 0 ? '\nSEMUA LULUS' : `\n${failures} TES GAGAL`);
process.exit(failures === 0 ? 0 : 1);
