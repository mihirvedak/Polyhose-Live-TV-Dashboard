import type { StageKey } from '../types';

export interface StageMeta {
  key: StageKey;
  label: string;
  /** Short label for the stage strip */
  short: string;
  index: number;
}

export const STAGES: StageMeta[] = [
  { key: 'mandrel', label: 'Mandrel', short: 'Mandrel', index: 1 },
  { key: 'liner', label: 'Liner', short: 'Liner', index: 2 },
  { key: 'braider', label: 'Braider', short: 'Braider', index: 3 },
  { key: 'cover', label: 'Cover', short: 'Cover', index: 4 },
  { key: 'vulcanisation', label: 'Vulcanisation', short: 'Vulc.', index: 5 },
  { key: 'testing', label: 'Testing', short: 'Testing', index: 6 },
];

export const STAGE_BY_KEY: Record<StageKey, StageMeta> = Object.fromEntries(
  STAGES.map((s) => [s.key, s]),
) as Record<StageKey, StageMeta>;
