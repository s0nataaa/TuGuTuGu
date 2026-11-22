import type { MerchantAccount, FoodCategory } from '../types/marketplace';
import type { MerchantRow, ProfileRow } from './db';
import { ApiError, toApiError, unwrap } from './errors';
import { rowToMerchant } from './mappers';
import { supabase } from './supabase';

export type UserRole = 'consumer' | 'merchant';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string | null;
  /** Terisi kalau role = merchant. */
  merchant: MerchantAccount | null;
}

export interface SignUpResult {
  /** null kalau Supabase meminta konfirmasi email dulu (belum ada session). */
  user: AppUser | null;
  needsEmailConfirmation: boolean;
}

async function loadAppUser(userId: string, email: string): Promise<AppUser> {
  const profile = unwrap<ProfileRow>(
    await supabase.from('profiles').select('*').eq('id', userId).single()
  );

  let merchant: MerchantAccount | null = null;
  if (profile.role === 'merchant') {
    const row = unwrap<MerchantRow | null>(
      await supabase.from('merchants').select('*').eq('owner_id', userId).maybeSingle()
    );
    merchant = row ? rowToMerchant(row, email) : null;
  }

  return {
    id: userId,
    email,
    role: profile.role,
    fullName: profile.full_name,
    phone: profile.phone,
    merchant,
  };
}

async function finishSignUp(
  res: Awaited<ReturnType<typeof supabase.auth.signUp>>
): Promise<SignUpResult> {
  if (res.error) throw toApiError(res.error);
  const { user, session } = res.data;
  // Email sudah terdaftar + konfirmasi email aktif: Supabase mengembalikan user
  // "palsu" dengan identities kosong (anti-enumerasi).
  if (user && Array.isArray(user.identities) && user.identities.length === 0) {
    throw new ApiError('email_taken');
  }
  if (!session || !user) return { user: null, needsEmailConfirmation: true };
  return { user: await loadAppUser(user.id, user.email ?? ''), needsEmailConfirmation: false };
}

export async function signUpConsumer(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<SignUpResult> {
  return finishSignUp(
    await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { role: 'consumer', full_name: input.fullName, phone: input.phone ?? '' } },
    })
  );
}

/** Role & toko dibuat atomik oleh trigger database dari metadata ini. */
export async function signUpMerchant(input: {
  email: string;
  password: string;
  storeName: string;
  category: FoodCategory;
  address: string;
  neighborhood?: string;
  businessType?: string;
  fullName?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}): Promise<SignUpResult> {
  return finishSignUp(
    await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          role: 'merchant',
          full_name: input.fullName ?? input.storeName,
          phone: input.phone ?? '',
          store_name: input.storeName,
          category: input.category,
          business_type: input.businessType ?? '',
          address: input.address,
          neighborhood: input.neighborhood ?? '',
          lat: input.lat != null ? String(input.lat) : '',
          lng: input.lng != null ? String(input.lng) : '',
        },
      },
    })
  );
}

/** Kalau `expectedRole` diisi dan tidak cocok, session langsung ditutup dan dilempar 'wrong_role'. */
export async function signIn(
  email: string,
  password: string,
  expectedRole?: UserRole
): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toApiError(error);
  const user = await loadAppUser(data.user.id, data.user.email ?? email);
  if (expectedRole && user.role !== expectedRole) {
    await supabase.auth.signOut();
    throw new ApiError('wrong_role');
  }
  return user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toApiError(error);
}

/** User yang sedang login (session bertahan setelah refresh), atau null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  try {
    return await loadAppUser(u.id, u.email ?? '');
  } catch {
    return null;
  }
}

/** Dengarkan login/logout. Mengembalikan fungsi unsubscribe. */
export function onAuthChange(cb: (user: AppUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      cb(null);
      return;
    }
    // Jangan panggil supabase langsung di dalam callback ini (bisa deadlock).
    setTimeout(() => {
      loadAppUser(session.user.id, session.user.email ?? '')
        .then(cb)
        .catch(() => cb(null));
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function updateProfile(patch: { fullName?: string; phone?: string }): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError('not_authenticated');
  const update: Record<string, string> = {};
  if (patch.fullName !== undefined) update.full_name = patch.fullName;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (Object.keys(update).length === 0) return;
  unwrap(await supabase.from('profiles').update(update).eq('id', id).select('id').single());
}
