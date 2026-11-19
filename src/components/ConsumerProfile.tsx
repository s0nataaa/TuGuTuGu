import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Info,
  Leaf,
  Lock,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  DietaryPrefKey,
  EWalletProvider,
  LocationOption,
  OrderRecord,
  WishlistAlert,
} from '../types/marketplace';
import {
  INITIAL_WISHLIST_ALERTS,
  LOCATION_OPTIONS,
  formatRupiah,
} from '../data/mockMarketplace';

export interface CustomerProfileData {
  name: string;
  email: string;
  phone: string;
}

interface ConsumerProfileProps {
  profile: CustomerProfileData;
  onUpdateProfile: (next: CustomerProfileData) => void;
  selectedLocation: LocationOption;
  onSelectLocation: (loc: LocationOption) => void;
  defaultWallet: EWalletProvider;
  onSelectDefaultWallet: (wallet: EWalletProvider) => void;
  orders: OrderRecord[];
  collectedStampsCount: number;
  onOpenMerchantLogin: () => void;
  onOpenMerchantRegister: () => void;
  onNavigateOrders: () => void;
  onLogout: () => void;
  onResetDemoData?: () => void;
}

type ProfileModalType =
  | 'locations'
  | 'wallets'
  | 'dietary'
  | 'alerts'
  | 'security'
  | 'help'
  | 'about'
  | null;

interface WalletItemState {
  id: EWalletProvider;
  label: string;
  linked: boolean;
  accountHint: string;
  balanceLabel: string;
  badgeColor: string;
}

interface AlertSettingsState {
  midnightDrops: boolean;
  freeFoodNearby: boolean;
  pickupReminder: boolean;
  weekendSpecials: boolean;
}

interface SecuritySettingsState {
  twoFactorOtp: boolean;
  pinOnCancel: boolean;
  biometricLogin: boolean;
}

const STORAGE_LOCATIONS_KEY = 'tugutugu_saved_locations';
const STORAGE_WALLETS_KEY = 'tugutugu_wallets';
const STORAGE_DIETARY_KEY = 'tugutugu_dietary_prefs';
const STORAGE_ALERT_SETTINGS_KEY = 'tugutugu_alert_settings';
const STORAGE_WISHLIST_ALERTS_KEY = 'tugutugu_wishlist_alerts';
const STORAGE_SECURITY_KEY = 'tugutugu_security_settings';

const DEFAULT_WALLETS: WalletItemState[] = [
  {
    id: 'GoPay',
    label: 'GoPay',
    linked: true,
    accountHint: '+62 812-••••-4890',
    balanceLabel: 'Rp 245.000',
    badgeColor: 'bg-[#00AED6] text-white',
  },
  {
    id: 'OVO',
    label: 'OVO',
    linked: true,
    accountHint: '+62 812-••••-4890',
    balanceLabel: 'Rp 128.500',
    badgeColor: 'bg-[#4C3494] text-white',
  },
  {
    id: 'DANA',
    label: 'DANA',
    linked: true,
    accountHint: '+62 812-••••-4890',
    balanceLabel: 'Rp 84.000',
    badgeColor: 'bg-[#118EEA] text-white',
  },
  {
    id: 'ShopeePay',
    label: 'ShopeePay',
    linked: false,
    accountHint: 'Belum terhubung',
    balanceLabel: '—',
    badgeColor: 'bg-[#EE4D2D] text-white',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Apa itu Surprise Bag di TuGuTuGu?',
    a: 'Surprise Bag adalah paket makanan layak santap berlebih dari bakery, restoran, atau toko bahan pangan yang dijual diskon hingga 90% atau gratis menjelang tutup toko.',
  },
  {
    q: 'Bagaimana cara bayar Cash on Pickup (COD)?',
    a: 'Pilih metode Cash on Pickup saat checkout. Pesananmu akan berstatus Payment Pending hingga kamu datang mengambil makanan dan membayar langsung di kasir toko.',
  },
  {
    q: 'Bagaimana alur klaim makanan Gratis (Rp 0)?',
    a: 'Makanan gratis tidak memerlukan metode pembayaran. Cukup tekan Claim for Free, konfirmasi klaim, lalu tunjukkan QR Claim ID ke kasir saat jam pickup.',
  },
  {
    q: 'Apakah makanan yang diselamatkan dijamin masih layak konsumsi?',
    a: 'Ya. Semua mitra TuGuTuGu hanya mengunggah stok berlebih harian yang masih segar dan aman dikonsumsi sesuai standar kebersihan toko.',
  },
];

export const ConsumerProfile: React.FC<ConsumerProfileProps> = ({
  profile,
  onUpdateProfile,
  selectedLocation,
  onSelectLocation,
  defaultWallet,
  onSelectDefaultWallet,
  orders,
  collectedStampsCount,
  onOpenMerchantLogin,
  onOpenMerchantRegister,
  onNavigateOrders,
  onLogout,
  onResetDemoData,
}) => {
  const [activeModal, setActiveModal] = useState<ProfileModalType>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // 1. Saved Locations State
  const [savedLocations, setSavedLocations] = useState<LocationOption[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCATIONS_KEY);
      if (saved) return JSON.parse(saved) as LocationOption[];
    } catch {
      // ignore
    }
    return LOCATION_OPTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOCATIONS_KEY, JSON.stringify(savedLocations));
    } catch {
      // ignore
    }
  }, [savedLocations]);

  const [newLocLabel, setNewLocLabel] = useState('');
  const [newLocArea, setNewLocArea] = useState('');

  // 2. Linked E-Wallets State
  const [wallets, setWallets] = useState<WalletItemState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WALLETS_KEY);
      if (saved) return JSON.parse(saved) as WalletItemState[];
    } catch {
      // ignore
    }
    return DEFAULT_WALLETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WALLETS_KEY, JSON.stringify(wallets));
    } catch {
      // ignore
    }
  }, [wallets]);

  // 3. Dietary Preferences State (disinkronkan dengan Explore)
  const [dietaryPrefs, setDietaryPrefs] = useState<Record<DietaryPrefKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DIETARY_KEY);
      if (saved) return JSON.parse(saved) as Record<DietaryPrefKey, boolean>;
    } catch {
      // ignore
    }
    return { halal: false, vegetarian: false, nutFree: false };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DIETARY_KEY, JSON.stringify(dietaryPrefs));
    } catch {
      // ignore
    }
  }, [dietaryPrefs]);

  // 4. Alert Settings & Wishlist Alerts State
  const [alertSettings, setAlertSettings] = useState<AlertSettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ALERT_SETTINGS_KEY);
      if (saved) return JSON.parse(saved) as AlertSettingsState;
    } catch {
      // ignore
    }
    return {
      midnightDrops: true,
      freeFoodNearby: true,
      pickupReminder: true,
      weekendSpecials: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
    } catch {
      // ignore
    }
  }, [alertSettings]);

  const [wishlistAlerts, setWishlistAlerts] = useState<WishlistAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WISHLIST_ALERTS_KEY);
      if (saved) return JSON.parse(saved) as WishlistAlert[];
    } catch {
      // ignore
    }
    return INITIAL_WISHLIST_ALERTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WISHLIST_ALERTS_KEY, JSON.stringify(wishlistAlerts));
    } catch {
      // ignore
    }
  }, [wishlistAlerts]);

  // 5. Profile & Security State
  const [security, setSecurity] = useState<SecuritySettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECURITY_KEY);
      if (saved) return JSON.parse(saved) as SecuritySettingsState;
    } catch {
      // ignore
    }
    return {
      twoFactorOtp: true,
      pinOnCancel: false,
      biometricLogin: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SECURITY_KEY, JSON.stringify(security));
    } catch {
      // ignore
    }
  }, [security]);

  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftPhone, setDraftPhone] = useState(profile.phone);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    setDraftName(profile.name);
    setDraftEmail(profile.email);
    setDraftPhone(profile.phone);
  }, [profile]);

  // Dynamic Impact Metrics
  const totalSaved = orders
    .filter((o) => o.pickupStatus !== 'Cancelled')
    .reduce((acc, o) => acc + o.totalSavings, 0);
  const rescuedBags = orders
    .filter((o) => o.pickupStatus !== 'Cancelled')
    .reduce((acc, o) => acc + o.quantity, 0);
  const co2SavedKg = (rescuedBags * 2.5).toFixed(1);

  // Dynamic Subtitles for Settings Rows
  const linkedWalletNames = wallets.filter((w) => w.linked).map((w) => w.id);
  const walletSubtitle =
    linkedWalletNames.length > 0
      ? `Default: ${defaultWallet} · ${linkedWalletNames.length} terhubung`
      : 'Belum ada e-wallet terhubung';

  const activeDietLabels = [
    dietaryPrefs.halal ? 'Halal' : null,
    dietaryPrefs.vegetarian ? 'Vegetarian' : null,
    dietaryPrefs.nutFree ? 'Bebas Kacang' : null,
  ].filter(Boolean) as string[];
  const dietarySubtitle =
    activeDietLabels.length > 0 ? activeDietLabels.join(', ') : 'All surplus bags';

  const activeAlertCount =
    Object.values(alertSettings).filter(Boolean).length +
    wishlistAlerts.filter((w) => w.active).length;
  const alertsSubtitle = alertSettings.midnightDrops
    ? `Midnight 21:00 aktif · ${activeAlertCount} pengingat`
    : `${activeAlertCount} pengingat aktif`;

  const locationSubtitle = `Aktif: ${selectedLocation.label} · ${savedLocations.length} tersimpan`;
  const securitySubtitle = security.twoFactorOtp
    ? 'Verified account · 2FA OTP aktif'
    : 'Verified consumer account';

  const handleShareImpact = async () => {
    const shareText = `Aku sudah menyelamatkan ${rescuedBags} bag makanan (${co2SavedKg} kg CO2e dihemat & hemat ${formatRupiah(totalSaved)}) di TuGuTuGu!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TuGuTuGu Food Rescue Impact', text: shareText });
        showToast('Impact berhasil dibagikan');
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Ringkasan impact disalin ke clipboard');
    } catch {
      showToast('Ringkasan impact siap dibagikan');
    }
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocLabel.trim() || !newLocArea.trim()) return;
    const created: LocationOption = {
      id: `loc-custom-${Date.now()}`,
      label: newLocLabel.trim(),
      area: newLocArea.trim(),
      city: 'Jakarta',
    };
    setSavedLocations((prev) => [created, ...prev]);
    onSelectLocation(created);
    setNewLocLabel('');
    setNewLocArea('');
    showToast(`Lokasi "${created.label}" ditambahkan & diaktifkan`);
  };

  const handleToggleWallet = (walletId: EWalletProvider) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== walletId) return w;
        const nextLinked = !w.linked;
        return {
          ...w,
          linked: nextLinked,
          accountHint: nextLinked ? profile.phone : 'Belum terhubung',
          balanceLabel: nextLinked ? 'Rp 50.000' : '—',
        };
      })
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim() || !draftEmail.trim()) return;
    onUpdateProfile({
      name: draftName.trim(),
      email: draftEmail.trim(),
      phone: draftPhone.trim() || '+62 812-8842-4890',
    });
    showToast('Profil akun berhasil diperbarui');
  };

  return (
    <div className="space-y-5 pt-3 pb-10 sm:space-y-6">
      {/* Feedback Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Consumer Identity Card */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-black font-display text-lg font-bold text-white sm:h-14 sm:w-14">
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-lg font-bold text-[#1A1A1A] sm:text-xl">
                {profile.name}
              </h1>
              <button
                type="button"
                onClick={() => setActiveModal('security')}
                aria-label="Edit profil"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#4C4546] hover:text-black"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="truncate text-xs text-[#6B6B6B] sm:text-sm">
              {profile.email} · {collectedStampsCount} Stempel Toko
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateOrders}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 text-xs font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7] sm:w-auto"
        >
          View My Orders ({orders.length})
        </button>
      </section>

      {/* Food Rescue Impact */}
      <section aria-labelledby="impact-heading">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 id="impact-heading" className="font-display text-base font-bold text-[#1A1A1A]">
            Your Food Rescue Impact
          </h2>
          <button
            type="button"
            onClick={handleShareImpact}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-xs font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
          >
            <Share2 className="h-3.5 w-3.5 text-[#006D37]" />
            <span>Share</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4">
            <p className="text-xs text-[#6B6B6B]">Meals Rescued</p>
            <p className="mt-1 font-display text-xl font-bold text-[#1A1A1A] tabular-nums sm:text-2xl">
              {rescuedBags}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4">
            <p className="text-xs text-[#6B6B6B]">CO₂e Avoided</p>
            <p className="mt-1 font-display text-xl font-bold text-[#006D37] tabular-nums sm:text-2xl">
              {co2SavedKg} kg
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:col-span-1 sm:p-4">
            <p className="text-xs text-[#6B6B6B]">Money Saved</p>
            <p className="mt-1 font-display text-xl font-bold text-[#1A1A1A] tabular-nums sm:text-2xl">
              {formatRupiah(totalSaved)}
            </p>
          </div>
        </div>
      </section>

      {/* PROMINENT MERCHANT ACCESS CTA — Directly inside Profile Screen */}
      <section
        aria-labelledby="merchant-access-heading"
        className="overflow-hidden rounded-2xl border border-black bg-[#141414] p-4 text-white sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#06C167]">
              <Store className="h-4 w-4" />
              <span>TuGuTuGu Partner Portal</span>
            </div>
            <h2
              id="merchant-access-heading"
              className="mt-1.5 font-display text-lg font-bold text-white sm:text-xl"
            >
              Manage Your Restaurant or Bakery Surplus
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#A6A6A6] sm:text-sm">
              Publish surprise bags, verify consumer QR codes, and confirm Cash on Pickup payments
              from your Merchant Dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:min-w-[230px]">
            <button
              type="button"
              onClick={onOpenMerchantLogin}
              className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#06C167] px-5 font-display text-base font-bold text-[#00210D] shadow-sm transition-transform hover:bg-[#05b05d] active:scale-[0.98]"
            >
              <Store className="h-5 w-5 shrink-0" />
              <span>Login as a Merchant</span>
            </button>

            <button
              type="button"
              onClick={onOpenMerchantRegister}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Register as a Merchant
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Account Settings List */}
      <section aria-label="Account Settings">
        <h2 className="mb-2.5 font-display text-base font-bold text-[#1A1A1A]">
          Account &amp; Preferences
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
          {(
            [
              {
                id: 'locations',
                icon: MapPin,
                label: 'Saved Pickup Locations',
                detail: locationSubtitle,
              },
              {
                id: 'wallets',
                icon: CreditCard,
                label: 'Linked E-Wallets',
                detail: walletSubtitle,
              },
              {
                id: 'dietary',
                icon: Leaf,
                label: 'Dietary Preferences',
                detail: dietarySubtitle,
              },
              {
                id: 'alerts',
                icon: Bell,
                label: 'Midnight Deal & Pickup Alerts',
                detail: alertsSubtitle,
              },
              {
                id: 'security',
                icon: ShieldCheck,
                label: 'Account & Security',
                detail: securitySubtitle,
              },
            ] as const
          ).map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModal(item.id)}
                className={`flex min-h-[64px] w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#F6F6F6] sm:px-5 ${
                  idx !== 0 ? 'border-t border-[#E5E5E5]' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">{item.label}</p>
                    <p className="truncate text-xs text-[#6B6B6B]">{item.detail}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Support & App Info */}
      <section aria-label="Support and Information">
        <h2 className="mb-2.5 font-display text-base font-bold text-[#1A1A1A]">
          Support &amp; Info
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
          <button
            type="button"
            onClick={() => setActiveModal('help')}
            className="flex min-h-[60px] w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#F6F6F6] sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A]">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A1A1A]">Help Center &amp; FAQ</p>
                <p className="truncate text-xs text-[#6B6B6B]">
                  Cara kerja Surprise Bag, COD, &amp; Klaim Gratis
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('about')}
            className="flex min-h-[60px] w-full items-center justify-between border-t border-[#E5E5E5] px-4 py-3.5 text-left transition-colors hover:bg-[#F6F6F6] sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A]">
                <Info className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                  About TuGuTuGu &amp; Privacy
                </p>
                <p className="truncate text-xs text-[#6B6B6B]">
                  Versi prototype v1.0 · Penyimpanan lokal aktif
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
          </button>
        </div>
      </section>

      {/* Danger Log Out Action */}
      <section aria-label="Session Actions">
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-[#F9C6BE] bg-[#FFF0ED] px-4 font-display text-sm font-bold text-[#B42318] transition-colors hover:bg-[#FFE3DE] active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[#6B6B6B]">
        <UserCheck className="h-3.5 w-3.5" />
        Signed in as {profile.name} · TuGuTuGu
      </p>

      {/* ==================== MODAL SHELL FOR PROFILE MENUS ==================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag pill */}
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9]" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5">
              <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                {activeModal === 'locations' && 'Saved Pickup Locations'}
                {activeModal === 'wallets' && 'Linked E-Wallets'}
                {activeModal === 'dietary' && 'Dietary Preferences'}
                {activeModal === 'alerts' && 'Midnight Deal & Pickup Alerts'}
                {activeModal === 'security' && 'Account & Security'}
                {activeModal === 'help' && 'Help Center & FAQ'}
                {activeModal === 'about' && 'About TuGuTuGu & Privacy'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* 1. SAVED PICKUP LOCATIONS */}
              {activeModal === 'locations' && (
                <>
                  <p className="text-xs text-[#6B6B6B]">
                    Pilih area utama untuk menampilkan toko dan penawaran terdekat di layar Home.
                  </p>

                  <div className="space-y-2">
                    {savedLocations.map((loc) => {
                      const isActive = selectedLocation.id === loc.id;
                      const isCustom = loc.id.startsWith('loc-custom-');
                      return (
                        <div
                          key={loc.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-3.5 ${
                            isActive
                              ? 'border-[#06C167] bg-[#06C167]/10'
                              : 'border-[#E5E5E5] bg-[#F6F6F6]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc);
                              showToast(`Lokasi Home diubah ke ${loc.label}`);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                isActive ? 'bg-[#06C167] text-[#00210D]' : 'bg-white text-[#1A1A1A]'
                              }`}
                            >
                              {isActive ? (
                                <Check className="h-4 w-4 stroke-[3]" />
                              ) : (
                                <MapPin className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-display text-sm font-bold text-[#1A1A1A]">
                                {loc.label}
                              </p>
                              <p className="truncate text-xs text-[#6B6B6B]">
                                {loc.area}, {loc.city}
                              </p>
                            </div>
                          </button>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => {
                                setSavedLocations((prev) => prev.filter((item) => item.id !== loc.id));
                                if (isActive) onSelectLocation(LOCATION_OPTIONS[0]);
                                showToast('Lokasi dihapus');
                              }}
                              aria-label="Hapus lokasi"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-white hover:text-[#B42318]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleAddLocation}
                    className="space-y-2.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5"
                  >
                    <p className="text-xs font-bold text-[#1A1A1A]">Tambah Lokasi Baru</p>
                    <input
                      type="text"
                      value={newLocLabel}
                      onChange={(e) => setNewLocLabel(e.target.value)}
                      placeholder="Label (mis. Kos Setiabudi / Kantor Kuningan)"
                      className="min-h-[42px] w-full rounded-lg border border-[#E5E5E5] bg-white px-3 text-xs text-[#1A1A1A] outline-none focus:border-black"
                    />
                    <input
                      type="text"
                      value={newLocArea}
                      onChange={(e) => setNewLocArea(e.target.value)}
                      placeholder="Alamat / Kecamatan"
                      className="min-h-[42px] w-full rounded-lg border border-[#E5E5E5] bg-white px-3 text-xs text-[#1A1A1A] outline-none focus:border-black"
                    />
                    <button
                      type="submit"
                      className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-black font-display text-xs font-semibold text-white hover:bg-[#1B1B1B]"
                    >
                      <Plus className="h-4 w-4" />
                      Simpan &amp; Aktifkan Lokasi
                    </button>
                  </form>
                </>
              )}

              {/* 2. LINKED E-WALLETS */}
              {activeModal === 'wallets' && (
                <>
                  <p className="text-xs text-[#6B6B6B]">
                    Atur e-wallet terhubung dan pilih metode default saat checkout berbayar.
                  </p>
                  <div className="space-y-2.5">
                    {wallets.map((w) => {
                      const isDefault = defaultWallet === w.id && w.linked;
                      return (
                        <div
                          key={w.id}
                          className={`rounded-xl border p-3.5 ${
                            isDefault
                              ? 'border-[#06C167] bg-[#06C167]/10'
                              : 'border-[#E5E5E5] bg-[#F6F6F6]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-9 min-w-[68px] items-center justify-center rounded-lg px-2 font-display text-xs font-bold ${w.badgeColor}`}
                              >
                                {w.label}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#1A1A1A]">
                                  {w.linked ? w.balanceLabel : 'Belum Terhubung'}
                                </p>
                                <p className="text-[11px] text-[#6B6B6B]">{w.accountHint}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleToggleWallet(w.id);
                                showToast(
                                  w.linked
                                    ? `${w.label} diputus sementara`
                                    : `${w.label} berhasil dihubungkan`
                                );
                              }}
                              className={`min-h-[34px] rounded-lg border px-3 text-xs font-semibold ${
                                w.linked
                                  ? 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                                  : 'border-black bg-black text-white'
                              }`}
                            >
                              {w.linked ? 'Putuskan' : 'Hubungkan'}
                            </button>
                          </div>

                          {w.linked && (
                            <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2">
                              <span className="text-[11px] text-[#4C4546]">
                                {isDefault ? 'Dipakai otomatis saat checkout' : 'Tersedia di checkout'}
                              </span>
                              {isDefault ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#06C167] px-2.5 py-0.5 text-[10px] font-bold text-[#00210D]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Default
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectDefaultWallet(w.id);
                                    showToast(`${w.label} diset sebagai default checkout`);
                                  }}
                                  className="text-xs font-bold text-[#006D37] hover:underline"
                                >
                                  Jadikan Default
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 3. DIETARY PREFERENCES */}
              {activeModal === 'dietary' && (
                <>
                  <p className="text-xs text-[#6B6B6B]">
                    Preferensi ini tersimpan dan otomatis tersinkron dengan filter di tab Explore.
                  </p>
                  <div className="space-y-2.5">
                    {(
                      [
                        {
                          key: 'halal',
                          title: 'Halal Only',
                          desc: 'Hanya tampilkan toko & menu ramah halal / bersertifikat halal',
                        },
                        {
                          key: 'vegetarian',
                          title: 'Vegetarian Friendly',
                          desc: 'Prioritaskan paket roti, sayur, buah, dan makanan bebas daging',
                        },
                        {
                          key: 'nutFree',
                          title: 'Bebas Kacang (Nut-Free)',
                          desc: 'Sembunyikan menu yang berisiko mengandung kacang',
                        },
                      ] as { key: DietaryPrefKey; title: string; desc: string }[]
                    ).map((pref) => (
                      <label
                        key={pref.key}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[#1A1A1A]">
                            {pref.title}
                          </p>
                          <p className="text-xs text-[#6B6B6B]">{pref.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={dietaryPrefs[pref.key]}
                          onChange={() => {
                            setDietaryPrefs((prev) => ({
                              ...prev,
                              [pref.key]: !prev[pref.key],
                            }));
                            showToast('Preferensi diet diperbarui');
                          }}
                          className="h-5 w-5 shrink-0 accent-[#06C167]"
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDietaryPrefs({ halal: false, vegetarian: false, nutFree: false });
                      showToast('Semua filter diet direset (All surplus bags)');
                    }}
                    className="min-h-[42px] w-full rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-[#1A1A1A] hover:bg-[#F6F6F6]"
                  >
                    Tampilkan Semua Makanan (Reset)
                  </button>
                </>
              )}

              {/* 4. MIDNIGHT DEAL & PICKUP ALERTS */}
              {activeModal === 'alerts' && (
                <>
                  <div className="space-y-2.5">
                    {[
                      {
                        key: 'midnightDrops' as const,
                        title: 'Midnight Deal Drops (21:00+)',
                        desc: 'Kabari saat promo larut malam dibuka',
                      },
                      {
                        key: 'freeFoodNearby' as const,
                        title: 'Free Food Nearby',
                        desc: 'Notifikasi instan saat ada makanan Rp 0 di sekitarmu',
                      },
                      {
                        key: 'pickupReminder' as const,
                        title: 'Pickup Window Reminder',
                        desc: 'Pengingat 30 menit sebelum jam ambil pesanan dimulai',
                      },
                      {
                        key: 'weekendSpecials' as const,
                        title: 'Weekend Specials',
                        desc: 'Rekomendasi paket keluarga setiap akhir pekan',
                      },
                    ].map((row) => (
                      <label
                        key={row.key}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[#1A1A1A]">
                            {row.title}
                          </p>
                          <p className="text-xs text-[#6B6B6B]">{row.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={alertSettings[row.key]}
                          onChange={() =>
                            setAlertSettings((prev) => ({
                              ...prev,
                              [row.key]: !prev[row.key],
                            }))
                          }
                          className="h-5 w-5 shrink-0 accent-[#06C167]"
                        />
                      </label>
                    ))}
                  </div>

                  {wishlistAlerts.length > 0 && (
                    <div className="space-y-2 border-t border-[#E5E5E5] pt-3">
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Wishlist Area &amp; Rute Tersimpan
                      </p>
                      {wishlistAlerts.map((wl) => (
                        <label
                          key={wl.id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#1A1A1A]">{wl.title}</p>
                            <p className="truncate text-[11px] text-[#6B6B6B]">{wl.criteria}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={wl.active}
                            onChange={() =>
                              setWishlistAlerts((prev) =>
                                prev.map((a) =>
                                  a.id === wl.id ? { ...a, active: !a.active } : a
                                )
                              )
                            }
                            className="h-4 w-4 shrink-0 accent-[#06C167]"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      showToast('Simulasi alert terkirim: Kuro Midnight Kitchen baru drop 2 bag!')
                    }
                    className="min-h-[44px] w-full rounded-xl bg-black font-display text-xs font-semibold text-white hover:bg-[#1B1B1B]"
                  >
                    Kirim Simulasi Notifikasi Alert
                  </button>
                </>
              )}

              {/* 5. ACCOUNT & SECURITY */}
              {activeModal === 'security' && (
                <>
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="min-h-[42px] w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] outline-none focus:border-black focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                        Email Terverifikasi
                      </label>
                      <input
                        type="email"
                        value={draftEmail}
                        onChange={(e) => setDraftEmail(e.target.value)}
                        className="min-h-[42px] w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] outline-none focus:border-black focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                        Nomor HP
                      </label>
                      <input
                        type="tel"
                        value={draftPhone}
                        onChange={(e) => setDraftPhone(e.target.value)}
                        className="min-h-[42px] w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] outline-none focus:border-black focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[44px] w-full rounded-xl bg-[#06C167] font-display text-xs font-bold text-[#00210D] hover:bg-[#05b05d]"
                    >
                      Simpan Perubahan Profil
                    </button>
                  </form>

                  <div className="space-y-2.5 border-t border-[#E5E5E5] pt-4">
                    <p className="text-xs font-bold text-[#1A1A1A]">Keamanan Akun</p>
                    {[
                      {
                        key: 'twoFactorOtp' as const,
                        title: 'Two-Step Verification (OTP)',
                        desc: 'Minta kode OTP saat login di perangkat baru',
                      },
                      {
                        key: 'pinOnCancel' as const,
                        title: 'Konfirmasi PIN Saat Batalkan Order',
                        desc: 'Cegah pembatalan pesanan secara tidak sengaja',
                      },
                    ].map((sec) => (
                      <label
                        key={sec.key}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1A1A1A]">{sec.title}</p>
                          <p className="text-[11px] text-[#6B6B6B]">{sec.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={security[sec.key]}
                          onChange={() =>
                            setSecurity((prev) => ({
                              ...prev,
                              [sec.key]: !prev[sec.key],
                            }))
                          }
                          className="h-4 w-4 shrink-0 accent-[#06C167]"
                        />
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowPasswordForm((v) => !v)}
                      className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-[#1A1A1A] hover:bg-[#F6F6F6]"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {showPasswordForm ? 'Tutup Ubah Kata Sandi' : 'Ubah Kata Sandi'}
                    </button>

                    {showPasswordForm && (
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Kata sandi baru (min. 6 karakter)"
                          className="min-h-[40px] flex-1 rounded-lg border border-[#E5E5E5] px-3 text-xs outline-none focus:border-black"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newPassword.length < 6) {
                              showToast('Minimal 6 karakter');
                              return;
                            }
                            setNewPassword('');
                            setShowPasswordForm(false);
                            showToast('Kata sandi berhasil diperbarui (simulasi)');
                          }}
                          className="min-h-[40px] rounded-lg bg-black px-3 text-xs font-semibold text-white"
                        >
                          Simpan
                        </button>
                      </div>
                    )}

                    {onResetDemoData && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetDemoData();
                          setActiveModal(null);
                          showToast('Data prototype berhasil direset');
                        }}
                        className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#F9C6BE] bg-[#FFF0ED] text-xs font-semibold text-[#B42318]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset Data Prototype ke Awal
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* 6. HELP CENTER & FAQ */}
              {activeModal === 'help' && (
                <div className="space-y-2.5">
                  {FAQ_ITEMS.map((faq, i) => {
                    const open = openFaqIndex === i;
                    return (
                      <div
                        key={faq.q}
                        className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#F6F6F6]"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(open ? null : i)}
                          className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
                        >
                          <span className="font-display text-xs font-bold text-[#1A1A1A] sm:text-sm">
                            {faq.q}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[#6B6B6B] transition-transform ${
                              open ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {open && (
                          <div className="border-t border-[#E5E5E5] bg-white px-3.5 py-3 text-xs leading-relaxed text-[#4C4546]">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 7. ABOUT & PRIVACY */}
              {activeModal === 'about' && (
                <div className="space-y-3 text-xs leading-relaxed text-[#4C4546]">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4">
                    <p className="font-display text-sm font-bold text-[#1A1A1A]">
                      TuGuTuGu Food Rescue Marketplace
                    </p>
                    <p className="mt-1">
                      Versi Prototype UI/UX (PWA). Membantu konsumen menyelamatkan makanan surplus
                      berkualitas dari toko &amp; restoran lokal dengan harga terjangkau atau gratis.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                    <p className="font-bold text-[#1A1A1A]">Privasi &amp; Penyimpanan Lokal</p>
                    <p className="mt-1">
                      Pada mode prototype ini, seluruh perubahan profil, stempel toko, lokasi,
                      e-wallet default, preferensi diet, dan pengaturan alert disimpan secara lokal di
                      perangkatmu (<code className="font-mono">localStorage</code>) tanpa dikirim ke
                      server eksternal.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
