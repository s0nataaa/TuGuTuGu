import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ReceiptText,
  X,
} from 'lucide-react';
import { OrderRecord } from '../types/marketplace';
import { formatRupiah } from '../data/mockMarketplace';
import { QrCodeSvg } from './QrCodeSvg';

interface ConsumerOrdersProps {
  orders: OrderRecord[];
  highlightedOrderId: string | null;
  onClearHighlight: () => void;
  onCancelOrder: (orderId: string) => void;
  onExploreHome: () => void;
}

export const ConsumerOrders: React.FC<ConsumerOrdersProps> = ({
  orders,
  highlightedOrderId,
  onClearHighlight,
  onCancelOrder,
  onExploreHome,
}) => {
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [ticketOrder, setTicketOrder] = useState<OrderRecord | null>(() =>
    highlightedOrderId ? orders.find((o) => o.id === highlightedOrderId) ?? null : null
  );

  const activeOrders = orders.filter((o) => o.pickupStatus === 'Ready for Pickup');
  const pastOrders = orders.filter((o) => o.pickupStatus !== 'Ready for Pickup');
  const displayed = tab === 'active' ? activeOrders : pastOrders;

  const openTicket = (order: OrderRecord) => {
    setTicketOrder(order);
    onClearHighlight();
  };

  return (
    <div className="space-y-5 pt-2 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1A1A1A]">My Orders</h1>
        <p className="mt-0.5 text-sm text-[#6B6B6B]">
          Track active reservations, free claims, and pickup QR codes
        </p>
      </div>

      {/* Segmented Tabs */}
      <div className="grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-1">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`min-h-[42px] rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors tabular-nums ${
            tab === 'active' ? 'bg-black text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          }`}
        >
          Active ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`min-h-[42px] rounded-lg px-2 text-xs font-semibold whitespace-nowrap transition-colors tabular-nums ${
            tab === 'past' ? 'bg-black text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
          }`}
        >
          Completed ({pastOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
          {displayed.map((order) => {
            const isCodUnpaid =
              order.paymentMethod === 'cod' && order.paymentStatus === 'Pending (Cash on Pickup)';
            const isFree = order.type === 'free';
            const isHighlighted = order.id === highlightedOrderId;

            return (
              <div
                key={order.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-3.5 transition-all sm:p-4 ${
                  isHighlighted
                    ? 'border-[#06C167] ring-2 ring-[#06C167]/30'
                    : 'border-[#E5E5E5]'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] pb-2.5">
                    <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                      {order.id}
                    </span>

                    {isFree ? (
                      <span className="rounded-full bg-[#06C167] px-2.5 py-0.5 text-[11px] font-bold text-[#00210D]">
                        Free Claim · {order.pickupStatus}
                      </span>
                    ) : isCodUnpaid ? (
                      <span className="rounded-full bg-[#FFB020] px-2.5 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
                        Unpaid · Cash on Pickup
                      </span>
                    ) : order.pickupStatus === 'Cancelled' ? (
                      <span className="rounded-full bg-[#E5E5E5] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B6B6B]">
                        Cancelled
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#06C167]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#006D37]">
                        Paid {order.ewalletProvider ? `via ${order.ewalletProvider}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-3">
                    <img
                      src={order.listingImage}
                      alt={order.listingTitle}
                      referrerPolicy="no-referrer"
                      className="h-18 w-18 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[#6B6B6B]">
                        {order.merchantName}
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-sm font-bold text-[#1A1A1A]">
                        {order.listingTitle}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#4C4546]">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="tabular-nums">Pickup {order.pickupWindow}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{order.pickupAddress}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-col gap-3 border-t border-[#E5E5E5] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-baseline justify-between sm:block">
                    <p className="text-[11px] text-[#6B6B6B]">
                      {order.quantity} bag{order.quantity > 1 ? 's' : ''} · {order.createdAt}
                    </p>
                    <p className="font-display text-base font-bold text-[#1A1A1A] tabular-nums">
                      {order.totalAmount === 0 ? 'FREE' : formatRupiah(order.totalAmount)}
                    </p>
                  </div>

                  {order.pickupStatus === 'Ready for Pickup' ? (
                    <button
                      type="button"
                      onClick={() => openTicket(order)}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 font-display text-xs font-semibold text-white hover:bg-[#1B1B1B] sm:w-auto"
                    >
                      <QrCode className="h-4 w-4" />
                      Show QR Ticket
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#006D37]">
                      {order.pickupStatus === 'Completed' && <CheckCircle2 className="h-4 w-4" />}
                      {order.pickupStatus}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] px-6 py-12 text-center">
          <ReceiptText className="h-9 w-9 text-[#6B6B6B]" />
          <h3 className="mt-3 font-display text-base font-bold text-[#1A1A1A]">
            {tab === 'active' ? 'No active pickups right now' : 'No completed orders yet'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#6B6B6B]">
            Reserve a discounted surprise bag or claim a free community bag to see your QR pickup
            ticket here.
          </p>
          <button
            type="button"
            onClick={onExploreHome}
            className="mt-5 min-h-[44px] rounded-lg bg-black px-5 py-2.5 font-display text-sm font-semibold text-white"
          >
            Browse Surplus Food
          </button>
        </div>
      )}

      {/* QR Verification Ticket Modal */}
      {ticketOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setTicketOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pickup Verification Ticket"
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9]" />
            </div>
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5">
              <div>
                <p className="text-xs font-semibold text-[#006D37]">Merchant Verification</p>
                <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                  Pickup QR Ticket
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTicketOrder(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
              <div className="rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-5">
                <QrCodeSvg value={ticketOrder.id} size={184} className="mx-auto p-2" />
                <p className="mt-3 text-xs text-[#6B6B6B]">
                  {ticketOrder.type === 'free' ? 'Claim ID' : 'Order ID'}
                </p>
                <p className="font-mono text-xl font-bold tracking-wider text-[#1A1A1A]">
                  {ticketOrder.id}
                </p>
              </div>

              {ticketOrder.paymentMethod === 'cod' &&
                ticketOrder.paymentStatus === 'Pending (Cash on Pickup)' && (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#FFB020]/20 px-4 py-3 text-left text-xs text-[#1A1A1A]">
                    <Banknote className="h-5 w-5 shrink-0 text-[#9A5B00]" />
                    <div>
                      <p className="font-bold">Unpaid · Cash on Pickup</p>
                      <p className="text-[#4C4546]">
                        Pay <strong>{formatRupiah(ticketOrder.totalAmount)}</strong> directly to{' '}
                        {ticketOrder.merchantName} when scanning this QR code.
                      </p>
                    </div>
                  </div>
                )}

              <div className="mt-4 space-y-2 rounded-xl border border-[#E5E5E5] p-3.5 text-left text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B]">Item</span>
                  <span className="font-semibold text-[#1A1A1A]">
                    {ticketOrder.quantity}× {ticketOrder.listingTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B]">Merchant</span>
                  <span className="font-semibold text-[#1A1A1A]">{ticketOrder.merchantName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B]">Pickup Window</span>
                  <span className="font-semibold text-[#1A1A1A] tabular-nums">
                    {ticketOrder.pickupWindow}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B6B6B]">Payment</span>
                  <span className="font-semibold text-[#1A1A1A]">{ticketOrder.paymentStatus}</span>
                </div>
              </div>

              {ticketOrder.pickupStatus === 'Ready for Pickup' && (
                <button
                  type="button"
                  onClick={() => {
                    onCancelOrder(ticketOrder.id);
                    setTicketOrder(null);
                  }}
                  className="mt-4 min-h-[42px] w-full rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#E11900] hover:bg-[#FFDAD6]/40"
                >
                  Cancel Reservation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
