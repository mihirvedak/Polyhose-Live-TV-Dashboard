import type { StageKey } from '../types';

// Live process parameters shown in Block 3. These follow the tags the
// Polyhose machines publish on I/O Sense (device tabs: Speed, Run Status,
// Length, Dia, Drum, PIR Details).
//
// `tag` / `setTag` are the IOsense sensor ids. The values below are
// placeholders until the real sensor ids are mapped; per-machine differences
// go in MACHINE_TAG_OVERRIDES. A tag of null shows the tile as "Not connected".

export type ParamKind =
  /** Value against a set point, with a tolerance band */
  | 'measure'
  /** Running count or length; no limits */
  | 'counter'
  /** Run status: 1 = running, 0 = stopped */
  | 'state'
  /** Fault code: 0 = no fault */
  | 'fault';

export interface ParamConfig {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  kind: ParamKind;
  /** Actual value tag; null until mapped */
  tag: string | null;
  /** Live set point tag (e.g. Set RPM, Standard Speed, Set Length) */
  setTag?: string;
  /** Limits = set point ± this percentage (measure only) */
  tolerancePct?: number;
}

export const LIVE_PARAMS: ParamConfig[] = [
  { key: 'lineSpeed', label: 'Line speed', unit: 'm/min', decimals: 1, kind: 'measure', tag: 'ACTUAL_LINE_SPEED', setTag: 'STANDARD_SPEED', tolerancePct: 10 },
  { key: 'rpm', label: 'Machine speed', unit: 'rpm', decimals: 0, kind: 'measure', tag: 'ACTUAL_RPM', setTag: 'SET_RPM', tolerancePct: 5 },
  { key: 'length', label: 'Length', unit: 'm', decimals: 1, kind: 'counter', tag: 'ACTUAL_LENGTH', setTag: 'SET_LENGTH' },
  // Dia tab fields not confirmed yet
  { key: 'dia', label: 'Dia', unit: 'mm', decimals: 2, kind: 'measure', tag: null },
  { key: 'drumIn', label: 'Drum in', unit: '', decimals: 0, kind: 'counter', tag: 'DRUM_IN' },
  { key: 'drumOut', label: 'Drum out', unit: '', decimals: 0, kind: 'counter', tag: 'DRUM_OUT' },
  { key: 'runStatus', label: 'Run status', unit: '', decimals: 0, kind: 'state', tag: 'RUN_STATUS' },
  { key: 'faultCode', label: 'Fault code', unit: '', decimals: 0, kind: 'fault', tag: 'FAULT_CODE' },
];

/** Every stage publishes the same device tags today; override per stage here if that changes. */
export const PARAMS_BY_STAGE: Record<StageKey, ParamConfig[]> = {
  mandrel: LIVE_PARAMS,
  liner: LIVE_PARAMS,
  braider: LIVE_PARAMS,
  cover: LIVE_PARAMS,
  vulcanisation: LIVE_PARAMS,
  testing: LIVE_PARAMS,
};

/**
 * Per-machine tag mapping: machine id → parameter key → tag id (null = not wired).
 * By default the tag id is `${machineId}.${param.tag}`.
 */
export const MACHINE_TAG_OVERRIDES: Record<string, Record<string, string | null>> = {};

export function tagFor(machineId: string, param: ParamConfig): string | null {
  const override = MACHINE_TAG_OVERRIDES[machineId]?.[param.key];
  if (override !== undefined) return override;
  return param.tag ? `${machineId}.${param.tag}` : null;
}

export function setTagFor(machineId: string, param: ParamConfig): string | null {
  return param.setTag ? `${machineId}.${param.setTag}` : null;
}

/** Limits from the live set point and the tolerance, when both exist. */
export function limitsFor(param: ParamConfig, setPoint: number | null | undefined): { lo: number; hi: number } | null {
  if (param.kind !== 'measure' || param.tolerancePct == null || setPoint == null || !Number.isFinite(setPoint) || setPoint === 0) return null;
  const d = Math.abs(setPoint) * (param.tolerancePct / 100);
  return { lo: setPoint - d, hi: setPoint + d };
}
