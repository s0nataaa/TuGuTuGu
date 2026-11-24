import React, { useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Leaf,
  MapPin,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { FoodListing, OrderRecord } from '../types/marketplace';
import { formatRupiah } from '../data/mockMarketplace';
import { QrCodeSvg } from './QrCodeSvg';

interface ConsumerOrdersProps {
  orders: OrderRecord[];
  listings?: FoodListing[];
  highlightedOrderId: string | null;
  onClearHighlight: () => void;
  onCancelOrder: (orderId: string) => void;
  onExploreHome: () => void;
  onSelectListing?: (listing: FoodListing) => void;
}

export const ConsumerOrders: React.FC<ConsumerOrdersProps> = ({
  orders,
  listings = [],
  highlightedOrderId,
  onClearHighlight,
  onCancelOrder,
  onExploreHome,
  onSelectListing,
}) => {
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [ticketOrder, setTicketOrder] = useState<OrderRecord | null>(() =>
    highlightedOrderId ? orders.find((o) => o.id === highlightedOrderId) ?? null : null
  );
  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => o.pickupStatus === 'Ready for Pickup');
  const pastOrders = orders.filter((o) => o.pickupStatus !== 'Ready for Pickup');
  const displayed = tab === 'active' ? activeOrders : pastOrders;

  const openTicket = (order: OrderRecord) => {
    setDetailOrder(null);
    setTicketOrder(order);
    onClearHighlight();
  };

  const openDetail = (order: OrderRecord) => {
    setDetailOrder(order);
    onClearHighlight();
  };

  const handleCopyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedId(orderId);
      setTimeout(() => {
        setCopiedId((prev) => (prev === orderId ? null : prev));
      }, 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const renderStatusBadge = (order: OrderRecord) => {
    const isCodUnpaid =
      order.paymentMethod === 'cod' && order.paymentStatus === 'Pending (Cash on Pickup)';
    const isFree = order.type === 'free';

    if (order.pickupStatus === 'Cancelled') {
      return (
        <span className="rounded-full bg-[#E5E5E5] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B6B6B] dark:bg-[#272B27] dark:text-[#A3A8A3]">
          Cancelled
        </span>
      );
    }
    if (isFree) {
      return (
        <span className="rounded-full bg-[#06C167] px-2.5 py-0.5 text-[11px] font-bold text-[#00210D]">
          Free Claim · {order.pickupStatus}
        </span>
      );
    }
    if (isCodUnpaid) {
      return (
        <span className="rounded-full bg-[#FFB020] px-2.5 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
          Unpaid · Cash on Pickup
        </span>
      );
    }
    return (
      <span className="rounded-full bg-[#06C167]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#006D37] dark:bg-[#06C167]/20 dark:text-[#06C167]">
        Paid {order.ewalletProvider ? `via ${order.ewalletProvider}` : ''}
      </span>
    );
  };

  const matchedListing = detailOrder
    ? listings.find((l) => l.id === detailOrder.listingId)
    : undefined;

  return (
    <div className="space-y-5 pt-2 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
          My Orders
        </h1>
        <p className="mt-0.5 text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
          Tap any order card to view full details, receipt, or pickup QR codes
        </p>
      </div>

      {/* Segmented Tabs */}
      <div className="grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-1 dark:border-[#2A2D2A] dark:bg-[#161816]">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`min-h-[42px] rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors tabular-nums ${
            tab === 'active'
              ? 'bg-black text-white dark:bg-[#06C167] dark:text-[#00210D]'
              : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
          }`}
        >
          Active ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`min-h-[42px] rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors tabular-nums ${
            tab === 'past'
              ? 'bg-black text-white dark:bg-[#06C167] dark:text-[#00210D]'
              : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
          }`}
        >
          Completed ({pastOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
          {displayed.map((order) => {
            const isHighlighted = order.id === highlightedOrderId;

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(order);
                  }
                }}
                aria-label={`View details for ${order.listingTitle} (${order.id})`}
                className={`group flex cursor-pointer flex-col justify-between rounded-2xl border bg-white p-3.5 text-left transition-all hover:border-[#1A1A1A]/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] sm:p-4 dark:bg-[#161816] dark:hover:border-[#454A45] ${
                  isHighlighted
                    ? 'border-[#06C167] ring-2 ring-[#06C167]/30'
                    : 'border-[#E5E5E5] dark:border-[#2A2D2A]'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] pb-2.5 dark:border-[#2A2D2A]">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {order.id}
                      <ChevronRight className="h-3.5 w-3.5 text-[#9B9B9B] transition-transform group-hover:translate-x-0.5 dark:text-[#7D857E]" />
                    </span>

                    {renderStatusBadge(order)}
                  </div>

                  <div className="mt-3 flex gap-3">
                    <img
                      src={order.listingImage}
                      alt={order.listingTitle}
                      referrerPolicy="no-referrer"
                      className="h-18 w-18 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[#6B6B6B] dark:text-[#A3A8A3]">
                        {order.merchantName}
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {order.listingTitle}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#4C4546] dark:text-[#C8CDC8]">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="tabular-nums">Pickup {order.pickupWindow}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{order.pickupAddress}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-col gap-3 border-t border-[#E5E5E5] pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2A2D2A]">
                  <div className="flex items-baseline justify-between sm:block">
                    <p className="text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                      {order.quantity} bag{order.quantity > 1 ? 's' : ''} · {order.createdAt}
                    </p>
                    <p className="font-display text-base font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                      {order.totalAmount === 0 ? 'FREE' : formatRupiah(order.totalAmount)}
                    </p>
                  </div>

                  {order.pickupStatus === 'Ready for Pickup' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTicket(order);
                      }}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 font-display text-xs font-semibold text-white hover:bg-[#1B1B1B] sm:w-auto dark:bg-white dark:text-[#0D0E0D] dark:hover:bg-[#E5E5E5]"
                    >
                      <QrCode className="h-4 w-4" />
                      Show QR Ticket
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          order.pickupStatus === 'Completed'
                            ? 'text-[#006D37] dark:text-[#06C167]'
                            : 'text-[#6B6B6B] dark:text-[#A3A8A3]'
                        }`}
                      >
                        {order.pickupStatus === 'Completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {order.pickupStatus}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F6F6F6] px-2.5 py-1.5 text-[11px] font-semibold text-[#1A1A1A] group-hover:bg-[#EAEAEA] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:group-hover:bg-[#272B27]">
                        Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] px-6 py-12 text-center dark:border-[#2A2D2A] dark:bg-[#161816]">
          <ReceiptText className="h-9 w-9 text-[#6B6B6B] dark:text-[#A3A8A3]" />
          <h3 className="mt-3 font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            {tab === 'active' ? 'No active pickups right now' : 'No completed orders yet'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#6B6B6B] dark:text-[#A3A8A3]">
            Reserve a discounted surprise bag or claim a free community bag to see your QR pickup
            ticket here.
          </p>
          <button
            type="button"
            onClick={onExploreHome}
            className="mt-5 min-h-[44px] rounded-lg bg-black px-5 py-2.5 font-display text-sm font-semibold text-white dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
          >
            Browse Surplus Food
          </button>
        </div>
      )}

      {/* Order Detail Sheet / Modal */}
      {detailOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
          onClick={() => setDetailOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Order Details"
        >
          <div
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-[0_8px_28px_rgba(0,0,0,0.22)] sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#006D37] dark:text-[#06C167]">
                  Order Summary
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <h2 className="font-mono text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {detailOrder.id}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopyOrderId(detailOrder.id)}
                    aria-label="Copy order ID"
                    className="inline-flex items-center gap-1 rounded-md border border-[#E5E5E5] bg-[#F6F6F6] px-2 py-0.5 text-[11px] font-semibold text-[#4C4546] hover:bg-[#EAEAEA] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#C8CDC8] dark:hover:bg-[#272B27]"
                  >
                    {copiedId === detailOrder.id ? (
                      <>
                        <Check className="h-3 w-3 text-[#06C167]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                aria-label="Close order details"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* Status & Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-3.5 py-2.5 dark:border-[#2E322E] dark:bg-[#1E211E]">
                <div className="flex items-center gap-2">
                  {detailOrder.pickupStatus === 'Completed' ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#006D37] dark:text-[#06C167]" />
                  ) : detailOrder.pickupStatus === 'Cancelled' ? (
                    <XCircle className="h-4.5 w-4.5 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                  ) : (
                    <Clock className="h-4.5 w-4.5 text-[#006D37] dark:text-[#06C167]" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.pickupStatus}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                      Placed {detailOrder.createdAt}
                    </p>
                  </div>
                </div>
                {renderStatusBadge(detailOrder)}
              </div>

              {/* 3-Step Order Progress */}
              <div className="rounded-xl border border-[#E5E5E5] p-3.5 dark:border-[#2E322E] dark:bg-[#1E211E]/50">
                <p className="mb-3 text-[11px] font-bold tracking-wide text-[#6B6B6B] uppercase dark:text-[#A3A8A3]">
                  Order Timeline
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Step 1: Placed */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#06C167] text-[#00210D]">
                      <Check className="h-4 w-4" />
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      Reserved
                    </p>
                    <p className="text-[10px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                      {detailOrder.createdAt}
                    </p>
                  </div>

                  {/* Step 2: Ready for Pickup */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        detailOrder.pickupStatus === 'Cancelled'
                          ? 'bg-[#E5E5E5] text-[#6B6B6B] dark:bg-[#272B27] dark:text-[#A3A8A3]'
                          : 'bg-[#06C167] text-[#00210D]'
                      }`}
                    >
                      {detailOrder.pickupStatus === 'Cancelled' ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <ShoppingBag className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      Pickup Window
                    </p>
                    <p className="text-[10px] tabular-nums text-[#6B6B6B] dark:text-[#A3A8A3]">
                      {detailOrder.pickupWindow}
                    </p>
                  </div>

                  {/* Step 3: Completed or Cancelled */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        detailOrder.pickupStatus === 'Completed'
                          ? 'bg-[#06C167] text-[#00210D]'
                          : detailOrder.pickupStatus === 'Cancelled'
                            ? 'bg-[#FFDAD6] text-[#E11900] dark:bg-[#3A1B18] dark:text-[#FCA5A5]'
                            : 'border border-dashed border-[#C7C7C7] bg-white text-[#9B9B9B] dark:border-[#3E443E] dark:bg-[#161816] dark:text-[#7D857E]'
                      }`}
                    >
                      {detailOrder.pickupStatus === 'Completed' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : detailOrder.pickupStatus === 'Cancelled' ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <QrCode className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.pickupStatus === 'Cancelled'
                        ? 'Cancelled'
                        : detailOrder.pickupStatus === 'Completed'
                          ? 'Rescued'
                          : 'Scan QR'}
                    </p>
                    <p className="text-[10px] text-[#6B6B6B] dark:text-[#A3A8A3]">
                      {detailOrder.pickupStatus === 'Completed'
                        ? 'Picked up'
                        : detailOrder.pickupStatus === 'Cancelled'
                          ? 'Stock returned'
                          : 'At counter'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item & Merchant Details */}
              <div className="rounded-xl border border-[#E5E5E5] p-3.5 dark:border-[#2E322E] dark:bg-[#1E211E]/50">
                <div className="flex gap-3">
                  <img
                    src={detailOrder.listingImage}
                    alt={detailOrder.listingTitle}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006D37] dark:text-[#06C167]">
                      <Store className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{detailOrder.merchantName}</span>
                    </div>
                    <h3 className="mt-0.5 font-display text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.listingTitle}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#4C4546] dark:text-[#C8CDC8]">
                      Quantity: <span className="font-bold">{detailOrder.quantity} bag{detailOrder.quantity > 1 ? 's' : ''}</span>
                    </p>
                    {matchedListing?.dietaryTags && matchedListing.dietaryTags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {matchedListing.dietaryTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[#F6F6F6] px-2 py-0.5 text-[10px] font-medium text-[#4C4546] dark:bg-[#272B27] dark:text-[#C8CDC8]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {matchedListing?.whatsInside && matchedListing.whatsInside.length > 0 && (
                  <div className="mt-3 border-t border-[#E5E5E5] pt-2.5 dark:border-[#2E322E]">
                    <p className="text-[11px] font-semibold text-[#6B6B6B] dark:text-[#A3A8A3]">
                      What&apos;s inside this bag
                    </p>
                    <p className="mt-0.5 text-xs text-[#1A1A1A] dark:text-[#E5E7EB]">
                      {matchedListing.whatsInside.join(' · ')}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-1.5 border-t border-[#E5E5E5] pt-2.5 text-xs dark:border-[#2E322E]">
                  <div className="flex items-start gap-2 text-[#4C4546] dark:text-[#C8CDC8]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                    <span>{detailOrder.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4C4546] dark:text-[#C8CDC8]">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                    <span className="tabular-nums">Pickup window: {detailOrder.pickupWindow}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#4C4546] dark:text-[#C8CDC8]">
                    <User className="h-3.5 w-3.5 shrink-0 text-[#6B6B6B] dark:text-[#A3A8A3]" />
                    <span>Reserved by {detailOrder.customerName}</span>
                  </div>
                </div>
              </div>

              {/* COD Alert if unpaid */}
              {detailOrder.pickupStatus === 'Ready for Pickup' &&
                detailOrder.paymentMethod === 'cod' &&
                detailOrder.paymentStatus === 'Pending (Cash on Pickup)' && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#FFB020]/20 px-3.5 py-3 text-xs text-[#1A1A1A] dark:bg-[#FFB020]/15 dark:text-[#FDE68A]">
                    <Banknote className="h-5 w-5 shrink-0 text-[#9A5B00] dark:text-[#FFB020]" />
                    <div>
                      <p className="font-bold">Cash on Pickup Required</p>
                      <p className="text-[#4C4546] dark:text-[#FDE68A]/85">
                        Prepare <strong>{formatRupiah(detailOrder.totalAmount)}</strong> when picking
                        up at {detailOrder.merchantName}.
                      </p>
                    </div>
                  </div>
                )}

              {/* Payment & Savings Receipt */}
              <div className="rounded-xl border border-[#E5E5E5] p-3.5 text-xs dark:border-[#2E322E] dark:bg-[#1E211E]/50">
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#6B6B6B] uppercase dark:text-[#A3A8A3]">
                  <Wallet className="h-3.5 w-3.5" />
                  Payment &amp; Savings Receipt
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">
                      Original Value ({detailOrder.quantity}×{' '}
                      {formatRupiah(detailOrder.unitOriginalPrice)})
                    </span>
                    <span className="font-medium text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                      {formatRupiah(detailOrder.unitOriginalPrice * detailOrder.quantity)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#006D37] dark:text-[#06C167]">
                      TuGuTuGu Rescue Discount
                    </span>
                    <span className="font-semibold text-[#006D37] tabular-nums dark:text-[#06C167]">
                      -{formatRupiah(detailOrder.totalSavings)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[#E5E5E5] pt-2 dark:border-[#2E322E]">
                    <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.type === 'free'
                        ? 'Total Claim Cost'
                        : detailOrder.paymentStatus === 'Paid'
                          ? 'Total Paid'
                          : 'Total Due at Pickup'}
                    </span>
                    <span className="font-display text-sm font-bold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                      {detailOrder.totalAmount === 0
                        ? 'FREE'
                        : formatRupiah(detailOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 pt-1">
                    <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Payment Method</span>
                    <span className="font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.type === 'free'
                        ? 'Community Free Share'
                        : detailOrder.paymentMethod === 'cod'
                          ? 'Cash on Pickup (COD)'
                          : `E-Wallet (${detailOrder.ewalletProvider ?? 'Digital Wallet'})`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Payment Status</span>
                    <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {detailOrder.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Impact Highlight for Completed Orders */}
              {detailOrder.pickupStatus === 'Completed' && (
                <div className="flex items-center gap-3 rounded-xl bg-[#06C167]/12 px-3.5 py-3 text-xs dark:bg-[#06C167]/15">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C167] text-[#00210D]">
                    <Leaf className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#006D37] dark:text-[#06C167]">
                      Food Rescued Successfully!
                    </p>
                    <p className="text-[#4C4546] dark:text-[#C8CDC8]">
                      You saved{' '}
                      <strong className="tabular-nums">
                        {formatRupiah(detailOrder.totalSavings)}
                      </strong>{' '}
                      and prevented ~{(detailOrder.quantity * (matchedListing?.weightKg ?? 0.9)).toFixed(1)}{' '}
                      kg of surplus food waste.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-1">
                {detailOrder.pickupStatus === 'Ready for Pickup' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openTicket(detailOrder)}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-black px-4 font-display text-sm font-semibold text-white hover:bg-[#1B1B1B] dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
                    >
                      <QrCode className="h-4.5 w-4.5" />
                      Show Pickup QR Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCancelOrder(detailOrder.id);
                        setDetailOrder(null);
                      }}
                      className="min-h-[42px] w-full rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#E11900] hover:bg-[#FFDAD6]/40 dark:border-[#5C231D] dark:text-[#FCA5A5] dark:hover:bg-[#3A1B18]"
                    >
                      Cancel Reservation
                    </button>
                  </>
                ) : matchedListing && matchedListing.stock > 0 && onSelectListing ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = matchedListing;
                      setDetailOrder(null);
                      onSelectListing(target);
                    }}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-black px-4 font-display text-sm font-semibold text-white hover:bg-[#1B1B1B] dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Order Again ({matchedListing.stock} left)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailOrder(null);
                      onExploreHome();
                    }}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-black px-4 font-display text-sm font-semibold text-white hover:bg-[#1B1B1B] dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Browse More Surplus Food
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Verification Ticket Modal */}
      {ticketOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/75"
          onClick={() => setTicketOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pickup Verification Ticket"
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
            </div>
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
              <div>
                <p className="text-xs font-semibold text-[#006D37] dark:text-[#06C167]">
                  Merchant Verification
                </p>
                <h2 className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Pickup QR Ticket
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTicketOrder(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
              <div className="rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-5 dark:border-[#2E322E] dark:bg-[#1E211E]">
                <QrCodeSvg value={ticketOrder.id} size={184} className="mx-auto p-2" />
                <p className="mt-3 text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
                  {ticketOrder.type === 'free' ? 'Claim ID' : 'Order ID'}
                </p>
                <p className="font-mono text-xl font-bold tracking-wider text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {ticketOrder.id}
                </p>
              </div>

              {ticketOrder.paymentMethod === 'cod' &&
                ticketOrder.paymentStatus === 'Pending (Cash on Pickup)' && (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#FFB020]/20 px-4 py-3 text-left text-xs text-[#1A1A1A] dark:bg-[#FFB020]/15 dark:text-[#FDE68A]">
                    <Banknote className="h-5 w-5 shrink-0 text-[#9A5B00] dark:text-[#FFB020]" />
                    <div>
                      <p className="font-bold">Unpaid · Cash on Pickup</p>
                      <p className="text-[#4C4546] dark:text-[#FDE68A]/85">
                        Pay <strong>{formatRupiah(ticketOrder.totalAmount)}</strong> directly to{' '}
                        {ticketOrder.merchantName} when scanning this QR code.
                      </p>
                    </div>
                  </div>
                )}

              <div className="mt-4 space-y-2 rounded-xl border border-[#E5E5E5] p-3.5 text-left text-xs dark:border-[#2E322E] dark:bg-[#1E211E]/60">
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Item</span>
                  <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {ticketOrder.quantity}× {ticketOrder.listingTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Merchant</span>
                  <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {ticketOrder.merchantName}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Pickup Window</span>
                  <span className="font-semibold text-[#1A1A1A] tabular-nums dark:text-[#F5F5F5]">
                    {ticketOrder.pickupWindow}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B] dark:text-[#A3A8A3]">Payment</span>
                  <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {ticketOrder.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = ticketOrder;
                    setTicketOrder(null);
                    setDetailOrder(current);
                  }}
                  className="min-h-[42px] w-full rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] hover:bg-[#F6F6F6] dark:border-[#2E322E] dark:text-[#F5F5F5] dark:hover:bg-[#1E211E]"
                >
                  View Full Order Details
                </button>

                {ticketOrder.pickupStatus === 'Ready for Pickup' && (
                  <button
                    type="button"
                    onClick={() => {
                      onCancelOrder(ticketOrder.id);
                      setTicketOrder(null);
                    }}
                    className="min-h-[42px] w-full rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#E11900] hover:bg-[#FFDAD6]/40 dark:border-[#5C231D] dark:text-[#FCA5A5] dark:hover:bg-[#3A1B18]"
                  >
                    Cancel Reservation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
