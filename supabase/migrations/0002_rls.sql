-- =====================================================================
-- 0002_rls.sql  --  Row Level Security + grant per kolom
-- Prinsip: client TIDAK pernah menulis tabel orders langsung.
-- Semua perubahan order lewat fungsi di 0003 (security definer).
-- =====================================================================

alter table public.profiles  enable row level security;
alter table public.merchants enable row level security;
alter table public.listings  enable row level security;
alter table public.orders    enable row level security;

-- Mulai dari nol: cabut semua hak default, lalu beri yang perlu saja.
revoke all on public.profiles, public.merchants, public.listings, public.orders
  from anon, authenticated;

-- ---------------- profiles ----------------
-- Hanya baca & ubah profil sendiri. Kolom role / id tidak bisa diubah client.
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------- merchants ----------------
-- Info toko bersifat publik (consumer perlu nama toko). Insert hanya lewat
-- trigger signup. Merchant hanya boleh ubah toko miliknya, kolom terbatas.
grant select on public.merchants to anon, authenticated;
grant update (store_name, category, business_type, email, address,
              neighborhood, lat, lng, is_open)
  on public.merchants to authenticated;

create policy merchants_select_all on public.merchants
  for select to anon, authenticated
  using (true);

create policy merchants_update_own on public.merchants
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------- listings ----------------
-- Semua orang bisa lihat listing aktif; merchant juga lihat miliknya yang nonaktif.
-- stock TIDAK ada di grant update: ubah stok hanya via adjust_listing_stock()
-- supaya tidak menimpa pengurangan stok dari order yang sedang berjalan.
grant select on public.listings to anon, authenticated;
grant insert (merchant_id, title, description, category, whats_inside, dietary_tags,
              image_url, original_price, discounted_price, stock, max_claim_per_user,
              lat, lng, pickup_address, neighborhood, pickup_start, pickup_end,
              is_midnight_deal, is_weekend_special, halal, vegetarian, nut_free,
              weight_kg, is_active)
  on public.listings to authenticated;
grant update (title, description, category, whats_inside, dietary_tags,
              image_url, original_price, discounted_price, max_claim_per_user,
              lat, lng, pickup_address, neighborhood, pickup_start, pickup_end,
              is_midnight_deal, is_weekend_special, halal, vegetarian, nut_free,
              weight_kg, is_active)
  on public.listings to authenticated;

create policy listings_select on public.listings
  for select to anon, authenticated
  using (
    is_active
    or merchant_id in (select id from public.merchants where owner_id = (select auth.uid()))
  );

create policy listings_insert_own on public.listings
  for insert to authenticated
  with check (
    merchant_id in (select id from public.merchants where owner_id = (select auth.uid()))
  );

create policy listings_update_own on public.listings
  for update to authenticated
  using (
    merchant_id in (select id from public.merchants where owner_id = (select auth.uid()))
  )
  with check (
    merchant_id in (select id from public.merchants where owner_id = (select auth.uid()))
  );

-- ---------------- orders ----------------
-- Read-only untuk client: consumer lihat order miliknya, merchant lihat order tokonya.
grant select on public.orders to authenticated;

create policy orders_select on public.orders
  for select to authenticated
  using (
    consumer_id = (select auth.uid())
    or merchant_id in (select id from public.merchants where owner_id = (select auth.uid()))
  );
