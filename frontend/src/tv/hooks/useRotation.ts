import { useCallback, useEffect, useRef, useState } from 'react';
import * as R from '../lib/rotation';
import type { MachineStatusInfo } from '../types';

export interface RotationControls {
  state: R.RotationState;
  current: R.PlaylistItem | undefined;
  nextItem: R.PlaylistItem | undefined;
  progress: number;
  next(): void;
  prev(): void;
  togglePlay(): void;
  stop(): void;
}

/** Drives the pure scheduler with a clock, and jumps to machines that go down. */
export function useRotation(
  playlist: R.PlaylistItem[],
  statuses: Record<string, MachineStatusInfo>,
  jumpToDown: boolean,
): RotationControls {
  const [state, setState] = useState(() => R.initialRotation(playlist, Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const playlistRef = useRef(playlist);

  // Keep the same machine on screen when the playlist changes
  useEffect(() => {
    playlistRef.current = playlist;
    setState((s) => R.reconcile(s, playlist, Date.now()));
  }, [playlist]);

  // Clock: advance when time is up, and repaint the progress bar
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((s) => R.tick(s, playlistRef.current, t));
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Jump to a machine when it goes down: show it for one turn, then continue
  const prevStatuses = useRef<Record<string, MachineStatusInfo>>({});
  useEffect(() => {
    const before = prevStatuses.current;
    prevStatuses.current = statuses;
    if (!jumpToDown || !Object.keys(before).length) return;
    const wentDown = Object.values(statuses).find(
      (s) => s.status === 'down' && before[s.machineId] && before[s.machineId].status !== 'down',
    );
    if (wentDown) setState((s) => (s.mode === 'playing' ? R.jumpTo(s, playlistRef.current, wentDown.machineId, Date.now()) : s));
  }, [statuses, jumpToDown]);

  const next = useCallback(() => setState((s) => R.next(s, playlistRef.current, Date.now())), []);
  const prev = useCallback(() => setState((s) => R.prev(s, playlistRef.current, Date.now())), []);
  const togglePlay = useCallback(() => setState((s) => R.togglePlay(s, Date.now())), []);
  const stop = useCallback(() => setState(() => R.stop(playlistRef.current)), []);

  const n = playlist.length;
  const current = R.currentItem(state, playlist);
  const nextIndex = n ? ((state.resumeId ? Math.max(0, playlist.findIndex((p) => p.machineId === state.resumeId)) : state.index) + 1) % n : 0;

  return {
    state,
    current,
    nextItem: n > 1 ? playlist[nextIndex] : undefined,
    progress: n > 1 ? R.progress(state, playlist, now) : 0,
    next,
    prev,
    togglePlay,
    stop,
  };
}
