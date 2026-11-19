import { describe, expect, it } from 'vitest';
import * as R from '../../tv/lib/rotation';
import type { Machine, MachineStatusInfo, TvProfile } from '../../tv/types';

const machines: Machine[] = [
  { id: 'Mandrel_M1', name: 'Mandrel_M1', stage: 'mandrel' },
  { id: 'Braiding_B21', name: 'Braiding_B21', stage: 'braider' },
  { id: 'Braiding_B22', name: 'Braiding_B22', stage: 'braider' },
  { id: 'Cover_C1', name: 'Cover_C1', stage: 'cover' },
];

function profile(patch: Partial<TvProfile> = {}): TvProfile {
  return {
    id: 'p',
    name: 'Test TV',
    machines: machines.map((m) => ({ machineId: m.id, enabled: true })),
    defaultSections: ['oee', 'currentPir', 'params', 'lastPir', 'timeline', 'downtime'],
    secondsPerMachine: 5,
    order: 'stage',
    skipNoSignal: true,
    jumpToDown: true,
    theme: 'day',
    hideControlsAfterMs: 3000,
    updatedAt: '',
    updatedBy: '',
    ...patch,
  };
}

const status = (id: string, s: MachineStatusInfo['status']): MachineStatusInfo => ({ machineId: id, status: s, since: '' });

describe('buildPlaylist', () => {
  it('uses per-machine seconds when set, otherwise the default', () => {
    const p = profile({ machines: machines.map((m) => ({ machineId: m.id, enabled: true, seconds: m.id === 'Braiding_B22' ? 20 : undefined })) });
    const list = R.buildPlaylist(p, machines, {});
    expect(list.map((i) => i.seconds)).toEqual([5, 5, 20, 5]);
  });

  it('skips disabled machines, machines with no sections, and no-signal machines when asked', () => {
    const p = profile({
      machines: [
        { machineId: 'Mandrel_M1', enabled: false },
        { machineId: 'Braiding_B21', enabled: true, sections: [] },
        { machineId: 'Braiding_B22', enabled: true },
        { machineId: 'Cover_C1', enabled: true },
      ],
    });
    const statuses = { Cover_C1: status('Cover_C1', 'noSignal') };
    expect(R.buildPlaylist(p, machines, statuses).map((i) => i.machineId)).toEqual(['Braiding_B22']);
    expect(R.buildPlaylist({ ...p, skipNoSignal: false }, machines, statuses).map((i) => i.machineId)).toEqual(['Braiding_B22', 'Cover_C1']);
  });

  it('orders down machines first, then by stage', () => {
    const list = R.buildPlaylist(profile({ order: 'downFirst' }), machines, { Cover_C1: status('Cover_C1', 'down') });
    expect(list.map((i) => i.machineId)).toEqual(['Cover_C1', 'Mandrel_M1', 'Braiding_B21', 'Braiding_B22']);
  });

  it('custom order follows the profile machine order', () => {
    const p = profile({ order: 'custom', machines: [...machines].reverse().map((m) => ({ machineId: m.id, enabled: true })) });
    expect(R.buildPlaylist(p, machines, {}).map((i) => i.machineId)).toEqual(['Cover_C1', 'Braiding_B22', 'Braiding_B21', 'Mandrel_M1']);
  });

  it('per-machine sections keep the default order', () => {
    const p = profile({
      defaultSections: ['params', 'oee', 'currentPir'],
      machines: [{ machineId: 'Mandrel_M1', enabled: true, sections: ['oee', 'downtime', 'params'] }],
    });
    expect(R.buildPlaylist(p, machines, {})[0].sections).toEqual(['params', 'oee', 'downtime']);
  });

  it('clamps seconds to 5..300', () => {
    expect(R.clampSeconds(1)).toBe(5);
    expect(R.clampSeconds(999)).toBe(300);
    expect(R.clampSeconds(12.4)).toBe(12);
  });
});

describe('rotation scheduler', () => {
  const list = R.buildPlaylist(profile({ machines: machines.map((m) => ({ machineId: m.id, enabled: true, seconds: m.id === 'Braiding_B21' ? 10 : undefined })) }), machines, {});

  it('next and previous wrap around', () => {
    let s = R.initialRotation(list, 0);
    s = R.prev(s, list, 0);
    expect(s.currentId).toBe('Cover_C1');
    s = R.next(s, list, 0);
    expect(s.currentId).toBe('Mandrel_M1');
  });

  it('advances when the machine time is up, using that machine’s own time', () => {
    let s = R.initialRotation(list, 0);
    s = R.tick(s, list, 4_999);
    expect(s.currentId).toBe('Mandrel_M1');
    s = R.tick(s, list, 5_000);
    expect(s.currentId).toBe('Braiding_B21');
    s = R.tick(s, list, 14_000);
    expect(s.currentId).toBe('Braiding_B21');
    s = R.tick(s, list, 15_000);
    expect(s.currentId).toBe('Braiding_B22');
  });

  it('pause freezes progress and resume continues from it', () => {
    let s = R.initialRotation(list, 0);
    s = R.pause(s, 2_000);
    expect(R.progress(s, list, 60_000)).toBeCloseTo(0.4);
    expect(R.tick(s, list, 60_000).currentId).toBe('Mandrel_M1');
    s = R.play(s, 60_000);
    expect(R.progress(s, list, 61_000)).toBeCloseTo(0.6);
    expect(R.tick(s, list, 62_999).currentId).toBe('Mandrel_M1');
    expect(R.tick(s, list, 63_000).currentId).toBe('Braiding_B21');
  });

  it('stop pauses and returns to the first machine', () => {
    let s = R.next(R.next(R.initialRotation(list, 0), list, 0), list, 0);
    s = R.stop(list);
    expect(s).toMatchObject({ index: 0, currentId: 'Mandrel_M1', mode: 'stopped' });
    expect(R.progress(s, list, 99_000)).toBe(0);
    expect(R.tick(s, list, 99_000).currentId).toBe('Mandrel_M1');
  });

  it('jump-to-down shows the machine for one turn, then continues the loop', () => {
    let s = R.initialRotation(list, 0); // on Mandrel_M1
    s = R.jumpTo(s, list, 'Cover_C1', 1_000);
    expect(s.currentId).toBe('Cover_C1');
    s = R.tick(s, list, 6_000);
    expect(s.currentId).toBe('Braiding_B21');
    expect(s.resumeId).toBeNull();
  });

  it('does not rotate with a single machine', () => {
    const one = list.slice(0, 1);
    const s = R.initialRotation(one, 0);
    expect(R.tick(s, one, 60_000)).toBe(s);
    expect(R.next(s, one, 0)).toBe(s);
  });

  it('keeps the same machine on screen when the playlist changes', () => {
    let s = R.next(R.initialRotation(list, 0), list, 0); // Braiding_B21
    const shorter = list.filter((i) => i.machineId !== 'Mandrel_M1');
    s = R.reconcile(s, shorter, 100);
    expect(s).toMatchObject({ index: 0, currentId: 'Braiding_B21' });
    const without = shorter.filter((i) => i.machineId !== 'Braiding_B21');
    s = R.reconcile(s, without, 200);
    expect(s.currentId).toBe('Braiding_B22');
  });

  it('loop length sums each machine’s time', () => {
    expect(R.loopSeconds(list)).toBe(25);
  });
});
