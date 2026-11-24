import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Share2,
  X,
} from 'lucide-react';
import { formatRupiah } from '../data/mockMarketplace';

export type ShareTemplateId = 'midnight' | 'daylight';

interface ShareImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  rescuedBags: number;
  co2SavedKg: string;
  totalSaved: number;
  storesExploredCount: number;
  onNotify?: (message: string) => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function generateImpactPngBlob(params: {
  template: ShareTemplateId;
  userName: string;
  rescuedBags: number;
  co2SavedKg: string;
  totalSaved: number;
  storesExploredCount: number;
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const {
    template,
    userName,
    rescuedBags,
    co2SavedKg,
    totalSaved,
    storesExploredCount,
  } = params;

  const savingsText = formatRupiah(totalSaved);
  const foodSavedKg = (rescuedBags * 0.85).toFixed(1);
  const kmEquivalent = (Number(co2SavedKg) * 4.2).toFixed(0);
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (template === 'midnight') {
    // Deep architectural obsidian background
    ctx.fillStyle = '#0C0D0C';
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle radial emerald glow top-right
    const glow = ctx.createRadialGradient(920, 180, 40, 920, 180, 620);
    glow.addColorStop(0, 'rgba(6, 193, 103, 0.24)');
    glow.addColorStop(1, 'rgba(6, 193, 103, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle geometric concentric arcs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    [260, 400, 540].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(920, 180, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Header Wordmark
    ctx.textBaseline = 'top';
    ctx.font = '700 44px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('TuGu', 84, 88);
    const tuguWidth = ctx.measureText('TuGu').width;
    ctx.fillStyle = '#06C167';
    ctx.fillText('TuGu', 84 + tuguWidth, 88);

    ctx.font = '600 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#A1A6A2';
    ctx.textAlign = 'right';
    ctx.fillText('Food Rescue Report', 996, 98);
    ctx.textAlign = 'left';

    // Hero Metric
    ctx.font = '500 30px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#9CA39E';
    ctx.fillText('Total makanan berhasil diselamatkan', 84, 280);

    ctx.font = '800 132px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${rescuedBags}`, 84, 340);
    const numWidth = ctx.measureText(`${rescuedBags}`).width;
    ctx.font = '700 64px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#06C167';
    ctx.fillText(' Meals', 84 + numWidth + 8, 396);

    ctx.font = '500 32px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#D4D8D5';
    ctx.fillText(`Setara ${co2SavedKg} kg CO₂e dicegah dari limbah pangan`, 84, 515);

    // Hairline divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(84, 645);
    ctx.lineTo(996, 645);
    ctx.stroke();

    // 2-Column Metric Grid
    ctx.font = '500 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#9CA39E';
    ctx.fillText('Uang Dihemat', 84, 700);
    ctx.fillText('Jejak CO₂e Dihindari', 560, 700);

    ctx.font = '700 54px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#06C167';
    ctx.fillText(savingsText, 84, 750);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${co2SavedKg} kg`, 560, 750);

    // Second row metrics
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.beginPath();
    ctx.moveTo(84, 875);
    ctx.lineTo(996, 875);
    ctx.stroke();

    ctx.font = '500 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#9CA39E';
    ctx.fillText('Toko Dijelajahi', 84, 920);
    ctx.fillText('Pangan Diselamatkan', 560, 920);

    ctx.font = '700 44px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${storesExploredCount} Toko`, 84, 970);
    ctx.fillText(`${foodSavedKg} kg`, 560, 970);

    // Bottom Identity Strip
    drawRoundedRect(ctx, 84, 1135, 912, 130, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(154, 1200, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#06C167';
    ctx.fill();

    ctx.font = '700 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#00210D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 154, 1201);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 30px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(userName, 212, 1168);

    ctx.font = '500 24px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#9CA39E';
    ctx.fillText('Penyelamat Surplus Harian', 212, 1208);

    ctx.textAlign = 'right';
    ctx.font = '600 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#06C167';
    ctx.fillText('@tugutugu.id', 958, 1185);
    ctx.textAlign = 'left';
  } else {
    // Daylight Journal / Receipt Card
    ctx.fillStyle = '#F7F6F2';
    ctx.fillRect(0, 0, 1080, 1350);

    // Top accent bar
    ctx.fillStyle = '#06C167';
    ctx.fillRect(0, 0, 1080, 18);

    // Header
    ctx.textBaseline = 'top';
    ctx.font = '700 44px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#141414';
    ctx.fillText('TuGu', 84, 86);
    const tuguWidth = ctx.measureText('TuGu').width;
    ctx.fillStyle = '#006D37';
    ctx.fillText('TuGu', 84 + tuguWidth, 86);

    ctx.textAlign = 'right';
    ctx.font = '600 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#5C5B57';
    ctx.fillText('Impact Receipt', 996, 96);
    ctx.textAlign = 'left';

    // Hero block
    ctx.font = '500 30px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#5C5B57';
    ctx.fillText('Jejak karbon berhasil dihindari', 84, 240);

    ctx.font = '800 120px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#006D37';
    ctx.fillText(`${co2SavedKg} kg`, 84, 298);

    ctx.font = '600 36px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#141414';
    ctx.fillText(`CO₂e · Setara hemat ${kmEquivalent} km perjalanan motor`, 84, 446);

    // Dashed receipt divider
    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = '#CFCBC2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(84, 548);
    ctx.lineTo(996, 548);
    ctx.stroke();
    ctx.restore();

    // Ledger Rows
    const rows: [string, string, boolean][] = [
      ['Meals Rescued', `${rescuedBags} surprise bag`, false],
      ['Total Savings', savingsText, true],
      ['Stores Visited', `${storesExploredCount} toko`, false],
      ['Surplus Rescued', `${foodSavedKg} kg`, false],
    ];

    rows.forEach(([label, value, highlight], idx) => {
      const y = 606 + idx * 124;
      ctx.font = '500 30px "Plus Jakarta Sans", "Inter", sans-serif';
      ctx.fillStyle = '#5C5B57';
      ctx.fillText(label, 84, y);

      ctx.textAlign = 'right';
      ctx.font = '700 38px "Plus Jakarta Sans", "Inter", sans-serif';
      ctx.fillStyle = highlight ? '#006D37' : '#141414';
      ctx.fillText(value, 996, y - 4);
      ctx.textAlign = 'left';

      if (idx < rows.length - 1) {
        ctx.strokeStyle = '#E5E2DA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(84, y + 72);
        ctx.lineTo(996, y + 72);
        ctx.stroke();
      }
    });

    // Bottom Strip
    drawRoundedRect(ctx, 84, 1135, 912, 130, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2DFD7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(154, 1200, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#141414';
    ctx.fill();

    ctx.font = '700 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 154, 1201);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 30px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#141414';
    ctx.fillText(userName, 212, 1168);

    ctx.font = '500 24px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#5C5B57';
    ctx.fillText('Saved Today, Shared Forward', 212, 1208);

    ctx.textAlign = 'right';
    ctx.font = '700 28px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillStyle = '#006D37';
    ctx.fillText('@tugutugu.id', 958, 1185);
    ctx.textAlign = 'left';
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.76 1.52V6.78a4.82 4.82 0 0 1-1-.09Z" />
  </svg>
);

export const ShareImpactModal: React.FC<ShareImpactModalProps> = ({
  isOpen,
  onClose,
  userName,
  rescuedBags,
  co2SavedKg,
  totalSaved,
  storesExploredCount,
  onNotify,
}) => {
  const [template, setTemplate] = useState<ShareTemplateId>('midnight');
  const [copied, setCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setActionStatus(null);
      setBusyAction(null);
      setTilt({ rx: 0, ry: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const foodSavedKg = (rescuedBags * 0.85).toFixed(1);
  const kmEquivalent = (Number(co2SavedKg) * 4.2).toFixed(0);
  const shareCaption = `Sudah menyelamatkan ${rescuedBags} surprise bag makanan (${co2SavedKg} kg CO2e dihindari & hemat ${formatRupiah(totalSaved)}) dari ${storesExploredCount} toko bareng @tugutugu.id! Yuk ikut kurangi food waste. #TuGuTuGu #FoodRescue #ZeroWaste`;

  const setBannerStatus = (msg: string) => {
    setActionStatus(msg);
    onNotify?.(msg);
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyCaptionToClipboard = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyCaption = async () => {
    const ok = await copyCaptionToClipboard();
    if (ok) {
      setBannerStatus('Ringkasan & caption disalin ke clipboard');
    } else {
      setBannerStatus('Caption siap dibagikan');
    }
  };

  const handleSaveToDevice = async () => {
    setBusyAction('save');
    try {
      const blob = await generateImpactPngBlob({
        template,
        userName,
        rescuedBags,
        co2SavedKg,
        totalSaved,
        storesExploredCount,
      });
      if (!blob) {
        setBannerStatus('Gagal menyiapkan file gambar');
        return;
      }
      triggerDownload(blob, `tugutugu-impact-${template}.png`);
      setBannerStatus('Kartu PNG berhasil disimpan ke perangkat');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSocialShare = async (channel: 'ig' | 'tt' | 'wa' | 'more') => {
    setBusyAction(channel);
    try {
      const blob = await generateImpactPngBlob({
        template,
        userName,
        rescuedBags,
        co2SavedKg,
        totalSaved,
        storesExploredCount,
      });

      // Use native Web Share Sheet with PNG file when available (especially on mobile / "Lainnya")
      if (channel === 'more' && navigator.share) {
        try {
          if (blob) {
            const file = new File([blob], `tugutugu-impact-${template}.png`, {
              type: 'image/png',
            });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'TuGuTuGu Food Rescue Impact',
                text: shareCaption,
                files: [file],
              });
              setBannerStatus('Kartu impact dibagikan via menu perangkat');
              return;
            }
          }
          await navigator.share({
            title: 'TuGuTuGu Food Rescue Impact',
            text: shareCaption,
          });
          setBannerStatus('Ringkasan impact dibagikan');
          return;
        } catch {
          // Fall through to clipboard + download fallback if share sheet dismissed/unsupported
        }
      }

      await copyCaptionToClipboard();

      if (channel === 'ig' || channel === 'tt') {
        if (blob) {
          triggerDownload(blob, `tugutugu-impact-${template}.png`);
        }
        setBannerStatus(
          channel === 'ig'
            ? 'Gambar tersimpan & caption disalin — siap upload ke Instagram Story!'
            : 'Gambar tersimpan & caption disalin — siap upload ke TikTok!'
        );
        return;
      }

      if (channel === 'wa') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'TuGuTuGu Food Rescue Impact',
              text: shareCaption,
            });
            setBannerStatus('Teks impact dibagikan');
            return;
          } catch {
            // fallback to clipboard
          }
        }
        setBannerStatus('Teks impact disalin — siap ditempel ke WhatsApp!');
        return;
      }

      if (blob) {
        triggerDownload(blob, `tugutugu-impact-${template}.png`);
      }
      setBannerStatus('Gambar & caption disalin — siap dibagikan ke aplikasi lain');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-py * 7).toFixed(2)),
      ry: Number((px * 8).toFixed(2)),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-xs sm:items-center sm:p-4 dark:bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-impact-title"
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl dark:border dark:border-[#2A2D2A] dark:bg-[#161816]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#DCD9D9] dark:bg-[#3A3E3A]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3.5 dark:border-[#2A2D2A]">
          <div>
            <h2
              id="share-impact-title"
              className="font-display text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]"
            >
              Share Impact Card
            </h2>
            <p className="text-xs text-[#6B6B6B] dark:text-[#A3A8A3]">
              Pilih template kartu untuk dibagikan ke Instagram, TikTok, atau lainnya
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal share"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#6B6B6B] transition-colors hover:bg-[#F6F6F6] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:bg-[#1E211E] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* 2 Template Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Pilih template kartu"
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F6F6F6] p-1 dark:bg-[#1E211E]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={template === 'midnight'}
              onClick={() => setTemplate('midnight')}
              className={`min-h-[42px] rounded-lg px-3 font-display text-xs font-semibold whitespace-nowrap transition-colors ${
                template === 'midnight'
                  ? 'bg-black text-white shadow-xs dark:bg-[#06C167] dark:text-[#00210D]'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
              }`}
            >
              Midnight
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={template === 'daylight'}
              onClick={() => setTemplate('daylight')}
              className={`min-h-[42px] rounded-lg px-3 font-display text-xs font-semibold whitespace-nowrap transition-colors ${
                template === 'daylight'
                  ? 'bg-white text-[#1A1A1A] shadow-xs dark:bg-white dark:text-[#0D0E0D]'
                  : 'text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#A3A8A3] dark:hover:text-[#F5F5F5]'
              }`}
            >
              Daylight
            </button>
          </div>

          {/* Interactive IG-Ready Preview Card Stage */}
          <div className="flex justify-center py-1" style={{ perspective: '900px' }}>
            <div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="w-full max-w-[310px] select-none"
            >
              {template === 'midnight' ? (
                /* TEMPLATE 1: MIDNIGHT EDITORIAL POSTER */
                <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-[#0C0D0C] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                  {/* Subtle geometric emerald backdrop */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#06C167]/20 blur-2xl"
                  />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 200"
                    className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 text-white/[0.06]"
                    fill="none"
                  >
                    <circle cx="120" cy="80" r="46" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="120" cy="80" r="76" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="120" cy="80" r="106" stroke="currentColor" strokeWidth="1.2" />
                  </svg>

                  {/* Top Wordmark */}
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold tracking-tight text-white">
                      TuGu<span className="text-[#06C167]">TuGu</span>
                    </span>
                    <span className="text-[11px] font-medium text-[#A1A6A2]">
                      Food Rescue Report
                    </span>
                  </div>

                  {/* Hero Metric */}
                  <div className="relative my-auto py-3">
                    <p className="text-xs font-medium text-[#9CA39E]">
                      Makanan berhasil diselamatkan
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-5xl leading-none font-bold tracking-tight text-white tabular-nums">
                        {rescuedBags}
                      </span>
                      <span className="font-display text-xl font-bold text-[#06C167]">
                        Meals
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#D4D8D5]">
                      Setara <span className="font-semibold text-white tabular-nums">{co2SavedKg} kg CO₂e</span> dicegah dari limbah pangan
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3.5">
                      <div>
                        <p className="text-[11px] text-[#9CA39E]">Uang Dihemat</p>
                        <p className="mt-0.5 font-display text-base font-bold text-[#06C167] tabular-nums">
                          {formatRupiah(totalSaved)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9CA39E]">Toko Dijelajahi</p>
                        <p className="mt-0.5 font-display text-base font-bold text-white tabular-nums">
                          {storesExploredCount} Toko
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Identity Footer */}
                  <div className="relative flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06C167] font-display text-xs font-bold text-[#00210D]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-bold text-white">
                          {userName}
                        </p>
                        <p className="truncate text-[10px] text-[#A1A6A2]">
                          Penyelamat Surplus Harian
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-[#06C167]">
                      @tugutugu.id
                    </span>
                  </div>
                </div>
              ) : (
                /* TEMPLATE 2: DAYLIGHT JOURNAL / RECEIPT POSTER */
                <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-[#E2DFD7] bg-[#F7F6F2] p-5 text-[#141414] shadow-[0_14px_34px_rgba(0,0,0,0.10)]">
                  {/* Top accent bar */}
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#06C167]" />

                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-display text-sm font-bold tracking-tight text-[#141414]">
                      TuGu<span className="text-[#006D37]">TuGu</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#5C5B57]">
                      Impact Receipt
                    </span>
                  </div>

                  {/* Hero Carbon Highlight */}
                  <div className="my-auto space-y-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-[#5C5B57]">
                        Jejak karbon dihindari
                      </p>
                      <p className="mt-0.5 font-display text-4xl leading-none font-bold tracking-tight text-[#006D37] tabular-nums">
                        {co2SavedKg} kg CO₂e
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-[#4C4546]">
                        Setara hemat <span className="tabular-nums">{kmEquivalent} km</span> perjalanan motor
                      </p>
                    </div>

                    <div className="border-t border-dashed border-[#CFCBC2]" />

                    {/* Crisp Receipt Ledger */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#5C5B57]">Meals Rescued</span>
                        <span className="font-display font-bold text-[#141414] tabular-nums">
                          {rescuedBags} bag
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[#E5E2DA] pt-2">
                        <span className="text-[#5C5B57]">Total Savings</span>
                        <span className="font-display font-bold text-[#006D37] tabular-nums">
                          {formatRupiah(totalSaved)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[#E5E2DA] pt-2">
                        <span className="text-[#5C5B57]">Stores Visited</span>
                        <span className="font-display font-bold text-[#141414] tabular-nums">
                          {storesExploredCount} toko
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[#E5E2DA] pt-2">
                        <span className="text-[#5C5B57]">Surplus Rescued</span>
                        <span className="font-display font-bold text-[#141414] tabular-nums">
                          {foodSavedKg} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Identity Footer */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2DFD7] bg-white px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#141414] font-display text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-bold text-[#141414]">
                          {userName}
                        </p>
                        <p className="truncate text-[10px] text-[#5C5B57]">
                          Saved Today, Shared Forward
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-[#006D37]">
                      @tugutugu.id
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contextual Inline Status Banner */}
          {actionStatus && (
            <div className="flex items-center gap-2 rounded-xl border border-[#06C167]/40 bg-[#06C167]/12 px-3.5 py-2.5 text-xs font-medium text-[#004D27] dark:bg-[#06C167]/15 dark:text-[#6EE7B7]">
              <Check className="h-4 w-4 shrink-0 text-[#006D37] dark:text-[#06C167]" />
              <span>{actionStatus}</span>
            </div>
          )}

          {/* Primary Actions: Save to Device & Copy to Clipboard */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleSaveToDevice}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-black px-4 font-display text-xs font-semibold text-white transition-colors hover:bg-[#1E1E1E] active:scale-[0.99] disabled:opacity-60 dark:bg-[#06C167] dark:text-[#00210D] dark:hover:bg-[#05b05d]"
            >
              <Download className="h-4 w-4 text-[#06C167] dark:text-[#00210D]" />
              <span>Save to Device</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCaption}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F6F6F6] px-4 font-display text-xs font-semibold text-[#1A1A1A] transition-colors hover:bg-[#EAE7E7] active:scale-[0.99] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:bg-[#272B27]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#006D37] dark:text-[#06C167]" />
                  <span className="text-[#006D37] dark:text-[#06C167]">Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#1A1A1A] dark:text-[#F5F5F5]" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
          </div>

          {/* Social Share Destinations */}
          <div className="border-t border-[#E5E5E5] pt-3.5 dark:border-[#2A2D2A]">
            <p className="mb-2.5 text-xs font-semibold text-[#6B6B6B] dark:text-[#A3A8A3]">
              Bagikan langsung ke
            </p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleSocialShare('ig')}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2 py-2 text-[11px] font-semibold text-[#1A1A1A] transition-colors hover:border-[#D4D4D4] hover:bg-[#F6F6F6] active:scale-[0.98] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:border-[#3E433E] dark:hover:bg-[#272B27]"
              >
                <Instagram className="h-4 w-4 text-[#C13584] dark:text-[#F472B6]" />
                <span>Instagram</span>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleSocialShare('tt')}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2 py-2 text-[11px] font-semibold text-[#1A1A1A] transition-colors hover:border-[#D4D4D4] hover:bg-[#F6F6F6] active:scale-[0.98] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:border-[#3E433E] dark:hover:bg-[#272B27]"
              >
                <TikTokIcon className="h-4 w-4 text-[#141414] dark:text-[#F5F5F5]" />
                <span>TikTok</span>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleSocialShare('wa')}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2 py-2 text-[11px] font-semibold text-[#1A1A1A] transition-colors hover:border-[#D4D4D4] hover:bg-[#F6F6F6] active:scale-[0.98] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:border-[#3E433E] dark:hover:bg-[#272B27]"
              >
                <MessageCircle className="h-4 w-4 text-[#006D37] dark:text-[#06C167]" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleSocialShare('more')}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-[#E5E5E5] bg-white px-2 py-2 text-[11px] font-semibold text-[#1A1A1A] transition-colors hover:border-[#D4D4D4] hover:bg-[#F6F6F6] active:scale-[0.98] dark:border-[#2E322E] dark:bg-[#1E211E] dark:text-[#F5F5F5] dark:hover:border-[#3E433E] dark:hover:bg-[#272B27]"
              >
                <MoreHorizontal className="h-4 w-4 text-[#4C4546] dark:text-[#A3A8A3]" />
                <span>Lainnya</span>
              </button>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B6B6B] dark:text-[#A3A8A3]">
            <Share2 className="h-3 w-3" />
            <span>Kartu otomatis terunduh beresolusi HD (1080×1350) saat disimpan</span>
          </p>
        </div>
      </div>
    </div>
  );
};
