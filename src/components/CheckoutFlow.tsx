import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  X,
} from 'lucide-react';
import {
  EWalletProvider,
  FoodListing,
  OrderRecord,
  PaymentMethod,
} from '../types/marketplace';
import { formatRupiah } from '../data/mockMarketplace';
import { QrCodeSvg } from './QrCodeSvg';

interface CheckoutFlowProps {
  listing: FoodListing;
  customerName: string;
  defaultWallet?: EWalletProvider;
  onClose: () => void;
  onCompleteOrder: (order: OrderRecord) => void;
  onViewMyOrder: (orderId: string) => void;
}

const EWALLET_PROVIDERS: {
  id: EWalletProvider;
  label: string;
  subtitle: string;
  badgeColor: string;
}[] = [
  { id: 'GoPay', label: 'GoPay', subtitle: 'Instant QRIS & GoPay balance', badgeColor: 'bg-[#00AED6] text-white' },
  { id: 'OVO', label: 'OVO', subtitle: 'OVO Cash & Points supported', badgeColor: 'bg-[#4C3494] text-white' },
  { id: 'DANA', label: 'DANA', subtitle: 'Direct DANA wallet checkout', badgeColor: 'bg-[#118EEA] text-white' },
  { id: 'ShopeePay', label: 'ShopeePay', subtitle: 'Fast mobile confirmation', badgeColor: 'bg-[#EE4D2D] text-white' },
];

type PaidStep = 1 | 2 | 3 | 4 | 5;
type PaymentProcessState = 'processing' | 'success' | 'failed' | 'cod_pending';

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  listing,
  customerName,
  defaultWallet = 'GoPay',
  onClose,
  onCompleteOrder,
  onViewMyOrder,
}) => {
  const isFree = listing.discountedPrice === 0;
  const maxAllowed = isFree
    ? Math.min(listing.stock, listing.maxClaimPerUser ?? 1)
    : listing.stock;

  const [quantity, setQuantity] = useState(1);
  const [paidStep, setPaidStep] = useState<PaidStep>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ewallet');
  const [ewalletProvider, setEwalletProvider] = useState<EWalletProvider>(defaultWallet);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [processState, setProcessState] = useState<PaymentProcessState>('processing');

  // Free claim state
  const [freeConfirmed, setFreeConfirmed] = useState(false);
  const [freeClaiming, setFreeClaiming] = useState(false);

  // Final created order
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);

  const unitOriginal = listing.originalPrice;
  const unitDiscounted = listing.discountedPrice;
  const totalOriginal = unitOriginal * quantity;
  const totalAmount = unitDiscounted * quantity;
  const totalSavings = totalOriginal - totalAmount;

  const generateUniqueId = (prefix: 'SB' | 'FREE') => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${num}`;
  };

  // Run e-wallet processing effect when entering Step 4 with ewallet
  useEffect(() => {
    if (paidStep !== 4 || paymentMethod !== 'ewallet' || processState !== 'processing') {
      return;
    }
    const timer = window.setTimeout(() => {
      if (simulateFailure) {
        setProcessState('failed');
      } else {
        const orderId = generateUniqueId('SB');
        const newOrder: OrderRecord = {
          id: orderId,
          type: 'paid',
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.image,
          merchantId: listing.merchantId,
          merchantName: listing.merchantName,
          pickupAddress: listing.pickupAddress,
          pickupWindow: listing.pickupWindow,
          quantity,
          unitOriginalPrice: unitOriginal,
          unitPaidPrice: unitDiscounted,
          totalAmount,
          totalSavings,
          paymentMethod: 'ewallet',
          ewalletProvider,
          paymentStatus: 'Paid',
          pickupStatus: 'Ready for Pickup',
          customerName,
          createdAt: 'Just now',
        };
        setCreatedOrder(newOrder);
        onCompleteOrder(newOrder);
        setProcessState('success');
      }
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [
    paidStep,
    paymentMethod,
    processState,
    simulateFailure,
    listing,
    quantity,
    unitOriginal,
    unitDiscounted,
    totalAmount,
    totalSavings,
    ewalletProvider,
    customerName,
    onCompleteOrder,
  ]);

  const handleConfirmCod = () => {
    const orderId = generateUniqueId('SB');
    const newOrder: OrderRecord = {
      id: orderId,
      type: 'paid',
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.image,
      merchantId: listing.merchantId,
      merchantName: listing.merchantName,
      pickupAddress: listing.pickupAddress,
      pickupWindow: listing.pickupWindow,
      quantity,
      unitOriginalPrice: unitOriginal,
      unitPaidPrice: unitDiscounted,
      totalAmount,
      totalSavings,
      paymentMethod: 'cod',
      paymentStatus: 'Pending (Cash on Pickup)',
      pickupStatus: 'Ready for Pickup',
      customerName,
      createdAt: 'Just now',
    };
    setCreatedOrder(newOrder);
    onCompleteOrder(newOrder);
    setProcessState('cod_pending');
    setPaidStep(4);
  };

  const handleStartEwalletPayment = () => {
    setProcessState('processing');
    setPaidStep(4);
  };

  const handleRetryPayment = () => {
    setSimulateFailure(false);
    setProcessState('processing');
  };

  const handleConfirmFreeClaim = () => {
    setFreeClaiming(true);
    window.setTimeout(() => {
      const claimId = generateUniqueId('FREE');
      const newOrder: OrderRecord = {
        id: claimId,
        type: 'free',
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.image,
        merchantId: listing.merchantId,
        merchantName: listing.merchantName,
        pickupAddress: listing.pickupAddress,
        pickupWindow: listing.pickupWindow,
        quantity,
        unitOriginalPrice: unitOriginal,
        unitPaidPrice: 0,
        totalAmount: 0,
        totalSavings: unitOriginal * quantity,
        paymentStatus: 'Free Claim',
        pickupStatus: 'Ready for Pickup',
        customerName,
        createdAt: 'Just now',
      };
      setCreatedOrder(newOrder);
      onCompleteOrder(newOrder);
      setFreeClaiming(false);
      setFreeConfirmed(true);
    }, 650);
  };

  const handleBack = () => {
    if (paidStep === 2) setPaidStep(1);
    else if (paidStep === 3) setPaidStep(2);
    else if (paidStep === 4 && processState === 'failed') setPaidStep(3);
    else onClose();
  };

  // ==================== FREE FOOD CLAIM FLOW ====================
  if (isFree) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Free Food Claim"
      >
        <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] sm:rounded-2xl">
          <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9]" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
            <div className="flex items-center gap-2.5">
              {!freeConfirmed && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Back"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                  {freeConfirmed ? 'Free Claim Confirmed' : 'Claim Free Surplus Food'}
                </h2>
                <p className="text-xs text-[#6B6B6B]">Zero-cost community food rescue</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {!freeConfirmed ? (
              <div className="space-y-5">
                {/* Item Card */}
                <div className="flex gap-3.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-full bg-[#06C167] px-2.5 py-0.5 text-[11px] font-bold text-[#00210D]">
                      FREE · RP 0
                    </span>
                    <h3 className="mt-1 truncate font-display text-sm font-bold text-[#1A1A1A]">
                      {listing.title}
                    </h3>
                    <p className="text-xs text-[#6B6B6B]">{listing.merchantName}</p>
                    <p className="mt-1 text-xs font-medium text-[#006D37] tabular-nums">
                      {listing.stock} free claims remaining
                    </p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] p-4">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#1A1A1A]">
                      Claim Quantity
                    </p>
                    <p className="text-xs text-[#6B6B6B]">
                      Max {maxAllowed} per person · {listing.stock} available
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-display text-base font-bold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                      disabled={quantity >= maxAllowed}
                      aria-label="Increase quantity"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Pickup Info */}
                <div className="space-y-3 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
                    <div>
                      <p className="text-xs text-[#6B6B6B]">Merchant</p>
                      <p className="font-semibold text-[#1A1A1A]">{listing.merchantName}</p>
                      <p className="text-xs text-[#6B6B6B]">{listing.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-[#E5E5E5] pt-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
                    <div>
                      <p className="text-xs text-[#6B6B6B]">Pickup Window</p>
                      <p className="font-semibold text-[#1A1A1A] tabular-nums">
                        Today, {listing.pickupWindow}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Zero-cost banner */}
                <div className="flex items-center justify-between rounded-xl bg-[#06C167]/15 px-4 py-3 text-sm">
                  <span className="font-medium text-[#005228]">No payment required</span>
                  <span className="font-display text-lg font-bold text-[#005228] tabular-nums">
                    Rp 0
                  </span>
                </div>
              </div>
            ) : (
              createdOrder && (
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06C167] text-[#00210D]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#1A1A1A]">
                    Your Free Bag is Reserved
                  </h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">
                    Show this QR code to {createdOrder.merchantName} during pickup.
                  </p>

                  <div className="mt-5 rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-5">
                    <QrCodeSvg value={createdOrder.id} size={172} className="mx-auto p-2" />
                    <p className="mt-3 text-xs font-medium text-[#6B6B6B]">Unique Claim ID</p>
                    <p className="font-mono text-lg font-bold tracking-wider text-[#1A1A1A]">
                      {createdOrder.id}
                    </p>
                  </div>

                  <div className="mt-5 w-full space-y-2.5 rounded-xl border border-[#E5E5E5] p-4 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Merchant</span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {createdOrder.merchantName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Pickup Time</span>
                      <span className="font-semibold text-[#1A1A1A] tabular-nums">
                        {createdOrder.pickupWindow}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Status</span>
                      <span className="font-semibold text-[#006D37]">
                        Free Claim · Ready for Pickup
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E5E5E5] bg-white px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            {!freeConfirmed ? (
              <button
                type="button"
                disabled={freeClaiming}
                onClick={handleConfirmFreeClaim}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#06C167] px-5 font-display text-base font-bold text-[#00210D] transition-colors hover:bg-[#05b05d] disabled:opacity-60"
              >
                {freeClaiming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Confirming Claim...
                  </>
                ) : (
                  'Confirm Claim for Free'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => createdOrder && onViewMyOrder(createdOrder.id)}
                className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-black px-5 font-display text-base font-semibold text-white hover:bg-[#1B1B1B]"
              >
                View My Order
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== DISCOUNTED FOOD PAYMENT FLOW (STEP 1–5) ====================
  const stepTitles: Record<PaidStep, string> = {
    1: 'Step 1 of 5 · Select Quantity',
    2: 'Step 2 of 5 · Order Summary',
    3: 'Step 3 of 5 · Payment Method',
    4: 'Step 4 of 5 · Payment Status',
    5: 'Step 5 of 5 · Order Confirmed',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout Flow"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] sm:rounded-2xl">
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9]" />
        </div>
        {/* Header */}
        <div className="border-b border-[#E5E5E5] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {paidStep < 5 && !(paidStep === 4 && processState === 'processing') && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F6F6F6] text-[#1A1A1A] hover:bg-[#EAE7E7]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <p className="text-[11px] font-semibold text-[#006D37]">{stepTitles[paidStep]}</p>
                <h2 className="font-display text-base font-bold text-[#1A1A1A]">
                  {paidStep === 1 && 'Reserve Surprise Bag'}
                  {paidStep === 2 && 'Review Order Summary'}
                  {paidStep === 3 && 'Choose Payment Method'}
                  {paidStep === 4 && 'Transaction Status'}
                  {paidStep === 5 && 'Reservation Confirmed'}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close checkout"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F6F6F6]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 5-step progress indicator */}
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-colors ${
                  step <= paidStep ? 'bg-[#06C167]' : 'bg-[#E5E5E5]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP 1: QUANTITY SELECTION */}
          {paidStep === 1 && (
            <div className="space-y-5">
              <div className="flex gap-3.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-3.5">
                <img
                  src={listing.image}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-black px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                    -{listing.discountPercent}% OFF
                  </span>
                  <h3 className="mt-1 truncate font-display text-sm font-bold text-[#1A1A1A]">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-[#6B6B6B]">{listing.merchantName}</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-base font-bold text-[#006D37] tabular-nums">
                      {formatRupiah(unitDiscounted)}
                    </span>
                    <span className="text-xs text-[#6B6B6B] line-through tabular-nums">
                      {formatRupiah(unitOriginal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] p-4">
                <div>
                  <p className="font-display text-sm font-semibold text-[#1A1A1A]">
                    Select Quantity
                  </p>
                  <p className="text-xs text-[#6B6B6B] tabular-nums">
                    Remaining stock: <strong className="text-[#1A1A1A]">{listing.stock} bags</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] transition-colors hover:bg-[#EAE7E7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-7 text-center font-display text-lg font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                    disabled={quantity >= maxAllowed}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] text-[#1A1A1A] transition-colors hover:bg-[#EAE7E7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {quantity >= maxAllowed && (
                <p className="text-xs font-medium text-[#9A5B00]">
                  Maximum available stock ({listing.stock}) selected.
                </p>
              )}

              <div className="flex items-center justify-between rounded-xl bg-[#F6F6F6] p-4">
                <span className="text-sm text-[#6B6B6B]">Subtotal ({quantity} bag{quantity > 1 ? 's' : ''})</span>
                <span className="font-display text-xl font-bold text-[#006D37] tabular-nums">
                  {formatRupiah(totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: ORDER SUMMARY */}
          {paidStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 rounded-xl border border-[#E5E5E5] p-3.5">
                <img
                  src={listing.image}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#6B6B6B]">{listing.merchantName}</p>
                  <h3 className="truncate font-display text-sm font-bold text-[#1A1A1A]">
                    {listing.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#1A1A1A] tabular-nums">
                    Quantity: <strong>{quantity}×</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
                  <div>
                    <p className="text-xs text-[#6B6B6B]">Pickup Location</p>
                    <p className="font-semibold text-[#1A1A1A]">{listing.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 border-t border-[#E5E5E5] pt-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
                  <div>
                    <p className="text-xs text-[#6B6B6B]">Pickup Time Window</p>
                    <p className="font-semibold text-[#1A1A1A] tabular-nums">
                      Today, {listing.pickupWindow}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl border border-[#E5E5E5] p-4 text-sm">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Original price ({quantity}×)</span>
                  <span className="line-through tabular-nums">{formatRupiah(totalOriginal)}</span>
                </div>
                <div className="flex justify-between text-[#006D37]">
                  <span>Food Rescue Savings (-{listing.discountPercent}%)</span>
                  <span className="font-semibold tabular-nums">-{formatRupiah(totalSavings)}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Discounted unit price</span>
                  <span className="tabular-nums">{formatRupiah(unitDiscounted)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-3">
                  <span className="font-display text-base font-bold text-[#1A1A1A]">
                    Total Amount
                  </span>
                  <span className="font-display text-xl font-bold text-[#006D37] tabular-nums">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT METHOD SELECTION */}
          {paidStep === 3 && (
            <div className="space-y-4">
              {/* Option 1: E-Wallet */}
              <div
                onClick={() => setPaymentMethod('ewallet')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setPaymentMethod('ewallet')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'ewallet'
                    ? 'border-black bg-white'
                    : 'border-[#E5E5E5] bg-[#F6F6F6] hover:border-[#1A1A1A]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-[#1A1A1A]">
                        Option 1: E-Wallet
                      </p>
                      <p className="text-xs text-[#6B6B6B]">
                        Instant confirmation via digital wallet
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      paymentMethod === 'ewallet' ? 'border-black bg-black' : 'border-[#CFC4C5]'
                    }`}
                  >
                    {paymentMethod === 'ewallet' && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {paymentMethod === 'ewallet' && (
                  <div className="mt-4 space-y-2.5 border-t border-[#E5E5E5] pt-3.5">
                    <p className="text-xs font-semibold text-[#1A1A1A]">
                      Select provider (Selected: {ewalletProvider})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {EWALLET_PROVIDERS.map((provider) => {
                        const active = ewalletProvider === provider.id;
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEwalletProvider(provider.id);
                            }}
                            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                              active
                                ? 'border-black bg-[#F6F6F6] ring-1 ring-black'
                                : 'border-[#E5E5E5] bg-white hover:bg-[#F6F6F6]'
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${provider.badgeColor}`}
                            >
                              {provider.label.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[#1A1A1A]">
                                {provider.label}
                              </p>
                              <p className="truncate text-[10px] text-[#6B6B6B]">
                                {active ? 'Selected' : 'Tap to select'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 flex cursor-pointer items-center justify-between rounded-lg bg-[#F6F6F6] px-3 py-2 text-xs text-[#6B6B6B]"
                    >
                      <span>Simulate gateway error (test retry flow)</span>
                      <input
                        type="checkbox"
                        checked={simulateFailure}
                        onChange={(e) => setSimulateFailure(e.target.checked)}
                        className="h-4 w-4 accent-black"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Option 2: Cash on Pickup (COD) */}
              <div
                onClick={() => setPaymentMethod('cod')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setPaymentMethod('cod')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'cod'
                    ? 'border-black bg-white'
                    : 'border-[#E5E5E5] bg-[#F6F6F6] hover:border-[#1A1A1A]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAE7E7] text-[#1A1A1A]">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-[#1A1A1A]">
                        Option 2: Cash on Pickup (COD)
                      </p>
                      <p className="text-xs text-[#6B6B6B]">Pay directly at the merchant counter</p>
                    </div>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      paymentMethod === 'cod' ? 'border-black bg-black' : 'border-[#CFC4C5]'
                    }`}
                  >
                    {paymentMethod === 'cod' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="mt-3 rounded-lg border border-[#E5E5E5] bg-[#F6F6F6] p-3 text-xs leading-relaxed text-[#4C4546]">
                    Your surprise bag will be held until <strong>{listing.pickupWindow}</strong>.
                    Payment of <strong>{formatRupiah(totalAmount)}</strong> is made directly in cash
                    at <strong>{listing.merchantName}</strong> when collecting your order. Your order
                    remains marked unpaid until the merchant confirms payment.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT STATUS */}
          {paidStep === 4 && (
            <div className="flex flex-col items-center py-6 text-center">
              {processState === 'processing' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F6F6F6]">
                    <Loader2 className="h-8 w-8 animate-spin text-black" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-[#1A1A1A]">
                    Payment Processing
                  </h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">
                    Authorizing {formatRupiah(totalAmount)} via {ewalletProvider}...
                  </p>
                </>
              )}

              {processState === 'failed' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFDAD6] text-[#E11900]">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-[#1A1A1A]">
                    Payment Failed
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-[#6B6B6B]">
                    {ewalletProvider} could not complete the authorization. No funds were deducted.
                    Retry your payment or switch to Cash on Pickup.
                  </p>
                  <div className="mt-6 flex w-full flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleRetryPayment}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-black font-display text-sm font-semibold text-white hover:bg-[#1B1B1B]"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Payment ({ewalletProvider})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cod');
                        setPaidStep(3);
                      }}
                      className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#F6F6F6] font-display text-sm font-semibold text-[#1A1A1A] hover:bg-[#EAE7E7]"
                    >
                      Switch to Cash on Pickup
                    </button>
                  </div>
                </>
              )}

              {processState === 'success' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#06C167] text-[#00210D]">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-[#1A1A1A]">
                    Payment Successful
                  </h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">
                    {formatRupiah(totalAmount)} paid via {ewalletProvider}. Your bag is secured!
                  </p>
                  <div className="mt-5 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Payment Status</span>
                      <span className="font-semibold text-[#006D37]">Paid · {ewalletProvider}</span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-[#6B6B6B]">Amount Paid</span>
                      <span className="font-bold text-[#1A1A1A] tabular-nums">
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {processState === 'cod_pending' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFB020]/25 text-[#9A5B00]">
                    <Banknote className="h-8 w-8" />
                  </div>
                  <span className="mt-4 rounded-full bg-[#FFB020] px-3 py-1 text-xs font-bold text-[#1A1A1A]">
                    CASH ON PICKUP · PAYMENT PENDING
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#1A1A1A]">
                    Reservation Held — Pay at Counter
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-[#6B6B6B]">
                    Your order is reserved as <strong>Cash on Pickup</strong>. Please bring{' '}
                    <strong className="text-[#1A1A1A]">{formatRupiah(totalAmount)}</strong> in cash
                    when collecting from {listing.merchantName}.
                  </p>
                  <div className="mt-5 w-full rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] p-4 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Payment Status</span>
                      <span className="font-semibold text-[#9A5B00]">
                        Unpaid (Cash on Pickup)
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-[#6B6B6B]">Cash Due at Pickup</span>
                      <span className="font-bold text-[#1A1A1A] tabular-nums">
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 5: ORDER CONFIRMATION + QR CODE */}
          {paidStep === 5 && createdOrder && (
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#06C167]/15 px-3 py-1 text-xs font-bold text-[#006D37]">
                <ShieldCheck className="h-4 w-4" />
                Order Confirmed
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-[#1A1A1A]">
                Show QR Code at Pickup
              </h3>

              <div className="mt-4 rounded-2xl border border-[#E5E5E5] bg-[#F6F6F6] p-5">
                <QrCodeSvg value={createdOrder.id} size={172} className="mx-auto p-2" />
                <p className="mt-3 text-xs font-medium text-[#6B6B6B]">Unique Order ID</p>
                <p className="font-mono text-lg font-bold tracking-wider text-[#1A1A1A]">
                  {createdOrder.id}
                </p>
              </div>

              <div className="mt-5 w-full space-y-2.5 rounded-xl border border-[#E5E5E5] p-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#6B6B6B]">Merchant</span>
                  <span className="text-right font-semibold text-[#1A1A1A]">
                    {createdOrder.merchantName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#6B6B6B]">Address</span>
                  <span className="text-right text-xs font-medium text-[#1A1A1A]">
                    {createdOrder.pickupAddress}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#6B6B6B]">Pickup Window</span>
                  <span className="font-semibold text-[#1A1A1A] tabular-nums">
                    Today, {createdOrder.pickupWindow}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#E5E5E5] pt-2.5">
                  <span className="text-[#6B6B6B]">Payment Status</span>
                  <span
                    className={`font-semibold ${
                      createdOrder.paymentStatus === 'Paid' ? 'text-[#006D37]' : 'text-[#9A5B00]'
                    }`}
                  >
                    {createdOrder.paymentMethod === 'cod'
                      ? 'Unpaid · Cash on Pickup'
                      : `Paid via ${createdOrder.ewalletProvider}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Action */}
        <div className="border-t border-[#E5E5E5] bg-white px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {paidStep === 1 && (
            <button
              type="button"
              onClick={() => setPaidStep(2)}
              className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-black font-display text-base font-semibold text-white hover:bg-[#1B1B1B]"
            >
              Continue to Order Summary
            </button>
          )}

          {paidStep === 2 && (
            <button
              type="button"
              onClick={() => setPaidStep(3)}
              className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-black font-display text-base font-semibold text-white hover:bg-[#1B1B1B]"
            >
              Select Payment Method
            </button>
          )}

          {paidStep === 3 && (
            <button
              type="button"
              onClick={
                paymentMethod === 'ewallet' ? handleStartEwalletPayment : handleConfirmCod
              }
              className={`flex min-h-[50px] w-full items-center justify-center rounded-lg font-display text-base font-bold transition-colors ${
                paymentMethod === 'ewallet'
                  ? 'bg-[#06C167] text-[#00210D] hover:bg-[#05b05d]'
                  : 'bg-black text-white hover:bg-[#1B1B1B]'
              }`}
            >
              {paymentMethod === 'ewallet'
                ? `Continue to Payment (${ewalletProvider})`
                : 'Confirm Reservation'}
            </button>
          )}

          {paidStep === 4 && (processState === 'success' || processState === 'cod_pending') && (
            <button
              type="button"
              onClick={() => setPaidStep(5)}
              className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-[#06C167] font-display text-base font-bold text-[#00210D] hover:bg-[#05b05d]"
            >
              Generate Pickup QR Code
            </button>
          )}

          {paidStep === 5 && createdOrder && (
            <button
              type="button"
              onClick={() => onViewMyOrder(createdOrder.id)}
              className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-black font-display text-base font-semibold text-white hover:bg-[#1B1B1B]"
            >
              View My Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
