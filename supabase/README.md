# Backend TuGuTuGu (Supabase)

Bagian Orang A: skema DB, RLS, fungsi order atomik, auth, storage, seed, dan kontrak `src/api/`.

## Setup (±10 menit)

1. **Buat project** di <https://supabase.com> (free tier). Catat password database kalau diminta.
2. **Matikan konfirmasi email** (wajib untuk dev & demo, kalau tidak signup tidak langsung punya session):
   *Authentication → Providers → Email → matikan "Confirm email"*.
3. **Jalankan SQL**: *SQL Editor → New query*, paste seluruh isi [`supabase/setup.sql`](./setup.sql) → Run.
   File itu gabungan `migrations/0001..0004` + `seed.sql`. Aman diulang untuk seed, tapi migrasi hanya sekali
   (kalau mau ulang dari nol: jalankan `supabase/dev/reset.sql` dulu).
4. **Isi `.env`**: salin `.env.example` → `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   dari *Project Settings → API*. Jangan pernah memakai `service_role` key di `VITE_*`.
5. `npm install && npm run dev`.
6. **Cek anti-dobel-klaim**: `npm run test:race` (butuh `.env` dan langkah 2). Semua baris harus `PASS`.

Kalau seed terlihat "kosong" / order gagal dengan `pickup_window_closed` di hari berikutnya, geser jam pickup
toko seed ke hari ini: `select public.reset_demo_pickup_windows();` di SQL Editor.

Mau dashboard merchant langsung berisi listing seed? Daftar akun merchant lewat app, lalu jalankan
`supabase/dev/claim_demo_merchant.sql` (ganti email & slug toko).

## Model data

| Tabel | Isi |
|---|---|
| `profiles` | 1 per akun auth. `role` = `consumer` / `merchant`. Dibuat otomatis oleh trigger signup. |
| `merchants` | Toko (`lat`,`lng`, `is_open`, `owner_id`). Merchant baru dibuat otomatis dari metadata signup. Toko seed `owner_id = null`. |
| `listings` | Surplus bag: `lat`,`lng`,`pickup_start`,`pickup_end`,`stock`, harga, flag halal/vegetarian, `is_active` (soft delete). |
| `orders` | `code` (TG-123456 / FREE-123456, tampil ke user), `qr_token` (isi QR, rahasia), `payment_status`, `pickup_status`, snapshot judul/harga/alamat. |
| view `listings_feed` | listing + nama/jenis toko. |
| view `merchant_insights` | angka insights untuk toko milik user yang login. |

Status (di DB → label di `OrderRecord` lama):

| `payment_status` | label UI | arti |
|---|---|---|
| `awaiting_payment` | `Awaiting Payment` | e-wallet sudah dipesan, belum dibayar |
| `paid` | `Paid` | e-wallet lunas, atau COD yang sudah diambil |
| `cod_pending` | `Pending (Cash on Pickup)` | COD menunggu uang tunai |
| `free` | `Free Claim` | bag Rp 0 |
| `failed` | `Failed` | pembayaran gagal / kedaluwarsa |

`pickup_status`: `ready` → `Ready for Pickup`, `completed` → `Completed`, `cancelled` → `Cancelled`.

## Keamanan (RLS)

- Client **tidak bisa** `insert/update/delete` tabel `orders`. Semua lewat fungsi `security definer`.
- Consumer hanya melihat order miliknya. Merchant hanya melihat/mengubah listing & order tokonya.
- `role` tidak bisa diubah dari client. Kolom `rating`, `rescued_count`, `owner_id` juga tidak bisa.
- `stock` tidak bisa di-update langsung, hanya lewat `adjust_listing_stock(id, delta)` (relatif, atomik).
- `mark_order_paid`, `fail_order_payment`, `expire_unpaid_orders` hanya bisa dipanggil `service_role`.

## Kontrak `src/api/`

```ts
import { auth, listings, orders, merchants, insights, storage, ApiError } from '../api';
```

Semua fungsi async dan melempar `ApiError` (`e.code` stabil, `e.message` bahasa Indonesia). Tipe balikan memakai
`FoodListing` / `OrderRecord` / `MerchantAccount` dari `src/types/marketplace.ts` supaya komponen lama tetap cocok.

| Modul | Fungsi |
|---|---|
| `auth` | `signUpConsumer`, `signUpMerchant`, `signIn(email, pw, expectedRole?)`, `signOut`, `getCurrentUser`, `onAuthChange`, `updateProfile` |
| `listings` | `getNearby({lat,lng,radiusKm?,onlyOpen?})`, `list()`, `getById`, `listMine`, `create`, `update`, `adjustStock`, `remove` |
| `orders` | `create({listingId, quantity, paymentMethod, ewalletProvider?})`, `cancel`, `complete(tokenOrCode)`, `listMine`, `listForMerchant`, `findByToken` |
| `merchants` | `getMine`, `update` |
| `insights` | `getMerchantInsights()` |
| `storage` | `uploadListingImage(file)` → URL publik |

Kode error yang perlu ditangani UI: `insufficient_stock`, `claim_limit_exceeded`, `pickup_window_closed`,
`listing_unavailable`, `order_already_completed`, `order_cancelled`, `payment_not_confirmed`, `order_not_found`.

### Hal yang beda dari mock lama

- `OrderRecord.id` = **kode order** (`TG-123456`) supaya tampilan lama tetap enak dibaca. UUID di `orderId`.
  `orders.cancel()` menerima keduanya. Prefix `SB-` sudah diganti `TG-`.
- QR berisi `order.qrToken` (64 hex), **bukan** `id`. Merchant scan → `orders.complete(hasilScan)`.
  Input manual cadangan: ketik kode order (`TG-123456`) → `orders.complete(kode)` atau `orders.findByToken(kode)` untuk preview.
- `FoodListing.coordinates {x,y}` masih diisi (dihitung dari lat/lng) supaya peta persen lama tidak crash. Pakai `lat`/`lng` untuk Leaflet, lalu hapus.
- `FoodListing.pickupWindow` string dihitung dari `pickup_start/end` (jam Jakarta). Form merchant yang masih berupa teks
  `"19:30 – 21:00"` bisa pakai `parsePickupWindow(text)` → `{pickupStart, pickupEnd}`.
- Listing dihapus = `is_active = false` (riwayat order tetap utuh).
- COD otomatis jadi `Paid` ketika merchant menyelesaikan order (uang tunai dianggap diterima saat pickup).

## Catatan untuk Orang B (pembayaran e-wallet)

Alur yang sudah disiapkan di DB:

1. Consumer `orders.create({paymentMethod:'ewallet', ...})` → stok sudah dikunci, order `Awaiting Payment`.
2. Edge Function "create transaction" (dipanggil dengan JWT user): baca order lewat client user (RLS memastikan itu
   miliknya), buat transaksi Midtrans Snap dengan `order_id = order.code` dan `gross_amount = order.totalAmount`.
3. Edge Function webhook (verifikasi signature Midtrans dulu!), pakai **service role client**:
   - sukses (`settlement` / `capture`) → `rpc('mark_order_paid', { p_code, p_payment_ref })`
   - `deny` / `cancel` / `expire` → `rpc('fail_order_payment', { p_code })` (stok dikembalikan)
4. `mark_order_paid` idempoten. Kalau setelah dipanggil `payment_status` bukan `paid`, order sudah dibatalkan/kedaluwarsa
   (bayar telat) dan perlu refund manual.
5. `rpc('expire_unpaid_orders', { p_older_than: '15 minutes' })` membebaskan stok dari order yang tidak pernah dibayar;
   bisa dipanggil dari Edge Function terjadwal atau manual.

`complete_order` menolak order `Awaiting Payment` / `Failed` dengan `payment_not_confirmed`.

## Catatan untuk Orang C

- `listings.list()` / `listings.getNearby()` menggantikan `INITIAL_LISTINGS`; `orders.listMine()` menggantikan `INITIAL_ORDERS`.
- `orders.create()` menggantikan `handleCompleteOrder` (stok **tidak** dikurangi di client lagi).
  `orders.cancel()` mengembalikan stok di server.
- Setelah order, panggil ulang `listings.getNearby()` agar stok tampil terbaru.
- `auth.onAuthChange` + `auth.getCurrentUser()` untuk session yang bertahan setelah refresh.

## Keputusan & batasan

- **Anti dobel-klaim**: `create_order` memakai `UPDATE listings SET stock = stock - qty WHERE stock >= qty`, yang mengunci
  baris listing; request paralel diserialkan Postgres. Batas klaim per user dicek setelah lock. Bag gratis default max 1 per user.
- **Refund** tidak diimplementasi: membatalkan order e-wallet yang sudah `Paid` hanya mengembalikan stok.
- **Toko seed tidak punya pemilik** (lihat `dev/claim_demo_merchant.sql`). Koordinat seed adalah perkiraan area Jakarta.
- Consumer hanya bisa memesan dengan akun role `consumer` (akun merchant ditolak `only_consumer_can_order`).
- Stok yang diedit lewat form (`listings.update` dengan `stock`) dikonversi jadi selisih atomik; menekan simpan bersamaan
  dengan pesanan masuk tidak menimpa pesanan itu.

## Struktur

```
supabase/
  migrations/0001_schema.sql     tabel + trigger
  migrations/0002_rls.sql        RLS + grant per kolom
  migrations/0003_functions.sql  signup trigger, create/cancel/complete_order, insights, feed
  migrations/0004_storage.sql    bucket listing-images
  seed.sql                       data dari mockMarketplace.ts
  setup.sql                      GENERATED gabungan semuanya (npm run db:bundle)
  dev/reset.sql                  hapus semua objek (dev)
  dev/claim_demo_merchant.sql    jadikan akun merchant pemilik toko seed (dev)
src/api/                         kontrak untuk UI
scripts/race-test.mjs            uji concurrency + hak akses ke Supabase asli
```

Ubah SQL? Edit file di `migrations/`, lalu `npm run db:bundle` supaya `setup.sql` ikut berubah.
