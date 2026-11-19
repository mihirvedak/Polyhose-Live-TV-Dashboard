import type { SectionKey } from '../types';

export interface SectionMeta {
  key: SectionKey;
  label: string;
  description: string;
  /** Short name used inside layout previews */
  short: string;
  /** Relative width when sharing a row (12-column grid) */
  width: number;
  /** Relative height of the row this section sits in */
  height: number;
}

export const SECTIONS: SectionMeta[] = [
  { key: 'oee', label: 'OEE by period', short: 'OEE', description: 'OEE, A, P, Q, production · shift, prev. shift, yesterday, month', width: 5, height: 1 },
  { key: 'currentPir', label: 'Current PIR', short: 'Current PIR', description: 'Plan, produced, remaining, ETA, stage-wise, operator', width: 7, height: 1 },
  { key: 'params', label: 'Live process parameters', short: 'Live parameters', description: '8 PLC values with set point, limits, 60 min trend', width: 8, height: 1 },
  { key: 'lastPir', label: 'Last PIR & next in queue', short: 'Last PIR', description: 'Qty vs plan, run time, downtime, OEE, operator', width: 4, height: 1 },
  { key: 'timeline', label: 'Shift timeline & hourly output', short: 'Shift timeline', description: 'Production / downtime / changeover / no signal', width: 8, height: 0.68 },
  { key: 'downtime', label: 'Downtime this shift', short: 'Downtime', description: 'Stops, minutes lost, changeovers, latest stops', width: 4, height: 0.68 },
];

export const SECTION_BY_KEY: Record<SectionKey, SectionMeta> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s]),
) as Record<SectionKey, SectionMeta>;

export const ALL_SECTION_KEYS: SectionKey[] = SECTIONS.map((s) => s.key);
