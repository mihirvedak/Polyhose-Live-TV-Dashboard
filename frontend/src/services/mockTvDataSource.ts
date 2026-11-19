import { PARAMS_BY_STAGE, setTagFor, tagFor } from '../tv/config/parameters';
import { ALL_SECTION_KEYS } from '../tv/config/sections';
import { STAGES } from '../tv/config/stages';
import { dayMonth } from '../tv/lib/format';
import type {
  DowntimeStop,
  HourlyOutput,
  Machine,
  MachineDetail,
  MachineLive,
  MachineStatus,
  MachineStatusInfo,
  ParamReading,
  PeriodOeeInput,
  SegmentKind,
  ShiftName,
  ShiftWindow,
  StageKey,
  TimelineSegment,
  TvProfile,
} from '../tv/types';
import type { TvDataSource } from './tvDataSource';

// SAMPLE DATA ONLY. Every name and number here is invented so the TV works
// before the IOsense APIs are connected. Nothing outside this file may
// hard-code machines, people or figures.

const MIN = 60_000;

const MACHINES: Machine[] = [
  ...range(1, 4).map((n) => m(`Mandrel_M${n}`, 'mandrel')),
  ...range(1, 6).map((n) => m(`Liner_L${n}`, 'liner')),
  ...range(21, 32).map((n) => m(`Braiding_B${n}`, 'braider')),
  ...range(1, 5).map((n) => m(`Cover_C${n}`, 'cover')),
  ...range(1, 4).map((n) => m(`Autoclave_V${n}`, 'vulcanisation')),
  ...range(1, 3).map((n) => m(`Testing_T${n}`, 'testing')),
];

const BY_ID = new Map(MACHINES.map((x) => [x.id, x]));

/** Fixed statuses so the demo shows every state; others run. */
const FORCED: Record<string, { status: MachineStatus; reason?: string; sinceMin: number }> = {
  Braiding_B23: { status: 'down', reason: 'Joint Bobbin', sinceMin: 230 },
  Braiding_B26: { status: 'changeover', reason: 'Die/Pin Changeover', sinceMin: 236 },
  Braiding_B29: { status: 'noSignal', sinceMin: 95 },
  Braiding_B32: { status: 'down', reason: 'NPD', sinceMin: 210 },
  Liner_L4: { status: 'down', reason: 'Material Shortage', sinceMin: 180 },
  Cover_C3: { status: 'changeover', reason: 'Size Changeover', sinceMin: 200 },
  Autoclave_V3: { status: 'noSignal', sinceMin: 40 },
};

const IDEAL_SPEED: Record<StageKey, number> = {
  mandrel: 6.5,
  liner: 8.5,
  braider: 5.2,
  cover: 7.5,
  vulcanisation: 12,
  testing: 10,
};

const OPERATORS = [
  ['201476', 'Karthik S'], ['201388', 'Suresh M'], ['201512', 'Pradeep R'], ['201290', 'Arun Kumar'],
  ['201634', 'Vignesh P'], ['201455', 'Murugan K'], ['201702', 'Dinesh B'], ['201318', 'Ramesh T'],
  ['201577', 'Sathish V'], ['201819', 'Balaji N'], ['201266', 'Manikandan A'], ['201930', 'Gopal R'],
] as const;

const SUPERVISORS: Record<StageKey, string[]> = {
  mandrel: ['R. Venkatesh', 'S. Prakash', 'K. Anand'],
  liner: ['P. Elango', 'M. Rajesh', 'T. Saravanan'],
  braider: ['M. Senthilkumar', 'R. Kannan', 'S. Ilango'],
  cover: ['A. Jayakumar', 'N. Mohan', 'V. Shankar'],
  vulcanisation: ['G. Ravi', 'K. Natarajan', 'P. Selvam'],
  testing: ['D. Karthikeyan', 'S. Bhaskar', 'R. Mani'],
};

const HOSE_SIZES = ['R1AT ⅜"', 'R2AT ½"', '2SN ¾"', 'R1AT ¼"', '4SP 1"', 'R2AT ⅝"'];
const BREAKDOWN_REASONS = ['NPD', 'Joint Bobbin', 'Others', 'Wire Break', 'Power Failure', 'Material Shortage'];
const CHANGEOVER_REASONS = ['Die/Pin Changeover', 'Size Changeover', 'Bobbin Change'];
const SHIFT_START_HOUR: Record<ShiftName, number> = { A: 6, B: 14, C: 22 };

function m(id: string, stage: StageKey): Machine {
  return { id, name: id, stage };
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 from a string key */
function rand(key: string): number {
  return (hash(key) % 100000) / 100000;
}

function pick<T>(arr: readonly T[], key: string): T {
  return arr[hash(key) % arr.length];
}

function between(lo: number, hi: number, key: string): number {
  return lo + (hi - lo) * rand(key);
}

// ---------------------------------------------------------------- shifts

export function shiftAt(now: Date): ShiftWindow {
  const h = now.getHours();
  const name: ShiftName = h >= 6 && h < 14 ? 'A' : h >= 14 && h < 22 ? 'B' : 'C';
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(SHIFT_START_HOUR[name]);
  if (name === 'C' && h < 6) start.setDate(start.getDate() - 1);
  const end = new Date(start.getTime() + 8 * 60 * MIN);
  return { name, start: start.toISOString(), end: end.toISOString() };
}

function previousShift(s: ShiftWindow): ShiftWindow {
  return shiftAt(new Date(new Date(s.start).getTime() - 30 * MIN));
}

// ---------------------------------------------------------------- status

function statusAt(machine: Machine, now: Date): MachineStatusInfo {
  const shift = shiftAt(now);
  const shiftStart = new Date(shift.start).getTime();
  const elapsedMin = (now.getTime() - shiftStart) / MIN;
  const forced = FORCED[machine.id];

  if (forced) {
    const sinceMin = Math.max(0, Math.min(forced.sinceMin, elapsedMin - 3));
    return {
      machineId: machine.id,
      status: forced.status,
      reason: forced.reason,
      since: new Date(shiftStart + sinceMin * MIN).toISOString(),
    };
  }

  // Everyone else follows the simulated shift, so machines stop and restart
  const t = now.getTime();
  const seg = simulateShift(machine, shift).find((x) => x.start <= t && t < x.end);
  if (!seg) return { machineId: machine.id, status: 'running', since: shift.start };
  return { machineId: machine.id, status: SEGMENT_TO_STATUS[seg.kind], reason: seg.reason, since: iso(seg.start) };
}

// ---------------------------------------------------------------- timeline

const STATUS_TO_SEGMENT: Record<MachineStatus, SegmentKind> = {
  running: 'production',
  down: 'downtime',
  changeover: 'changeover',
  noSignal: 'noSignal',
};

const SEGMENT_TO_STATUS: Record<SegmentKind, MachineStatus> = {
  production: 'running',
  downtime: 'down',
  changeover: 'changeover',
  noSignal: 'noSignal',
};

interface SimSegment {
  start: number;
  end: number;
  kind: SegmentKind;
  reason?: string;
}

/** Deterministic events for a whole shift: production runs broken by stops. */
function simulateShift(machine: Machine, shift: ShiftWindow): SimSegment[] {
  const shiftStart = new Date(shift.start).getTime();
  const shiftEnd = new Date(shift.end).getTime();
  const out: SimSegment[] = [];
  let t = shiftStart;
  for (let i = 0; t < shiftEnd; i++) {
    const key = `${machine.id}:${shift.start}:${i}`;
    const prodEnd = Math.min(shiftEnd, t + between(25, 80, `${key}:p`) * MIN);
    out.push({ start: t, end: prodEnd, kind: 'production' });
    t = prodEnd;
    if (t >= shiftEnd) break;
    const r = rand(`${key}:k`);
    const kind: SegmentKind = r < 0.58 ? 'downtime' : r < 0.92 ? 'changeover' : 'noSignal';
    const reason = kind === 'downtime' ? pick(BREAKDOWN_REASONS, `${key}:r`) : kind === 'changeover' ? pick(CHANGEOVER_REASONS, `${key}:r`) : undefined;
    const len = kind === 'changeover' ? between(8, 14, `${key}:s`) : kind === 'noSignal' ? between(3, 6, `${key}:s`) : between(4, 13, `${key}:s`);
    const stopEnd = Math.min(shiftEnd, t + len * MIN);
    out.push({ start: t, end: stopEnd, kind, reason });
    t = stopEnd;
  }
  return out;
}

/** Shift history up to the current status, then the status segment until now. */
function timelineFor(machine: Machine, now: Date, status: MachineStatusInfo) {
  const shift = shiftAt(now);
  const shiftStart = new Date(shift.start).getTime();
  const since = Math.max(shiftStart, new Date(status.since).getTime());
  const segments: (TimelineSegment & { reason?: string })[] = simulateShift(machine, shift)
    .filter((x) => x.start < since)
    .map((x) => ({ start: iso(x.start), end: iso(Math.min(x.end, since)), kind: x.kind, reason: x.reason }));
  segments.push({
    start: iso(since),
    end: now.toISOString(),
    kind: STATUS_TO_SEGMENT[status.status],
    reason: status.reason,
  });
  return segments.filter((x) => new Date(x.end).getTime() > new Date(x.start).getTime());
}

function iso(t: number): string {
  return new Date(t).toISOString();
}

function overlapMin(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / MIN;
}

// ---------------------------------------------------------------- factors

function factors(machine: Machine) {
  const id = machine.id;
  let p = between(0.82, 0.95, `${id}:p`);
  // Ideal rate set too low for this size: raw performance above 100%.
  if (id === 'Braiding_B24') p = 1.036;
  const q = between(0.92, 0.985, `${id}:q`);
  return { p, q, ideal: IDEAL_SPEED[machine.stage] };
}

function syntheticPeriod(
  machine: Machine,
  key: PeriodOeeInput['key'],
  label: string,
  sublabel: string,
  plannedMin: number,
): PeriodOeeInput {
  const { p, q, ideal } = factors(machine);
  const a = machine.id === 'Braiding_B32' ? between(0.3, 0.42, `${machine.id}:${key}:a`) : between(0.86, 0.99, `${machine.id}:${key}:a`);
  const pp = Math.min(p, 1.04) * between(0.97, 1.02, `${machine.id}:${key}:pp`);
  const prod = plannedMin * a;
  const actual = prod * ideal * pp;
  return {
    key,
    label,
    sublabel,
    plannedTimeMin: plannedMin,
    prodTimeMin: prod,
    actualM: actual,
    idealMPerMin: ideal,
    totalM: actual,
    goodM: actual * q,
  };
}

// ---------------------------------------------------------------- params

/** Set points per machine (Set RPM, Standard Speed, Set Length) */
function setPoints(machine: Machine) {
  const { ideal } = factors(machine);
  return {
    STANDARD_SPEED: Math.round(ideal * 10) / 10,
    SET_RPM: pick([900, 1100, 1300, 1500], `${machine.id}:setrpm`),
    // Some machines have no set length entered, as on the live device
    SET_LENGTH: rand(`${machine.id}:setlen`) < 0.3 ? null : pick([500, 800, 1000], `${machine.id}:setlenv`),
  };
}

function noise(seed: string, tm: number): number {
  const phase = rand(seed) * 10;
  return 0.55 * Math.sin(tm / 6 + phase) + 0.3 * Math.sin(tm / 1.7 + phase * 2) + 0.25 * (rand(`${seed}:${Math.floor(tm)}`) - 0.5);
}

/** Value of one device tag at time t, given whether the machine was running then. */
function tagValue(machine: Machine, key: string, t: number, running: boolean, faultCode: number, nowT: number): number | null {
  const sp = setPoints(machine);
  const tm = t / MIN;
  const seed = `${machine.id}:${key}`;
  const minuteOfShift = (t - new Date(shiftAt(new Date(t)).start).getTime()) / MIN;
  switch (key) {
    case 'STANDARD_SPEED':
    case 'SET_RPM':
    case 'SET_LENGTH':
      return sp[key];
    case 'ACTUAL_LINE_SPEED':
      return running ? sp.STANDARD_SPEED * (1 + 0.05 * noise(seed, tm)) : 0;
    case 'ACTUAL_RPM': {
      if (!running) return 0;
      let v = sp.SET_RPM * (1 + 0.025 * noise(seed, tm));
      // Braiding_B27 drifts above its tolerance over the last ~12 min
      if (machine.id === 'Braiding_B27') v += sp.SET_RPM * 0.08 * Math.min(1, Math.max(0, (12 - (nowT - t) / MIN) / 8));
      return v;
    }
    case 'ACTUAL_LENGTH': {
      const drum = sp.SET_LENGTH ?? 1000;
      return Math.round(((minuteOfShift * sp.STANDARD_SPEED * 0.9 + rand(`${seed}:base`) * drum) % drum) * 100) / 100;
    }
    case 'DRUM_IN':
      return Math.floor(between(20, 60, `${seed}:base`) + minuteOfShift / 95);
    case 'DRUM_OUT':
      return Math.floor(between(10, 30, `${seed}:base`) + minuteOfShift / 110);
    case 'RUN_STATUS':
      return running ? 1 : 0;
    case 'FAULT_CODE':
      return running ? 0 : faultCode;
    default:
      return null;
  }
}

function liveParams(machine: Machine, status: MachineStatusInfo, now: Date): Record<string, ParamReading> {
  const out: Record<string, ParamReading> = {};
  const sinceT = new Date(status.since).getTime();
  const nowT = now.getTime();
  const faultCode = status.status === 'down' ? 1 + (hash(`${machine.id}:${status.reason}`) % 40) : 0;

  const keys = new Set<string>();
  for (const p of PARAMS_BY_STAGE[machine.stage]) {
    const tag = tagFor(machine.id, p);
    if (tag) keys.add(tag);
    const setTag = setTagFor(machine.id, p);
    if (setTag) keys.add(setTag);
  }

  for (const tag of keys) {
    const key = tag.slice(machine.id.length + 1);
    const history: (number | null)[] = [];
    for (let i = 59; i >= 0; i--) {
      const t = nowT - i * MIN;
      const inStatus = t >= sinceT;
      if (inStatus && status.status === 'noSignal') history.push(null);
      else history.push(tagValue(machine, key, t, !inStatus || status.status === 'running', faultCode, nowT));
    }
    const value = status.status === 'noSignal' ? null : tagValue(machine, key, nowT, status.status === 'running', faultCode, nowT);
    out[tag] = { value, history };
  }
  return out;
}

// ---------------------------------------------------------------- PIRs

function pirNumber(machine: Machine, salt: string): string {
  return String(410000 + (hash(`${machine.stage}:${salt}`) % 9000));
}

function buildDetail(machine: Machine, now: Date): MachineDetail {
  const status = statusAt(machine, now);
  const shift = shiftAt(now);
  const shiftStart = new Date(shift.start).getTime();
  const shiftEnd = new Date(shift.end).getTime();
  const nowT = now.getTime();
  const segments = timelineFor(machine, now, status);
  const { p, q, ideal } = factors(machine);

  const prodMin = segments.filter((s) => s.kind === 'production').reduce((sum, s) => sum + overlapMin(new Date(s.start).getTime(), new Date(s.end).getTime(), shiftStart, nowT), 0);
  const elapsedMin = (nowT - shiftStart) / MIN;
  const actualNow = prodMin * ideal * p;

  const prev = previousShift(shift);
  const prev2 = previousShift(prev);
  const startOfToday = new Date(now);
  startOfToday.setHours(6, 0, 0, 0);
  if (now.getHours() < 6) startOfToday.setDate(startOfToday.getDate() - 1);
  const yesterday = new Date(startOfToday.getTime() - 24 * 60 * MIN);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = Math.max(1, Math.round((startOfToday.getTime() - monthStart.getTime()) / (24 * 60 * MIN)));

  const shiftLabel = (s: ShiftWindow) => {
    const sameDay = new Date(s.start).toDateString() === startOfToday.toDateString();
    if (s.name === 'C') return 'last night';
    return sameDay ? 'today' : dayMonth(s.start);
  };

  const noSignal = status.status === 'noSignal';
  const oee: PeriodOeeInput[] = [
    {
      key: 'current',
      label: `Shift ${shift.name}`,
      sublabel: 'now',
      plannedTimeMin: noSignal ? 0 : Math.max(1, elapsedMin),
      prodTimeMin: prodMin,
      actualM: actualNow,
      idealMPerMin: ideal,
      totalM: actualNow,
      goodM: actualNow * q,
    },
    syntheticPeriod(machine, 'prev', `Shift ${prev.name}`, shiftLabel(prev), 480),
    syntheticPeriod(machine, 'prev2', `Shift ${prev2.name}`, shiftLabel(prev2), 480),
    syntheticPeriod(machine, 'yesterday', 'Yesterday', `${dayMonth(yesterday)} · 3 shifts`, 1440),
    syntheticPeriod(machine, 'month', 'This month', `1–${now.getDate()} ${dayMonth(now).split(' ')[1]}`, 1440 * daysInMonth),
  ];

  // Current PIR
  const stageIdx = STAGES.findIndex((s) => s.key === machine.stage);
  const hasPir = !noSignal && machine.id !== 'Cover_C5';
  const planMissing = machine.id === 'Liner_L2';
  const plan = planMissing ? null : pick([800, 1000, 1000, 1200, 1500], `${machine.id}:plan`);
  const planForCalc = plan ?? 1000;
  const base = between(0.25, 0.55, `${machine.id}:base:${shift.start}`) * planForCalc;
  const producedHere = Math.min(planForCalc * 0.97, base + actualNow);
  const pirStart = new Date(shiftStart - between(60, 1500, `${machine.id}:pirstart`) * MIN);

  const currentPir = hasPir
    ? {
        pir: pirNumber(machine, `cur:${Math.floor(shiftStart / (24 * 60 * MIN))}:${machine.id.slice(-2)}`),
        hoseSize: pick(HOSE_SIZES, `${machine.id}:size`),
        mpir: `MP-${7000 + (hash(`${machine.id}:mpir`) % 999)}`,
        dueDate: new Date(nowT + between(1, 3, `${machine.id}:due`) * 24 * 60 * MIN).toISOString(),
        startedAt: pirStart.toISOString(),
        planM: plan,
        producedHereM: Math.round(producedHere),
        avgSpeed: ideal * p * 0.92,
        stages: STAGES.map((s, i) => {
          if (i < stageIdx) return { stage: s.key, doneM: planForCalc, planM: plan, partLot: false };
          if (i === stageIdx) return { stage: s.key, doneM: Math.round(producedHere), planM: plan, partLot: false };
          const lot = i - stageIdx === 1 ? Math.round(producedHere * between(0.2, 0.4, `${machine.id}:lot`)) : Math.round(producedHere * between(0.2, 0.4, `${machine.id}:lot`));
          return { stage: s.key, doneM: lot, planM: plan, partLot: lot > 0 };
        }),
      }
    : null;

  const lastPlan = pick([800, 1000, 1200, 1500], `${machine.id}:lastplan`);
  const lastRun = between(300, 520, `${machine.id}:lastrun`);
  const lastDown = between(30, 120, `${machine.id}:lastdown`);
  const lastTo = new Date(pirStart.getTime() - between(5, 25, `${machine.id}:gap`) * MIN);
  const lastFrom = new Date(lastTo.getTime() - (lastRun + lastDown) * MIN);
  const lastOp = pick(OPERATORS, `${machine.id}:lastop`);
  const lastPir = {
    pir: pirNumber(machine, `last:${machine.id}`),
    hoseSize: pick(HOSE_SIZES, `${machine.id}:lastsize`),
    producedM: Math.round(lastPlan * between(0.92, 1.0, `${machine.id}:lastpct`)),
    planM: lastPlan,
    from: lastFrom.toISOString(),
    to: lastTo.toISOString(),
    runMin: lastRun,
    downMin: lastDown,
    oee: between(0.55, 0.82, `${machine.id}:lastoee`),
    avgSpeed: ideal * between(0.5, 0.75, `${machine.id}:lastspd`),
    operator: { id: lastOp[0], name: lastOp[1] },
  };

  // Hourly output
  const hourly: HourlyOutput[] = [];
  for (let h = shiftStart; h < shiftEnd; h += 60 * MIN) {
    const hEnd = h + 60 * MIN;
    const target = Math.round(ideal * 60 * 0.95);
    if (h > nowT) {
      hourly.push({ hourStart: iso(h), metres: null, target });
      continue;
    }
    const prodInHour = segments
      .filter((s) => s.kind === 'production')
      .reduce((sum, s) => sum + overlapMin(new Date(s.start).getTime(), new Date(s.end).getTime(), h, Math.min(hEnd, nowT)), 0);
    hourly.push({ hourStart: iso(h), metres: Math.round(prodInHour * ideal * p), target });
  }

  // Downtime
  const stopSegs = segments.filter((s) => s.kind === 'downtime' || s.kind === 'changeover');
  const stops: DowntimeStop[] = stopSegs.map((s) => ({
    start: s.start,
    reason: s.reason ?? (s.kind === 'changeover' ? 'Changeover' : 'Others'),
    durationMin: Math.max(1, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / MIN)),
    kind: s.kind === 'changeover' ? 'changeover' : 'breakdown',
  }));

  const nextOp = pick(HOSE_SIZES, `${machine.id}:nextsize`);
  return {
    machineId: machine.id,
    oee,
    currentPir,
    lastPir,
    nextInQueue: { pir: pirNumber(machine, `next:${machine.id}`), hoseSize: nextOp, planM: pick([1000, 1200, 1500], `${machine.id}:nextplan`) },
    timeline: segments.map(({ start, end, kind }) => ({ start, end, kind })),
    hourly,
    downtime: {
      stops: stops.length,
      minutesLost: stops.reduce((sum, s) => sum + s.durationMin, 0),
      changeovers: stops.filter((s) => s.kind === 'changeover').length,
      latest: stops.slice(-3).reverse(),
    },
    fetchedAt: now.toISOString(),
  };
}

function buildLive(machine: Machine, now: Date): MachineLive {
  const status = statusAt(machine, now);
  const shift = shiftAt(now);
  const op = pick(OPERATORS, `${machine.id}:op:${shift.start}`);
  const supIdx = (['A', 'B', 'C'] as ShiftName[]).indexOf(shift.name);
  const params = liveParams(machine, status, now);
  const lineSpeedParam = PARAMS_BY_STAGE[machine.stage].find((p) => p.key === 'lineSpeed');
  const lineTag = lineSpeedParam ? tagFor(machine.id, lineSpeedParam) : null;
  const lineSpeed = status.status !== 'running' ? 0 : (lineTag ? params[lineTag]?.value : null) ?? factors(machine).ideal;

  return {
    machineId: machine.id,
    status,
    lineSpeed,
    // Operator ids arrive as floats from the event table
    operator: machine.id === 'Testing_T2' ? { id: `${op[0]}.0` } : { id: `${op[0]}.0`, name: op[1] },
    supervisor: { name: SUPERVISORS[machine.stage][supIdx], shift: shift.name },
    shift,
    params,
    fetchedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------- profiles

const BACKEND_KEY = 'polyhose.tv.mockBackend.profiles';

function seedProfiles(): TvProfile[] {
  const now = new Date().toISOString();
  const base = {
    defaultSections: [...ALL_SECTION_KEYS],
    secondsPerMachine: 5,
    order: 'stage' as const,
    skipNoSignal: true,
    jumpToDown: true,
    theme: 'auto' as const,
    hideControlsAfterMs: 3000 as const,
    autoFullscreen: true,
    updatedAt: now,
    updatedBy: 'system',
  };
  return [
    {
      ...base,
      id: 'plant-entrance',
      name: 'Plant entrance TV',
      machines: MACHINES.map((x) => ({ machineId: x.id, enabled: true })),
    },
    {
      ...base,
      id: 'braider-hall',
      name: 'Braider hall TV',
      machines: MACHINES.map((x) => ({
        machineId: x.id,
        enabled: x.stage === 'braider' && x.id !== 'Braiding_B29',
        ...(x.id === 'Braiding_B23' ? { sections: ['oee', 'currentPir', 'lastPir', 'downtime'] as TvProfile['defaultSections'], seconds: 20 } : {}),
      })),
    },
  ];
}

function readBackend(): TvProfile[] {
  try {
    const raw = localStorage.getItem(BACKEND_KEY);
    if (raw) return JSON.parse(raw) as TvProfile[];
  } catch {
    /* fall through to seed */
  }
  const seeded = seedProfiles();
  writeBackend(seeded);
  return seeded;
}

function writeBackend(profiles: TvProfile[]): void {
  try {
    localStorage.setItem(BACKEND_KEY, JSON.stringify(profiles));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

// ---------------------------------------------------------------- adapter

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function machineOrThrow(id: string): Machine {
  const machine = BY_ID.get(id);
  if (!machine) throw new Error(`Unknown machine ${id}`);
  return machine;
}

export function createMockTvDataSource(): TvDataSource {
  return {
    kind: 'mock',
    async listMachines() {
      await delay(80);
      return MACHINES.map((x) => ({ ...x }));
    },
    async getStatuses() {
      await delay(60);
      const now = new Date();
      return MACHINES.map((x) => statusAt(x, now));
    },
    async getLive(machineId) {
      await delay(80);
      return buildLive(machineOrThrow(machineId), new Date());
    },
    async getDetail(machineId) {
      await delay(120);
      return buildDetail(machineOrThrow(machineId), new Date());
    },
    async listProfiles() {
      await delay(60);
      return readBackend();
    },
    async saveProfile(profile) {
      await delay(120);
      const saved = { ...profile, updatedAt: new Date().toISOString() };
      const all = readBackend().filter((p) => p.id !== profile.id);
      writeBackend([...all, saved]);
      return saved;
    },
    async deleteProfile(id) {
      await delay(60);
      writeBackend(readBackend().filter((p) => p.id !== id));
    },
  };
}
