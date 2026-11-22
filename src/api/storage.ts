import { ApiError, toApiError } from './errors';
import { requireUserId, supabase } from './supabase';

const BUCKET = 'listing-images';
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Upload foto listing (merchant). Mengembalikan URL publik untuk dipakai
 * sebagai `imageUrl` di listings.create/update.
 */
export async function uploadListingImage(file: File | Blob): Promise<string> {
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) throw new ApiError('invalid_image');

  const uid = await requireUserId();
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw toApiError(error);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
