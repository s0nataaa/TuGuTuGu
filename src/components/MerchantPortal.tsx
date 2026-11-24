import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  Star,
  Store,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  FoodCategory,
  FoodListing,
  MerchantAccount,
  OrderRecord,
} from '../types/marketplace';
import { DEMO_MERCHANT, formatRupiah } from '../data/mockMarketplace';

interface MerchantPortalProps {
  mode: 'login' | 'register' | 'dashboard';
  merchant: MerchantAccount | null;
  listings: FoodListing[];
  orders: OrderRecord[];
  onChangeMode: (mode: 'login' | 'register' | 'dashboard') => void;
  onExitToConsumer: () => void;
  onAuthenticate: (merchant: MerchantAccount) => void;
  onUpdateMerchant: (merchant: MerchantAccount) => void;
  onLogout: () => void;
  onConfirmCodAndPickup: (orderId: string) => void;
  onVerifyQrPickup: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onAdjustStock: (listingId: string, delta: number) => void;
  onCreateListing: (listing: FoodListing) => void;
  onUpdateListing: (listing: FoodListing) => void;
  onDeleteListing: (listingId: string) => void;
}

type MerchantDashTab = 'orders' | 'bags' | 'insights' | 'store';
type OrderFilterTab = 'all' | 'ready' | 'cod' | 'completed' | 'cancelled';

interface MerchantSettingsState {
  storeOpen: boolean;
  defaultPickupWindow: string;
  pickupNotes: string;
  payoutChannel: string;
  payoutAccountName: string;
  payoutAccountNumber: string;
  autoSettleDaily: boolean;
  instantOrderAlert: boolean;
  lowStockAlert: boolean;
}

const BAG_IMAGE_PRESETS: { label: string; src: string }[] = [
  { label: 'Bakery & Croissant', src: '/src/assets/images/bakery_croissants_1795103366271.jpg' },
  { label: 'Japanese Bento', src: '/src/assets/images/japanese_bento_1795103366733.jpg' },
  { label: 'Nasi & Indonesian', src: '/src/assets/images/indonesian_nasi_bowl_1795103366543.jpg' },
  { label: 'Coffee & Cake', src: '/src/assets/images/artisan_coffee_cake_1795103366293.jpg' },
  { label: 'Healthy Bowl', src: '/src/assets/images/mediterranean_bowl_1795103366660.jpg' },
  { label: 'Desserts & Pastry', src: '/src/assets/images/chocolate_desserts_1795103367438.jpg' },
  { label: 'Fresh Groceries', src: '/src/assets/images/fresh_groceries_box_1795103366812.jpg' },
  { label: 'Drinks & Boba', src: '/src/assets/images/craft_boba_drinks_1795103366539.jpg' },
];

const STORAGE_MERCHANT_SETTINGS = 'tugutugu_merchant_settings';

export const MerchantPortal: React.FC<MerchantPortalProps> = ({
  mode,
  merchant,
  listings,
  orders,
  onChangeMode,
  onExitToConsumer,
  onAuthenticate,
  onUpdateMerchant,
  onLogout,
  onConfirmCodAndPickup,
  onVerifyQrPickup,
  onCancelOrder,
  onAdjustStock,
  onCreateListing,
  onUpdateListing,
  onDeleteListing,
}) => {
  // Login state
  const [loginEmail, setLoginEmail] = useState(DEMO_MERCHANT.email);
  const [loginPassword, setLoginPassword] = useState('merchant2026');
  const [loginError, setLoginError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Register state
  const [regStoreName, setRegStoreName] = useState('');
  const [regCategory, setRegCategory] = useState<FoodCategory>('Bakery');
  const [regAddress, setRegAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  // Dashboard navigation & feedback
  const [dashTab, setDashTab] = useState<MerchantDashTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilterTab>('all');
  const [orderLookup, setOrderLookup] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // QR Scanner / Lookup Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrInputCode, setQrInputCode] = useState('');

  // Add / Edit Bag Modal
  const [showBagModal, setShowBagModal] = useState(false);
  const [editingBag, setEditingBag] = useState<FoodListing | null>(null);
  const [bagTitle, setBagTitle] = useState('');
  const [bagDescription, setBagDescription] = useState('');
  const [bagCategory, setBagCategory] = useState<FoodCategory>('Bakery');
  const [bagImage, setBagImage] = useState(BAG_IMAGE_PRESETS[0].src);
  const [bagOriginal, setBagOriginal] = useState('120000');
  const [bagDiscounted, setBagDiscounted] = useState('30000');
  const [bagIsFree, setBagIsFree] = useState(false);
  const [bagIsMidnight, setBagIsMidnight] = useState(false);
  const [bagHalal, setBagHalal] = useState(true);
  const [bagVegetarian, setBagVegetarian] = useState(false);
  const [bagStock, setBagStock] = useState('4');
  const [bagWindow, setBagWindow] = useState('20:00 – 21:30');

  // Merchant Store Settings (persisted)
  const [storeSettings, setStoreSettings] = useState<MerchantSettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MERCHANT_SETTINGS);
      if (saved) return JSON.parse(saved) as MerchantSettingsState;
    } catch {
      // ignore
    }
    return {
      storeOpen: true,
      defaultPickupWindow: '19:30 – 21:30',
      pickupNotes: 'Tunjukkan QR Order ID ke kasir counter depan sebelah kiri.',
      payoutChannel: 'Bank BCA',
      payoutAccountName: 'Atelier Boulangerie ID',
      payoutAccountNumber: '•••• •••• 8821',
      autoSettleDaily: true,
      instantOrderAlert: true,
      lowStockAlert: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MERCHANT_SETTINGS, JSON.stringify(storeSettings));
    } catch {
      // ignore
    }
  }, [storeSettings]);

  const activeMerchant = merchant ?? DEMO_MERCHANT;

  // Store Edit Form drafts
  const [draftStoreName, setDraftStoreName] = useState(activeMerchant.storeName);
  const [draftStoreCategory, setDraftStoreCategory] = useState<FoodCategory>(activeMerchant.category);
  const [draftStoreAddress, setDraftStoreAddress] = useState(activeMerchant.address);
  const [draftStoreArea, setDraftStoreArea] = useState(activeMerchant.neighborhood);

  useEffect(() => {
    setDraftStoreName(activeMerchant.storeName);
    setDraftStoreCategory(activeMerchant.category);
    setDraftStoreAddress(activeMerchant.address);
    setDraftStoreArea(activeMerchant.neighborhood);
  }, [activeMerchant]);

  const activeNonCancelledOrders = useMemo(
    () => orders.filter((o) => o.pickupStatus !== 'Cancelled'),
    [orders]
  );

  const paymentBreakdown = useMemo(() => {
    const ewalletCount = activeNonCancelledOrders.filter((o) => o.paymentMethod === 'ewallet').length;
    const codCount = activeNonCancelledOrders.filter((o) => o.paymentMethod === 'cod').length;
    const freeCount = activeNonCancelledOrders.filter((o) => o.type === 'free').length;
    const total = Math.max(1, ewalletCount + codCount + freeCount);
    return {
      ewalletCount,
      codCount,
      freeCount,
      ewalletPct: Math.round((ewalletCount / total) * 100),
      codPct: Math.round((codCount / total) * 100),
      freePct: Math.round((freeCount / total) * 100),
    };
  }, [activeNonCancelledOrders]);

  const qrMatchedOrder = useMemo(() => {
    const q = qrInputCode.trim().toLowerCase();
    if (!q) return null;
    return orders.find((o) => o.id.toLowerCase() === q) ?? null;
  }, [qrInputCode, orders]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.includes('@') || loginPassword.length < 4) {
      setLoginError('Enter a valid merchant email and password (min 4 characters).');
      return;
    }
    setLoginError('');
    setAuthLoading(true);
    window.setTimeout(() => {
      setAuthLoading(false);
      onAuthenticate({
        ...DEMO_MERCHANT,
        email: loginEmail,
      });
    }, 550);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !regStoreName.trim() ||
      !regAddress.trim() ||
      !regEmail.includes('@') ||
      regPassword.length < 4
    ) {
      setRegError('Please fill out store name, pickup address, valid email, and password.');
      return;
    }
    setRegError('');
    setAuthLoading(true);
    window.setTimeout(() => {
      setAuthLoading(false);
      onAuthenticate({
        id: `m-${Date.now()}`,
        storeName: regStoreName.trim(),
        category: regCategory,
        email: regEmail.trim(),
        address: regAddress.trim(),
        neighborhood: 'Jakarta',
        rating: 5.0,
      });
    }, 600);
  };

  // ==================== LOGIN SCREEN ====================
  if (mode === 'login') {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <button
          type="button"
          onClick={onExitToConsumer}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:underline dark:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Consumer Profile
        </button>

        <div className="mt-5 rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <div>
            <p className="text-xs font-semibold text-[#006D37] dark:text-[#06C167]">
              TuGuTuGu Partner
            </p>
            <h1 className="font-display text-xl font-bold text-[#1A1A1A] sm:text-2xl dark:text-[#F5F5F5]">
              Merchant Login
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
            Sign in to access your Merchant Dashboard, publish surplus bags, and verify customer
            pickups.
          </p>

          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Merchant Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="partner@bakery.id"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            {loginError && (
              <p className="text-xs font-medium text-[#E11900] dark:text-[#FF6B57]">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#06C167] font-display text-base font-bold text-[#00210D] transition-colors hover:bg-[#05b05d] disabled:opacity-60"
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Merchant Dashboard'
              )}
            </button>
          </form>

          <div className="mt-5 border-t border-[#E5E5E5] pt-4 text-center dark:border-[#2A2D2A]">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
              New kitchen or bakery partner?
            </p>
            <button
              type="button"
              onClick={() => onChangeMode('register')}
              className="mt-1.5 font-display text-sm font-bold text-[#1A1A1A] hover:underline dark:text-[#F5F5F5]"
            >
              Register as a Merchant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== REGISTER SCREEN ====================
  if (mode === 'register') {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <button
          type="button"
          onClick={() => onChangeMode('login')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:underline dark:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Merchant Login
        </button>

        <div className="mt-6 rounded-2xl border border-[#E5E5E5] bg-white p-6 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white dark:bg-[#06C167] dark:text-[#00210D]">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            Register as a Merchant
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
            Turn end-of-day surplus food into rescued meals and extra store revenue.
          </p>

          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Store / Kitchen Name
              </label>
              <input
                type="text"
                value={regStoreName}
                onChange={(e) => setRegStoreName(e.target.value)}
                placeholder="e.g., Kopi & Roti Kemang"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Primary Category
              </label>
              <select
                value={regCategory}
                onChange={(e) => setRegCategory(e.target.value as FoodCategory)}
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              >
                <option value="Bakery">Bakery</option>
                <option value="Meals">Meals</option>
                <option value="Drinks">Drinks</option>
                <option value="Desserts">Desserts</option>
                <option value="Groceries">Groceries</option>
                <option value="Snacks & Deli">Snacks &amp; Deli</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Pickup Address
              </label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="Jl. Kemang Raya No. 12"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Business Email
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="owner@yourstore.id"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Create Password
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="h-12 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />
            </div>

            {regError && (
              <p className="text-xs font-medium text-[#E11900] dark:text-[#FF6B57]">{regError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-black font-display text-base font-semibold text-white transition-colors hover:bg-[#1B1B1B] disabled:opacity-60 dark:bg-[#06C167] dark:font-bold dark:text-[#00210D] dark:hover:bg-[#05b05d]"
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Partner Account...
                </>
              ) : (
                'Create Merchant Account'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== MERCHANT DASHBOARD ====================
  const merchantListings = listings.filter((l) => l.merchantId === activeMerchant.id);
  const displayListings = merchantListings.length > 0 ? merchantListings : listings.slice(0, 3);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'ready' && o.pickupStatus !== 'Ready for Pickup') return false;
    if (
      orderFilter === 'cod' &&
      !(o.paymentStatus === 'Pending (Cash on Pickup)' && o.pickupStatus === 'Ready for Pickup')
    ) {
      return false;
    }
    if (orderFilter === 'completed' && o.pickupStatus !== 'Completed') return false;
    if (orderFilter === 'cancelled' && o.pickupStatus !== 'Cancelled') return false;

    if (!orderLookup.trim()) return true;
    const q = orderLookup.trim().toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.listingTitle.toLowerCase().includes(q)
    );
  });

  const pendingPickupOrders = orders.filter((o) => o.pickupStatus === 'Ready for Pickup');
  const pendingPickupCount = pendingPickupOrders.length;
  const unpaidCodOrders = pendingPickupOrders.filter(
    (o) => o.paymentStatus === 'Pending (Cash on Pickup)'
  );
  const unpaidCodCount = unpaidCodOrders.length;
  const pendingCodTotal = unpaidCodOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  const completedRevenue = orders
    .filter((o) => o.paymentStatus === 'Paid' && o.pickupStatus !== 'Cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const totalBagsSold = activeNonCancelledOrders.reduce((acc, o) => acc + o.quantity, 0);
  const totalFoodKg = Number((totalBagsSold * 0.85).toFixed(1));
  const totalCo2Kg = Number((totalFoodKg * 2.5).toFixed(1));

  const openAddBagModal = () => {
    setEditingBag(null);
    setBagTitle('');
    setBagDescription('');
    setBagCategory(activeMerchant.category);
    setBagImage(BAG_IMAGE_PRESETS[0].src);
    setBagOriginal('120000');
    setBagDiscounted('30000');
    setBagIsFree(false);
    setBagIsMidnight(false);
    setBagHalal(true);
    setBagVegetarian(false);
    setBagStock('4');
    setBagWindow(storeSettings.defaultPickupWindow);
    setShowBagModal(true);
  };

  const openEditBagModal = (bag: FoodListing) => {
    const bagFree = bag.discountedPrice <= 0 || bag.discountPercent >= 100;
    setEditingBag(bag);
    setBagTitle(bag.title);
    setBagDescription(bag.description);
    setBagCategory(bag.category);
    setBagImage(bag.image);
    setBagOriginal(String(bag.originalPrice));
    setBagDiscounted(bagFree ? '0' : String(bag.discountedPrice));
    setBagIsFree(bagFree);
    setBagIsMidnight(Boolean(bag.isMidnightDeal));
    setBagHalal(bag.halal ?? true);
    setBagVegetarian(Boolean(bag.vegetarian));
    setBagStock(String(bag.stock));
    setBagWindow(bag.pickupWindow);
    setShowBagModal(true);
  };

  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagTitle.trim()) return;
    const orig = Math.max(10000, Number(bagOriginal) || 100000);
    const enteredDisc = Number(bagDiscounted);
    const effectiveIsFree = bagIsFree || (!Number.isNaN(enteredDisc) && enteredDisc <= 0);
    const disc = effectiveIsFree
      ? 0
      : Math.min(orig - 1000, Math.max(5000, enteredDisc || 25000));
    const pct = effectiveIsFree ? 100 : Math.max(10, Math.round(((orig - disc) / orig) * 100));
    const stockNum = Math.max(0, Number(bagStock) || 0);

    const tags = [
      bagHalal ? 'Halal' : null,
      bagVegetarian ? 'Vegetarian' : null,
      effectiveIsFree ? 'Zero Cost' : 'Fresh Today',
    ].filter(Boolean) as string[];

    if (editingBag) {
      onUpdateListing({
        ...editingBag,
        title: bagTitle.trim(),
        description:
          bagDescription.trim() ||
          `Fresh surplus bag curated by ${activeMerchant.storeName} ready for today's pickup.`,
        category: bagCategory,
        image: bagImage,
        originalPrice: orig,
        discountedPrice: disc,
        discountPercent: pct,
        stock: stockNum,
        pickupWindow: bagWindow.trim() || storeSettings.defaultPickupWindow,
        maxClaimPerUser: effectiveIsFree ? 1 : undefined,
        isMidnightDeal: bagIsMidnight,
        halal: bagHalal,
        vegetarian: bagVegetarian,
        dietaryTags: tags,
      });
      showToast(`"${bagTitle.trim()}" berhasil diperbarui`);
    } else {
      const newBag: FoodListing = {
        id: `bag-${Date.now()}`,
        title: bagTitle.trim(),
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.storeName,
        merchantCategory: `${bagCategory} Partner`,
        category: bagCategory,
        description:
          bagDescription.trim() ||
          `Fresh surplus bag curated by ${activeMerchant.storeName} ready for today's pickup.`,
        whatsInside: ['Chef-curated daily surplus selection'],
        dietaryTags: tags,
        image: bagImage,
        originalPrice: orig,
        discountedPrice: disc,
        discountPercent: pct,
        stock: Math.max(1, stockNum),
        maxClaimPerUser: effectiveIsFree ? 1 : undefined,
        distanceKm: 0.4,
        neighborhood: activeMerchant.neighborhood,
        pickupAddress: activeMerchant.address,
        pickupWindow: bagWindow.trim() || storeSettings.defaultPickupWindow,
        expiresAtMs: Date.now() + 90 * 60 * 1000,
        rating: activeMerchant.rating,
        reviewCount: 1,
        rescuedCount: 1,
        isNew: true,
        isMidnightDeal: bagIsMidnight,
        halal: bagHalal,
        vegetarian: bagVegetarian,
        nutFree: true,
        areaId: 'area-senopati',
        coordinates: { x: 48, y: 45 },
      };
      onCreateListing(newBag);
      showToast(`"${newBag.title}" dipublikasikan ke marketplace`);
    }

    setShowBagModal(false);
    setDashTab('bags');
  };

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftStoreName.trim() || !draftStoreAddress.trim()) return;
    onUpdateMerchant({
      ...activeMerchant,
      storeName: draftStoreName.trim(),
      category: draftStoreCategory,
      address: draftStoreAddress.trim(),
      neighborhood: draftStoreArea.trim() || 'Jakarta',
    });
    showToast('Profil & pengaturan toko disimpan');
  };

  const merchantNavTabs: {
    id: MerchantDashTab;
    label: string;
    mobileLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'orders',
      label: `Orders & Check-in (${orders.length})`,
      mobileLabel: 'Orders',
      icon: ClipboardList,
      badge: pendingPickupCount,
    },
    {
      id: 'bags',
      label: `Surplus Bags (${displayListings.length})`,
      mobileLabel: 'Bags',
      icon: Package,
    },
    {
      id: 'insights',
      label: 'Insights & Impact',
      mobileLabel: 'Insights',
      icon: BarChart3,
    },
    {
      id: 'store',
      label: 'Store Settings',
      mobileLabel: 'Store',
      icon: Settings,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
      {/* Feedback Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg dark:border dark:border-[#2E322E] dark:bg-[#1E211E]">
          {toastMsg}
        </div>
      )}

      {/* Merchant Top Header */}
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-[#141414] p-4 text-white sm:p-5 lg:flex-row lg:items-center dark:border dark:border-[#2A2D2A] dark:bg-[#161816]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#06C167] text-[#00210D] sm:h-12 sm:w-12">
            <Store className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-[#06C167]">TuGuTuGu Merchant</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  storeSettings.storeOpen
                    ? 'bg-[#06C167]/20 text-[#06C167]'
                    : 'bg-[#FFB020]/20 text-[#FFB020]'
                }`}
              >
                {storeSettings.storeOpen ? 'Open · Accepting Orders' : 'Paused'}
              </span>
            </div>
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">
              {activeMerchant.storeName}
            </h1>
            <p className="truncate text-xs text-[#A6A6A6]">{activeMerchant.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={() => {
              setQrInputCode(pendingPickupOrders[0]?.id ?? '');
              setShowQrModal(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold whitespace-nowrap text-white hover:bg-white/15 sm:px-3.5"
          >
            <ScanLine className="h-4 w-4 text-[#06C167]" />
            Verify QR
          </button>

          <button
            type="button"
            onClick={openAddBagModal}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#06C167] px-3 font-display text-xs font-bold whitespace-nowrap text-[#00210D] hover:bg-[#05b05d] sm:px-4"
          >
            <Plus className="h-4 w-4" />
            Add Bag
          </button>

          <button
            type="button"
            onClick={onExitToConsumer}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold whitespace-nowrap text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Consumer View
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 text-xs font-semibold whitespace-nowrap text-[#DCD9D9] hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">Active Surplus Bags</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
            {displayListings.reduce((sum, l) => sum + l.stock, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">Awaiting Pickup</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
            {pendingPickupCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">Unpaid COD Orders</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#9A5B00] tabular-nums dark:text-[#FFB020]">
            {unpaidCodCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 sm:p-4 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">Confirmed Revenue</p>
          <p className="mt-1 font-display text-lg font-bold text-[#006D37] tabular-nums sm:text-xl dark:text-[#06C167]">
            {formatRupiah(completedRevenue)}
          </p>
        </div>
      </div>

      {/* Desktop Tabs (Mobile uses fixed bottom nav below) */}
      <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto border-b border-[#E5E5E5] pb-3 md:flex dark:border-[#2A2D2A]">
        {merchantNavTabs.map((tab) => {
          const Icon = tab.icon;
          const active = dashTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDashTab(tab.id)}
              className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-black text-white dark:bg-white dark:text-[#0D0E0D]'
                  : 'bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:bg-[#272B27]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: ORDERS & CHECK-IN ==================== */}
      {dashTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
              <input
                type="search"
                value={orderLookup}
                onChange={(e) => setOrderLookup(e.target.value)}
                placeholder="Cari Order ID (SB-748219), nama customer, atau bag..."
                className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-white pr-4 pl-10 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:outline-none dark:border-[#2E322E] dark:bg-[#161816] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167]"
              />
            </div>

            {/* Order Status Filter Pills */}
            <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'ready', label: `Ready (${pendingPickupCount})` },
                  { id: 'cod', label: `Unpaid COD (${unpaidCodCount})` },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' },
                ] as { id: OrderFilterTab; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                    orderFilter === f.id
                      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-[#0D0E0D]'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6] dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#F5F5F5] dark:hover:bg-[#1E211E]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center dark:border-[#2A2D2A] dark:bg-[#161816]">
              <ClipboardList className="mx-auto h-9 w-9 text-[#6B6B6B] dark:text-[#A3A8A3]" />
              <p className="mt-2 font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Tidak ada pesanan di filter ini
              </p>
              <button
                type="button"
                onClick={() => {
                  setOrderFilter('all');
                  setOrderLookup('');
                }}
                className="mt-3 min-h-[38px] rounded-lg bg-black px-4 text-xs font-semibold text-white dark:bg-white dark:text-[#0D0E0D]"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredOrders.map((order) => {
                const isUnpaidCod =
                  order.paymentStatus === 'Pending (Cash on Pickup)' &&
                  order.pickupStatus === 'Ready for Pickup';
                const isReady = order.pickupStatus === 'Ready for Pickup';
                const isCancelled = order.pickupStatus === 'Cancelled';

                return (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-4 dark:border-[#2A2D2A] dark:bg-[#161816]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {order.id}
                        </span>
                        {isCancelled ? (
                          <span className="rounded-full bg-[#F6F6F6] px-2.5 py-0.5 text-[11px] font-bold text-[#6B6B6B] dark:bg-[#222522] dark:text-[#A3A8A3]">
                            Cancelled
                          </span>
                        ) : isUnpaidCod ? (
                          <span className="rounded-full bg-[#FFB020] px-2.5 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
                            UNPAID · CASH ON PICKUP
                          </span>
                        ) : order.type === 'free' ? (
                          <span className="rounded-full bg-[#06C167]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#006D37] dark:text-[#06C167]">
                            Free Claim
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#06C167]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#006D37] dark:text-[#06C167]">
                            {order.paymentStatus}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {order.quantity}× {order.listingTitle}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                        Customer:{' '}
                        <strong className="text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {order.customerName}
                        </strong>{' '}
                        · {order.pickupWindow}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5 border-t border-[#E5E5E5] pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2A2D2A]">
                      <span className="font-display text-base font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                        {order.totalAmount === 0 ? 'FREE' : formatRupiah(order.totalAmount)}
                      </span>

                      {isReady ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onCancelOrder(order.id);
                              showToast(`Order ${order.id} dibatalkan & stok dikembalikan`);
                            }}
                            className="min-h-[42px] rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-xs font-semibold text-[#6B6B6B] hover:text-[#B42318] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#A3A8A3] dark:hover:text-[#FCA5A5]"
                          >
                            Cancel
                          </button>

                          {isUnpaidCod ? (
                            <button
                              type="button"
                              onClick={() => {
                                onConfirmCodAndPickup(order.id);
                                showToast(`Pembayaran COD ${order.id} dikonfirmasi!`);
                              }}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#06C167] px-3.5 font-display text-xs font-bold text-[#00210D] hover:bg-[#05b05d] sm:flex-initial"
                            >
                              <Banknote className="h-4 w-4" />
                              Confirm Cash &amp; Hand Over
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onVerifyQrPickup(order.id);
                                showToast(`Order ${order.id} selesai diambil!`);
                              }}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 font-display text-xs font-semibold text-white hover:bg-[#1B1B1B] sm:flex-initial dark:bg-white dark:text-[#0D0E0D] dark:hover:bg-[#E5E5E5]"
                            >
                              <QrCode className="h-4 w-4" />
                              Verify QR &amp; Complete
                            </button>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            isCancelled
                              ? 'text-[#6B6B6B] dark:text-[#A3A8A3]'
                              : 'text-[#006D37] dark:text-[#06C167]'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {order.pickupStatus}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: SURPLUS BAGS MANAGEMENT ==================== */}
      {dashTab === 'bags' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
              Atur stok real-time, edit harga/jam pickup, atau publikasikan bag baru.
            </p>
            <button
              type="button"
              onClick={openAddBagModal}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-black px-3.5 font-display text-xs font-semibold text-white hover:bg-[#1B1B1B] dark:bg-white dark:text-[#0D0E0D] dark:hover:bg-[#E5E5E5]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Bag
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {displayListings.map((bag) => (
              <div
                key={bag.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-white p-4 dark:border-[#2A2D2A] dark:bg-[#161816]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={bag.image}
                      alt={bag.title}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#F6F6F6] px-2 py-0.5 text-[10px] font-semibold text-[#1A1A1A] dark:bg-[#222522] dark:text-[#E5E5E5]">
                          {bag.category}
                        </span>
                        <span className="rounded-full bg-[#06C167]/15 px-2 py-0.5 text-[10px] font-bold text-[#006D37] dark:text-[#06C167]">
                          {bag.discountedPrice <= 0 || bag.discountPercent >= 100
                            ? 'FREE'
                            : `-${bag.discountPercent}%`}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {bag.title}
                      </h3>
                      <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                        {formatRupiah(bag.discountedPrice)} · {bag.pickupWindow}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#E5E5E5] pt-3 dark:border-[#2A2D2A]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditBagModal(bag)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-2.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:bg-[#272B27]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteListing(bag.id);
                        showToast(`"${bag.title}" dihapus dari daftar`);
                      }}
                      aria-label={`Hapus ${bag.title}`}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-xs font-semibold text-[#6B6B6B] hover:border-[#F9C6BE] hover:bg-[#FFF0ED] hover:text-[#B42318] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#A3A8A3] dark:hover:border-[#6E2D26] dark:hover:bg-[#3A1B18] dark:hover:text-[#FCA5A5]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#006D37] tabular-nums dark:text-[#06C167]">
                      Stok: {bag.stock}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(bag.id, -1)}
                      disabled={bag.stock <= 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] font-bold text-[#1A1A1A] disabled:opacity-40 dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(bag.id, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] font-bold text-[#1A1A1A] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: INSIGHTS & IMPACT ==================== */}
      {dashTab === 'insights' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#141414] p-5 text-white dark:border dark:border-[#2A2D2A] dark:bg-[#161816]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#A6A6A6]">Food Waste Prevented</span>
                <Sparkles className="h-4 w-4 text-[#06C167]" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums">{totalFoodKg} kg</p>
              <p className="mt-1 text-xs text-[#A6A6A6]">
                {totalBagsSold} surplus bags terselamatkan · {totalCo2Kg} kg CO₂e dicegah
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Pending COD Cash
                </span>
                <Banknote className="h-4 w-4 text-[#9A5B00] dark:text-[#FFB020]" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                {formatRupiah(pendingCodTotal)}
              </p>
              <p className="mt-1 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                Dari {unpaidCodCount} pesanan menunggu pembayaran tunai di kasir
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Store Rating
                </span>
                <Star className="h-4 w-4 fill-[#FFB020] text-[#FFB020]" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                {activeMerchant.rating.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-[#006D37] dark:text-[#06C167]">
                Top 10% mitra penyelamat makanan di {activeMerchant.neighborhood}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Payment Mix */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <h3 className="font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Payment Method Mix
              </h3>
              <div className="mt-4 space-y-3 text-xs">
                {[
                  {
                    label: 'E-Wallet (GoPay, OVO, DANA, ShopeePay)',
                    count: paymentBreakdown.ewalletCount,
                    pct: paymentBreakdown.ewalletPct,
                    color: 'bg-[#06C167]',
                  },
                  {
                    label: 'Cash on Pickup (COD)',
                    count: paymentBreakdown.codCount,
                    pct: paymentBreakdown.codPct,
                    color: 'bg-[#FFB020]',
                  },
                  {
                    label: 'Free Community Share (Rp 0)',
                    count: paymentBreakdown.freeCount,
                    pct: paymentBreakdown.freePct,
                    color: 'bg-black dark:bg-white',
                  },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex justify-between font-medium">
                      <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">{bar.label}</span>
                      <span className="text-[#6B6B6B] tabular-nums dark:text-[#A3A8A3]">
                        {bar.count} order ({bar.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F6F6F6] dark:bg-[#222522]">
                      <div
                        className={`h-full rounded-full ${bar.color}`}
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Bags Snapshot */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <h3 className="font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Top Performing Bags
              </h3>
              <div className="mt-3 space-y-2.5">
                {displayListings.slice(0, 3).map((bag) => (
                  <div
                    key={bag.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F6F6] p-3 dark:bg-[#1E211E]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {bag.title}
                      </p>
                      <p className="text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                        {bag.rescuedCount} terjual · Sisa {bag.stock}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-xs font-bold text-[#006D37] tabular-nums dark:text-[#06C167]">
                      {formatRupiah(bag.discountedPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: STORE SETTINGS & PAYOUT ==================== */}
      {dashTab === 'store' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Store Availability + Profile Form */}
          <div className="space-y-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3.5 dark:border-[#2A2D2A]">
              <div>
                <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Store Profile &amp; Status
                </h3>
                <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Ubah nama toko, kategori, dan jam pickup default
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#F6F6F6] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]">
                <span>{storeSettings.storeOpen ? 'Open' : 'Paused'}</span>
                <input
                  type="checkbox"
                  checked={storeSettings.storeOpen}
                  onChange={() => {
                    setStoreSettings((s) => ({ ...s, storeOpen: !s.storeOpen }));
                    showToast(
                      storeSettings.storeOpen
                        ? 'Toko dijeda sementara dari order baru'
                        : 'Toko kembali buka menerima reservasi!'
                    );
                  }}
                  className="h-4 w-4 accent-[#06C167]"
                />
              </label>
            </div>

            <form onSubmit={handleSaveStoreProfile} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Store Name
                </label>
                <input
                  type="text"
                  value={draftStoreName}
                  onChange={(e) => setDraftStoreName(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Category
                  </label>
                  <select
                    value={draftStoreCategory}
                    onChange={(e) => setDraftStoreCategory(e.target.value as FoodCategory)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  >
                    <option value="Bakery">Bakery</option>
                    <option value="Meals">Meals</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Snacks & Deli">Snacks &amp; Deli</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    value={draftStoreArea}
                    onChange={(e) => setDraftStoreArea(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Pickup Address
                </label>
                <input
                  type="text"
                  value={draftStoreAddress}
                  onChange={(e) => setDraftStoreAddress(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Default Pickup Window
                  </label>
                  <input
                    type="text"
                    value={storeSettings.defaultPickupWindow}
                    onChange={(e) =>
                      setStoreSettings((s) => ({ ...s, defaultPickupWindow: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Pickup Counter Notes
                  </label>
                  <input
                    type="text"
                    value={storeSettings.pickupNotes}
                    onChange={(e) =>
                      setStoreSettings((s) => ({ ...s, pickupNotes: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl bg-black font-display text-xs font-semibold text-white hover:bg-[#1B1B1B] dark:bg-white dark:text-[#0D0E0D] dark:hover:bg-[#E5E5E5]"
              >
                Simpan Pengaturan Toko
              </button>
            </form>
          </div>

          {/* Payout & Merchant Alert Settings */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3 dark:border-[#2A2D2A]">
                <Wallet className="h-5 w-5 text-[#006D37] dark:text-[#06C167]" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Payout &amp; Settlement
                  </h3>
                  <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                    Rekening pencairan dana transaksi E-Wallet
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5 dark:border-[#2E322E] dark:bg-[#1E211E]">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-[#1A1A1A] dark:text-[#F5F5F5]" />
                    <div>
                      <p className="font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {storeSettings.payoutChannel} · {storeSettings.payoutAccountNumber}
                      </p>
                      <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                        a.n. {storeSettings.payoutAccountName}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#06C167] px-2.5 py-0.5 text-[10px] font-bold text-[#00210D]">
                    Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['Bank BCA', 'Bank Mandiri', 'GoPay Merchant', 'OVO Bisnis'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setStoreSettings((s) => ({ ...s, payoutChannel: ch }));
                        showToast(`Tujuan pencairan diubah ke ${ch}`);
                      }}
                      className={`min-h-[38px] rounded-lg border px-3 text-xs font-semibold ${
                        storeSettings.payoutChannel === ch
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-[#0D0E0D]'
                          : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:bg-[#272B27]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3 text-xs dark:border-[#2E322E] dark:bg-[#1E211E]">
                  <div>
                    <p className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      Auto-Settlement Harian (23:59 WIB)
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                      Cairkan otomatis pendapatan E-Wallet setiap malam
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={storeSettings.autoSettleDaily}
                    onChange={() =>
                      setStoreSettings((s) => ({ ...s, autoSettleDaily: !s.autoSettleDaily }))
                    }
                    className="h-4 w-4 accent-[#06C167]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 dark:border-[#2A2D2A] dark:bg-[#161816]">
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3 dark:border-[#2A2D2A]">
                <Bell className="h-5 w-5 text-[#1A1A1A] dark:text-[#F5F5F5]" />
                <h3 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Notifikasi Kasir &amp; Stok
                </h3>
              </div>
              <div className="mt-3 space-y-2.5">
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#F6F6F6] p-3 text-xs dark:bg-[#1E211E]">
                  <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Suara &amp; Alert Pesanan Baru
                  </span>
                  <input
                    type="checkbox"
                    checked={storeSettings.instantOrderAlert}
                    onChange={() =>
                      setStoreSettings((s) => ({
                        ...s,
                        instantOrderAlert: !s.instantOrderAlert,
                      }))
                    }
                    className="h-4 w-4 accent-[#06C167]"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#F6F6F6] p-3 text-xs dark:bg-[#1E211E]">
                  <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Peringatan Saat Stok Bag Tinggal 1
                  </span>
                  <input
                    type="checkbox"
                    checked={storeSettings.lowStockAlert}
                    onChange={() =>
                      setStoreSettings((s) => ({ ...s, lowStockAlert: !s.lowStockAlert }))
                    }
                    className="h-4 w-4 accent-[#06C167]"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MOBILE BOTTOM NAV FOR MERCHANT MODE ==================== */}
      <nav
        aria-label="Merchant mobile navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-[#E5E5E5] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-[#2A2D2A] dark:bg-[#141614]/95"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          {merchantNavTabs.map((item) => {
            const Icon = item.icon;
            const active = dashTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDashTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 ${
                  active ? 'text-black dark:text-white' : 'text-[#6B6B6B] dark:text-[#8E948E]'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#06C167] px-1 text-[10px] font-bold text-[#00210D] tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.mobileLabel}
                </span>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#06C167]" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==================== MODAL 1: ADD / EDIT SURPRISE BAG ==================== */}
      {showBagModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
          onClick={() => setShowBagModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
            </div>
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#006D37] dark:text-[#06C167]" />
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {editingBag ? 'Edit Surprise Bag' : 'Publish Surprise Bag'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBagModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveBag}
              className="flex-1 space-y-3.5 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Bag Title
                </label>
                <input
                  type="text"
                  required
                  value={bagTitle}
                  onChange={(e) => setBagTitle(e.target.value)}
                  placeholder="e.g., Evening Pastry Rescue Box"
                  className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Foto Bag
                </label>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {BAG_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.src}
                      type="button"
                      onClick={() => setBagImage(preset.src)}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                        bagImage === preset.src ? 'border-[#06C167]' : 'border-transparent'
                      }`}
                      title={preset.label}
                    >
                      <img
                        src={preset.src}
                        alt={preset.label}
                        className="h-12 w-12 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Category
                  </label>
                  <select
                    value={bagCategory}
                    onChange={(e) => setBagCategory(e.target.value as FoodCategory)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                  >
                    <option value="Bakery">Bakery</option>
                    <option value="Meals">Meals</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Snacks & Deli">Snacks &amp; Deli</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Pickup Window
                  </label>
                  <input
                    type="text"
                    value={bagWindow}
                    onChange={(e) => setBagWindow(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] tabular-nums dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 py-2.5 text-xs font-semibold text-[#1A1A1A] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]">
                <span>Offer as Free Community Food (Rp 0)</span>
                <input
                  type="checkbox"
                  checked={bagIsFree}
                  onChange={(e) => setBagIsFree(e.target.checked)}
                  className="h-4 w-4 accent-[#06C167]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Original Price (Rp)
                  </label>
                  <input
                    type="number"
                    value={bagOriginal}
                    onChange={(e) => setBagOriginal(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] tabular-nums dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                  />
                </div>
                {!bagIsFree && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      Rescue Price (Rp)
                    </label>
                    <input
                      type="number"
                      value={bagDiscounted}
                      onChange={(e) => setBagDiscounted(e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] tabular-nums dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Available Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={bagStock}
                    onChange={(e) => setBagStock(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-sm text-[#1A1A1A] tabular-nums dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]"
                  />
                </div>
                <div className="flex flex-col justify-end gap-1.5 text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={bagHalal}
                      onChange={(e) => setBagHalal(e.target.checked)}
                      className="h-4 w-4 accent-[#06C167]"
                    />
                    Halal
                  </label>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={bagVegetarian}
                      onChange={(e) => setBagVegetarian(e.target.checked)}
                      className="h-4 w-4 accent-[#06C167]"
                    />
                    Vegetarian
                  </label>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={bagIsMidnight}
                      onChange={(e) => setBagIsMidnight(e.target.checked)}
                      className="h-4 w-4 accent-[#06C167]"
                    />
                    Midnight Deal
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={bagDescription}
                  onChange={(e) => setBagDescription(e.target.value)}
                  placeholder="Isi perkiraan paket..."
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] p-2.5 text-xs text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
                />
              </div>

              <button
                type="submit"
                className="mt-1 min-h-[48px] w-full rounded-xl bg-[#06C167] font-display text-sm font-bold text-[#00210D] hover:bg-[#05b05d]"
              >
                {editingBag ? 'Save Bag Changes' : 'Publish to Marketplace'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: QR CHECK-IN & COD VERIFICATION ==================== */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
          onClick={() => setShowQrModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
            </div>
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#006D37] dark:text-[#06C167]" />
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Verify Customer QR / Order ID
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="rounded-xl border border-dashed border-[#06C167] bg-[#06C167]/10 p-4 text-center">
                <ScanLine className="mx-auto h-8 w-8 text-[#006D37] dark:text-[#06C167]" />
                <p className="mt-1.5 text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Simulasi Scan QR / Masukkan Kode Order
                </p>
                <p className="mt-0.5 text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Ketik Order ID dari QR konsumen atau pilih antrean siap ambil di bawah.
                </p>
              </div>

              <input
                type="text"
                value={qrInputCode}
                onChange={(e) => setQrInputCode(e.target.value)}
                placeholder="Contoh: SB-748219 atau FREE-903142"
                className="h-12 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 font-mono text-sm font-bold text-[#1A1A1A] uppercase placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:placeholder:text-[#8E948E] dark:focus:border-[#06C167] dark:focus:bg-[#141614]"
              />

              {pendingPickupOrders.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-[#6B6B6B] dark:text-[#A3A8A3]">
                    Antrean siap ambil (ketuk untuk isi kode):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingPickupOrders.map((po) => (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setQrInputCode(po.id)}
                        className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${
                          qrInputCode.toUpperCase() === po.id.toUpperCase()
                            ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-[#0D0E0D]'
                            : 'border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5]'
                        }`}
                      >
                        {po.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {qrMatchedOrder ? (
                <div className="rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 dark:border-[#2E322E] dark:bg-[#1E211E]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {qrMatchedOrder.id}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        qrMatchedOrder.paymentStatus === 'Pending (Cash on Pickup)'
                          ? 'bg-[#FFB020] text-[#1A1A1A]'
                          : 'bg-[#06C167] text-[#00210D]'
                      }`}
                    >
                      {qrMatchedOrder.paymentStatus}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {qrMatchedOrder.quantity}× {qrMatchedOrder.listingTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-[#4C4546] dark:text-[#C8CDC8]">
                    Customer: <strong>{qrMatchedOrder.customerName}</strong> ·{' '}
                    <Clock className="inline h-3 w-3" /> {qrMatchedOrder.pickupWindow}
                  </p>
                  <p className="mt-2 font-display text-base font-bold text-[#006D37] tabular-nums dark:text-[#06C167]">
                    {qrMatchedOrder.totalAmount === 0
                      ? 'FREE CLAIM (Rp 0)'
                      : formatRupiah(qrMatchedOrder.totalAmount)}
                  </p>

                  {qrMatchedOrder.pickupStatus === 'Ready for Pickup' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (qrMatchedOrder.paymentStatus === 'Pending (Cash on Pickup)') {
                          onConfirmCodAndPickup(qrMatchedOrder.id);
                          showToast(`COD ${qrMatchedOrder.id} lunas & selesai!`);
                        } else {
                          onVerifyQrPickup(qrMatchedOrder.id);
                          showToast(`QR ${qrMatchedOrder.id} terverifikasi!`);
                        }
                        setShowQrModal(false);
                      }}
                      className="mt-3 min-h-[46px] w-full rounded-xl bg-[#06C167] font-display text-xs font-bold text-[#00210D] hover:bg-[#05b05d]"
                    >
                      {qrMatchedOrder.paymentStatus === 'Pending (Cash on Pickup)'
                        ? 'Terima Tunai & Serahkan Bag'
                        : 'Verifikasi QR & Selesaikan Pickup'}
                    </button>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-[#006D37] dark:text-[#06C167]">
                      Status: {qrMatchedOrder.pickupStatus}
                    </p>
                  )}
                </div>
              ) : qrInputCode.trim() ? (
                <p className="text-xs font-medium text-[#B42318] dark:text-[#FCA5A5]">
                  Order ID "{qrInputCode}" tidak ditemukan.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
