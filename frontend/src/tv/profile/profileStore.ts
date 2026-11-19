import { useSyncExternalStore } from 'react';
import { tvDataSource } from '../../services/tvDataSource';
import { ALL_SECTION_KEYS } from '../config/sections';
import type { Machine, TvProfile } from '../types';

// TV profiles: saved to the backend through tvDataSource, cached in
// localStorage so the TV still starts when the API is unreachable.

const CACHE_KEY = 'polyhose.tv.profileCache';
const ACTIVE_KEY = 'polyhose.tv.activeProfileId';

export interface ProfileState {
  status: 'loading' | 'ready';
  profiles: TvProfile[];
  activeId: string | null;
  /** Where the profiles came from on the last load */
  source: 'api' | 'cache' | 'default';
  error: string | null;
}

let state: ProfileState = { status: 'loading', profiles: [], activeId: null, source: 'default', error: null };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function setState(patch: Partial<ProfileState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProfileState(): ProfileState {
  return useSyncExternalStore(subscribe, () => state);
}

export function activeProfile(s: ProfileState): TvProfile | null {
  return s.profiles.find((p) => p.id === s.activeId) ?? s.profiles[0] ?? null;
}

export function createDefaultProfile(machines: Machine[], id = 'default', name = 'This TV'): TvProfile {
  return {
    id,
    name,
    machines: machines.map((m) => ({ machineId: m.id, enabled: true })),
    defaultSections: [...ALL_SECTION_KEYS],
    secondsPerMachine: 5,
    order: 'stage',
    skipNoSignal: true,
    jumpToDown: true,
    theme: 'auto',
    hideControlsAfterMs: 3000,
    autoFullscreen: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'tv',
  };
}

/** Add machines the profile has never seen (new machines on the plant) as disabled. */
export function withAllMachines(profile: TvProfile, machines: Machine[]): TvProfile {
  const known = new Set(profile.machines.map((m) => m.machineId));
  const missing = machines.filter((m) => !known.has(m.id));
  if (!missing.length) return profile;
  return { ...profile, machines: [...profile.machines, ...missing.map((m) => ({ machineId: m.id, enabled: false }))] };
}

function readCache(): TvProfile[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TvProfile[]) : [];
  } catch {
    return [];
  }
}

function writeCache(profiles: TvProfile[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profiles));
  } catch {
    /* storage unavailable */
  }
}

function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

function urlProfileId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('profile');
  } catch {
    return null;
  }
}

/** Load once; the URL (?profile=id) wins, then the last profile used on this device. */
export function ensureProfilesLoaded(machines: Machine[]): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    let profiles: TvProfile[] = [];
    let source: ProfileState['source'] = 'api';
    let error: string | null = null;
    try {
      profiles = await tvDataSource.listProfiles();
      writeCache(profiles);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load TV profiles';
      console.error('[TV] profile load failed, using cache', e);
      profiles = readCache();
      source = 'cache';
    }
    if (!profiles.length) {
      profiles = [createDefaultProfile(machines)];
      source = 'default';
    }
    profiles = profiles.map((p) => withAllMachines(p, machines));
    const wanted = urlProfileId() ?? readActiveId();
    const activeId = profiles.some((p) => p.id === wanted) ? wanted! : profiles[0].id;
    writeActiveId(activeId);
    setState({ status: 'ready', profiles, activeId, source, error });
  })();
  return loading;
}

export function setActiveProfile(id: string): void {
  writeActiveId(id);
  setState({ activeId: id });
}

/** Save to the backend, cache locally and apply immediately. */
export async function saveProfile(profile: TvProfile): Promise<TvProfile> {
  let saved = profile;
  let error: string | null = null;
  try {
    saved = await tvDataSource.saveProfile(profile);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not save to the server';
    console.error('[TV] profile save failed, kept on this device', e);
  }
  const profiles = [...state.profiles.filter((p) => p.id !== saved.id), saved];
  writeCache(profiles);
  writeActiveId(saved.id);
  setState({ profiles, activeId: saved.id, error });
  return saved;
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    await tvDataSource.deleteProfile(id);
  } catch (e) {
    console.error('[TV] profile delete failed', e);
  }
  const profiles = state.profiles.filter((p) => p.id !== id);
  writeCache(profiles);
  const activeId = state.activeId === id ? (profiles[0]?.id ?? null) : state.activeId;
  if (activeId) writeActiveId(activeId);
  setState({ profiles, activeId });
}
