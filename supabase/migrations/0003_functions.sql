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
