-- =====================================================================
-- DEV ONLY. Hapus SEMUA objek TuGuTuGu (data ikut hilang) supaya migrasi
-- bisa dijalankan ulang dari 0001. Akun di auth.users TIDAK dihapus.
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.merchant_insights;
drop view if exists public.listings_feed;

drop table if exists public.orders    cascade;
drop table if exists public.listings  cascade;
drop table if exists public.merchants cascade;
drop table if exists public.profiles  cascade;

drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();
drop function if exists public.listings_fill_defaults();
drop function if exists public.create_order(uuid, integer, text, text);
drop function if exists public.cancel_order(uuid);
drop function if exists public.complete_order(text);
drop function if exists public.adjust_listing_stock(uuid, integer);
drop function if exists public.mark_order_paid(text, text);
drop function if exists public.fail_order_payment(text);
drop function if exists public.expire_unpaid_orders(interval);
drop function if exists public.listings_nearby(double precision, double precision, double precision, boolean);
drop function if exists public.jakarta_today_at(time);
drop function if exists public.reset_demo_pickup_windows();

drop policy if exists "listing images are publicly readable" on storage.objects;
drop policy if exists "merchants upload to own folder"       on storage.objects;
drop policy if exists "merchants update own images"          on storage.objects;
drop policy if exists "merchants delete own images"          on storage.objects;
-- bucket dihapus lewat Dashboard -> Storage kalau perlu (SQL delete ke storage.buckets diblokir Supabase).
