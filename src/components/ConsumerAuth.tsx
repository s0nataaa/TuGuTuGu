import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, Phone, User, X } from 'lucide-react';
import { CustomerProfileData } from './ConsumerProfile';

interface ConsumerAuthProps {
  defaultEmail: string;
  onAuthenticate: (profile: CustomerProfileData) => void;
}

type AuthTab = 'login' | 'register';

const SIMULATED_GOOGLE_ACCOUNTS: CustomerProfileData[] = [
  {
    name: 'Nadia Pratama',
    email: 'nadia.pratama@gmail.com',
    phone: '+62 812-8842-4890',
  },
  {
    name: 'Raditya Indra',
    email: 'raditya.indra@gmail.com',
    phone: '+62 813-9012-7741',
  },
];

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const ConsumerAuth: React.FC<ConsumerAuthProps> = ({
  defaultEmail,
  onAuthenticate,
}) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState(defaultEmail || 'nadia.pratama@tugutugu.id');
  const [password, setPassword] = useState('tugutugu2026');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loadingMethod, setLoadingMethod] = useState<'form' | 'google' | null>(null);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (password.length < 4) {
      setError('Kata sandi minimal 4 karakter.');
      return;
    }
    if (tab === 'register' && !fullName.trim()) {
      setError('Masukkan nama lengkap untuk mendaftar.');
      return;
    }

    setError('');
    setLoadingMethod('form');

    window.setTimeout(() => {
      setLoadingMethod(null);
      const derivedName =
        tab === 'register'
          ? fullName.trim()
          : email
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

      onAuthenticate({
        name: derivedName || 'Pengguna TuGuTuGu',
        email: email.trim(),
        phone: phone.trim() || '+62 812-8842-4890',
      });
    }, 500);
  };

  const handleSelectGoogleAccount = (account: CustomerProfileData) => {
    setShowGoogleChooser(false);
    setError('');
    setLoadingMethod('google');
    window.setTimeout(() => {
      setLoadingMethod(null);
      onAuthenticate(account);
    }, 550);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#FCF9F8] px-4 py-8 dark:bg-[#0D0E0D]">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-black dark:text-white">
            TuGu<span className="text-[#006D37] dark:text-[#06C167]">TuGu</span>
          </h1>
          <p className="mt-1 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
            Selamatkan makanan surplus harian hingga 90% lebih hemat.
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xs sm:p-6 dark:border-[#2A2D2A] dark:bg-[#161816]">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F6F6F6] p-1 dark:bg-[#1E211E]">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`min-h-[40px] rounded-lg font-display text-xs font-bold transition-colors ${
                tab === 'login'
                  ? 'bg-black text-white shadow-xs dark:bg-[#06C167] dark:text-[#00210D]'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`min-h-[40px] rounded-lg font-display text-xs font-bold transition-colors ${
                tab === 'register'
                  ? 'bg-black text-white shadow-xs dark:bg-[#06C167] dark:text-[#00210D]'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
              }`}
            >
              Register
            </button>
          </div>

          <div className="mt-5">
            <h2 className="font-display text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              {tab === 'login' ? 'Masuk ke Akunmu' : 'Buat Akun TuGuTuGu'}
            </h2>
            <p className="mt-0.5 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
              {tab === 'login'
                ? 'Lanjutkan berburu surprise bag dan cek pesanan pickup kamu.'
                : 'Daftar cepat untuk mulai menyelamatkan makanan di sekitarmu.'}
            </p>
          </div>

          {/* Simulated Google Login Button */}
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={() => setShowGoogleChooser(true)}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#DCD9D9] bg-white px-4 font-display text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F6F6F6] active:scale-[0.99] disabled:opacity-60 dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:bg-[#272B27]"
          >
            {loadingMethod === 'google' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#4285F4]" />
                <span>Menghubungkan ke Google...</span>
              </>
            ) : (
              <>
                <GoogleGIcon className="h-5 w-5" />
                <span>{tab === 'login' ? 'Log in with Google' : 'Sign up with Google'}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E5E5E5] dark:bg-[#2A2D2A]" />
            <span className="text-[11px] font-medium text-[#6B6B6B] dark:text-[#A3A8A3]">
              atau dengan email
            </span>
            <div className="h-px flex-1 bg-[#E5E5E5] dark:bg-[#2A2D2A]" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Nadia Pratama"
                    className="h-11 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-3.5 pl-10 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#787F78] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="h-11 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-3.5 pl-10 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#787F78] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Nomor HP (Opsional)
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="h-11 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-3.5 pl-10 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#787F78] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="h-11 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-3.5 pl-10 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#787F78] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>
            </div>

            {error && <p className="text-xs font-medium text-[#B42318] dark:text-[#FCA5A5]">{error}</p>}

            <button
              type="submit"
              disabled={loadingMethod !== null}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#06C167] font-display text-sm font-bold text-[#00210D] transition-colors hover:bg-[#05b05d] disabled:opacity-60"
            >
              {loadingMethod === 'form' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{tab === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch prompt */}
          <p className="mt-4 text-center text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
            {tab === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              type="button"
              onClick={() => {
                setTab(tab === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="font-bold text-[#1A1A1A] hover:underline dark:text-[#F5F5F5]"
            >
              {tab === 'login' ? 'Daftar sekarang' : 'Log in di sini'}
            </button>
          </p>
        </div>
      </div>

      {/* Simulated Google Account Chooser Modal */}
      {showGoogleChooser && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
          onClick={() => setShowGoogleChooser(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pilih akun Google"
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
              <div className="flex items-center gap-2">
                <GoogleGIcon className="h-4 w-4" />
                <span className="font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Sign in with Google
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleChooser(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                Pilih akun Google untuk melanjutkan ke{' '}
                <strong className="text-[#1A1A1A] dark:text-[#F5F5F5]">TuGuTuGu</strong>
              </p>

              <div className="mt-3.5 space-y-2">
                {SIMULATED_GOOGLE_ACCOUNTS.map((acc) => {
                  const initials = acc.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(acc)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3 text-left transition-colors hover:border-black hover:bg-white dark:border-[#2E322E] dark:bg-[#1E211E] dark:hover:border-[#06C167] dark:hover:bg-[#272B27]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4285F4] font-display text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {acc.name}
                        </p>
                        <p className="truncate text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                          {acc.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                Simulasi login Google (prototype mode) — tanpa autentikasi eksternal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
