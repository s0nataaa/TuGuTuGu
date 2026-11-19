import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Flame,
  Footprints,
  HeartHandshake,
  Layers,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Route,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  DietaryPrefKey,
  ExploreMode,
  FoodListing,
  OrderRecord,
  WishlistAlert,
} from '../types/marketplace';
import {
  EXPLORE_AREAS,
  EXPLORE_BADGES,
  EXPLORE_ROUTES,
  INITIAL_LEADERBOARD,
  INITIAL_MISSIONS,
  INITIAL_WISHLIST_ALERTS,
  formatCompactRupiah,
  formatRupiah,
} from '../data/mockMarketplace';

interface ConsumerExploreProps {
  listings: FoodListing[];
  orders: OrderRecord[];
  collectedStamps: string[];
  onCollectStamp: (merchantId: string) => void;
  onSelectListing: (listing: FoodListing) => void;
  onQuickAction: (listing: FoodListing) => void;
}

type SheetSnap = 'peek' | 'half' | 'full';

interface MapCluster {
  id: string;
  x: number;
  y: number;
  pins: FoodListing[];
  minPrice: number;
  hasUrgent: boolean;
  hasUnstamped: boolean;
  hasFree: boolean;
}

const STORAGE_PREFS_KEY = 'tugutugu_dietary_prefs';
const STORAGE_ALERTS_KEY = 'tugutugu_wishlist_alerts';

// Posisi mock pengguna (Senopati - SCBD)
const MOCK_USER_POSITION = { x: 49, y: 52 };

// Center & zoom preset per area saat chip area dipilih
const AREA_CAMERA_PRESETS: Record<string, { x: number; y: number; zoom: number }> = {
  all: { x: 49, y: 48, zoom: 1.15 },
  'area-senopati': { x: 41, y: 45, zoom: 1.5 },
  'area-scbd': { x: 68, y: 40, zoom: 1.45 },
  'area-kemang': { x: 40, y: 71, zoom: 1.4 },
  'area-menteng': { x: 64, y: 24, zoom: 1.45 },
};

// Feature flags untuk menyembunyikan gamifikasi berat tanpa menghapus data di mockMarketplace.ts
const EXPLORE_FEATURE_FLAGS = {
  showMissions: false,
  showStreak: false,
  showLeaderboard: false,
  showAreaBadges: false,
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getMinutesLeft(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.round((expiresAtMs - nowMs) / 60000));
}

function isUrgentListing(item: FoodListing, nowMs: number): boolean {
  const minsLeft = getMinutesLeft(item.expiresAtMs, nowMs);
  return item.stock <= 2 || (minsLeft > 0 && minsLeft < 60);
}

function estimateWalkMinutes(distanceKm: number): number {
  return Math.max(2, Math.round(distanceKm * 12.5));
}

export const ConsumerExplore: React.FC<ConsumerExploreProps> = ({
  listings,
  orders,
  collectedStamps,
  onCollectStamp,
  onSelectListing,
  onQuickAction,
}) => {
  const [mode, setMode] = useState<ExploreMode>('area');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(EXPLORE_ROUTES[0].id);
  const [onlyUnstamped, setOnlyUnstamped] = useState<boolean>(false);
  const [onlyUrgent, setOnlyUrgent] = useState<boolean>(false);

  // Waktu terkini untuk perhitungan countdown "Segera habis" (< 60 menit)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Kamera Peta Interaktif (Pan & Zoom)
  const [mapCenter, setMapCenter] = useState<{ x: number; y: number }>({ x: 49, y: 48 });
  const [zoom, setZoom] = useState<number>(1.15);
  const [isPanningMap, setIsPanningMap] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const panGestureRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startCenterX: number;
    startCenterY: number;
    moved: boolean;
  } | null>(null);

  // Seleksi Pin & Kartu Ringkas (Sinkron Dua Arah)
  const [focusedMerchantId, setFocusedMerchantId] = useState<string>(
    listings[0]?.merchantId ?? 'm-boulangerie'
  );
  const [showPinCard, setShowPinCard] = useState<boolean>(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Draggable Bottom Sheet State
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half');
  const [sheetDragDelta, setSheetDragDelta] = useState<number>(0);
  const sheetDragRef = useRef<{
    pointerId: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // Preferensi Diet (persisted)
  const [dietaryPrefs, setDietaryPrefs] = useState<Record<DietaryPrefKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { halal: false, vegetarian: false, nutFree: false };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(dietaryPrefs));
    } catch {
      // ignore
    }
  }, [dietaryPrefs]);

  // Wishlist Alerts (persisted)
  const [alerts, setAlerts] = useState<WishlistAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ALERTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_WISHLIST_ALERTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  // Modals & Toast
  const [showPokestopHub, setShowPokestopHub] = useState(false);
  const [pokestopTab, setPokestopTab] = useState<'stamps' | 'missions' | 'leaderboard'>('stamps');
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [splitListing, setSplitListing] = useState<FoodListing | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const activeRoute =
    EXPLORE_ROUTES.find((r) => r.id === selectedRouteId) ?? EXPLORE_ROUTES[0];
  const activeArea = EXPLORE_AREAS.find((a) => a.id === selectedAreaId) ?? EXPLORE_AREAS[0];

  // Filter dasar sesuai mode aktif & preferensi Explore (tanpa membatasi viewport agar pin tetap muncul saat peta digeser)
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.stock <= 0) return false;
      if (dietaryPrefs.halal && !item.halal) return false;
      if (dietaryPrefs.vegetarian && !item.vegetarian) return false;
      if (dietaryPrefs.nutFree && !item.nutFree) return false;
      if (onlyUnstamped && collectedStamps.includes(item.merchantId)) return false;
      if (onlyUrgent && !isUrgentListing(item, nowMs)) return false;

      if (mode === 'route') {
        if (!activeRoute.merchantIdsOnRoute.includes(item.merchantId)) return false;
      }

      return true;
    });
  }, [
    listings,
    dietaryPrefs,
    onlyUnstamped,
    onlyUrgent,
    collectedStamps,
    mode,
    activeRoute,
    nowMs,
  ]);

  // Daftar listing yang terlihat dalam viewport peta saat ini (sinkron saat geser/zoom peta)
  const viewportListings = useMemo(() => {
    const halfSpanX = 48 / zoom;
    const halfSpanY = 48 / zoom;
    return filteredListings.filter(
      (item) =>
        Math.abs(item.coordinates.x - mapCenter.x) <= halfSpanX &&
        Math.abs(item.coordinates.y - mapCenter.y) <= halfSpanY
    );
  }, [filteredListings, mapCenter, zoom]);

  // Pin merchant unik di peta (mengutamakan penawaran segera habis / harga termurah per merchant)
  const mapPins = useMemo(() => {
    const byMerchant = new Map<string, FoodListing>();
    for (const item of filteredListings) {
      const existing = byMerchant.get(item.merchantId);
      if (!existing) {
        byMerchant.set(item.merchantId, item);
      } else {
        const itemUrgent = isUrgentListing(item, nowMs);
        const existingUrgent = isUrgentListing(existing, nowMs);
        if (
          (itemUrgent && !existingUrgent) ||
          (itemUrgent === existingUrgent && item.discountedPrice < existing.discountedPrice)
        ) {
          byMerchant.set(item.merchantId, item);
        }
      }
    }
    return Array.from(byMerchant.values());
  }, [filteredListings, nowMs]);

  // Daftar seluruh merchant unik untuk buku koleksi stempel Toko
  const allMerchantSpots = useMemo(() => {
    const byMerchant = new Map<string, FoodListing>();
    for (const item of listings) {
      if (!byMerchant.has(item.merchantId)) {
        byMerchant.set(item.merchantId, item);
      }
    }
    return Array.from(byMerchant.values());
  }, [listings]);

  // Clustering marker otomatis saat zoom out (zoom <= 1.0) untuk menjaga kerapian & performa
  const isClusteringActive = zoom <= 1.0;

  const clusteredMapItems = useMemo(() => {
    const clusters: MapCluster[] = [];
    const screenThresholdPct = 14;

    if (!isClusteringActive) {
      return mapPins.map((pin) => ({
        id: pin.merchantId,
        x: pin.coordinates.x,
        y: pin.coordinates.y,
        pins: [pin],
        minPrice: pin.discountedPrice,
        hasUrgent: isUrgentListing(pin, nowMs),
        hasUnstamped: !collectedStamps.includes(pin.merchantId),
        hasFree: pin.discountedPrice === 0,
      }));
    }

    for (const pin of mapPins) {
      let target: MapCluster | null = null;
      for (const c of clusters) {
        const dx = (pin.coordinates.x - c.x) * zoom;
        const dy = (pin.coordinates.y - c.y) * zoom;
        if (Math.hypot(dx, dy) < screenThresholdPct) {
          target = c;
          break;
        }
      }

      if (target) {
        target.pins.push(pin);
        const count = target.pins.length;
        target.x = target.pins.reduce((acc, p) => acc + p.coordinates.x, 0) / count;
        target.y = target.pins.reduce((acc, p) => acc + p.coordinates.y, 0) / count;
        target.minPrice = Math.min(target.minPrice, pin.discountedPrice);
        target.hasUrgent = target.hasUrgent || isUrgentListing(pin, nowMs);
        target.hasUnstamped = target.hasUnstamped || !collectedStamps.includes(pin.merchantId);
        target.hasFree = target.hasFree || pin.discountedPrice === 0;
      } else {
        clusters.push({
          id: `cluster-${pin.merchantId}`,
          x: pin.coordinates.x,
          y: pin.coordinates.y,
          pins: [pin],
          minPrice: pin.discountedPrice,
          hasUrgent: isUrgentListing(pin, nowMs),
          hasUnstamped: !collectedStamps.includes(pin.merchantId),
          hasFree: pin.discountedPrice === 0,
        });
      }
    }

    return clusters;
  }, [isClusteringActive, mapPins, zoom, nowMs, collectedStamps]);

  // Listing yang sedang disorot oleh tap pin atau tap kartu bottom sheet
  const focusedListing = useMemo(() => {
    return (
      filteredListings.find((l) => l.merchantId === focusedMerchantId) ??
      viewportListings[0] ??
      filteredListings[0] ??
      null
    );
  }, [filteredListings, viewportListings, focusedMerchantId]);

  // Impact Tracker metrics
  const impactStats = useMemo(() => {
    const activeOrDone = orders.filter((o) => o.pickupStatus !== 'Cancelled');
    const bagsFromOrders = activeOrDone.reduce((acc, o) => acc + o.quantity, 0);
    const savedMoney = activeOrDone.reduce((acc, o) => acc + o.totalSavings, 0) + 185000;
    const totalBags = bagsFromOrders + 5;
    const foodKg = Number((totalBags * 0.85).toFixed(1));
    const co2Kg = Number((foodKg * 2.5).toFixed(1));
    return { totalBags, foodKg, co2Kg, savedMoney };
  }, [orders]);

  // Konversi koordinat peta (0..100) ke persentase layar di dalam kanvas peta
  const toScreenPos = (pt: { x: number; y: number }) => ({
    x: 50 + (pt.x - mapCenter.x) * zoom,
    y: 50 + (pt.y - mapCenter.y) * zoom,
  });

  // Fokus ke lokasi user (Tombol "Lokasi saya")
  const handleCenterUserLocation = () => {
    setMode((prev) => (prev === 'route' ? 'area' : prev));
    setSelectedAreaId('all');
    setMapCenter(MOCK_USER_POSITION);
    setZoom(1.3);
    triggerToast('Peta dipusatkan ke lokasimu');
  };

  // Pilih Area -> geser kamera peta ke area tersebut
  const handleSelectArea = (areaId: string) => {
    setSelectedAreaId(areaId);
    const preset = AREA_CAMERA_PRESETS[areaId] ?? AREA_CAMERA_PRESETS.all;
    setMapCenter({ x: preset.x, y: preset.y });
    setZoom(preset.zoom);
  };

  // Pilih Rute -> pusatkan kamera ke koridor rute
  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    const route = EXPLORE_ROUTES.find((r) => r.id === routeId);
    if (route) {
      setMapCenter({
        x: (route.originPoint.x + route.destinationPoint.x) / 2,
        y: (route.originPoint.y + route.destinationPoint.y) / 2,
      });
      setZoom(1.15);
    }
  };

  // Sinkron Pin -> Bottom Sheet
  const handleTapMapPin = (pin: FoodListing) => {
    setFocusedMerchantId(pin.merchantId);
    setShowPinCard(true);

    // Scroll kartu merchant terkait di bottom sheet agar sinkron dua arah
    window.setTimeout(() => {
      cardRefs.current[pin.merchantId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 60);
  };

  // Sinkron Bottom Sheet Card -> Sorot Pin di Peta
  const handleFocusFromSheetCard = (item: FoodListing) => {
    setFocusedMerchantId(item.merchantId);
    setShowPinCard(true);

    const screen = toScreenPos(item.coordinates);
    const outOfFocusBand =
      zoom <= 1.0 || Math.abs(screen.x - 50) > 30 || Math.abs(screen.y - 50) > 26;

    if (outOfFocusBand) {
      setMapCenter({ x: item.coordinates.x, y: item.coordinates.y });
      if (zoom <= 1.05) {
        setZoom(1.35);
      }
    }
  };

  // Gesture Pan pada Peta (Pointer Events — mendukung sentuhan mobile & mouse desktop)
  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Abaikan jika klik berasal dari tombol/pin interaktif di atas peta
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanningMap(true);
    panGestureRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCenterX: mapCenter.x,
      startCenterY: mapCenter.y,
      moved: false,
    };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId || !mapRef.current) return;

    const dxPx = e.clientX - gesture.startClientX;
    const dyPx = e.clientY - gesture.startClientY;
    if (Math.hypot(dxPx, dyPx) > 4) {
      gesture.moved = true;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const dxPct = (dxPx / Math.max(1, rect.width)) * 100;
    const dyPct = (dyPx / Math.max(1, rect.height)) * 100;

    setMapCenter({
      x: clamp(gesture.startCenterX - dxPct / zoom, 12, 88),
      y: clamp(gesture.startCenterY - dyPct / zoom, 12, 88),
    });
  };

  const handleMapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (gesture && gesture.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      panGestureRef.current = null;
      setIsPanningMap(false);
    }
  };

  // Gesture Drag Naik/Turun pada Handle Bottom Sheet
  const handleSheetHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetDragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      moved: false,
    };
  };

  const handleSheetHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const delta = e.clientY - drag.startY;
    if (Math.abs(delta) > 6) {
      drag.moved = true;
    }
    setSheetDragDelta(clamp(delta, -90, 90));
  };

  const handleSheetHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const delta = e.clientY - drag.startY;
    if (!drag.moved) {
      // Tap sederhana pada handle -> siklus snap
      setSheetSnap((prev) =>
        prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'half'
      );
    } else if (delta < -30) {
      // Drag ke atas -> perbesar sheet
      setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'full'));
    } else if (delta > 30) {
      // Drag ke bawah -> perkecil sheet
      setSheetSnap((prev) => (prev === 'full' ? 'half' : 'peek'));
    }

    setSheetDragDelta(0);
    sheetDragRef.current = null;
  };

  const resetAllFilters = () => {
    setDietaryPrefs({ halal: false, vegetarian: false, nutFree: false });
    setOnlyUnstamped(false);
    setOnlyUrgent(false);
    if (mode === 'area') {
      handleSelectArea('all');
    }
  };

  const handleActivateRouteAlert = () => {
    const title =
      mode === 'route'
        ? `Alert Rute: ${activeRoute.originName} → ${activeRoute.destinationName}`
        : `Alert Area: ${activeArea.name}`;
    setAlerts((prev) => [
      {
        id: `al-${Date.now()}`,
        title,
        criteria: 'Notifikasi otomatis saat surprise bag tersedia di Toko pilihan',
        active: true,
      },
      ...prev,
    ]);
    triggerToast('Wishlist alert diaktifkan untuk mode ini');
  };

  const handleShareImpact = async () => {
    const shareText = `Aku sudah menyelamatkan ${impactStats.foodKg} kg makanan (${impactStats.co2Kg} kg CO2e dihemat & hemat ${formatRupiah(impactStats.savedMoney)}) lewat TuGuTuGu!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kartu Impact TuGuTuGu',
          text: shareText,
        });
        triggerToast('Kartu impact siap dibagikan!');
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      triggerToast('Ringkasan impact disalin ke clipboard');
    } catch {
      triggerToast('Kartu impact siap dibagikan');
    }
  };

  const handleCopySplitInvite = async (item: FoodListing) => {
    const halfPrice = Math.ceil(item.discountedPrice / 2);
    const msg = `Patungan TuGuTuGu yuk! "${item.title}" di ${item.merchantName} cuma ${formatRupiah(halfPrice)}/orang (pickup ${item.pickupWindow}).`;
    try {
      await navigator.clipboard.writeText(msg);
      triggerToast('Link ajakan patungan disalin!');
    } catch {
      triggerToast('Ajakan patungan siap dikirim!');
    }
    setSplitListing(null);
  };

  const polylinePoints = activeRoute.polyline.map((pt) => `${pt.x * 4},${pt.y * 3}`).join(' ');
  const userScreenPos = toScreenPos(MOCK_USER_POSITION);
  const routeOriginScreen = toScreenPos(activeRoute.originPoint);
  const routeDestScreen = toScreenPos(activeRoute.destinationPoint);

  // Tinggi daftar pada bottom sheet sesuai posisi drag snap
  const listMaxHeightClass =
    sheetSnap === 'peek'
      ? 'max-h-[125px] lg:max-h-[180px]'
      : sheetSnap === 'full'
      ? 'max-h-[440px] lg:max-h-[470px]'
      : 'max-h-[250px] lg:max-h-[340px]';

  const focusedUrgent = focusedListing ? isUrgentListing(focusedListing, nowMs) : false;
  const focusedMinutesLeft = focusedListing
    ? getMinutesLeft(focusedListing.expiresAtMs, nowMs)
    : 0;
  const focusedStamped = focusedListing
    ? collectedStamps.includes(focusedListing.merchantId)
    : false;

  return (
    <div className="space-y-3 pt-2 pb-8 sm:space-y-4">
      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {feedbackToast}
        </div>
      )}

      {/* EXPLORE TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006D37]">
            <Compass className="h-3.5 w-3.5" />
            <span>Peta Jelajah Toko</span>
          </div>
          <h1 className="font-display text-xl font-bold text-[#1A1A1A] sm:text-2xl">
            Explore TuGuTuGu
          </h1>
        </div>

        {/* Quick Access Pills: Stempel + Impact + Alerts */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPokestopHub(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-black px-3 text-xs font-bold text-white hover:bg-[#1B1B1B]"
          >
            <Stamp className="h-3.5 w-3.5 text-[#06C167]" />
            <span className="tabular-nums">
              {collectedStamps.length}/{allMerchantSpots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowImpactModal(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3 text-xs font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#006D37]" />
            <span className="tabular-nums">{impactStats.foodKg} kg</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAlertsModal(true)}
            aria-label="Notifikasi dan Wishlist Alert"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7]"
          >
            <Bell className="h-4 w-4" />
            {alerts.some((a) => a.active) && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#06C167]" />
            )}
          </button>
        </div>
      </div>

      {/* EXPLORE MODE SWITCHER: Area | Rute */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-1">
        <button
          type="button"
          onClick={() => {
            setMode('area');
            const preset = AREA_CAMERA_PRESETS[selectedAreaId] ?? AREA_CAMERA_PRESETS.all;
            setMapCenter({ x: preset.x, y: preset.y });
            setZoom(preset.zoom);
          }}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors ${
            mode === 'area' ? 'bg-black text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          }`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>Area</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('route');
            handleSelectRoute(selectedRouteId);
          }}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors ${
            mode === 'route' ? 'bg-black text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          }`}
        >
          <Route className="h-3.5 w-3.5 shrink-0" />
          <span>Rute</span>
        </button>
      </div>

      {/* MODE-SPECIFIC CONTROLS */}
      {mode === 'area' && (
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {EXPLORE_AREAS.map((area) => {
            const active = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => handleSelectArea(area.id)}
                className={`min-h-[38px] shrink-0 rounded-xl border px-3.5 py-1.5 text-left transition-colors ${
                  active
                    ? 'border-black bg-black text-white'
                    : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6]'
                }`}
              >
                <p className="text-xs font-bold whitespace-nowrap">{area.name}</p>
              </button>
            );
          })}
        </div>
      )}

      {mode === 'route' && (
        <div className="space-y-2 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1A1A1A]">Pilih Rute Komuter</span>
            <span className="text-[11px] font-semibold text-[#006D37] tabular-nums">
              ~{activeRoute.durationMin} mnt perjalanan
            </span>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {EXPLORE_ROUTES.map((route) => {
              const active = route.id === activeRoute.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleSelectRoute(route.id)}
                  className={`min-h-[38px] shrink-0 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#4C4546]">
            <span className="font-semibold text-[#1A1A1A]">Asal:</span>
            <span className="truncate">{activeRoute.originName}</span>
            <span>→</span>
            <span className="font-semibold text-[#1A1A1A]">Tujuan:</span>
            <span className="truncate">{activeRoute.destinationName}</span>
          </div>
        </div>
      )}

      {/* EXPLORE-EXCLUSIVE FILTERS (Diet & Kondisi Toko — berbeda dari kategori di Home) */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#6B6B6B]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </span>
        {(
          [
            { key: 'halal', label: 'Halal' },
            { key: 'vegetarian', label: 'Vegetarian' },
            { key: 'nutFree', label: 'Bebas Kacang' },
          ] as { key: DietaryPrefKey; label: string }[]
        ).map((pref) => {
          const active = dietaryPrefs[pref.key];
          return (
            <button
              key={pref.key}
              type="button"
              onClick={() =>
                setDietaryPrefs((prev) => ({ ...prev, [pref.key]: !prev[pref.key] }))
              }
              className={`min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'border-[#06C167] bg-[#06C167] text-[#00210D]'
                  : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6]'
              }`}
            >
              {active ? '✓ ' : ''}
              {pref.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setOnlyUnstamped((v) => !v)}
          className={`min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
            onlyUnstamped
              ? 'border-black bg-black text-white'
              : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6]'
          }`}
        >
          Belum Di-Stamp
        </button>

        <button
          type="button"
          onClick={() => setOnlyUrgent((v) => !v)}
          className={`min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
            onlyUrgent
              ? 'border-[#B42318] bg-[#FFF0ED] text-[#B42318]'
              : 'border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#F6F6F6]'
          }`}
        >
          Segera Habis
        </button>
      </div>

      {/* MAIN INTERACTIVE POKESTOP MAP + DRAGGABLE VIEWPORT-SYNCED BOTTOM SHEET */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* INTERACTIVE PANNABLE & ZOOMABLE TOKO VECTOR MAP */}
        <div
          ref={mapRef}
          onPointerDown={handleMapPointerDown}
          onPointerMove={handleMapPointerMove}
          onPointerUp={handleMapPointerUp}
          onPointerCancel={handleMapPointerUp}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) < 4) return;
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            setZoom((z) => clamp(Number((z + delta).toFixed(2)), 0.75, 2.2));
          }}
          className={`relative h-[390px] touch-none overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#EAE7E7] select-none sm:h-[470px] lg:col-span-7 lg:h-[520px] ${
            isPanningMap ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          aria-label="Peta interaktif Toko TuGuTuGu"
        >
          {/* TRANSFORMED WORLD FABRIC LAYER (Streets, Parks, Heatmap, Route Polyline) */}
          <div
            className={`pointer-events-none absolute inset-0 ${
              isPanningMap ? '' : 'transition-transform duration-300 ease-out'
            }`}
            style={{
              transform: `translate(${50 - mapCenter.x * zoom}%, ${50 - mapCenter.y * zoom}%) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Extended canvas fabric so panning never exposes empty edges */}
              <rect x="-300" y="-300" width="1000" height="900" fill="#F0EDED" />
              <rect x="20" y="25" width="75" height="55" rx="8" fill="#E3ECE5" />
              <rect x="275" y="185" width="90" height="80" rx="8" fill="#E3ECE5" />
              <rect x="135" y="105" width="46" height="36" rx="8" fill="#E3ECE5" />

              {/* Major Jakarta Selatan & Pusat arterial roads */}
              <path d="M-120 62 L520 94" stroke="#FFFFFF" strokeWidth="9" />
              <path d="M-120 165 L520 138" stroke="#FFFFFF" strokeWidth="11" />
              <path d="M-120 244 L520 222" stroke="#FFFFFF" strokeWidth="7" />
              <path d="M84 -90 L114 390" stroke="#FFFFFF" strokeWidth="8" />
              <path d="M214 -90 L188 390" stroke="#FFFFFF" strokeWidth="12" />
              <path d="M312 -90 L334 390" stroke="#FFFFFF" strokeWidth="8" />

              {/* Neighborhood labels */}
              <text x="150" y="128" fontSize="10" fill="#8C8686" fontWeight="700">
                SENOPATI
              </text>
              <text x="272" y="114" fontSize="10" fill="#8C8686" fontWeight="700">
                SCBD
              </text>
              <text x="96" y="220" fontSize="10" fill="#8C8686" fontWeight="700">
                KEMANG
              </text>
              <text x="242" y="54" fontSize="10" fill="#8C8686" fontWeight="700">
                MENTENG
              </text>

              {/* Commute Route Polyline */}
              {mode === 'route' && (
                <>
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#000000"
                    strokeOpacity="0.18"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#06C167"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>
          </div>

          {/* ROUTE ORIGIN & DESTINATION MARKERS (Screen-space crisp) */}
          {mode === 'route' && (
            <>
              <div
                className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${
                  isPanningMap ? '' : 'transition-all duration-300 ease-out'
                }`}
                style={{ left: `${routeOriginScreen.x}%`, top: `${routeOriginScreen.y}%` }}
              >
                Asal
              </div>
              <div
                className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#006D37] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${
                  isPanningMap ? '' : 'transition-all duration-300 ease-out'
                }`}
                style={{ left: `${routeDestScreen.x}%`, top: `${routeDestScreen.y}%` }}
              >
                Tujuan
              </div>
            </>
          )}

          {/* USER LOCATION DOT */}
          <div
            className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 ${
              isPanningMap ? '' : 'transition-all duration-300 ease-out'
            }`}
            style={{ left: `${userScreenPos.x}%`, top: `${userScreenPos.y}%` }}
            title="Posisimu saat ini"
          >
            <span className="absolute -inset-2 rounded-full bg-[#06C167]/20" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-md">
              <Navigation className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* TOKO PINS & CLUSTERS (Always crisp in screen space) */}
          {clusteredMapItems.map((cluster) => {
            const screen = toScreenPos({ x: cluster.x, y: cluster.y });
            // Lewati render pin yang jauh di luar kanvas
            if (screen.x < -15 || screen.x > 115 || screen.y < -15 || screen.y > 115) {
              return null;
            }

            // 1. CLUSTER MARKER (saat zoom out & ada > 1 toko berdekatan)
            if (cluster.pins.length > 1) {
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => {
                    setMapCenter({ x: cluster.x, y: cluster.y });
                    setZoom(1.55);
                  }}
                  style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 hover:z-30 hover:scale-105 ${
                    isPanningMap ? '' : 'transition-all duration-300 ease-out'
                  }`}
                  aria-label={`Cluster ${cluster.pins.length} Toko, ketuk untuk perbesar`}
                >
                  <div className="relative flex items-center gap-1.5 rounded-full border-2 border-white bg-black px-2.5 py-1.5 text-white shadow-md">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C167] font-display text-[11px] font-bold text-[#00210D] tabular-nums">
                      {cluster.pins.length}
                    </span>
                    <span className="font-display text-[11px] font-bold whitespace-nowrap tabular-nums">
                      {cluster.hasFree ? 'Ada FREE' : formatCompactRupiah(cluster.minPrice)}
                    </span>
                  </div>
                </button>
              );
            }

            // 2. INDIVIDUAL TOKO PIN
            const pin = cluster.pins[0];
            const isSelected = focusedListing?.merchantId === pin.merchantId;
            const isStamped = collectedStamps.includes(pin.merchantId);
            const isFree = pin.discountedPrice === 0;

            return (
              <button
                key={pin.merchantId}
                type="button"
                onClick={() => handleTapMapPin(pin)}
                style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                  isSelected ? 'z-30 scale-110' : 'z-20 hover:z-30 hover:scale-105'
                } ${isPanningMap ? '' : 'transition-all duration-300 ease-out'}`}
                aria-label={`${pin.merchantName}, ${formatCompactRupiah(pin.discountedPrice)}`}
              >
                <div
                  className={`relative flex items-center gap-1 rounded-full border px-2.5 py-1 font-display text-[11px] font-bold shadow-sm tabular-nums ${
                    isSelected
                      ? 'border-white bg-black text-white ring-2 ring-[#06C167]'
                      : isFree
                      ? 'border-[#006D37] bg-[#06C167] text-[#00210D]'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                  }`}
                >
                  {isStamped ? (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#06C167] text-[#00210D]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-[#06C167] bg-white" />
                  )}
                  <span>{formatCompactRupiah(pin.discountedPrice)}</span>
                </div>
              </button>
            );
          })}

          {/* TOP-LEFT MAP CONTEXT & CLUSTER STATUS CHIP */}
          <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
            <div className="rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[#1A1A1A] shadow-xs backdrop-blur-xs">
              <span className="tabular-nums">{viewportListings.length}</span> bag di area peta ·{' '}
              <span className="font-mono text-[10px] text-[#006D37]">
                {zoom.toFixed(1)}×{isClusteringActive ? ' Cluster' : ''}
              </span>
            </div>
          </div>

          {/* TOP-RIGHT MAP CONTROLS: LOKASI SAYA + ZOOM IN / ZOOM OUT */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleCenterUserLocation}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white/95 px-3 text-xs font-bold text-[#1A1A1A] shadow-sm backdrop-blur-xs transition-colors hover:bg-[#F6F6F6] active:scale-[0.98]"
            >
              <LocateFixed className="h-4 w-4 text-[#006D37]" />
              <span>Lokasi saya</span>
            </button>

            <div className="flex flex-col overflow-hidden rounded-xl border border-[#E5E5E5] bg-white/95 shadow-sm backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(Number((z + 0.25).toFixed(2)), 0.75, 2.2))}
                aria-label="Perbesar peta"
                className="flex h-9 w-9 items-center justify-center border-b border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F6F6F6]"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(Number((z - 0.25).toFixed(2)), 0.75, 2.2))}
                aria-label="Perkecil peta (aktifkan cluster)"
                className="flex h-9 w-9 items-center justify-center text-[#1A1A1A] hover:bg-[#F6F6F6]"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* KARTU RINGKAS SAAT TAP PIN (Nama, Harga, Stok, Jam Ambil, Jarak Jalan Kaki, Reservasi & Check-in) */}
          {showPinCard && focusedListing && (
            <div className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-[#E5E5E5] bg-white/98 p-3.5 shadow-xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#006D37]">
                      Toko · {focusedListing.neighborhood}
                    </span>
                    {focusedUrgent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF0ED] px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
                        <AlertCircle className="h-3 w-3" />
                        Segera habis ({focusedMinutesLeft} mnt)
                      </span>
                    )}
                    {focusedStamped && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#06C167] px-2 py-0.5 text-[10px] font-bold text-[#00210D]">
                        <CheckCircle2 className="h-3 w-3" />
                        Stamped
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 truncate font-display text-sm font-bold text-[#1A1A1A]">
                    {focusedListing.merchantName}
                  </h3>
                  <p className="truncate text-xs text-[#4C4546]">{focusedListing.title}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPinCard(false)}
                  aria-label="Tutup kartu pin"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#6B6B6B] hover:text-[#1A1A1A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Metadata Ringkas: Harga, Sisa Stok, Jam Ambil, Jarak Jalan Kaki */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE7E7] pt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-base font-bold text-[#006D37] tabular-nums">
                    {formatRupiah(focusedListing.discountedPrice)}
                  </span>
                  {focusedListing.discountedPrice > 0 && (
                    <span className="text-[11px] text-[#6B6B6B] line-through tabular-nums">
                      {formatRupiah(focusedListing.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#4C4546]">
                  <span className="font-semibold text-[#1A1A1A] tabular-nums">
                    Sisa {focusedListing.stock}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="h-3 w-3 text-[#6B6B6B]" />
                    {focusedListing.pickupWindow}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Footprints className="h-3 w-3 text-[#006D37]" />
                    {estimateWalkMinutes(focusedListing.distanceKm)} mnt ({focusedListing.distanceKm.toFixed(1)} km)
                  </span>
                </div>
              </div>

              {/* Tombol Aksi: Check-in, Split/Detail, dan Reservasi */}
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={focusedStamped}
                  onClick={() => {
                    onCollectStamp(focusedListing.merchantId);
                    triggerToast(`Stempel ${focusedListing.merchantName} dikoleksi!`);
                  }}
                  className={`inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border px-3 text-xs font-bold transition-colors ${
                    focusedStamped
                      ? 'border-[#06C167]/40 bg-[#06C167]/15 text-[#006D37]'
                      : 'border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7]'
                  }`}
                >
                  <Stamp className="h-3.5 w-3.5" />
                  <span>{focusedStamped ? 'Stamped' : 'Check-in'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitListing(focusedListing)}
                  aria-label="Patungan Split Bag"
                  className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F6F6F6]"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => onQuickAction(focusedListing)}
                  className={`min-h-[38px] flex-1 rounded-xl px-3 font-display text-xs font-bold ${
                    focusedListing.discountedPrice === 0
                      ? 'bg-[#06C167] text-[#00210D] hover:bg-[#05b05d]'
                      : 'bg-black text-white hover:bg-[#1B1B1B]'
                  }`}
                >
                  {focusedListing.discountedPrice === 0 ? 'Klaim Gratis' : 'Reservasi'}
                </button>
              </div>
            </div>
          )}

          {/* Petunjuk geser halus di bawah peta ketika kartu pin belum dibuka */}
          {!showPinCard && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-black/75 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-xs">
              Geser peta atau ketuk pin Toko
            </div>
          )}
        </div>

        {/* DRAGGABLE VIEWPORT-FILTERED BOTTOM SHEET / SIDE LIST PANEL */}
        <div
          className="lg:col-span-5"
          style={{
            transform: sheetDragDelta !== 0 ? `translateY(${sheetDragDelta * 0.25}px)` : undefined,
          }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-xs">
            {/* Draggable Sheet Handle (drag naik/turun atau tap) */}
            <div
              onPointerDown={handleSheetHandlePointerDown}
              onPointerMove={handleSheetHandlePointerMove}
              onPointerUp={handleSheetHandlePointerUp}
              onPointerCancel={handleSheetHandlePointerUp}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSheetSnap((prev) => (prev === 'full' ? 'half' : 'full'));
                }
              }}
              aria-label="Geser naik atau turun untuk mengatur tinggi daftar merchant"
              className="cursor-grab touch-none border-b border-[#E5E5E5] px-4 pt-2 pb-3 select-none active:cursor-grabbing"
            >
              <div className="mb-2 flex justify-center">
                <span className="h-1.5 w-10 rounded-full bg-[#D8D5D5]" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-[#006D37]">
                    {mode === 'route'
                      ? 'Di Sepanjang Rute & Area Peta'
                      : 'Tampil Sesuai Area Peta'}
                  </p>
                  <h2 className="font-display text-sm font-bold text-[#1A1A1A] tabular-nums">
                    {viewportListings.length} Bag di Area Ini
                    {filteredListings.length > viewportListings.length && (
                      <span className="ml-1.5 font-sans text-xs font-normal text-[#6B6B6B]">
                        (dari {filteredListings.length} total)
                      </span>
                    )}
                  </h2>
                </div>

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A]">
                  {sheetSnap === 'full' ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </span>
              </div>
            </div>

            {/* Empty State: Tidak ada filter cocok OR viewport digeser ke area kosong */}
            {filteredListings.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <Compass className="h-9 w-9 text-[#6B6B6B]" />
                <h3 className="mt-3 font-display text-base font-bold text-[#1A1A1A]">
                  Belum ada bag untuk filter ini
                </h3>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6B6B6B]">
                  Coba longgarkan filter atau aktifkan alert agar kamu dikabari otomatis.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="min-h-[40px] rounded-lg bg-black px-3.5 text-xs font-semibold text-white"
                  >
                    Reset Filter
                  </button>
                  <button
                    type="button"
                    onClick={handleActivateRouteAlert}
                    className="min-h-[40px] rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 text-xs font-semibold text-[#1A1A1A]"
                  >
                    + Alert Area Ini
                  </button>
                </div>
              </div>
            ) : viewportListings.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <LocateFixed className="h-9 w-9 text-[#006D37]" />
                <h3 className="mt-3 font-display text-base font-bold text-[#1A1A1A]">
                  Tidak ada Toko di area peta ini
                </h3>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6B6B6B]">
                  Geser kembali peta ke area ramai atau zoom out untuk melihat Toko terdekat.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleCenterUserLocation}
                    className="min-h-[40px] rounded-lg bg-[#06C167] px-3.5 text-xs font-bold text-[#00210D]"
                  >
                    Pusatkan ke Lokasi Saya
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapCenter({ x: 49, y: 48 });
                      setZoom(0.85);
                    }}
                    className="min-h-[40px] rounded-lg bg-black px-3.5 text-xs font-semibold text-white"
                  >
                    Zoom Out Semua Area
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-3.5">
                <div
                  className={`space-y-2.5 overflow-y-auto pr-0.5 transition-[max-height] duration-200 ${listMaxHeightClass}`}
                >
                  {viewportListings.map((item) => {
                    const isFocused = focusedListing?.merchantId === item.merchantId;
                    const isFree = item.discountedPrice === 0;
                    const isUrgent = isUrgentListing(item, nowMs);
                    const isStamped = collectedStamps.includes(item.merchantId);
                    const walkMin = estimateWalkMinutes(item.distanceKm);

                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          if (!cardRefs.current[item.merchantId] || isFocused) {
                            cardRefs.current[item.merchantId] = el;
                          }
                        }}
                        onClick={() => handleFocusFromSheetCard(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleFocusFromSheetCard(item)}
                        className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                          isFocused
                            ? 'border-black bg-[#F6F6F6] ring-1 ring-black'
                            : 'border-[#E5E5E5] bg-white hover:bg-[#F6F6F6]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-[11px] font-medium text-[#6B6B6B]">
                                {item.merchantName} · {walkMin} mnt jalan
                              </p>
                              <span className="shrink-0 text-xs font-bold text-[#006D37] tabular-nums">
                                {formatCompactRupiah(item.discountedPrice)}
                              </span>
                            </div>

                            <p className="truncate font-display text-xs font-bold text-[#1A1A1A]">
                              {item.title}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="text-[#4C4546] tabular-nums">
                                {item.pickupWindow}
                              </span>
                              <span className="text-[#A6A6A6]">·</span>
                              <span className="font-semibold text-[#1A1A1A] tabular-nums">
                                Sisa {item.stock}
                              </span>
                              {isUrgent && (
                                <span className="rounded-full bg-[#FFF0ED] px-1.5 py-0.5 font-bold text-[#B42318]">
                                  Segera habis
                                </span>
                              )}
                              {isStamped && (
                                <span className="rounded-full bg-[#06C167]/20 px-1.5 py-0.5 font-bold text-[#006D37]">
                                  Stamped
                                </span>
                              )}
                              {isFree && (
                                <span className="rounded-full bg-[#06C167] px-1.5 py-0.5 font-bold text-[#00210D]">
                                  FREE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick actions saat kartu disorot agar alur lihat -> reservasi super cepat */}
                        {isFocused && (
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#E5E5E5] pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectListing(item);
                              }}
                              className="min-h-[34px] rounded-lg border border-[#E5E5E5] bg-white px-3 text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
                            >
                              Lihat Detail
                            </button>

                            <div className="flex items-center gap-1.5">
                              {!isStamped && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCollectStamp(item.merchantId);
                                    triggerToast(`Stempel ${item.merchantName} dikoleksi!`);
                                  }}
                                  className="min-h-[34px] rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
                                >
                                  Check-in
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickAction(item);
                                }}
                                className={`min-h-[34px] rounded-lg px-3.5 font-display text-[11px] font-bold ${
                                  isFree
                                    ? 'bg-[#06C167] text-[#00210D]'
                                    : 'bg-black text-white'
                                }`}
                              >
                                {isFree ? 'Klaim Gratis' : 'Reservasi'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL 1: KOLEKSI STEMPEL TOKO (GAMIFIKASI BERAT DISEMBUNYIKAN VIA FEATURE FLAG) ==================== */}
      {showPokestopHub && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowPokestopHub(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Koleksi Stempel Toko"
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9]" />
            </div>

            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C167] text-[#00210D]">
                  <Stamp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                    Koleksi Stempel Toko
                  </h2>
                  <p className="text-xs text-[#6B6B6B] tabular-nums">
                    {collectedStamps.length} dari {allMerchantSpots.length} toko telah di-stamp
                  </p>
                  {EXPLORE_FEATURE_FLAGS.showStreak && (
                    <p className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                      <Flame className="h-3.5 w-3.5 text-[#FFB020]" />
                      <span>Streak 4 hari berturut-turut</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPokestopHub(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Misi Mingguan & Leaderboard hanya tampil jika feature flag diaktifkan */}
            {(EXPLORE_FEATURE_FLAGS.showMissions || EXPLORE_FEATURE_FLAGS.showLeaderboard) && (
              <div className="grid grid-cols-3 gap-1 border-b border-[#E5E5E5] bg-[#F6F6F6] p-1.5">
                {[
                  { id: 'stamps', label: 'Stempel', enabled: true },
                  {
                    id: 'missions',
                    label: 'Misi Mingguan',
                    enabled: EXPLORE_FEATURE_FLAGS.showMissions,
                  },
                  {
                    id: 'leaderboard',
                    label: 'Leaderboard',
                    enabled: EXPLORE_FEATURE_FLAGS.showLeaderboard,
                  },
                ]
                  .filter((t) => t.enabled)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setPokestopTab(t.id as 'stamps' | 'missions' | 'leaderboard')
                      }
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                        pokestopTab === t.id ? 'bg-black text-white' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {pokestopTab === 'stamps' && (
                <>
                  {/* Daftar Paspor Stempel Merchant */}
                  <div className="space-y-2.5">
                    {allMerchantSpots.map((spot) => {
                      const stamped = collectedStamps.includes(spot.merchantId);
                      return (
                        <div
                          key={spot.merchantId}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                            stamped
                              ? 'border-[#06C167] bg-[#06C167]/10'
                              : 'border-[#E5E5E5] bg-[#F6F6F6]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                                stamped
                                  ? 'border-[#06C167] bg-[#06C167] text-[#00210D]'
                                  : 'border-[#06C167] bg-white text-[#006D37]'
                              }`}
                            >
                              {stamped ? (
                                <Check className="h-4 w-4 stroke-[3]" />
                              ) : (
                                <Stamp className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-[#006D37]">
                                {spot.merchantCategory}
                              </p>
                              <p className="truncate font-display text-sm font-bold text-[#1A1A1A]">
                                {spot.merchantName}
                              </p>
                              <p className="truncate text-[11px] text-[#6B6B6B]">
                                {spot.neighborhood} · {spot.pickupAddress}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowPokestopHub(false);
                                setMapCenter({ x: spot.coordinates.x, y: spot.coordinates.y });
                                setZoom(1.45);
                                setFocusedMerchantId(spot.merchantId);
                                setShowPinCard(true);
                              }}
                              className="min-h-[34px] rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
                            >
                              Peta
                            </button>
                            {!stamped && (
                              <button
                                type="button"
                                onClick={() => {
                                  onCollectStamp(spot.merchantId);
                                  triggerToast(`Stempel ${spot.merchantName} dikoleksi!`);
                                }}
                                className="min-h-[34px] rounded-lg bg-black px-2.5 text-[11px] font-bold text-white"
                              >
                                Check-in
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Badge per area disembunyikan via feature flag */}
                  {EXPLORE_FEATURE_FLAGS.showAreaBadges && (
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#1A1A1A]">
                        Badge Area (
                        {
                          EXPLORE_BADGES.filter((b) =>
                            b.requiredMerchantIds.every((id) => collectedStamps.includes(id))
                          ).length
                        }
                        /{EXPLORE_BADGES.length} terbuka)
                      </h3>
                      <div className="mt-2.5 space-y-2.5">
                        {EXPLORE_BADGES.map((badge) => {
                          const count = badge.requiredMerchantIds.filter((id) =>
                            collectedStamps.includes(id)
                          ).length;
                          const target = badge.requiredMerchantIds.length;
                          const unlocked = count >= target;
                          const pct = Math.min(100, Math.round((count / target) * 100));

                          return (
                            <div
                              key={badge.id}
                              className={`rounded-xl border p-3.5 ${
                                unlocked
                                  ? 'border-[#06C167] bg-[#06C167]/10'
                                  : 'border-[#E5E5E5] bg-[#F6F6F6]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Award
                                    className={`h-5 w-5 shrink-0 ${
                                      unlocked ? 'text-[#006D37]' : 'text-[#6B6B6B]'
                                    }`}
                                  />
                                  <div>
                                    <p className="font-display text-sm font-bold text-[#1A1A1A]">
                                      {badge.title}
                                    </p>
                                    <p className="text-[11px] text-[#6B6B6B]">
                                      {badge.description}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 font-mono text-xs font-bold tabular-nums">
                                  {count}/{target}
                                </span>
                              </div>
                              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                                <div
                                  className="h-full rounded-full bg-[#06C167] transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {EXPLORE_FEATURE_FLAGS.showMissions && pokestopTab === 'missions' && (
                <div className="space-y-3">
                  {INITIAL_MISSIONS.map((mis) => {
                    const pct = Math.min(100, Math.round((mis.progress / mis.target) * 100));
                    const done = mis.progress >= mis.target;
                    return (
                      <div
                        key={mis.id}
                        className="rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-sm font-bold text-[#1A1A1A]">
                              {mis.title}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-[#006D37]">
                              Hadiah: {mis.rewardLabel}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                              done
                                ? 'bg-[#06C167] text-[#00210D]'
                                : 'bg-white text-[#1A1A1A]'
                            }`}
                          >
                            {mis.progress}/{mis.target}
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full bg-[#06C167]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {EXPLORE_FEATURE_FLAGS.showLeaderboard && pokestopTab === 'leaderboard' && (
                <div className="space-y-2">
                  {INITIAL_LEADERBOARD.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-xl border p-3.5 ${
                        entry.isMe
                          ? 'border-[#06C167] bg-[#06C167]/10'
                          : 'border-[#E5E5E5] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold ${
                            idx === 0
                              ? 'bg-[#FFB020] text-[#1A1A1A]'
                              : 'bg-[#F6F6F6] text-[#1A1A1A]'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-display text-sm font-bold text-[#1A1A1A]">
                            {entry.name}
                          </p>
                          <p className="text-[11px] text-[#6B6B6B]">
                            {entry.area} · {entry.bagsRescued} bag
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-display text-sm font-bold text-[#006D37] tabular-nums">
                        <Trophy className="h-4 w-4" />
                        {entry.kgSaved.toFixed(1)} kg
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: IMPACT TRACKER + SHARE CARD ==================== */}
      {showImpactModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowImpactModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Impact Tracker"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                Impact Penyelamatanmu
              </h2>
              <button
                type="button"
                onClick={() => setShowImpactModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* Shareable Dark Impact Card */}
              <div className="rounded-2xl bg-[#141414] p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#06C167] px-2.5 py-0.5 text-[11px] font-bold text-[#00210D]">
                    TuGuTuGu Impact Card
                  </span>
                  <HeartHandshake className="h-5 w-5 text-[#06C167]" />
                </div>

                <p className="mt-4 font-display text-3xl font-bold tabular-nums">
                  {impactStats.foodKg} kg
                </p>
                <p className="text-xs text-[#A6A6A6]">
                  Makanan layak santap berhasil diselamatkan ({impactStats.totalBags} bag)
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                  <div>
                    <p className="text-[11px] text-[#A6A6A6]">CO₂e Dihemat</p>
                    <p className="font-display text-lg font-bold text-[#06C167] tabular-nums">
                      {impactStats.co2Kg} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#A6A6A6]">Uang Dihemat</p>
                    <p className="font-display text-lg font-bold text-white tabular-nums">
                      {formatRupiah(impactStats.savedMoney)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareImpact}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#06C167] font-display text-sm font-bold text-[#00210D] hover:bg-[#05b05d]"
              >
                <Share2 className="h-4 w-4" />
                Bagikan Kartu Impact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: WISHLIST ALERTS & PICKUP REMINDER ==================== */}
      {showAlertsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowAlertsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Alert dan Wishlist"
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                Alert &amp; Wishlist Stok
              </h2>
              <button
                type="button"
                onClick={() => setShowAlertsModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* Pickup Reminder Banner */}
              <div className="rounded-xl border border-[#06C167]/40 bg-[#06C167]/10 p-3.5 text-xs">
                <p className="font-bold text-[#006D37]">Pengingat Pickup Aktif</p>
                <p className="mt-0.5 text-[#1A1A1A]">
                  Atelier Boulangerie siap diambil pukul <strong>19:30 – 21:00</strong> hari ini.
                </p>
              </div>

              <div className="space-y-2.5">
                {alerts.map((al) => (
                  <label
                    key={al.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-[#1A1A1A]">
                        {al.title}
                      </p>
                      <p className="text-xs text-[#6B6B6B]">{al.criteria}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={al.active}
                      onChange={() =>
                        setAlerts((prev) =>
                          prev.map((a) => (a.id === al.id ? { ...a, active: !a.active } : a))
                        )
                      }
                      className="h-5 w-5 shrink-0 accent-[#06C167]"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={handleActivateRouteAlert}
                className="min-h-[46px] w-full rounded-xl bg-black font-display text-xs font-semibold text-white hover:bg-[#1B1B1B]"
              >
                + Tambah Alert dari Mode Explore Saat Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: SPLIT BAG / SHARE BAG UI ==================== */}
      {splitListing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setSplitListing(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Patungan Split Bag"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <p className="text-xs font-semibold text-[#006D37]">Patungan &amp; Bagikan</p>
                <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                  Split Bag Berdua
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSplitListing(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5">
              <p className="font-display text-sm font-bold text-[#1A1A1A]">
                {splitListing.title}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                {splitListing.merchantName} · Pickup {splitListing.pickupWindow}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[#E5E5E5] pt-2.5 text-sm">
                <span className="text-[#6B6B6B]">Patungan 2 orang:</span>
                <span className="font-display text-lg font-bold text-[#006D37] tabular-nums">
                  {splitListing.discountedPrice === 0
                    ? 'FREE'
                    : `${formatRupiah(Math.ceil(splitListing.discountedPrice / 2))} / org`}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleCopySplitInvite(splitListing)}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#06C167] font-display text-xs font-bold text-[#00210D]"
              >
                <Copy className="h-4 w-4" />
                Salin Ajakan Patungan
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = splitListing;
                  setSplitListing(null);
                  onQuickAction(target);
                }}
                className="flex min-h-[46px] items-center justify-center rounded-xl bg-black font-display text-xs font-semibold text-white"
              >
                Langsung Reservasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
