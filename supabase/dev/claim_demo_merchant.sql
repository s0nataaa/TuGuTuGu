-- =====================================================================
-- DEV ONLY. Jalankan manual di SQL Editor (jangan masuk migrasi).
-- Menjadikan akun merchant yang sudah daftar lewat app sebagai pemilik
-- toko seed, supaya dashboard merchant langsung berisi listing demo.
--
-- 1. Daftar dulu akun merchant lewat app (atau Authentication -> Users).
-- 2. Ganti email & slug di bawah, jalankan.
-- =====================================================================
do $$
declare
  v_email text := 'merchant-demo@example.com';   -- <- ganti
  v_slug  text := 'm-boulangerie';               -- <- toko seed yang diklaim
  v_uid   uuid;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'user % tidak ditemukan', v_email;
  end if;

  if not exists (select 1 from public.profiles where id = v_uid and role = 'merchant') then
    raise exception 'akun % bukan merchant (role harus merchant saat signup)', v_email;
  end if;

  -- toko kosong yang dibuat otomatis saat signup dibuang dulu (owner_id unik)
  delete from public.merchants
   where owner_id = v_uid
     and slug is null
     and not exists (select 1 from public.orders o where o.merchant_id = merchants.id)
     and not exists (select 1 from public.listings l where l.merchant_id = merchants.id);

  update public.merchants set owner_id = v_uid where slug = v_slug;
  if not found then
    raise exception 'toko seed % tidak ditemukan', v_slug;
  end if;
end $$;
