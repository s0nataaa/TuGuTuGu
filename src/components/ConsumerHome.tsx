import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Clock,
  Coffee,
  Croissant,
  Flame,
  Gift,
  HeartHandshake,
  MapPin,
  Moon,
  Search,
  ShoppingBasket,
  Sparkles,
  Star,
  Store,
  Tag,
  Utensils,
  X,
} from 'lucide-react';
import {
  FoodCategory,
  FoodListing,
  LocationOption,
  NotificationItem,
} from '../types/marketplace';
import {
  HERO_BANNER_IMAGE,
  LOCATION_OPTIONS,
  MIDNIGHT_BANNER_IMAGE,
} from '../data/mockMarketplace';
import { FoodCard } from './FoodCard';
import { HorizontalCarousel } from './HorizontalCarousel';

interface ConsumerHomeProps {
  listings: FoodListing[];
  recentlyViewedIds: string[];
  selectedLocation: LocationOption;
  notifications: NotificationItem[];
  onSelectLocation: (loc: LocationOption) => void;
  onMarkAllRead: () => void;
  onSearchSubmit: (query: string, category?: FoodCategory | 'All') => void;
  onSelectListing: (listing: FoodListing) => void;
  onQuickAction: (listing: FoodListing) => void;
}

const CATEGORIES: {
  id: FoodCategory;
  label: string;
  countLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'Bakery', label: 'Bakery', countLabel: 'Bread & pastry', icon: Croissant },
  { id: 'Meals', label: 'Meals', countLabel: 'Bento & bowls', icon: Utensils },
  { id: 'Drinks', label: 'Drinks', countLabel: 'Coffee & tea', icon: Coffee },
  { id: 'Desserts', label: 'Desserts', countLabel: 'Cakes & tarts', icon: Sparkles },
  { id: 'Groceries', label: 'Groceries', countLabel: 'Fresh produce', icon: ShoppingBasket },
  { id: 'Snacks & Deli', label: 'Other', countLabel: 'Deli & wraps', icon: Store },
];

function formatCountdown(expiresAtMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m left`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} left`;
}

export const ConsumerHome: React.FC<ConsumerHomeProps> = ({
  listings,
  recentlyViewedIds,
  selectedLocation,
  notifications,
  onSelectLocation,
  onMarkAllRead,
  onSearchSubmit,
  onSelectListing,
  onQuickAction,
}) => {
  const [searchText, setSearchText] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const midnightDeals = listings.filter((l) => l.isMidnightDeal);
  const freeFood = listings.filter((l) => l.discountedPrice === 0);
  const upTo90Off = [...listings]
    .filter((l) => l.discountedPrice > 0 && l.discountPercent >= 75)
    .sort((a, b) => b.discountPercent - a.discountPercent);
  const almostGone = listings.filter((l) => l.stock > 0 && l.stock <= 3);
  const rescueNearYou = [...listings].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);
  const endingSoon = [...listings]
    .filter((l) => l.expiresAtMs > nowMs)
    .sort((a, b) => a.expiresAtMs - b.expiresAtMs)
    .slice(0, 6);
  const bestDealsToday = listings.filter((l) => l.isBestDeal).slice(0, 3);
  const popularNearYou = listings.filter((l) => l.isPopular);
  const bakeryRescue = listings.filter((l) => l.category === 'Bakery');
  const mealDeals = listings.filter((l) => l.category === 'Meals');
  const sweetTreats = listings.filter((l) => l.category === 'Desserts');
  const newOnPlatform = listings.filter((l) => l.isNew);
  const weekendSpecials = listings.filter((l) => l.isWeekendSpecial);
  const recommendedForYou = listings.filter((l) => l.isRecommended);
  const recentlyViewed = recentlyViewedIds
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is FoodListing => Boolean(l));

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchText.trim());
  };

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      {/* TOP BAR: Location Selector + Notification Icon + Prominent Search Bar */}
      <div className="space-y-3 pt-2.5 sm:pt-3">
        <div className="relative flex items-center justify-between gap-2.5">
          {/* Location Selector */}
          <button
            type="button"
            onClick={() => {
              setLocationOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#F6F6F6] px-3 py-2 text-left transition-colors hover:bg-[#EAE7E7] sm:flex-initial sm:max-w-xs"
          >
            <MapPin className="h-4 w-4 shrink-0 text-[#006D37]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-[#6B6B6B] sm:text-[11px]">
                Rescuing near
              </p>
              <p className="truncate font-display text-xs font-bold text-[#1A1A1A] sm:text-sm">
                {selectedLocation.label}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
          </button>

          {/* Notification Icon */}
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setLocationOpen(false);
            }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] transition-colors hover:bg-[#EAE7E7]"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#06C167] px-1 text-[10px] font-bold text-[#00210D] tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Location Dropdown (Full width on mobile, anchored left on desktop) */}
          {locationOpen && (
            <div className="absolute top-14 right-0 left-0 z-30 rounded-2xl border border-[#E5E5E5] bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.14)] sm:right-auto sm:w-full sm:max-w-sm">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-display text-sm font-bold text-[#1A1A1A]">
                  Choose Pickup Neighborhood
                </span>
                <button
                  type="button"
                  onClick={() => setLocationOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {LOCATION_OPTIONS.map((loc) => {
                  const active = loc.id === selectedLocation.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onSelectLocation(loc);
                        setLocationOpen(false);
                      }}
                      className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-black font-semibold text-white'
                          : 'text-[#1A1A1A] hover:bg-[#F6F6F6]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate">{loc.label}</p>
                        <p className={`text-xs ${active ? 'text-white/75' : 'text-[#6B6B6B]'}`}>
                          {loc.area}, {loc.city}
                        </p>
                      </div>
                      {active && (
                        <span className="shrink-0 rounded-full bg-[#06C167] px-2 py-0.5 text-[10px] font-bold text-[#00210D]">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notifications Popover (Full width on mobile, anchored right on desktop) */}
          {notifOpen && (
            <div className="absolute top-14 right-0 left-0 z-30 rounded-2xl border border-[#E5E5E5] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.14)] sm:left-auto sm:w-full sm:max-w-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-[#1A1A1A]">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-xs font-semibold text-[#006D37] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      if (notif.listingId) {
                        const target = listings.find((l) => l.id === notif.listingId);
                        if (target) onSelectListing(target);
                      }
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      notif.read
                        ? 'border-[#E5E5E5] bg-white'
                        : 'border-[#06C167]/40 bg-[#06C167]/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#1A1A1A]">{notif.title}</p>
                      <span className="shrink-0 text-[11px] text-[#6B6B6B]">{notif.timeAgo}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#4C4546]">{notif.message}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prominent Search Bar */}
        <form onSubmit={handleSearchFormSubmit} className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B6B6B] sm:left-4 sm:h-5 sm:w-5" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search bakeries, bento, or free food..."
            className="h-12 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-22 pl-10 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none sm:pr-24 sm:pl-11"
          />
          <button
            type="submit"
            className="absolute top-1/2 right-1.5 min-h-[36px] -translate-y-1/2 rounded-lg bg-black px-3 py-1.5 font-display text-xs font-semibold text-white transition-colors hover:bg-[#1B1B1B] sm:px-3.5 sm:py-2"
          >
            Search
          </button>
        </form>
      </div>

      {/* HERO CAMPAIGN BANNER */}
      <section className="relative overflow-hidden rounded-2xl bg-black text-white">
        <img
          src={HERO_BANNER_IMAGE}
          alt="Freshly packed surplus dining surprise bag"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/35 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/70 sm:to-black/25" />
        <div className="relative z-10 flex flex-col justify-between gap-4 p-4 sm:p-8 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-[#06C167] px-2.5 py-1 text-[11px] font-bold text-[#00210D] sm:px-3 sm:text-xs">
              TuGuTuGu Drop · Save up to 90%
            </span>
            <h1 className="mt-2.5 font-display text-xl font-bold leading-snug tracking-tight text-balance sm:mt-3 sm:text-3xl">
              Rescue fresh surplus food near {selectedLocation.area}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-white/85 sm:mt-2 sm:text-sm">
              Reserve unsold artisan pastries, dinner bentos, and zero-cost community bags before
              closing time.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onSearchSubmit('', 'All')}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#06C167] px-5 font-display text-sm font-bold text-[#00210D] transition-colors hover:bg-[#05b05d] sm:w-auto"
            >
              Explore All Deals
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 1. BROWSE CATEGORIES */}
      <section aria-labelledby="sec-categories">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sec-categories" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
            Browse Categories
          </h2>
          <button
            type="button"
            onClick={() => onSearchSubmit('', 'All')}
            className="text-xs font-semibold text-[#006D37] hover:underline"
          >
            View all
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSearchSubmit('', cat.id)}
                className="group flex flex-col items-start rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-2.5 text-left transition-all hover:border-black hover:bg-white sm:p-3.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1A1A1A] transition-colors group-hover:bg-black group-hover:text-white sm:h-10 sm:w-10">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="mt-2 truncate font-display text-xs font-semibold text-[#1A1A1A] sm:mt-2.5 sm:text-sm">
                  {cat.label}
                </span>
                <span className="line-clamp-1 text-[10px] text-[#6B6B6B] sm:text-[11px]">
                  {cat.countLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. MIDNIGHT DEALS (Dark-themed section banner + edge-to-edge mobile carousel) */}
      <section
        aria-labelledby="sec-midnight"
        className="overflow-hidden rounded-2xl bg-[#141414] text-white"
      >
        <div className="relative flex flex-col justify-between gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:p-6">
          <img
            src={MIDNIGHT_BANNER_IMAGE}
            alt="Late-night street food and bakery counter"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-[#141414]/50" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#06C167] sm:px-3 sm:text-xs">
              <Moon className="h-3.5 w-3.5" />
              <span>Pickup Tonight 21:00 – 23:45</span>
            </div>
            <h2 id="sec-midnight" className="mt-2 font-display text-lg font-bold sm:text-2xl">
              Midnight Deals
            </h2>
            <p className="mt-0.5 text-xs text-[#A6A6A6] sm:mt-1 sm:text-sm">
              Limited late-night surplus drops from izakayas, noodle bars, and bakeries.
            </p>
          </div>

          <div className="relative z-10 inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs">
            <Clock className="h-3.5 w-3.5 text-[#06C167]" />
            <span className="tabular-nums">{midnightDeals.length} late-night drops</span>
          </div>
        </div>

        <HorizontalCarousel
          dark
          ariaLabel="Midnight Deals"
          className="scroll-pl-4 gap-3.5 p-4 sm:gap-4 sm:p-6"
        >
          {midnightDeals.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="dark"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 3. FREE FOOD, ZERO COST */}
      <section
        aria-labelledby="sec-free-food"
        className="rounded-2xl border border-[#06C167]/40 bg-[#06C167]/[0.06] p-4 sm:p-6"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006D37]">
              <HeartHandshake className="h-4 w-4" />
              <span>Community Zero-Cost Rescue</span>
            </div>
            <h2 id="sec-free-food" className="mt-0.5 font-display text-lg font-bold text-[#1A1A1A] sm:text-xl">
              Free Food, Zero Cost
            </h2>
          </div>
          <span className="rounded-full bg-[#06C167] px-2.5 py-1 text-[11px] font-bold text-[#00210D] tabular-nums sm:px-3 sm:text-xs">
            {freeFood.reduce((acc, f) => acc + f.stock, 0)} free claims left
          </span>
        </div>

        <HorizontalCarousel
          ariaLabel="Free Food"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {freeFood.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 4. UP TO 90% OFF */}
      <section aria-labelledby="sec-90-off">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006D37]">
              <Tag className="h-3.5 w-3.5" />
              <span>Highest Discount Bags</span>
            </div>
            <h2 id="sec-90-off" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Up to 90% Off
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSearchSubmit('', 'All')}
            className="text-xs font-semibold text-[#1A1A1A] hover:underline"
          >
            See all
          </button>
        </div>

        <HorizontalCarousel
          ariaLabel="Up to 90% Off"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {upTo90Off.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 5. ALMOST GONE */}
      <section aria-labelledby="sec-almost-gone">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9A5B00]">
              <Flame className="h-3.5 w-3.5" />
              <span>Low Stock Alert</span>
            </div>
            <h2 id="sec-almost-gone" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Almost Gone
            </h2>
          </div>
          <span className="text-xs font-medium text-[#6B6B6B] tabular-nums">
            3 bags or fewer
          </span>
        </div>

        <HorizontalCarousel
          ariaLabel="Almost Gone"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {almostGone.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 6. RESCUE FOOD NEAR YOU */}
      <section aria-labelledby="sec-near-you">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="sec-near-you" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Rescue Food Near You
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Closest pickups to {selectedLocation.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
          {rescueNearYou.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="list"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
      </section>

      {/* 7. ENDING SOON (Accurate live countdown) */}
      <section aria-labelledby="sec-ending-soon">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E11900]">
              <Clock className="h-3.5 w-3.5" />
              <span>Expiring Pickup Windows</span>
            </div>
            <h2 id="sec-ending-soon" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Ending Soon
            </h2>
          </div>
        </div>

        <HorizontalCarousel
          ariaLabel="Ending Soon"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {endingSoon.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              countdownText={formatCountdown(item.expiresAtMs, nowMs)}
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 8. BEST DEALS TODAY */}
      <section aria-labelledby="sec-best-deals">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="sec-best-deals" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Best Deals Today
            </h2>
            <p className="text-xs text-[#6B6B6B]">Top price-to-value surplus picks</p>
          </div>
        </div>

        {bestDealsToday.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <FoodCard
                listing={bestDealsToday[0]}
                variant="spotlight"
                onSelect={onSelectListing}
                onQuickAction={onQuickAction}
              />
            </div>
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:col-span-6">
              {bestDealsToday.slice(1).map((item) => (
                <FoodCard
                  key={item.id}
                  listing={item}
                  variant="list"
                  onSelect={onSelectListing}
                  onQuickAction={onQuickAction}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 9. POPULAR NEAR YOU */}
      <section aria-labelledby="sec-popular">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="sec-popular" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Popular Near You
            </h2>
            <p className="text-xs text-[#6B6B6B]">Most frequently rescued local kitchens</p>
          </div>
        </div>

        <HorizontalCarousel
          ariaLabel="Popular Near You"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {popularNearYou.map((item) => (
            <div key={item.id} className="w-[252px] shrink-0 snap-start sm:w-[280px]">
              <div className="mb-1.5 flex items-center justify-between px-0.5 text-xs text-[#6B6B6B]">
                <span className="truncate font-semibold text-[#1A1A1A]">{item.merchantName}</span>
                <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                  <Star className="h-3 w-3 fill-[#06C167] text-[#06C167]" />
                  {item.rescuedCount.toLocaleString()} rescued
                </span>
              </div>
              <FoodCard
                listing={item}
                variant="grid"
                onSelect={onSelectListing}
                onQuickAction={onQuickAction}
              />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      {/* 10. BAKERY RESCUE */}
      <section aria-labelledby="sec-bakery">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sec-bakery" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
            Bakery Rescue
          </h2>
          <button
            type="button"
            onClick={() => onSearchSubmit('', 'Bakery')}
            className="text-xs font-semibold text-[#006D37] hover:underline"
          >
            All Bakery
          </button>
        </div>
        <HorizontalCarousel
          ariaLabel="Bakery Rescue"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {bakeryRescue.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 11. MEAL DEALS */}
      <section aria-labelledby="sec-meals">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sec-meals" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
            Meal Deals
          </h2>
          <button
            type="button"
            onClick={() => onSearchSubmit('', 'Meals')}
            className="text-xs font-semibold text-[#006D37] hover:underline"
          >
            All Meals
          </button>
        </div>
        <HorizontalCarousel
          ariaLabel="Meal Deals"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {mealDeals.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 12. SWEET TREATS */}
      <section aria-labelledby="sec-sweets">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sec-sweets" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
            Sweet Treats
          </h2>
          <button
            type="button"
            onClick={() => onSearchSubmit('', 'Desserts')}
            className="text-xs font-semibold text-[#006D37] hover:underline"
          >
            All Desserts
          </button>
        </div>
        <HorizontalCarousel
          ariaLabel="Sweet Treats"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {sweetTreats.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 13. NEW ON THE PLATFORM */}
      <section aria-labelledby="sec-new">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="sec-new" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              New on the Platform
            </h2>
            <p className="text-xs text-[#6B6B6B]">Freshly joined local restaurants &amp; cafes</p>
          </div>
        </div>
        <HorizontalCarousel
          ariaLabel="New on the Platform"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {newOnPlatform.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 14. WEEKEND SPECIALS */}
      <section
        aria-labelledby="sec-weekend"
        className="rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 sm:p-6"
      >
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A]">
              <Gift className="h-3.5 w-3.5 text-[#006D37]" />
              <span>Saturday &amp; Sunday Pickup Bundles</span>
            </div>
            <h2 id="sec-weekend" className="mt-0.5 font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Weekend Specials
            </h2>
          </div>
        </div>
        <HorizontalCarousel
          ariaLabel="Weekend Specials"
          className="-mx-4 scroll-pl-4 gap-3.5 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {weekendSpecials.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="carousel"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </HorizontalCarousel>
      </section>

      {/* 15. RECOMMENDED FOR YOU */}
      <section aria-labelledby="sec-recommended">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="sec-recommended" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
              Recommended for You
            </h2>
            <p className="text-xs text-[#6B6B6B]">Picked from your favorite bakeries &amp; bowls</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {recommendedForYou.slice(0, 4).map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="grid"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
      </section>

      {/* 16. RECENTLY VIEWED */}
      <section aria-labelledby="sec-recent">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sec-recent" className="font-display text-base font-bold text-[#1A1A1A] sm:text-xl">
            Recently Viewed
          </h2>
          <span className="text-xs text-[#6B6B6B] tabular-nums">
            {recentlyViewed.length} item{recentlyViewed.length === 1 ? '' : 's'}
          </span>
        </div>
        {recentlyViewed.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
            {recentlyViewed.map((item) => (
              <FoodCard
                key={item.id}
                listing={item}
                variant="list"
                onSelect={onSelectListing}
                onQuickAction={onQuickAction}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E5E5E5] p-6 text-center text-sm text-[#6B6B6B]">
            Open any surprise bag above and it will appear here for quick access.
          </div>
        )}
      </section>
    </div>
  );
};
