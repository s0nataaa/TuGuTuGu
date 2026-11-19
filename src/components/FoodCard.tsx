import React, { useState } from 'react';
import { Clock, MapPin, Star, Utensils } from 'lucide-react';
import { FoodListing } from '../types/marketplace';
import { formatRupiah } from '../data/mockMarketplace';

interface FoodCardProps {
  listing: FoodListing;
  variant?: 'carousel' | 'dark' | 'list' | 'spotlight' | 'grid';
  countdownText?: string;
  showSoldOutSafe?: boolean;
  onSelect: (listing: FoodListing) => void;
  onQuickAction: (listing: FoodListing) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  listing,
  variant = 'carousel',
  countdownText,
  onSelect,
  onQuickAction,
}) => {
  const [imgError, setImgError] = useState(false);
  const isFree = listing.discountedPrice === 0;
  const isSoldOut = listing.stock <= 0;
  const isAlmostGone = listing.stock > 0 && listing.stock <= 3;

  const isDark = variant === 'dark';

  const renderImage = (heightClass: string) => (
    <div className={`relative overflow-hidden bg-[#EAE7E7] ${heightClass}`}>
      {!imgError ? (
        <img
          src={listing.image}
          alt={`${listing.title} from ${listing.merchantName}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#EAE7E7] to-[#DCD9D9] p-4 text-center text-[#6B6B6B]">
          <Utensils className="mb-1.5 h-6 w-6 opacity-60" />
          <span className="text-xs font-medium">{listing.merchantName}</span>
        </div>
      )}

      {/* Subtle top-left primary badge: FREE, -XX%, or ENDING SOON */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
        {isFree ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[#06C167] px-2.5 text-xs font-bold tracking-tight text-[#00210D]">
            FREE
          </span>
        ) : (
          <span className="inline-flex h-6 items-center rounded-full bg-black px-2.5 text-xs font-bold tracking-tight text-white tabular-nums">
            -{listing.discountPercent}%
          </span>
        )}

        {countdownText && (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#E11900] px-2.5 text-[11px] font-semibold text-white tabular-nums">
            <Clock className="h-3 w-3" />
            {countdownText}
          </span>
        )}
      </div>

      {/* Top-right stock urgency indicator */}
      {isSoldOut ? (
        <span className="absolute top-2.5 right-2.5 inline-flex h-6 items-center rounded-full bg-[#E5E5E5] px-2.5 text-xs font-semibold text-[#6B6B6B]">
          Sold out
        </span>
      ) : isAlmostGone ? (
        <span className="absolute top-2.5 right-2.5 inline-flex h-6 items-center rounded-full bg-[#FFB020] px-2.5 text-xs font-bold text-[#1A1A1A] tabular-nums">
          Only {listing.stock} left
        </span>
      ) : listing.isNew ? (
        <span className="absolute top-2.5 right-2.5 inline-flex h-6 items-center rounded-full bg-white/95 px-2.5 text-xs font-bold text-[#1A1A1A]">
          NEW
        </span>
      ) : null}
    </div>
  );

  if (variant === 'list') {
    return (
      <article
        onClick={() => onSelect(listing)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(listing);
          }
        }}
        className="group flex cursor-pointer items-stretch gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-2.5 transition-colors hover:border-[#1A1A1A]/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-black sm:gap-3.5 sm:p-3"
      >
        <div className="relative h-24 w-22 shrink-0 overflow-hidden rounded-lg bg-[#EAE7E7] sm:w-28">
          {!imgError ? (
            <img
              src={listing.image}
              alt={listing.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#6B6B6B]">
              <Utensils className="h-5 w-5" />
            </div>
          )}
          <span
            className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold sm:text-[11px] ${
              isFree ? 'bg-[#06C167] text-[#00210D]' : 'bg-black text-white'
            }`}
          >
            {isFree ? 'FREE' : `-${listing.discountPercent}%`}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5">
              <p className="truncate text-[11px] font-medium text-[#6B6B6B] sm:text-xs">
                {listing.merchantName} · {listing.distanceKm.toFixed(1)} km
              </p>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#1A1A1A] tabular-nums sm:text-xs">
                <Star className="h-3 w-3 fill-[#1A1A1A] text-[#1A1A1A] sm:h-3.5 sm:w-3.5" />
                {listing.rating.toFixed(1)}
              </span>
            </div>
            <h3 className="mt-0.5 truncate font-display text-sm font-semibold text-[#1A1A1A]">
              {listing.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6B6B] sm:text-xs">
              <Clock className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{listing.pickupWindow}</span>
              {isAlmostGone && (
                <>
                  <span>·</span>
                  <span className="shrink-0 font-semibold text-[#9A5B00]">
                    {listing.stock} left
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
              <span className="font-display text-sm font-bold text-[#006D37] tabular-nums sm:text-base">
                {formatRupiah(listing.discountedPrice)}
              </span>
              {!isFree && (
                <span className="text-[11px] text-[#6B6B6B] line-through tabular-nums sm:text-xs">
                  {formatRupiah(listing.originalPrice)}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={isSoldOut}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction(listing);
              }}
              className={`min-h-[38px] shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-transform active:scale-[0.98] sm:px-3 sm:text-xs ${
                isSoldOut
                  ? 'cursor-not-allowed bg-[#E5E5E5] text-[#9A9A9A]'
                  : isFree
                  ? 'bg-[#06C167] text-[#00210D] hover:bg-[#05b05d]'
                  : 'bg-black text-white hover:bg-[#1B1B1B]'
              }`}
            >
              {isSoldOut ? 'Sold out' : isFree ? 'Claim Free' : 'Reserve'}
            </button>
          </div>
        </div>
      </article>
    );
  }

  const widthClass =
    variant === 'carousel' || variant === 'dark'
      ? 'w-[252px] sm:w-[280px] shrink-0 snap-start'
      : 'w-full';

  return (
    <article
      onClick={() => onSelect(listing)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(listing);
        }
      }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all focus-visible:outline-2 focus-visible:outline-black ${widthClass} ${
        isDark
          ? 'border-white/10 bg-[#1F1F1F] text-white hover:border-white/25'
          : 'border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] hover:border-[#1A1A1A]/25 hover:bg-white'
      }`}
    >
      {renderImage(variant === 'spotlight' ? 'h-48 sm:h-60' : 'h-38 sm:h-40')}

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={`truncate font-medium ${isDark ? 'text-[#A6A6A6]' : 'text-[#6B6B6B]'}`}>
              {listing.merchantName}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums">
              <Star className={`h-3.5 w-3.5 ${isDark ? 'fill-white text-white' : 'fill-[#1A1A1A] text-[#1A1A1A]'}`} />
              {listing.rating.toFixed(1)}
            </span>
          </div>

          <h3 className="mt-1 line-clamp-1 font-display text-[15px] font-semibold leading-snug">
            {listing.title}
          </h3>

          <div
            className={`mt-1.5 flex items-center gap-1.5 text-xs ${
              isDark ? 'text-[#A6A6A6]' : 'text-[#6B6B6B]'
            }`}
          >
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {listing.distanceKm.toFixed(1)} km
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{listing.pickupWindow}</span>
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 border-black/5 dark:border-white/10">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span
                className={`font-display text-base font-bold leading-none tabular-nums sm:text-lg ${
                  isDark ? 'text-[#06C167]' : 'text-[#006D37]'
                }`}
              >
                {formatRupiah(listing.discountedPrice)}
              </span>
              {!isFree && (
                <span
                  className={`text-[11px] line-through tabular-nums sm:text-xs ${
                    isDark ? 'text-[#848484]' : 'text-[#6B6B6B]'
                  }`}
                >
                  {formatRupiah(listing.originalPrice)}
                </span>
              )}
            </div>
            <span className={`mt-0.5 text-[11px] tabular-nums ${isDark ? 'text-[#A6A6A6]' : 'text-[#6B6B6B]'}`}>
              {isSoldOut
                ? 'Unavailable'
                : isFree
                ? `${listing.stock} free claims left`
                : `${listing.stock} bags left`}
            </span>
          </div>

          <button
            type="button"
            disabled={isSoldOut}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction(listing);
            }}
            className={`min-h-[40px] shrink-0 rounded-lg px-3 py-2 font-display text-xs font-semibold whitespace-nowrap transition-transform active:scale-[0.98] sm:px-3.5 ${
              isSoldOut
                ? 'cursor-not-allowed bg-[#E5E5E5] text-[#9A9A9A]'
                : isFree
                ? 'bg-[#06C167] text-[#00210D] hover:bg-[#05b05d]'
                : isDark
                ? 'bg-white text-black hover:bg-[#EAE7E7]'
                : 'bg-black text-white hover:bg-[#1B1B1B]'
            }`}
          >
            {isSoldOut ? 'Sold out' : isFree ? 'Claim for Free' : 'Reserve'}
          </button>
        </div>
      </div>
    </article>
  );
};
