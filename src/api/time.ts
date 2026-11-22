const TZ = 'Asia/Jakarta';

const hhmm = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TZ,
});
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }); // YYYY-MM-DD
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });

/** "19:30 – 21:00" (jam Jakarta). */
export function formatPickupWindow(startIso: string, endIso: string): string {
  return `${hhmm.format(new Date(startIso))} – ${hhmm.format(new Date(endIso))}`;
}

/** "Today, 17:42" / "Yesterday, 20:50" / "12 Nov, 17:42" (jam Jakarta). */
export function formatOrderTimestamp(iso: string): string {
  const d = new Date(iso);
  const key = dayKey.format(d);
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const time = hhmm.format(d);
  if (key === today) return `Today, ${time}`;
  if (key === yesterday) return `Yesterday, ${time}`;
  return `${dayMonth.format(d)}, ${time}`;
}

/**
 * Ubah teks jendela pickup dari form merchant ("19:30 – 21:00") jadi ISO
 * timestamp untuk HARI INI (Asia/Jakarta). Kalau jam selesai <= jam mulai
 * dianggap lewat tengah malam (besok).
 */
export function parsePickupWindow(
  text: string,
  now: Date = new Date()
): { pickupStart: string; pickupEnd: string } {
  const m = text.match(/(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})/);
  if (!m) throw new Error(`Format jam pickup tidak dikenali: "${text}" (contoh: 19:30 – 21:00)`);
  const key = dayKey.format(now);
  const p = (n: string) => n.padStart(2, '0');
  const start = new Date(`${key}T${p(m[1])}:${m[2]}:00+07:00`);
  let end = new Date(`${key}T${p(m[3])}:${m[4]}:00+07:00`);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { pickupStart: start.toISOString(), pickupEnd: end.toISOString() };
}
