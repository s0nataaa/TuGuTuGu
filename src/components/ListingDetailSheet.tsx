import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShoppingBag,
  Star,
  Utensils,
  X,
} from 'lucide-react';
import { FoodListing } from '../types/marketplace';
import { formatRupiah } from '../data/mockMarketplace';

interface ListingDetailSheetProps {
  listing: FoodListing | null;
  onClose: () => void;
  onStartAction: (listing: FoodListing) => void;
}

export const ListingDetailSheet: React.FC<ListingDetailSheetProps> = ({
  listing,
  onClose,
  onStartAction,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [listing?.id]);

  if (!listing) return null;

  const isFree = listing.discountedPrice <= 0 || listing.discountPercent >= 100;
  const isSoldOut = listing.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={listing.title}
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top drag handle for mobile */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
        </div>

        {/* Hero Photo */}
        <div className="relative h-48 w-full shrink-0 bg-[#EAE7E7] sm:h-64 dark:bg-[#232623]">
          {!imgError ? (
            <img
              src={listing.image}
              alt={listing.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#EAE7E7] text-[#6B6B6B] dark:bg-[#232623] dark:text-[#A3A8A3]">
              <Utensils className="h-10 w-10 opacity-50" />
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#1A1A1A] shadow-sm transition-colors hover:bg-white dark:bg-[#141614]/90 dark:text-[#F5F5F5] dark:hover:bg-[#1E211E]"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {isFree ? (
              <span className="rounded-full bg-[#06C167] px-3 py-1 text-xs font-bold text-[#00210D]">
                FREE · ZERO COST
              </span>
            ) : (
              <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white tabular-nums">
                Save {listing.discountPercent}%
              </span>
            )}
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1A1A1A] tabular-nums dark:bg-[#141614]/90 dark:text-[#F5F5F5]">
              {isSoldOut ? 'Sold out' : `${listing.stock} left`}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#6B6B6B] dark:text-[#A3A8A3]">
                {listing.merchantName} · {listing.merchantCategory}
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-[#1A1A1A] sm:text-2xl dark:text-[#F5F5F5]">
                {listing.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#F6F6F6] px-2.5 py-1.5 text-xs font-semibold tabular-nums sm:text-sm dark:bg-[#1E211E] dark:text-[#F5F5F5]">
              <Star className="h-4 w-4 fill-[#1A1A1A] text-[#1A1A1A] dark:fill-[#06C167] dark:text-[#06C167]" />
              <span>{listing.rating.toFixed(1)}</span>
              <span className="text-[11px] font-normal text-[#6B6B6B] dark:text-[#A3A8A3]">
                ({listing.reviewCount})
              </span>
            </div>
          </div>

          {/* Pickup & Location Info */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5 sm:grid-cols-2 dark:border-[#2E322E] dark:bg-[#1E211E]">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A] dark:text-[#06C167]" />
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Pickup Window
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                  Today, {listing.pickupWindow}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A] dark:text-[#06C167]" />
              <div>
                <p className="text-xs font-medium text-[#6B6B6B] dark:text-[#A3A8A3]">
                  Pickup Spot · {listing.distanceKm.toFixed(1)} km
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {listing.pickupAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-5">
            <h3 className="font-display text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
              About this Surprise Bag
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#4C4546] dark:text-[#C8CDC8]">
              {listing.description}
            </p>
          </div>

          {/* What's Inside */}
          <div className="mt-5">
            <h3 className="font-display text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
              What you may rescue
            </h3>
            <ul className="mt-2 space-y-2">
              {listing.whatsInside.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[#1A1A1A] dark:text-[#E5E7EB]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006D37] dark:text-[#06C167]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dietary & Rescue Impact */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E5E5E5] pt-4 text-xs text-[#6B6B6B] dark:border-[#2A2D2A] dark:text-[#A3A8A3]">
            <span>{listing.category}</span>
            <span>·</span>
            {listing.dietaryTags.map((tag, idx) => (
              <React.Fragment key={tag}>
                <span>{tag}</span>
                {idx < listing.dietaryTags.length - 1 && <span>·</span>}
              </React.Fragment>
            ))}
            <span>·</span>
            <span className="font-medium text-[#006D37] tabular-nums dark:text-[#06C167]">
              {listing.rescuedCount.toLocaleString()} meals rescued here
            </span>
          </div>
        </div>

        {/* Sticky Bottom CTA */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E5E5E5] bg-white px-4 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-6 sm:py-4 dark:border-[#2A2D2A] dark:bg-[#161816]">
          <div className="shrink-0">
            <p className="text-[11px] text-[#6B6B6B] sm:text-xs dark:text-[#A3A8A3]">
              {isFree ? 'Zero-cost share' : 'Rescue price'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl font-bold text-[#006D37] tabular-nums sm:text-2xl dark:text-[#06C167]">
                {formatRupiah(listing.discountedPrice)}
              </span>
              {!isFree && (
                <span className="text-xs text-[#6B6B6B] line-through tabular-nums sm:text-sm dark:text-[#787F78]">
                  {formatRupiah(listing.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isSoldOut}
            onClick={() => onStartAction(listing)}
            className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg px-4 font-display text-sm font-semibold whitespace-nowrap transition-transform active:scale-[0.98] sm:max-w-[240px] sm:px-5 sm:text-base ${
              isSoldOut
                ? 'cursor-not-allowed bg-[#E5E5E5] text-[#9A9A9A] dark:bg-[#232623] dark:text-[#6B7280]'
                : isFree
                ? 'bg-[#06C167] text-[#00210D] hover:bg-[#05b05d]'
                : 'bg-black text-white hover:bg-[#1B1B1B] dark:bg-white dark:text-[#0D0E0D] dark:hover:bg-[#E5E5E5]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            {isSoldOut ? 'Sold out' : isFree ? 'Claim for Free' : 'Reserve'}
          </button>
        </div>
      </div>
    </div>
  );
};
