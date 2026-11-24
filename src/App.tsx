/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Compass,
  Home,
  ReceiptText,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import {
  ConsumerTab,
  EWalletProvider,
  FoodCategory,
  FoodListing,
  LocationOption,
  MerchantAccount,
  NotificationItem,
  OrderRecord,
} from './types/marketplace';
import {
  INITIAL_LISTINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  LOCATION_OPTIONS,
} from './data/mockMarketplace';
import { ConsumerHome } from './components/ConsumerHome';
import { ConsumerSearch } from './components/ConsumerSearch';
import { ConsumerExplore } from './components/ConsumerExplore';
import { ConsumerOrders } from './components/ConsumerOrders';
import { ConsumerProfile, CustomerProfileData } from './components/ConsumerProfile';
import { ConsumerAuth } from './components/ConsumerAuth';
import { ListingDetailSheet } from './components/ListingDetailSheet';
import { CheckoutFlow } from './components/CheckoutFlow';
import { MerchantPortal } from './components/MerchantPortal';

const DEFAULT_PROFILE: CustomerProfileData = {
  name: 'Nadia Pratama',
  email: 'nadia.pratama@tugutugu.id',
  phone: '+62 812-8842-4890',
};

export default function App() {
  const [listings, setListings] = useState<FoodListing[]>(INITIAL_LISTINGS);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(LOCATION_OPTIONS[0]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(['bag-01', 'bag-04']);
  const [collectedStamps, setCollectedStamps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_stamps');
      return saved ? (JSON.parse(saved) as string[]) : ['m-sakura', 'm-dailybatch'];
    } catch {
      return ['m-sakura', 'm-dailybatch'];
    }
  });

  const [customerProfile, setCustomerProfile] = useState<CustomerProfileData>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_profile');
      if (saved) return JSON.parse(saved) as CustomerProfileData;
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });
  const [defaultWallet, setDefaultWallet] = useState<EWalletProvider>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_default_wallet');
      if (
        saved === 'GoPay' ||
        saved === 'OVO' ||
        saved === 'DANA' ||
        saved === 'ShopeePay'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'GoPay';
  });

  useEffect(() => {
    try {
      localStorage.setItem('tugutugu_profile', JSON.stringify(customerProfile));
    } catch {
      // Ignore storage quota errors in prototype mode
    }
  }, [customerProfile]);

  useEffect(() => {
    try {
      localStorage.setItem('tugutugu_default_wallet', defaultWallet);
    } catch {
      // Ignore storage quota errors in prototype mode
    }
  }, [defaultWallet]);

  useEffect(() => {
    try {
      localStorage.setItem('tugutugu_stamps', JSON.stringify(collectedStamps));
    } catch {
      // Ignore storage quota errors in prototype mode
    }
  }, [collectedStamps]);

  const handleResetDemoData = () => {
    try {
      [
        'tugutugu_stamps',
        'tugutugu_profile',
        'tugutugu_default_wallet',
        'tugutugu_saved_locations',
        'tugutugu_wallets',
        'tugutugu_dietary_prefs',
        'tugutugu_alert_settings',
        'tugutugu_wishlist_alerts',
        'tugutugu_security_settings',
        'tugutugu_merchant_account',
        'tugutugu_merchant_settings',
      ].forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
    setCustomerProfile(DEFAULT_PROFILE);
    setDefaultWallet('GoPay');
    setSelectedLocation(LOCATION_OPTIONS[0]);
    setCollectedStamps(['m-sakura', 'm-dailybatch']);
    setMerchantAccount(null);
    setListings(INITIAL_LISTINGS);
    setOrders(INITIAL_ORDERS);
    setNotifications(INITIAL_NOTIFICATIONS);
  };

  // Consumer Navigation
  const [activeTab, setActiveTab] = useState<ConsumerTab>('home');
  const [searchSeedQuery, setSearchSeedQuery] = useState('');
  const [searchSeedCategory, setSearchSeedCategory] = useState<FoodCategory | 'All'>('All');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Detail & Checkout Overlays
  const [detailListing, setDetailListing] = useState<FoodListing | null>(null);
  const [checkoutListing, setCheckoutListing] = useState<FoodListing | null>(null);

  // Theme State (light | dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('tugutugu_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Consumer Auth Flow
  const [isConsumerAuthenticated, setIsConsumerAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_consumer_auth');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('tugutugu_consumer_auth', String(isConsumerAuthenticated));
    } catch {
      // ignore
    }
  }, [isConsumerAuthenticated]);

  // Merchant Flow Mode
  const [appMode, setAppMode] = useState<'consumer' | 'merchant'>('consumer');
  const [merchantViewMode, setMerchantViewMode] = useState<'login' | 'register' | 'dashboard'>(
    'login'
  );
  const [merchantAccount, setMerchantAccount] = useState<MerchantAccount | null>(() => {
    try {
      const saved = localStorage.getItem('tugutugu_merchant_account');
      if (saved) return JSON.parse(saved) as MerchantAccount;
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      if (merchantAccount) {
        localStorage.setItem('tugutugu_merchant_account', JSON.stringify(merchantAccount));
      } else {
        localStorage.removeItem('tugutugu_merchant_account');
      }
    } catch {
      // ignore
    }
  }, [merchantAccount]);

  const activeOrdersCount = orders.filter((o) => o.pickupStatus === 'Ready for Pickup').length;

  const recordRecentlyViewed = (listingId: string) => {
    setRecentlyViewedIds((prev) => [listingId, ...prev.filter((id) => id !== listingId)].slice(0, 6));
  };

  const handleSelectListing = (listing: FoodListing) => {
    recordRecentlyViewed(listing.id);
    setDetailListing(listing);
  };

  const handleQuickAction = (listing: FoodListing) => {
    recordRecentlyViewed(listing.id);
    setDetailListing(null);
    setCheckoutListing(listing);
  };

  const handleSearchFromHome = (query: string, category: FoodCategory | 'All' = 'All') => {
    setSearchSeedQuery(query);
    setSearchSeedCategory(category);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollectStamp = (merchantId: string) => {
    setCollectedStamps((prev) => (prev.includes(merchantId) ? prev : [...prev, merchantId]));
  };

  const handleCompleteOrder = (newOrder: OrderRecord) => {
    setOrders((prev) => [newOrder, ...prev]);
    setListings((prev) =>
      prev.map((item) =>
        item.id === newOrder.listingId
          ? { ...item, stock: Math.max(0, item.stock - newOrder.quantity) }
          : item
      )
    );
    handleCollectStamp(newOrder.merchantId);
  };

  const handleViewMyOrder = (orderId: string) => {
    setCheckoutListing(null);
    setDetailListing(null);
    setHighlightedOrderId(orderId);
    setActiveTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelOrder = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.pickupStatus !== 'Ready for Pickup') return;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, pickupStatus: 'Cancelled' } : o))
    );
    setListings((prev) =>
      prev.map((l) =>
        l.id === target.listingId ? { ...l, stock: l.stock + target.quantity } : l
      )
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Merchant Actions
  const handleOpenMerchantLogin = () => {
    setAppMode('merchant');
    setMerchantViewMode(merchantAccount ? 'dashboard' : 'login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMerchantRegister = () => {
    setAppMode('merchant');
    setMerchantViewMode('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMerchantAuthenticate = (merchant: MerchantAccount) => {
    setMerchantAccount(merchant);
    setMerchantViewMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMerchantLogout = () => {
    setMerchantAccount(null);
    setAppMode('consumer');
    setActiveTab('profile');
  };

  const handleConsumerLogout = () => {
    setDetailListing(null);
    setCheckoutListing(null);
    setAppMode('consumer');
    setIsConsumerAuthenticated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsumerAuthenticate = (nextProfile: CustomerProfileData) => {
    setCustomerProfile(nextProfile);
    setIsConsumerAuthenticated(true);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmCodAndPickup = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, paymentStatus: 'Paid', pickupStatus: 'Completed' }
          : o
      )
    );
  };

  const handleVerifyQrPickup = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, pickupStatus: 'Completed' } : o))
    );
  };

  const handleUpdateMerchant = (updated: MerchantAccount) => {
    setMerchantAccount(updated);
    setListings((prev) =>
      prev.map((l) =>
        l.merchantId === updated.id
          ? {
              ...l,
              merchantName: updated.storeName,
              pickupAddress: updated.address,
              neighborhood: updated.neighborhood,
            }
          : l
      )
    );
  };

  const handleAdjustStock = (listingId: string, delta: number) => {
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, stock: Math.max(0, l.stock + delta) } : l))
    );
  };

  const handleCreateListing = (newBag: FoodListing) => {
    setListings((prev) => [newBag, ...prev]);
  };

  const handleUpdateListing = (updatedBag: FoodListing) => {
    setListings((prev) => prev.map((l) => (l.id === updatedBag.id ? updatedBag : l)));
  };

  const handleDeleteListing = (listingId: string) => {
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  };

  // Enforce user login before accessing consumer or merchant views
  if (!isConsumerAuthenticated) {
    return (
      <ConsumerAuth
        defaultEmail={customerProfile.email}
        onAuthenticate={handleConsumerAuthenticate}
      />
    );
  }

  // Render Merchant Mode (only accessible after logging in as user)
  if (appMode === 'merchant') {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#FCF9F8] dark:bg-[#0D0E0D]">
        <MerchantPortal
          mode={merchantViewMode}
          merchant={merchantAccount}
          listings={listings}
          orders={orders}
          onChangeMode={setMerchantViewMode}
          onExitToConsumer={() => {
            setAppMode('consumer');
            setActiveTab('profile');
          }}
          onAuthenticate={handleMerchantAuthenticate}
          onUpdateMerchant={handleUpdateMerchant}
          onLogout={handleMerchantLogout}
          onConfirmCodAndPickup={handleConfirmCodAndPickup}
          onVerifyQrPickup={handleVerifyQrPickup}
          onCancelOrder={handleCancelOrder}
          onAdjustStock={handleAdjustStock}
          onCreateListing={handleCreateListing}
          onUpdateListing={handleUpdateListing}
          onDeleteListing={handleDeleteListing}
        />
      </div>
    );
  }

  const navItems: {
    id: ConsumerTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'orders', label: 'Orders', icon: ReceiptText, badge: activeOrdersCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] dark:bg-[#0D0E0D] dark:text-[#F3F4F6] md:pb-10">
      {/* Mobile Compact Brand Strip (non-sticky so sticky height stays strictly under mobile cap) */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] bg-white px-4 py-2.5 dark:border-[#262926] dark:bg-[#141614] md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center text-left"
        >
          <span className="font-display text-base font-bold tracking-tight text-black dark:text-white">
            TuGu<span className="text-[#006D37] dark:text-[#06C167]">TuGu</span>
          </span>
        </button>

        {activeOrdersCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#F6F6F6] px-3 py-1 text-xs font-semibold text-[#1A1A1A] dark:bg-[#1E211E] dark:text-[#F3F4F6]"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-[#006D37] dark:text-[#06C167]" />
            <span className="tabular-nums">{activeOrdersCount} active</span>
          </button>
        )}
      </div>

      {/* Desktop Top Navigation Bar (clean 3-zone contract) */}
      <header className="sticky top-0 z-30 hidden border-b border-[#E5E5E5] bg-white/95 backdrop-blur-md dark:border-[#262926] dark:bg-[#141614]/95 md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center font-display text-xl font-bold tracking-tight text-black whitespace-nowrap shrink-0 dark:text-white"
          >
            <span>
              TuGu<span className="text-[#006D37] dark:text-[#06C167]">TuGu</span>
            </span>
          </button>

          <nav className="flex items-center gap-7" aria-label="Consumer navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'font-semibold text-black after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-[#06C167] dark:text-white'
                      : 'text-[#6B6B6B] hover:text-black dark:text-[#A3A8A3] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-black px-4 font-display text-xs font-semibold text-white whitespace-nowrap shrink-0 hover:bg-[#1B1B1B] dark:bg-[#1E211E] dark:border dark:border-[#2E322E] dark:hover:bg-[#272B27]"
          >
            <ShoppingBag className="h-4 w-4 text-[#06C167]" />
            <span>Active Pickups ({activeOrdersCount})</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {activeTab === 'home' && (
          <ConsumerHome
            listings={listings}
            recentlyViewedIds={recentlyViewedIds}
            selectedLocation={selectedLocation}
            notifications={notifications}
            onSelectLocation={setSelectedLocation}
            onMarkAllRead={handleMarkAllRead}
            onSearchSubmit={handleSearchFromHome}
            onSelectListing={handleSelectListing}
            onQuickAction={handleQuickAction}
          />
        )}

        {activeTab === 'search' && (
          <ConsumerSearch
            key={`${searchSeedQuery}-${searchSeedCategory}`}
            listings={listings}
            initialQuery={searchSeedQuery}
            initialCategory={searchSeedCategory}
            onSelectListing={handleSelectListing}
            onQuickAction={handleQuickAction}
          />
        )}

        {activeTab === 'explore' && (
          <ConsumerExplore
            listings={listings}
            orders={orders}
            collectedStamps={collectedStamps}
            onCollectStamp={handleCollectStamp}
            onSelectListing={handleSelectListing}
            onQuickAction={handleQuickAction}
          />
        )}

        {activeTab === 'orders' && (
          <ConsumerOrders
            orders={orders}
            listings={listings}
            highlightedOrderId={highlightedOrderId}
            onClearHighlight={() => setHighlightedOrderId(null)}
            onCancelOrder={handleCancelOrder}
            onExploreHome={() => setActiveTab('home')}
            onSelectListing={handleSelectListing}
          />
        )}

        {activeTab === 'profile' && (
          <ConsumerProfile
            profile={customerProfile}
            onUpdateProfile={setCustomerProfile}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            defaultWallet={defaultWallet}
            onSelectDefaultWallet={setDefaultWallet}
            orders={orders}
            collectedStampsCount={collectedStamps.length}
            theme={theme}
            onChangeTheme={setTheme}
            onOpenMerchantLogin={handleOpenMerchantLogin}
            onOpenMerchantRegister={handleOpenMerchantRegister}
            onNavigateOrders={() => setActiveTab('orders')}
            onLogout={handleConsumerLogout}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation (Home, Search, Explore, Orders, Profile) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-[#E5E5E5] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-[#262926] dark:bg-[#141614]/95 md:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-black dark:text-white'
                    : 'text-[#6B6B6B] dark:text-[#9CA39E]'
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
                  {item.label}
                </span>
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#06C167]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Listing Detail Modal / Bottom Sheet */}
      <ListingDetailSheet
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        onStartAction={handleQuickAction}
      />

      {/* Checkout / Free Claim Flow Modal */}
      {checkoutListing && (
        <CheckoutFlow
          key={checkoutListing.id}
          listing={checkoutListing}
          customerName={customerProfile.name}
          defaultWallet={defaultWallet}
          onClose={() => setCheckoutListing(null)}
          onCompleteOrder={handleCompleteOrder}
          onViewMyOrder={handleViewMyOrder}
        />
      )}
    </div>
  );
}
