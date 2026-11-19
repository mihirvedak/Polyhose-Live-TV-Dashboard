// Domain types for the Polyhose Machine TV. Shared by the data adapters,
// the rotation scheduler and the UI.

export type StageKey = 'mandrel' | 'liner' | 'braider' | 'cover' | 'vulcanisation' | 'testing';

export type MachineStatus = 'running' | 'down' | 'changeover' | 'noSignal';

export type SectionKey = 'oee' | 'currentPir' | 'params' | 'lastPir' | 'timeline' | 'downtime';

export type ShiftName = 'A' | 'B' | 'C';

export interface Machine {
  id: string;
  name: string;
  stage: StageKey;
}

export interface MachineStatusInfo {
  machineId: string;
  status: MachineStatus;
  /** ISO time the current status started */
  since: string;
  /** Downtime / changeover reason, if any */
  reason?: string;
}

export interface Person {
  id?: string;
  name?: string;
}

export interface ShiftWindow {
  name: ShiftName;
  /** ISO */
  start: string;
  /** ISO */
  end: string;
}

export interface ParamReading {
  /** null when the tag is configured but has no value (stopped / no signal) */
  value: number | null;
  /** Last 60 min, oldest first, one point per minute */
  history: (number | null)[];
}

/** Fast-changing data, refreshed every 5 s */
export interface MachineLive {
  machineId: string;
  status: MachineStatusInfo;
  lineSpeed: number;
  operator: Person;
  supervisor: Person & { shift?: ShiftName };
  shift: ShiftWindow;
  /** keyed by parameter tag id; missing key = tag not connected */
  params: Record<string, ParamReading>;
  fetchedAt: string;
}

export type PeriodKey = 'current' | 'prev' | 'prev2' | 'yesterday' | 'month';

/** Raw inputs for an OEE period. A/P/Q/OEE are derived in lib/calc. */
export interface PeriodOeeInput {
  key: PeriodKey;
  label: string;
  sublabel: string;
  plannedTimeMin: number;
  prodTimeMin: number;
  actualM: number;
  idealMPerMin: number;
  goodM: number;
  totalM: number;
}

export interface StageProgress {
  stage: StageKey;
  doneM: number;
  planM: number | null;
  /** Part lot: material split across lots at this stage */
  partLot: boolean;
}

export interface CurrentPir {
  pir: string;
  hoseSize: string;
  mpir: string;
  dueDate: string;
  startedAt: string;
  planM: number | null;
  producedHereM: number;
  avgSpeed: number;
  stages: StageProgress[];
}

export interface LastPir {
  pir: string;
  hoseSize: string;
  producedM: number;
  planM: number | null;
  from: string;
  to: string;
  runMin: number;
  downMin: number;
  oee: number;
  avgSpeed: number;
  operator: Person;
}

export interface QueueItem {
  pir: string;
  hoseSize: string;
  planM: number | null;
}

export type SegmentKind = 'production' | 'downtime' | 'changeover' | 'noSignal';

export interface TimelineSegment {
  start: string;
  end: string;
  kind: SegmentKind;
}

export interface HourlyOutput {
  hourStart: string;
  /** null for future hours */
  metres: number | null;
  target: number;
}

export interface DowntimeStop {
  start: string;
  reason: string;
  durationMin: number;
  kind: 'breakdown' | 'changeover';
}

/** Slow-changing data, refreshed every 30 s */
export interface MachineDetail {
  machineId: string;
  oee: PeriodOeeInput[];
  currentPir: CurrentPir | null;
  lastPir: LastPir | null;
  nextInQueue: QueueItem | null;
  timeline: TimelineSegment[];
  hourly: HourlyOutput[];
  downtime: {
    stops: number;
    minutesLost: number;
    changeovers: number;
    latest: DowntimeStop[];
  };
  fetchedAt: string;
}

export interface TvProfileMachine {
  machineId: string;
  enabled: boolean;
  /** Per-machine override of defaultSections */
  sections?: SectionKey[];
  /** Per-machine override of secondsPerMachine */
  seconds?: number;
}

export type RotationOrder = 'stage' | 'downFirst' | 'custom';
export type ThemeSetting = 'auto' | 'day' | 'night';
export type HideDelayMs = 2000 | 3000 | 5000;

export interface TvProfile {
  id: string;
  name: string;
  machines: TvProfileMachine[];
  /** ordered */
  defaultSections: SectionKey[];
  /** 5..300, default 5 */
  secondsPerMachine: number;
  order: RotationOrder;
  skipNoSignal: boolean;
  jumpToDown: boolean;
  theme: ThemeSetting;
  hideControlsAfterMs: HideDelayMs;
  /** Enter full screen on the first click, tap or key press (default on) */
  autoFullscreen?: boolean;
  updatedAt: string;
  updatedBy: string;
}
