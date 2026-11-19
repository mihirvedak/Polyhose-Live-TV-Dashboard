import type { MachineStatus, PeriodOeeInput } from '../types';

export interface OeeResult {
  availability: number;
  performance: number;
  /** Performance before the 100% cap */
  performanceRaw: number;
  quality: number;
  oee: number;
  capped: boolean;
}

const warned = new Set<string>();

/**
 * Availability = prod time ÷ planned time
 * Performance  = actual metres ÷ (prod time × ideal m/min), capped at 100%
 * Quality      = good metres ÷ total metres
 * OEE          = A × P × Q
 */
export function computeOee(input: PeriodOeeInput, contextId = ''): OeeResult | null {
  if (input.plannedTimeMin <= 0) return null;
  const availability = clamp01(input.prodTimeMin / input.plannedTimeMin);
  const idealM = input.prodTimeMin * input.idealMPerMin;
  const performanceRaw = idealM > 0 ? input.actualM / idealM : 0;
  const capped = performanceRaw > 1;
  if (capped) {
    const key = `${contextId}:${input.key}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[OEE] Performance ${(performanceRaw * 100).toFixed(1)}% > 100% for ${contextId || 'machine'} (${input.key}); capped at 100%. Check the ideal m/min for this hose size.`,
      );
    }
  }
  const performance = Math.min(1, Math.max(0, performanceRaw));
  const quality = input.totalM > 0 ? clamp01(input.goodM / input.totalM) : 1;
  return {
    availability,
    performance,
    performanceRaw,
    quality,
    oee: availability * performance * quality,
    capped,
  };
}

export type OeeTone = 'bad' | 'good' | 'neutral';

export const OEE_BAD_MAX = 0.4;
export const OEE_TARGET = 0.65;

/** ≤ 40% red, ≥ 65% (target) green, otherwise ink */
export function oeeTone(ratio: number | null | undefined): OeeTone {
  if (ratio == null || !Number.isFinite(ratio)) return 'neutral';
  const pct = Math.round(ratio * 100);
  if (pct <= OEE_BAD_MAX * 100) return 'bad';
  if (pct >= OEE_TARGET * 100) return 'good';
  return 'neutral';
}

export function remainingMetres(planM: number | null, producedM: number): number | null {
  if (planM == null || planM <= 0) return null;
  return Math.max(0, planM - producedM);
}

export type EtaResult =
  | { kind: 'time'; at: Date }
  | { kind: 'stopped' }
  | { kind: 'planMissing' }
  | { kind: 'done' };

/** ETA = now + remaining ÷ current line speed */
export function computeEta(
  now: Date,
  planM: number | null,
  producedM: number,
  lineSpeedMPerMin: number,
  status: MachineStatus,
): EtaResult {
  const remaining = remainingMetres(planM, producedM);
  if (remaining == null) return { kind: 'planMissing' };
  if (remaining === 0) return { kind: 'done' };
  if (status !== 'running' || lineSpeedMPerMin <= 0) return { kind: 'stopped' };
  return { kind: 'time', at: new Date(now.getTime() + (remaining / lineSpeedMPerMin) * 60000) };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
