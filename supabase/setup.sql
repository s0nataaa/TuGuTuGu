-- GENERATED oleh scripts/bundle-sql.mjs -- jangan edit manual, edit file di supabase/migrations lalu `npm run db:bundle`.

-- >>>>>>>>>> supabase/migrations/0001_schema.sql
-- =====================================================================
-- 0001_schema.sql  --  tabel inti TuGuTuGu
-- Jalankan paling pertama (Supabase Dashboard -> SQL Editor).
-- =====================================================================

-- ---------- profiles: 1 baris per akun auth, menyimpan role ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('consumer', 'merchant')),
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now()
);

-- ---------- merchants: toko (owner_id null = toko demo hasil seed) ----------
create table public.merchants (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid unique references public.profiles (id) on delete set null,
  slug           text unique,                       -- hanya diisi untuk toko seed
  store_name     text not null check (length(trim(store_name)) > 0),
  category       text not null check (category in
                   ('Bakery', 'Meals', 'Drinks', 'Desserts', 'Groceries', 'Snacks & Deli')),
  business_type  text,                              -- mis. 'French Artisan Bakery'
  email          text,
  address        text not null default '',
  neighborhood   text not null default '',
  lat            double precision not null default -6.2088  check (lat between -90 and 90),
  lng            double precision not null default 106.8456 check (lng between -180 and 180),
  rating         numeric(2, 1) not null default 0 check (rating between 0 and 5),
  is_open        boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- listings: surplus bag ----------
create table public.listings (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants (id) on delete cascade,
  title               text not null check (length(trim(title)) > 0),
  description         text not null default '',
  category            text not null check (category in
                        ('Bakery', 'Meals', 'Drinks', 'Desserts', 'Groceries', 'Snacks & Deli')),
  whats_inside        text[] not null default '{}',
  dietary_tags        text[] not null default '{}',
  image_url           text,
  original_price      integer not null check (original_price >= 0),
  discounted_price    integer not null check (discounted_price >= 0),
  stock               integer not null default 0 check (stock >= 0),
  max_claim_per_user  integer check (max_claim_per_user > 0),
  lat                 double precision not null check (lat between -90 and 90),
  lng                 double precision not null check (lng between -180 and 180),
  pickup_address      text not null default '',
  neighborhood        text not null default '',
  pickup_start        timestamptz not null,
  pickup_end          timestamptz not null,
  -- statistik tampilan (hanya diubah server / seed, bukan merchant)
  rating              numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count        integer not null default 0,
  rescued_count       integer not null default 0,
  -- badge / filter
  is_midnight_deal    boolean not null default false,
  is_weekend_special  boolean not null default false,
  is_popular          boolean not null default false,
  is_new              boolean not null default false,
  is_best_deal        boolean not null default false,
  is_recommended      boolean not null default false,
  halal               boolean not null default false,
  vegetarian          boolean not null default false,
  nut_free            boolean not null default false,
  weight_kg           numeric(5, 2) check (weight_kg > 0),
  is_active           boolean not null default true,  -- soft delete
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (discounted_price <= original_price),
  check (pickup_end > pickup_start)
);

create index listings_merchant_idx on public.listings (merchant_id);
create index listings_open_idx     on public.listings (is_active, pickup_end);

-- ---------- orders ----------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,          -- ID yang dilihat manusia: TG-123456 / FREE-123456
  qr_token          text not null unique,          -- rahasia, isi QR (64 hex)
  consumer_id       uuid not null references public.profiles (id),
  listing_id        uuid not null references public.listings (id),
  merchant_id       uuid not null references public.merchants (id),
  quantity          integer not null check (quantity > 0),
  -- snapshot supaya riwayat order tidak berubah kalau listing diedit
  listing_title     text not null,
  listing_image     text,
  merchant_name     text not null,
  pickup_address    text not null default '',
  pickup_start      timestamptz not null,
  pickup_end        timestamptz not null,
  customer_name     text not null default '',
  unit_original_price integer not null,
  unit_paid_price     integer not null,
  total_amount        integer not null,
  total_savings       integer not null,
  payment_method    text not null check (payment_method in ('ewallet', 'cod', 'free')),
  ewallet_provider  text check (ewallet_provider in ('GoPay', 'OVO', 'DANA', 'ShopeePay')),
  payment_status    text not null check (payment_status in
                      ('awaiting_payment', 'paid', 'cod_pending', 'free', 'failed')),
  pickup_status     text not null default 'ready'
                      check (pickup_status in ('ready', 'completed', 'cancelled')),
  payment_ref       text,                          -- referensi gateway (Midtrans transaction_id)
  paid_at           timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((payment_method = 'free') = (payment_status = 'free'))
);

create index orders_consumer_idx on public.orders (consumer_id, created_at desc);
create index orders_merchant_idx on public.orders (merchant_id, created_at desc);
create index orders_listing_idx  on public.orders (listing_id);
create index orders_unpaid_idx   on public.orders (created_at) where payment_status = 'awaiting_payment';

-- ---------- updated_at otomatis ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------- listing baru: isi lat/lng/alamat dari toko kalau kosong ----------
create or replace function public.listings_fill_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  m public.merchants%rowtype;
begin
  select * into m from public.merchants where id = new.merchant_id;
  if found then
    new.lat            := coalesce(new.lat, m.lat);
    new.lng            := coalesce(new.lng, m.lng);
    if new.pickup_address is null or new.pickup_address = '' then
      new.pickup_address := m.address;
    end if;
    if new.neighborhood is null or new.neighborhood = '' then
      new.neighborhood := m.neighborhood;
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_fill_defaults_trg before insert on public.listings
  for each row execute function public.listings_fill_defaults();


-- >>>>>>>>>> supabase/migrations/0002_rls.sql
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


-- >>>>>>>>>> supabase/migrations/0003_functions.sql
-- =====================================================================
-- 0003_functions.sql  --  trigger signup, fungsi order atomik, view feed & insights
-- Semua fungsi security definer memakai search_path kosong -> semua objek
-- ditulis lengkap dengan nama schema (public.xxx).
--
-- Kode error (message) yang dilempar, dipakai src/api/errors.ts:
--   not_authenticated, forbidden, only_consumer_can_order, invalid_quantity,
--   invalid_payment_method, listing_not_found, listing_unavailable,
--   pickup_window_closed, insufficient_stock, claim_limit_exceeded,
--   order_not_found, order_not_cancellable, order_already_completed,
--   order_cancelled, payment_not_confirmed, stock_would_go_negative
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Signup: buat profile (+ toko kalau role merchant) dari metadata signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role     text  := case when v_meta ->> 'role' = 'merchant' then 'merchant' else 'consumer' end;
  v_category text  := case when v_meta ->> 'category' in
                        ('Bakery', 'Meals', 'Drinks', 'Desserts', 'Groceries', 'Snacks & Deli')
                      then v_meta ->> 'category' else 'Meals' end;
  v_num      text  := '^-?[0-9]+(\.[0-9]+)?$';
  v_lat      double precision := -6.2088;
  v_lng      double precision := 106.8456;
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(nullif(trim(v_meta ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(trim(v_meta ->> 'phone'), '')
  );

  if v_role = 'merchant' then
    if (v_meta ->> 'lat') ~ v_num then
      v_lat := least(greatest((v_meta ->> 'lat')::double precision, -90), 90);
    end if;
    if (v_meta ->> 'lng') ~ v_num then
      v_lng := least(greatest((v_meta ->> 'lng')::double precision, -180), 180);
    end if;

    insert into public.merchants
      (owner_id, store_name, category, business_type, email, address, neighborhood, lat, lng)
    values (
      new.id,
      coalesce(nullif(trim(v_meta ->> 'store_name'), ''), 'Toko Baru'),
      v_category,
      nullif(trim(v_meta ->> 'business_type'), ''),
      new.email,
      coalesce(trim(v_meta ->> 'address'), ''),
      coalesce(nullif(trim(v_meta ->> 'neighborhood'), ''), 'Jakarta'),
      v_lat,
      v_lng
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. create_order: klaim stok atomik, buat order + qr_token acak
--    Anti dobel-klaim: UPDATE ... WHERE stock >= qty mengunci baris listing,
--    jadi dua request bersamaan diserialkan oleh Postgres; yang kedua melihat
--    stok yang sudah berkurang dan gagal dengan 'insufficient_stock'.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_listing_id      uuid,
  p_quantity        integer,
  p_payment_method  text,
  p_ewallet_provider text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_profile  public.profiles%rowtype;
  v_listing  public.listings%rowtype;
  v_merchant public.merchants%rowtype;
  v_method   text;
  v_status   text;
  v_limit    integer;
  v_already  integer;
  v_code     text;
  v_order    public.orders%rowtype;
  v_tries    integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.role <> 'consumer' then
    raise exception 'only_consumer_can_order' using errcode = '42501';
  end if;

  -- Klaim stok (atomik). RETURNING memberi baris SETELAH update.
  update public.listings
     set stock = stock - p_quantity
   where id = p_listing_id
     and is_active
     and stock >= p_quantity
     and pickup_end > now()
  returning * into v_listing;

  if not found then
    -- cari tahu kenapa gagal supaya pesan error jelas
    select * into v_listing from public.listings where id = p_listing_id;
    if not found then
      raise exception 'listing_not_found';
    elsif not v_listing.is_active then
      raise exception 'listing_unavailable';
    elsif v_listing.pickup_end <= now() then
      raise exception 'pickup_window_closed';
    else
      raise exception 'insufficient_stock';
    end if;
  end if;

  -- Batas klaim per user (free claim default 1). Dicek SETELAH lock listing,
  -- jadi request paralel dari user yang sama tidak bisa menembusnya.
  v_limit := case
               when v_listing.discounted_price = 0 then coalesce(v_listing.max_claim_per_user, 1)
               else v_listing.max_claim_per_user
             end;
  if v_limit is not null then
    select coalesce(sum(quantity), 0) into v_already
      from public.orders
     where consumer_id = v_uid
       and listing_id = v_listing.id
       and pickup_status <> 'cancelled';
    if v_already + p_quantity > v_limit then
      raise exception 'claim_limit_exceeded';
    end if;
  end if;

  -- Metode & status pembayaran ditentukan server, bukan client.
  if v_listing.discounted_price = 0 then
    v_method := 'free';
    v_status := 'free';
  else
    if p_payment_method not in ('ewallet', 'cod') then
      raise exception 'invalid_payment_method';
    end if;
    v_method := p_payment_method;
    v_status := case when v_method = 'cod' then 'cod_pending' else 'awaiting_payment' end;
  end if;

  select * into v_merchant from public.merchants where id = v_listing.merchant_id;

  -- Kode order unik; ulangi kalau tabrakan (sangat jarang).
  loop
    v_code := (case when v_method = 'free' then 'FREE-' else 'TG-' end)
              || lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.orders (
        code, qr_token, consumer_id, listing_id, merchant_id, quantity,
        listing_title, listing_image, merchant_name, pickup_address,
        pickup_start, pickup_end, customer_name,
        unit_original_price, unit_paid_price, total_amount, total_savings,
        payment_method, ewallet_provider, payment_status, pickup_status
      ) values (
        v_code,
        replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        v_uid, v_listing.id, v_listing.merchant_id, p_quantity,
        v_listing.title, v_listing.image_url, v_merchant.store_name, v_listing.pickup_address,
        v_listing.pickup_start, v_listing.pickup_end, v_profile.full_name,
        v_listing.original_price, v_listing.discounted_price,
        v_listing.discounted_price * p_quantity,
        (v_listing.original_price - v_listing.discounted_price) * p_quantity,
        v_method,
        case when v_method = 'ewallet' then p_ewallet_provider else null end,
        v_status, 'ready'
      )
      returning * into v_order;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then
        raise;
      end if;
    end;
  end loop;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. cancel_order: consumer pemilik order ATAU merchant pemilik toko.
--    Mengunci baris order dulu (FOR UPDATE) supaya stok tidak dikembalikan 2x.
-- ---------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if not (
    v_order.consumer_id = v_uid
    or exists (select 1 from public.merchants m
                where m.id = v_order.merchant_id and m.owner_id = v_uid)
  ) then
    -- sama dengan 'tidak ada' supaya tidak membocorkan keberadaan order
    raise exception 'order_not_found';
  end if;

  if v_order.pickup_status <> 'ready' then
    raise exception 'order_not_cancellable';
  end if;

  update public.listings
     set stock = stock + v_order.quantity
   where id = v_order.listing_id;

  update public.orders
     set pickup_status = 'cancelled',
         cancelled_at  = now(),
         payment_status = case when payment_status = 'awaiting_payment' then 'failed'
                               else payment_status end
   where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. complete_order: hanya merchant pemilik toko. Terima isi QR (qr_token)
--    ATAU kode order (TG-123456) untuk input manual.
--    COD: saat selesai dianggap uang sudah diterima -> payment_status = paid.
-- ---------------------------------------------------------------------
create or replace function public.complete_order(p_token text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_token text := trim(coalesce(p_token, ''));
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select o.* into v_order
    from public.orders o
    join public.merchants m on m.id = o.merchant_id
   where m.owner_id = v_uid
     and v_token <> ''
     and (o.qr_token = v_token or o.code = upper(v_token))
   for update of o;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.pickup_status = 'completed' then
    raise exception 'order_already_completed';
  elsif v_order.pickup_status = 'cancelled' then
    raise exception 'order_cancelled';
  elsif v_order.payment_status in ('awaiting_payment', 'failed') then
    raise exception 'payment_not_confirmed';
  end if;

  update public.orders
     set pickup_status  = 'completed',
         completed_at   = now(),
         payment_status = case when payment_status = 'cod_pending' then 'paid'
                               else payment_status end,
         paid_at        = case when payment_status = 'cod_pending' then now()
                               else paid_at end
   where id = v_order.id
  returning * into v_order;

  update public.listings
     set rescued_count = rescued_count + v_order.quantity
   where id = v_order.listing_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. adjust_listing_stock: ubah stok relatif (+/-) secara atomik, hanya
--    merchant pemilik. Dipakai tombol +/- stok dan form edit listing.
-- ---------------------------------------------------------------------
create or replace function public.adjust_listing_stock(p_listing_id uuid, p_delta integer)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing public.listings%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.listings l
     set stock = l.stock + p_delta
    from public.merchants m
   where l.id = p_listing_id
     and m.id = l.merchant_id
     and m.owner_id = v_uid
     and l.stock + p_delta >= 0
  returning l.* into v_listing;

  if not found then
    if exists (select 1 from public.listings l
                 join public.merchants m on m.id = l.merchant_id
                where l.id = p_listing_id and m.owner_id = v_uid) then
      raise exception 'stock_would_go_negative';
    end if;
    raise exception 'listing_not_found';
  end if;

  return v_listing;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Hook pembayaran e-wallet (HANYA service_role: Edge Function / webhook Midtrans)
--    Midtrans order_id = orders.code.
-- ---------------------------------------------------------------------
create or replace function public.mark_order_paid(p_code text, p_payment_ref text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where code = p_code for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  -- Idempoten: webhook Midtrans bisa dikirim berulang.
  -- Kalau order sudah cancelled/failed (mis. expired lalu dibayar telat),
  -- order dikembalikan apa adanya -> caller cek payment_status (butuh refund manual).
  if v_order.payment_status = 'awaiting_payment' and v_order.pickup_status = 'ready' then
    update public.orders
       set payment_status = 'paid',
           paid_at        = now(),
           payment_ref    = coalesce(p_payment_ref, payment_ref)
     where id = v_order.id
    returning * into v_order;
  end if;

  return v_order;
end;
$$;

create or replace function public.fail_order_payment(p_code text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where code = p_code for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.payment_status = 'awaiting_payment' and v_order.pickup_status = 'ready' then
    update public.listings
       set stock = stock + v_order.quantity
     where id = v_order.listing_id;

    update public.orders
       set payment_status = 'failed',
           pickup_status  = 'cancelled',
           cancelled_at   = now()
     where id = v_order.id
    returning * into v_order;
  end if;

  return v_order;
end;
$$;

-- Bebaskan stok dari order e-wallet yang tidak pernah dibayar.
create or replace function public.expire_unpaid_orders(p_older_than interval default interval '15 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select code from public.orders
     where payment_status = 'awaiting_payment'
       and pickup_status = 'ready'
       and created_at < now() - p_older_than
  loop
    perform public.fail_order_payment(r.code);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Feed listing + pencarian terdekat (haversine, tanpa PostGIS)
-- ---------------------------------------------------------------------
create or replace view public.listings_feed
with (security_invoker = true) as
select
  l.*,
  m.store_name    as merchant_name,
  m.business_type as merchant_business_type,
  m.category      as merchant_category
from public.listings l
join public.merchants m on m.id = l.merchant_id;

revoke all on public.listings_feed from anon, authenticated;
grant select on public.listings_feed to anon, authenticated;

create or replace function public.listings_nearby(
  p_lat         double precision,
  p_lng         double precision,
  p_radius_km   double precision default 15,
  p_only_open   boolean default false
)
returns table (listing jsonb, distance_km double precision)
language sql
stable
set search_path = ''
as $$
  select to_jsonb(f) as listing, d.km as distance_km
    from public.listings_feed f
   cross join lateral (
     select 6371 * 2 * asin(least(1.0::float8, sqrt(
              power(sin(radians(f.lat - p_lat) / 2), 2)
              + cos(radians(p_lat)) * cos(radians(f.lat))
                * power(sin(radians(f.lng - p_lng) / 2), 2)
            ))) as km
   ) d
   where f.is_active
     and d.km <= p_radius_km
     and (not p_only_open or (f.stock > 0 and f.pickup_end > now()))
   order by d.km asc, f.pickup_end asc;
$$;

grant execute on function public.listings_nearby(double precision, double precision, double precision, boolean)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Insights merchant (view; security_invoker -> RLS orders berlaku,
--    plus filter owner_id = user yang login)
-- ---------------------------------------------------------------------
create or replace view public.merchant_insights
with (security_invoker = true) as
select
  m.id as merchant_id,
  -- uang yang sudah pasti masuk (e-wallet paid + COD yang sudah diambil)
  coalesce(sum(o.total_amount) filter
    (where o.payment_status = 'paid' and o.pickup_status <> 'cancelled'), 0)::bigint   as total_revenue,
  -- COD yang masih menunggu uang tunai
  coalesce(sum(o.total_amount) filter
    (where o.payment_status = 'cod_pending' and o.pickup_status = 'ready'), 0)::bigint as pending_cod_total,
  (count(o.id) filter
    (where o.payment_status = 'cod_pending' and o.pickup_status = 'ready'))::int       as pending_cod_count,
  -- order siap diambil (sudah dibayar / COD / gratis)
  (count(o.id) filter
    (where o.pickup_status = 'ready'
       and o.payment_status in ('paid', 'cod_pending', 'free')))::int                  as ready_for_pickup_count,
  -- bag terjual/dipesan (tidak termasuk batal) dan bag benar-benar diambil
  coalesce(sum(o.quantity) filter (where o.pickup_status <> 'cancelled'), 0)::int      as bags_sold,
  coalesce(sum(o.quantity) filter (where o.pickup_status = 'completed'), 0)::int       as bags_rescued,
  -- dampak lingkungan dari bag yang sudah diambil (default 0.85 kg/bag, 2.5 kg CO2e per kg)
  round(coalesce(sum(o.quantity * coalesce(l.weight_kg, 0.85))
    filter (where o.pickup_status = 'completed'), 0), 1)::numeric                      as food_kg_rescued,
  round(coalesce(sum(o.quantity * coalesce(l.weight_kg, 0.85))
    filter (where o.pickup_status = 'completed'), 0) * 2.5, 1)::numeric                as co2e_kg_prevented,
  -- bauran pembayaran (order tidak batal)
  (count(o.id) filter (where o.payment_method = 'ewallet' and o.pickup_status <> 'cancelled'))::int as ewallet_orders,
  (count(o.id) filter (where o.payment_method = 'cod'     and o.pickup_status <> 'cancelled'))::int as cod_orders,
  (count(o.id) filter (where o.payment_method = 'free'    and o.pickup_status <> 'cancelled'))::int as free_orders
from public.merchants m
left join public.orders   o on o.merchant_id = m.id
left join public.listings l on l.id = o.listing_id
where m.owner_id = (select auth.uid())
group by m.id;

revoke all on public.merchant_insights from anon, authenticated;
grant select on public.merchant_insights to authenticated;

-- ---------------------------------------------------------------------
-- 9. Util demo: geser jendela pickup toko seed ke "hari ini" (Asia/Jakarta)
-- ---------------------------------------------------------------------
create or replace function public.jakarta_today_at(t time)
returns timestamptz
language sql
stable
as $$
  select (((now() at time zone 'Asia/Jakarta')::date + t) at time zone 'Asia/Jakarta');
$$;

create or replace function public.reset_demo_pickup_windows()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.listings l
     set pickup_start = public.jakarta_today_at((l.pickup_start at time zone 'Asia/Jakarta')::time),
         pickup_end   = public.jakarta_today_at((l.pickup_end   at time zone 'Asia/Jakarta')::time)
    from public.merchants m
   where m.id = l.merchant_id
     and m.slug is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Hak eksekusi: default Postgres memberi EXECUTE ke PUBLIC, cabut dulu.
-- ---------------------------------------------------------------------
revoke execute on function
  public.create_order(uuid, integer, text, text),
  public.cancel_order(uuid),
  public.complete_order(text),
  public.adjust_listing_stock(uuid, integer),
  public.mark_order_paid(text, text),
  public.fail_order_payment(text),
  public.expire_unpaid_orders(interval),
  public.reset_demo_pickup_windows()
  from public, anon, authenticated;

grant execute on function public.create_order(uuid, integer, text, text)   to authenticated;
grant execute on function public.cancel_order(uuid)                        to authenticated;
grant execute on function public.complete_order(text)                      to authenticated;
grant execute on function public.adjust_listing_stock(uuid, integer)       to authenticated;

-- khusus server (Edge Function pakai service role key)
grant execute on function public.mark_order_paid(text, text)               to service_role;
grant execute on function public.fail_order_payment(text)                  to service_role;
grant execute on function public.expire_unpaid_orders(interval)            to service_role;


-- >>>>>>>>>> supabase/migrations/0004_storage.sql
-- =====================================================================
-- 0004_storage.sql  --  bucket foto listing
-- Struktur path: listing-images/<user_id>/<nama-file>
-- Baca: publik. Tulis: hanya merchant, hanya ke folder miliknya.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "listing images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'listing-images');

create policy "merchants upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role = 'merchant')
  );

create policy "merchants update own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "merchants delete own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- >>>>>>>>>> supabase/seed.sql
-- =====================================================================
-- seed.sql  --  data demo dari src/data/mockMarketplace.ts
-- Aman dijalankan ulang (ON CONFLICT DO NOTHING / DO UPDATE).
-- * Toko seed TIDAK punya owner (owner_id null): hanya jadi inventori
--   untuk consumer. Mau punya dashboard merchant berisi data? Lihat
--   supabase/dev/claim_demo_merchant.sql
-- * Koordinat adalah PERKIRAAN area Jakarta, bukan hasil geocoding.
-- * Jendela pickup di-set ke HARI INI (Asia/Jakarta). Besoknya sudah lewat ->
--   jalankan:  select public.reset_demo_pickup_windows();
-- =====================================================================

insert into public.merchants (id, slug, store_name, category, business_type, email, address, neighborhood, lat, lng, rating) values
  ('11111111-1111-4111-8111-000000000001', 'm-boulangerie', 'Atelier Boulangerie', 'Bakery', 'French Artisan Bakery', 'partner@atelierboulangerie.id', 'Jl. Senopati No. 42, Kebayoran Baru', 'Senopati', -6.2335, 106.8095, 4.9),
  ('11111111-1111-4111-8111-000000000002', 'm-greenharvest', 'GreenHarvest Organic', 'Groceries', 'Organic Grocer', null, 'Jl. Gunawarman No. 18, Kebayoran Baru', 'Senopati', -6.2385, 106.803, 4.9),
  ('11111111-1111-4111-8111-000000000003', 'm-yokohama', 'Kuro Midnight Kitchen', 'Meals', 'Late-Night Izakaya', null, 'SCBD Lot 14, Ground Promenade', 'SCBD', -6.225, 106.8085, 4.8),
  ('11111111-1111-4111-8111-000000000004', 'm-sakura', 'Sora Bento Bar', 'Meals', 'Japanese Dining', null, 'Pacific Place Basement 1, Unit 12', 'SCBD', -6.2243, 106.8097, 4.9),
  ('11111111-1111-4111-8111-000000000005', 'm-kissa', 'Kissa Roastery & Bake', 'Desserts', 'Specialty Cafe', null, 'Jl. Kemang Raya No. 79', 'Kemang', -6.2745, 106.8138, 4.8),
  ('11111111-1111-4111-8111-000000000006', 'm-solgrain', 'Sol Grain Kitchen', 'Meals', 'Healthy Bowls', null, 'Jl. HOS Cokroaminoto No. 62', 'Menteng', -6.199, 106.83, 4.7),
  ('11111111-1111-4111-8111-000000000007', 'm-maison', 'Maison Éclair', 'Desserts', 'French Patisserie', null, 'Jl. Suryo No. 25, Kebayoran Baru', 'Senopati', -6.244, 106.804, 5),
  ('11111111-1111-4111-8111-000000000008', 'm-rempah', 'Dapur Rempah Nusantara', 'Meals', 'Indonesian Kitchen', null, 'Jl. Bangka Raya No. 11', 'Kemang', -6.26, 106.82, 4.8),
  ('11111111-1111-4111-8111-000000000009', 'm-dailybatch', 'The Daily Batch Coffee', 'Drinks', 'Coffee & Tea Bar', null, 'Jl. Wolter Monginsidi No. 55', 'Senopati', -6.2405, 106.8015, 4.7),
  ('11111111-1111-4111-8111-000000000010', 'm-breadberry', 'Bread & Berry Deli', 'Snacks & Deli', 'Artisan Deli & Bakery', null, 'Jl. Teuku Umar No. 14, Menteng', 'Menteng', -6.2005, 106.8335, 4.9)
on conflict (id) do update set
  store_name = excluded.store_name, category = excluded.category, business_type = excluded.business_type,
  address = excluded.address, neighborhood = excluded.neighborhood, lat = excluded.lat, lng = excluded.lng, rating = excluded.rating;

insert into public.listings (
  id, merchant_id, title, description, category, whats_inside, dietary_tags, image_url,
  original_price, discounted_price, stock, max_claim_per_user, lat, lng, pickup_address, neighborhood,
  pickup_start, pickup_end, rating, review_count, rescued_count,
  is_midnight_deal, is_weekend_special, is_popular, is_new, is_best_deal, is_recommended,
  halal, vegetarian, nut_free, weight_kg
) values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'Morning Bakehouse Surprise Bag', 'A curated assortment of freshly baked butter croissants, pain au chocolat, and half a country sourdough loaf from today’s morning batch.', 'Bakery',
   array['2× Butter Croissants', '1× Pain au Chocolat', '1× Half Country Sourdough']::text[], array['Vegetarian', 'Baked Today', 'Halal']::text[], '/src/assets/images/bakery_croissants_1795103366271.jpg',
   140000, 35000, 4, null, -6.2335, 106.8095, 'Jl. Senopati No. 42, Kebayoran Baru', 'Senopati',
   public.jakarta_today_at('19:30'), public.jakarta_today_at('21:00'), 4.9, 318, 1240,
   false, false, true, false, true, true,
   true, true, true, 0.8),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000002', 'Community Zero-Waste Pantry Share', 'Surplus organic heirloom tomatoes, ripe avocados, kale, and artisan bread shared free of charge before store reset.', 'Groceries',
   array['Seasonal Organic Greens', '2× Ripe Avocados', 'Heirloom Tomatoes', '1× Rustic Loaf']::text[], array['Vegan', 'Zero Cost', 'Halal']::text[], '/src/assets/images/fresh_groceries_box_1795103366812.jpg',
   85000, 0, 3, 1, -6.2385, 106.803, 'Jl. Gunawarman No. 18, Kebayoran Baru', 'Senopati',
   public.jakarta_today_at('18:00'), public.jakarta_today_at('19:30'), 4.9, 204, 890,
   false, false, true, false, false, false,
   true, true, true, 1.4),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000003', 'Midnight Ramen & Bao Surplus Box', 'Hot late-night rescue pack featuring braised chashu ramen kit or steamed pork-free teriyaki bao buns packed fresh at closing.', 'Meals',
   array['1× Hot Ramen Bowl Kit', '2× Steamed Bao Buns', 'Pickled Ginger & Chili Oil']::text[], array['No Pork', 'Hot Meal', 'Halal']::text[], '/src/assets/images/midnight_deals_banner_1795103367471.jpg',
   135000, 29000, 2, null, -6.225, 106.8085, 'SCBD Lot 14, Ground Promenade', 'SCBD',
   public.jakarta_today_at('22:00'), public.jakarta_today_at('23:45'), 4.8, 162, 640,
   true, false, false, false, true, false,
   true, false, false, 0.9),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000004', 'Sushi & Chicken Teriyaki Bento', 'Chef-prepared dinner bento with salmon nigiri, glazed chicken teriyaki, tamagoyaki, edamame, and steamed Japanese rice.', 'Meals',
   array['4× Salmon Nigiri', 'Chicken Teriyaki', 'Tamagoyaki & Edamame']::text[], array['Halal Friendly', 'Fresh Fish']::text[], '/src/assets/images/japanese_bento_1795103366733.jpg',
   160000, 16000, 2, null, -6.2243, 106.8097, 'Pacific Place Basement 1, Unit 12', 'SCBD',
   public.jakarta_today_at('20:30'), public.jakarta_today_at('21:30'), 4.9, 412, 1580,
   false, false, true, false, true, true,
   true, false, true, 0.7),
  ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000005', 'Basque Cheesecake & Matcha Duo', 'Creamy caramelized Basque burnt cheesecake slice paired with an iced ceremonial matcha latte.', 'Desserts',
   array['1× Basque Cheesecake Slice', '1× Iced Matcha Latte']::text[], array['Vegetarian', 'Halal']::text[], '/src/assets/images/artisan_coffee_cake_1795103366293.jpg',
   110000, 33000, 5, null, -6.2745, 106.8138, 'Jl. Kemang Raya No. 79', 'Kemang',
   public.jakarta_today_at('19:00'), public.jakarta_today_at('20:30'), 4.8, 194, 520,
   false, true, true, false, false, true,
   true, true, true, 0.6),
  ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000001', 'Free End-of-Day Croissant Pack', 'Complimentary bakery rescue bag for community members: 3 surplus butter croissants & cinnamon rolls baked this morning.', 'Bakery',
   array['2× Classic Butter Croissants', '1× Cardamom Cinnamon Roll']::text[], array['Vegetarian', 'Zero Cost', 'Halal']::text[], '/src/assets/images/bakery_croissants_1795103366271.jpg',
   75000, 0, 2, 1, -6.2335, 106.8095, 'Jl. Senopati No. 42, Kebayoran Baru', 'Senopati',
   public.jakarta_today_at('20:45'), public.jakarta_today_at('21:15'), 4.9, 89, 340,
   true, false, false, false, false, false,
   true, true, true, 0.5),
  ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000006', 'Harvest Chicken & Avocado Bowl', 'Wholesome grilled herb chicken, roasted sweet potato, avocado, crispy chickpeas, and lemon tahini dressing.', 'Meals',
   array['1× Full Harvest Grain Bowl', 'Side Lemon Tahini Dressing']::text[], array['High Protein', 'Gluten Free', 'Halal']::text[], '/src/assets/images/mediterranean_bowl_1795103366660.jpg',
   98000, 12000, 3, null, -6.199, 106.83, 'Jl. HOS Cokroaminoto No. 62', 'Menteng',
   public.jakarta_today_at('20:00'), public.jakarta_today_at('21:30'), 4.7, 147, 410,
   false, false, false, true, true, false,
   true, false, true, 0.7),
  ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000007', 'Patisserie Eclairs & Fruit Tart Box', 'Delicate dark chocolate eclairs, seasonal berry tarts, and assorted macarons curated before counter close.', 'Desserts',
   array['2× Dark Chocolate Eclairs', '1× Berry Custard Tart', '2× French Macarons']::text[], array['Vegetarian', 'Handcrafted']::text[], '/src/assets/images/chocolate_desserts_1795103367438.jpg',
   180000, 18000, 1, null, -6.244, 106.804, 'Jl. Suryo No. 25, Kebayoran Baru', 'Senopati',
   public.jakarta_today_at('20:30'), public.jakarta_today_at('22:00'), 5, 276, 920,
   false, true, true, false, false, false,
   true, true, false, 0.6),
  ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000008', 'Nasi Campur Rendang & Sate Lilit', 'Aromatic Bali-inspired nasi campur box with slow-braised beef rendang, sate lilit, crispy tempeh, and sambal matah.', 'Meals',
   array['Beef Rendang Portion', '2× Sate Lilit', 'Crispy Tempeh & Sambal Matah']::text[], array['Halal', 'Chef Special']::text[], '/src/assets/images/indonesian_nasi_bowl_1795103366543.jpg',
   95000, 24000, 6, null, -6.26, 106.82, 'Jl. Bangka Raya No. 11', 'Kemang',
   public.jakarta_today_at('21:00'), public.jakarta_today_at('22:30'), 4.8, 310, 1120,
   true, false, false, false, false, true,
   true, false, true, 0.9),
  ('22222222-2222-4222-8222-000000000010', '11111111-1111-4111-8111-000000000009', 'Dual Oat Latte & Matcha Rescue Cups', 'Two chilled specialty drinks prepared from surplus cold brew & ceremonial matcha batch before closing.', 'Drinks',
   array['1× Iced Spanish Oat Latte', '1× Iced Ceremonial Matcha Milk Tea']::text[], array['Plant-Based Oat Milk', 'Halal']::text[], '/src/assets/images/craft_boba_drinks_1795103366539.jpg',
   88000, 22000, 7, null, -6.2405, 106.8015, 'Jl. Wolter Monginsidi No. 55', 'Senopati',
   public.jakarta_today_at('19:30'), public.jakarta_today_at('21:00'), 4.7, 128, 470,
   false, false, false, true, false, true,
   true, true, true, 0.7),
  ('22222222-2222-4222-8222-000000000011', '11111111-1111-4111-8111-000000000009', 'Free Evening Cold Brew & Tea Bottles', 'Zero-cost surplus cold-pressed oat lattes and iced herbal tea bottles available to rescue before 10 PM.', 'Drinks',
   array['2× Chilled Cold Brew / Tea Bottles (350ml)']::text[], array['Dairy Free Option', 'Zero Cost', 'Halal']::text[], '/src/assets/images/craft_boba_drinks_1795103366539.jpg',
   64000, 0, 4, 1, -6.2405, 106.8015, 'Jl. Wolter Monginsidi No. 55', 'Senopati',
   public.jakarta_today_at('21:15'), public.jakarta_today_at('22:00'), 4.8, 74, 280,
   true, false, false, false, false, false,
   true, true, true, 0.7),
  ('22222222-2222-4222-8222-000000000012', '11111111-1111-4111-8111-000000000010', 'Weekend Family Deli & Sourdough Bundle', 'Generous weekend surprise bag stuffed with chicken Caesar wraps, sourdough boule, croissants, and fresh seasonal berries.', 'Snacks & Deli',
   array['2× Gourmet Deli Wraps', '1× Whole Sourdough Boule', '3× Mini Croissants', 'Fresh Berries']::text[], array['Family Size', 'Weekend Only', 'Halal']::text[], '/src/assets/images/hero_surplus_bag_1795103366612.jpg',
   240000, 48000, 3, null, -6.2005, 106.8335, 'Jl. Teuku Umar No. 14, Menteng', 'Menteng',
   public.jakarta_today_at('18:00'), public.jakarta_today_at('20:30'), 4.9, 215, 770,
   false, true, false, false, true, false,
   true, false, true, 1.5),
  ('22222222-2222-4222-8222-000000000013', '11111111-1111-4111-8111-000000000010', 'Late-Night Artisan Bread & Brioche Bag', 'Evening rescue bag with warm brioche buns, herb focaccia slices, and chocolate danishes ready for midnight pickup.', 'Bakery',
   array['2× Brioche Buns', '2× Rosemary Focaccia', '1× Chocolate Danish']::text[], array['Vegetarian', 'Halal']::text[], '/src/assets/images/bakery_croissants_1795103366271.jpg',
   90000, 18000, 2, null, -6.2005, 106.8335, 'Jl. Teuku Umar No. 14, Menteng', 'Menteng',
   public.jakarta_today_at('22:00'), public.jakarta_today_at('23:30'), 4.8, 118, 412,
   true, false, false, true, false, false,
   true, true, true, 0.7),
  ('22222222-2222-4222-8222-000000000014', '11111111-1111-4111-8111-000000000008', 'Free Warm Bento Community Portion', 'Free warm home-style meal portion with steamed rice, braised tempeh, sautéed greens, and spiced egg for anyone in need.', 'Meals',
   array['1× Complete Warm Meal Box', 'Sambal Packet']::text[], array['Halal', 'Zero Cost']::text[], '/src/assets/images/indonesian_nasi_bowl_1795103366543.jpg',
   55000, 0, 5, 1, -6.26, 106.82, 'Jl. Bangka Raya No. 11', 'Kemang',
   public.jakarta_today_at('20:00'), public.jakarta_today_at('21:30'), 4.9, 152, 615,
   false, false, false, false, false, false,
   true, true, true, 0.6),
  ('22222222-2222-4222-8222-000000000015', '11111111-1111-4111-8111-000000000005', 'Weekend Gelato & Cake Tasting Box', 'Assorted weekend patisserie slices including Basque cheesecake, tiramisu cup, and matcha roll cake.', 'Desserts',
   array['1× Basque Cheesecake', '1× Tiramisu Cup', '1× Matcha Roll Slice']::text[], array['Vegetarian', 'Weekend Only']::text[], '/src/assets/images/chocolate_desserts_1795103367438.jpg',
   155000, 39000, 4, null, -6.2745, 106.8138, 'Jl. Kemang Raya No. 79', 'Kemang',
   public.jakarta_today_at('19:30'), public.jakarta_today_at('21:30'), 4.8, 97, 305,
   false, true, false, true, false, false,
   true, true, false, 0.6)
on conflict (id) do nothing;

