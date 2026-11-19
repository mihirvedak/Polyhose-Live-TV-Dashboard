import { ALL_SECTION_KEYS } from '../config/sections';
import { STAGE_BY_KEY } from '../config/stages';
import type { Machine, MachineStatusInfo, SectionKey, TvProfile, TvProfileMachine } from '../types';

// Pure rotation scheduler. The hook in hooks/useRotation drives it with a clock.

export interface PlaylistItem {
  machineId: string;
  seconds: number;
  sections: SectionKey[];
}

export const MIN_SECONDS = 5;
export const MAX_SECONDS = 300;

export function clampSeconds(s: number): number {
  if (!Number.isFinite(s)) return MIN_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(s)));
}

/** Per-machine sections override the defaults; ordering follows the default order. */
export function effectiveSections(profile: TvProfile, entry: TvProfileMachine | undefined): SectionKey[] {
  const chosen = new Set(entry?.sections ?? profile.defaultSections);
  const order = [...profile.defaultSections, ...ALL_SECTION_KEYS.filter((k) => !profile.defaultSections.includes(k))];
  return order.filter((k) => chosen.has(k));
}

export function secondsFor(profile: TvProfile, entry: TvProfileMachine | undefined): number {
  return clampSeconds(entry?.seconds ?? profile.secondsPerMachine);
}

export function buildPlaylist(
  profile: TvProfile,
  machines: Machine[],
  statuses: Record<string, MachineStatusInfo | undefined>,
): PlaylistItem[] {
  const byId = new Map(machines.map((m) => [m.id, m]));
  const baseOrder = new Map(machines.map((m, i) => [m.id, i]));
  const customOrder = new Map(profile.machines.map((m, i) => [m.machineId, i]));

  const items = profile.machines
    .filter((e) => e.enabled && byId.has(e.machineId))
    .filter((e) => !(profile.skipNoSignal && statuses[e.machineId]?.status === 'noSignal'))
    .map((e) => ({
      machineId: e.machineId,
      seconds: secondsFor(profile, e),
      sections: effectiveSections(profile, e),
    }))
    .filter((item) => item.sections.length > 0);

  const stageRank = (id: string) => STAGE_BY_KEY[byId.get(id)!.stage].index * 1000 + (baseOrder.get(id) ?? 0);

  switch (profile.order) {
    case 'custom':
      return items.sort((a, b) => (customOrder.get(a.machineId) ?? 0) - (customOrder.get(b.machineId) ?? 0));
    case 'downFirst': {
      const isDown = (id: string) => (statuses[id]?.status === 'down' ? 0 : 1);
      return items.sort((a, b) => isDown(a.machineId) - isDown(b.machineId) || stageRank(a.machineId) - stageRank(b.machineId));
    }
    case 'stage':
    default:
      return items.sort((a, b) => stageRank(a.machineId) - stageRank(b.machineId));
  }
}

export type PlayMode = 'playing' | 'paused' | 'stopped';

export interface RotationState {
  index: number;
  currentId: string | null;
  /** Set while showing a jumped-to (down) machine; rotation continues after this id */
  resumeId: string | null;
  mode: PlayMode;
  /** Clock time the current machine's run started (adjusted for pauses) */
  startedAt: number;
  /** Elapsed ms frozen while paused / stopped */
  frozenMs: number;
}

export function initialRotation(playlist: PlaylistItem[], now: number): RotationState {
  return {
    index: 0,
    currentId: playlist[0]?.machineId ?? null,
    resumeId: null,
    mode: 'playing',
    startedAt: now,
    frozenMs: 0,
  };
}

export function elapsedMs(s: RotationState, now: number): number {
  return s.mode === 'playing' ? Math.max(0, now - s.startedAt) : s.frozenMs;
}

export function currentItem(s: RotationState, playlist: PlaylistItem[]): PlaylistItem | undefined {
  return playlist[s.index];
}

/** 0..1 of the time on the current machine */
export function progress(s: RotationState, playlist: PlaylistItem[], now: number): number {
  const item = currentItem(s, playlist);
  if (!item) return 0;
  return Math.min(1, elapsedMs(s, now) / (item.seconds * 1000));
}

function goTo(s: RotationState, playlist: PlaylistItem[], index: number, now: number): RotationState {
  return {
    ...s,
    index,
    currentId: playlist[index]?.machineId ?? null,
    resumeId: null,
    startedAt: now,
    frozenMs: 0,
  };
}

/** Index rotation continues from: the resume point after a jump, otherwise the current one. */
function baseIndex(s: RotationState, playlist: PlaylistItem[]): number {
  if (s.resumeId) {
    const i = playlist.findIndex((p) => p.machineId === s.resumeId);
    if (i >= 0) return i;
  }
  return s.index;
}

export function next(s: RotationState, playlist: PlaylistItem[], now: number): RotationState {
  const n = playlist.length;
  if (n <= 1) return s;
  return goTo(s, playlist, (baseIndex(s, playlist) + 1) % n, now);
}

export function prev(s: RotationState, playlist: PlaylistItem[], now: number): RotationState {
  const n = playlist.length;
  if (n <= 1) return s;
  const from = s.resumeId ? baseIndex(s, playlist) + 1 : s.index;
  return goTo(s, playlist, (from - 1 + n) % n, now);
}

/** Advance when the current machine's time is up. */
export function tick(s: RotationState, playlist: PlaylistItem[], now: number): RotationState {
  if (s.mode !== 'playing' || playlist.length <= 1) return s;
  const item = currentItem(s, playlist);
  if (!item) return goTo(s, playlist, 0, now);
  if (elapsedMs(s, now) < item.seconds * 1000) return s;
  return next(s, playlist, now);
}

export function play(s: RotationState, now: number): RotationState {
  if (s.mode === 'playing') return s;
  return { ...s, mode: 'playing', startedAt: now - s.frozenMs };
}

export function pause(s: RotationState, now: number): RotationState {
  if (s.mode !== 'playing') return s;
  return { ...s, mode: 'paused', frozenMs: elapsedMs(s, now) };
}

export function togglePlay(s: RotationState, now: number): RotationState {
  return s.mode === 'playing' ? pause(s, now) : play(s, now);
}

/** Pause and go back to the first machine. */
export function stop(playlist: PlaylistItem[]): RotationState {
  return {
    index: 0,
    currentId: playlist[0]?.machineId ?? null,
    resumeId: null,
    mode: 'stopped',
    startedAt: 0,
    frozenMs: 0,
  };
}

/** Show a machine for one turn, then continue the loop from where it was. */
export function jumpTo(s: RotationState, playlist: PlaylistItem[], machineId: string, now: number): RotationState {
  const idx = playlist.findIndex((p) => p.machineId === machineId);
  if (idx < 0 || idx === s.index) return s;
  return {
    ...s,
    index: idx,
    currentId: machineId,
    resumeId: s.resumeId ?? s.currentId,
    startedAt: now,
    frozenMs: 0,
  };
}

/** Keep showing the same machine when the playlist changes (statuses, settings). */
export function reconcile(s: RotationState, playlist: PlaylistItem[], now: number): RotationState {
  const resumeId = s.resumeId && playlist.some((p) => p.machineId === s.resumeId) ? s.resumeId : null;
  const idx = s.currentId ? playlist.findIndex((p) => p.machineId === s.currentId) : -1;
  if (idx >= 0) {
    if (idx === s.index && resumeId === s.resumeId) return s;
    return { ...s, index: idx, resumeId };
  }
  if (!playlist.length) return { ...s, index: 0, currentId: null, resumeId: null };
  const clamped = Math.min(Math.max(0, s.index), playlist.length - 1);
  return {
    ...s,
    index: clamped,
    currentId: playlist[clamped].machineId,
    resumeId,
    startedAt: now,
    frozenMs: 0,
  };
}

/** Total time for one loop of the playlist in seconds. */
export function loopSeconds(playlist: PlaylistItem[]): number {
  return playlist.reduce((sum, p) => sum + p.seconds, 0);
}
