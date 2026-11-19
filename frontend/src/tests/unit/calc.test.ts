import { describe, expect, it, vi } from 'vitest';
import { computeEta, computeOee, oeeTone, remainingMetres } from '../../tv/lib/calc';
import { formatDuration, formatMetres, formatSeconds, normaliseId } from '../../tv/lib/format';
import type { PeriodOeeInput } from '../../tv/types';

const period = (patch: Partial<PeriodOeeInput> = {}): PeriodOeeInput => ({
  key: 'current',
  label: 'Shift A',
  sublabel: 'now',
  plannedTimeMin: 480,
  prodTimeMin: 432,
  actualM: 1944,
  idealMPerMin: 5,
  goodM: 1886,
  totalM: 1944,
  ...patch,
});

describe('computeOee', () => {
  it('A = prod ÷ planned, P = actual ÷ (prod × ideal), Q = good ÷ total, OEE = A × P × Q', () => {
    const r = computeOee(period())!;
    expect(r.availability).toBeCloseTo(0.9);
    expect(r.performance).toBeCloseTo(0.9);
    expect(r.quality).toBeCloseTo(1886 / 1944);
    expect(r.oee).toBeCloseTo(0.9 * 0.9 * (1886 / 1944));
  });

  it('caps performance at 100% and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = computeOee(period({ actualM: 432 * 5 * 1.036 }), 'B24-test')!;
    expect(r.performanceRaw).toBeCloseTo(1.036);
    expect(r.performance).toBe(1);
    expect(r.capped).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('returns null without planned time (no signal)', () => {
    expect(computeOee(period({ plannedTimeMin: 0 }))).toBeNull();
  });
});

describe('oeeTone', () => {
  it('≤ 40% red, ≥ 65% green, otherwise ink', () => {
    expect(oeeTone(0.4)).toBe('bad');
    expect(oeeTone(0.41)).toBe('neutral');
    expect(oeeTone(0.649)).toBe('good'); // displays as 65%
    expect(oeeTone(0.64)).toBe('neutral');
    expect(oeeTone(null)).toBe('neutral');
  });
});

describe('remaining and ETA', () => {
  const now = new Date('2026-11-17T09:42:00');

  it('remaining never goes negative and is null without a plan', () => {
    expect(remainingMetres(1000, 620)).toBe(380);
    expect(remainingMetres(1000, 1200)).toBe(0);
    expect(remainingMetres(null, 620)).toBeNull();
  });

  it('ETA = now + remaining ÷ line speed', () => {
    const eta = computeEta(now, 1000, 620, 5, 'running');
    expect(eta.kind).toBe('time');
    if (eta.kind === 'time') expect(eta.at.getTime() - now.getTime()).toBe(76 * 60_000);
  });

  it('shows Stopped when the machine is not running', () => {
    expect(computeEta(now, 1000, 620, 5, 'down').kind).toBe('stopped');
    expect(computeEta(now, 1000, 620, 0, 'running').kind).toBe('stopped');
  });

  it('flags a missing plan and a finished PIR', () => {
    expect(computeEta(now, null, 620, 5, 'running').kind).toBe('planMissing');
    expect(computeEta(now, 600, 620, 5, 'running').kind).toBe('done');
  });
});

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    expect(formatMetres(121260)).toBe('1,21,260');
    expect(formatMetres(null)).toBe('—');
  });
  it('normalises float operator ids', () => {
    expect(normaliseId('201476.0')).toBe('201476');
    expect(normaliseId(201476)).toBe('201476');
    expect(normaliseId('')).toBeUndefined();
  });
  it('formats durations', () => {
    expect(formatDuration(142)).toBe('2h 22m');
    expect(formatDuration(29)).toBe('29 min');
    expect(formatSeconds(95)).toBe('1 min 35 s');
  });
});
