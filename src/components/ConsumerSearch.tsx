import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FoodCategory, FoodListing } from '../types/marketplace';
import { FoodCard } from './FoodCard';

interface ConsumerSearchProps {
  listings: FoodListing[];
  initialQuery: string;
  initialCategory: FoodCategory | 'All';
  onSelectListing: (listing: FoodListing) => void;
  onQuickAction: (listing: FoodListing) => void;
}

const CATEGORY_TABS: (FoodCategory | 'All')[] = [
  'All',
  'Bakery',
  'Meals',
  'Drinks',
  'Desserts',
  'Groceries',
  'Snacks & Deli',
];

type SortOption = 'recommended' | 'nearest' | 'lowest_price' | 'biggest_discount';

export const ConsumerSearch: React.FC<ConsumerSearchProps> = ({
  listings,
  initialQuery,
  initialCategory,
  onSelectListing,
  onQuickAction,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'All'>(initialCategory);
  const [freeOnly, setFreeOnly] = useState(false);
  const [midnightOnly, setMidnightOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = listings.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (freeOnly && !(item.discountedPrice <= 0 || item.discountPercent >= 100)) return false;
      if (midnightOnly && !item.isMidnightDeal) return false;
      if (q) {
        const hay = `${item.title} ${item.merchantName} ${item.category} ${item.neighborhood} ${item.dietaryTags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'nearest') return a.distanceKm - b.distanceKm;
      if (sortBy === 'lowest_price') return a.discountedPrice - b.discountedPrice;
      if (sortBy === 'biggest_discount') return b.discountPercent - a.discountPercent;
      return b.rating - a.rating;
    });
  }, [listings, query, selectedCategory, freeOnly, midnightOnly, sortBy]);

  const clearFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setFreeOnly(false);
    setMidnightOnly(false);
    setSortBy('recommended');
  };

  return (
    <div className="space-y-5 pt-2 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
          Search Surplus Bags
        </h1>
        <p className="mt-0.5 text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
          Filter by category, free claims, or late-night pickup windows
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6B6B6B] dark:text-[#A3A8A3]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bakery, sushi, matcha, or store name..."
          className="h-12 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] pr-11 pl-11 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-black focus:bg-white focus:outline-none dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#F5F5F5] dark:placeholder:text-[#787F78] dark:focus:border-[#06C167] dark:focus:bg-[#1B1E1B]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-[#6B6B6B] hover:bg-[#EAE7E7] hover:text-black dark:text-[#A3A8A3] dark:hover:bg-[#272B27] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[38px] shrink-0 rounded-full px-4 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-black text-white dark:bg-[#06C167] dark:text-[#00210D]'
                  : 'border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7] dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#E5E7EB] dark:hover:bg-[#1E211E]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Quick Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4 dark:border-[#2A2D2A]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFreeOnly((v) => !v)}
            className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
              freeOnly
                ? 'border-[#06C167] bg-[#06C167] text-[#00210D]'
                : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6] dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#F5F5F5] dark:hover:bg-[#1E211E]'
            }`}
          >
            Free Food Only
          </button>
          <button
            type="button"
            onClick={() => setMidnightOnly((v) => !v)}
            className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
              midnightOnly
                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-[#0D0E0D]'
                : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6] dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#F5F5F5] dark:hover:bg-[#1E211E]'
            }`}
          >
            Midnight Deals
          </button>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#6B6B6B] dark:text-[#A3A8A3]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort results"
            className="h-9 rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-2.5 text-xs font-semibold text-[#1A1A1A] focus:border-black focus:outline-none dark:border-[#2A2D2A] dark:bg-[#161816] dark:text-[#F5F5F5] dark:focus:border-[#06C167]"
          >
            <option value="recommended">Top Rated</option>
            <option value="nearest">Nearest First</option>
            <option value="lowest_price">Lowest Price</option>
            <option value="biggest_discount">Highest Discount</option>
          </select>
        </div>
      </div>

      {/* Result Count */}
      <p className="text-xs font-medium text-[#6B6B6B] tabular-nums dark:text-[#A3A8A3]">
        Showing {filtered.length} surplus bag{filtered.length === 1 ? '' : 's'}
      </p>

      {/* Results Grid or Empty State */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <FoodCard
              key={item.id}
              listing={item}
              variant="grid"
              onSelect={onSelectListing}
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] px-6 py-12 text-center dark:border-[#2A2D2A] dark:bg-[#161816]">
          <Search className="h-9 w-9 text-[#6B6B6B] dark:text-[#A3A8A3]" />
          <h3 className="mt-3 font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            No matching surprise bags
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
            Try broadening your search or clearing category filters to see all available local deals.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-lg bg-black px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-[#1B1B1B] dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};
