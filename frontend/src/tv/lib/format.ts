const indian = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Indian digit grouping: 121260 → "1,21,260" */
export function formatMetres(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return indian.format(Math.round(n));
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPct(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${Math.round(ratio * 100)}%`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function hhmm(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17 Nov" */
export function dayMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "17 Nov 2026" */
export function dayMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${dayMonth(d)} ${d.getFullYear()}`;
}

/** "15 Nov 22:10" */
export function dayMonthTime(date: Date | string): string {
  return `${dayMonth(date)} ${hhmm(date)}`;
}

/** 142 → "2h 22m", 29 → "29 min" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/** 95 → "1 min 35 s" */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (!min) return `${sec} s`;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

/** Operator ids arrive as floats like 201476.0 */
export function normaliseId(id: string | number | null | undefined): string | undefined {
  if (id == null || id === '') return undefined;
  const n = Number(id);
  if (Number.isFinite(n)) return String(Math.trunc(n));
  return String(id).trim();
}

export function minutesBetween(from: Date | string, to: Date | string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60000;
}
