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
