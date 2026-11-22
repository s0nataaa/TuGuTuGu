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
