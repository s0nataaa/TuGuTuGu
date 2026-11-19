export type FoodCategory =
  | 'Bakery'
  | 'Meals'
  | 'Drinks'
  | 'Desserts'
  | 'Groceries'
  | 'Snacks & Deli';

export type ConsumerTab = 'home' | 'search' | 'explore' | 'orders' | 'profile';

export type EWalletProvider = 'GoPay' | 'OVO' | 'DANA' | 'ShopeePay';

export type PaymentMethod = 'ewallet' | 'cod';

export type PaymentStatus =
  | 'Paid'
  | 'Pending (Cash on Pickup)'
  | 'Free Claim'
  | 'Failed';

export type PickupStatus = 'Ready for Pickup' | 'Completed' | 'Cancelled';

export type ExploreMode = 'area' | 'route';

export type DietaryPrefKey = 'halal' | 'vegetarian' | 'nutFree';

export interface ExploreArea {
  id: string;
  name: string;
  subtitle: string;
  badgeTitle: string;
  targetStamps: number;
  highlightMerchantIds: string[];
}

export interface ExploreRoutePreset {
  id: string;
  label: string;
  originName: string;
  destinationName: string;
  durationMin: number;
  originPoint: { x: number; y: number };
  destinationPoint: { x: number; y: number };
  polyline: { x: number; y: number }[];
  merchantIdsOnRoute: string[];
}

export interface HeatmapZone {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0 to 1
}

export interface ExploreBadge {
  id: string;
  title: string;
  areaLabel: string;
  description: string;
  requiredMerchantIds: string[];
}

export interface ExploreMission {
  id: string;
  title: string;
  rewardLabel: string;
  progress: number;
  target: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  area: string;
  kgSaved: number;
  bagsRescued: number;
  isMe?: boolean;
}

export interface WishlistAlert {
  id: string;
  title: string;
  criteria: string;
  active: boolean;
}

export interface FoodListing {
  id: string;
  title: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  category: FoodCategory;
  description: string;
  whatsInside: string[];
  dietaryTags: string[];
  image: string;
  originalPrice: number;
  discountedPrice: number; // 0 for free food
  discountPercent: number;
  stock: number;
  maxClaimPerUser?: number;
  distanceKm: number;
  neighborhood: string;
  pickupAddress: string;
  pickupWindow: string;
  expiresAtMs: number; // epoch ms for Ending Soon countdown
  rating: number;
  reviewCount: number;
  rescuedCount: number;
  isMidnightDeal?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  isWeekendSpecial?: boolean;
  isBestDeal?: boolean;
  isRecommended?: boolean;
  coordinates: { x: number; y: number }; // 0-100 map percentages
  // Explore & Gamification enrichment
  areaId?: string;
  pokestopCode?: string;
  releaseHour?: number; // 17 - 23
  halal?: boolean;
  vegetarian?: boolean;
  nutFree?: boolean;
  weightKg?: number;
}

export interface OrderRecord {
  id: string;
  type: 'paid' | 'free';
  listingId: string;
  listingTitle: string;
  listingImage: string;
  merchantId: string;
  merchantName: string;
  pickupAddress: string;
  pickupWindow: string;
  quantity: number;
  unitOriginalPrice: number;
  unitPaidPrice: number;
  totalAmount: number;
  totalSavings: number;
  paymentMethod?: PaymentMethod;
  ewalletProvider?: EWalletProvider;
  paymentStatus: PaymentStatus;
  pickupStatus: PickupStatus;
  customerName: string;
  createdAt: string;
}

export interface LocationOption {
  id: string;
  label: string;
  area: string;
  city: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  listingId?: string;
}

export interface MerchantAccount {
  id: string;
  storeName: string;
  category: FoodCategory;
  email: string;
  address: string;
  neighborhood: string;
  rating: number;
}
