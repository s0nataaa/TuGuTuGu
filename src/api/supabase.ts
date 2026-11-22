import { createClient } from '@supabase/supabase-js';
import { ApiError } from './errors';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set. Salin .env.example ke .env lalu isi (lihat supabase/README.md).'
  );
}

/** Satu client untuk seluruh app. Session disimpan di localStorage & di-refresh otomatis. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** id user yang sedang login, atau lempar ApiError('not_authenticated'). */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError('not_authenticated');
  return id;
}
