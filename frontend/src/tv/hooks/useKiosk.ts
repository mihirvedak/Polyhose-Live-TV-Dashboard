import { useEffect, useState } from 'react';

/** No selection, context menu, drag or double-click on the TV; keep the screen awake. */
export function useKiosk(): void {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const events = ['contextmenu', 'selectstart', 'dragstart', 'dblclick'] as const;
    events.forEach((ev) => document.addEventListener(ev, block));
    document.documentElement.classList.add('kiosk');

    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const requestLock = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen');
        if (disposed) void lock.release();
      } catch {
        /* wake lock not allowed: ignore */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void requestLock();
    };
    void requestLock();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      events.forEach((ev) => document.removeEventListener(ev, block));
      document.removeEventListener('visibilitychange', onVisible);
      document.documentElement.classList.remove('kiosk');
      lock?.release().catch(() => undefined);
    };
  }, []);
}

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Uniform scale that fits the 1920 × 1080 stage in the window. */
export function useStageScale(): number {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}
