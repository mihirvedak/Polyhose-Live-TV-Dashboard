import { useCallback, useEffect, useState } from 'react';

// Safari still ships the webkit-prefixed API
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const doc = () => document as FsDocument;

function fullscreenElement(): Element | null {
  return doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;
}

export function fullscreenSupported(): boolean {
  const el = document.documentElement as FsElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

/** Browser full screen. Entering needs a click, tap or key press (browser rule). */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!fullscreenElement());

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!fullscreenElement());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const enter = useCallback(async () => {
    if (fullscreenElement()) return;
    const el = document.documentElement as FsElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen?.();
    } catch (e) {
      console.warn('[TV] full screen was refused by the browser', e);
    }
  }, []);

  const exit = useCallback(async () => {
    if (!fullscreenElement()) return;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc().webkitExitFullscreen?.();
    } catch (e) {
      console.warn('[TV] could not leave full screen', e);
    }
  }, []);

  const toggle = useCallback(() => (fullscreenElement() ? exit() : enter()), [enter, exit]);

  return { isFullscreen, supported: fullscreenSupported(), enter, exit, toggle };
}

/**
 * Enter full screen on the first click, tap or key press, when the profile asks
 * for it. Once someone leaves full screen on purpose, it stays off for this visit.
 */
export function useAutoFullscreen(enabled: boolean, enter: () => Promise<void>): void {
  useEffect(() => {
    if (!enabled || !fullscreenSupported()) return;
    let wasFull = !!fullscreenElement();
    let disarmed = false;

    const onChange = () => {
      if (fullscreenElement()) wasFull = true;
      else if (wasFull) disarmed = true;
    };
    const onGesture = (e: Event) => {
      if (disarmed || fullscreenElement()) return;
      // The control bar's own buttons and the F key handle full screen themselves
      if (e.target instanceof Element && e.target.closest('.control-bar')) return;
      if (e instanceof KeyboardEvent && (e.key === 'f' || e.key === 'F')) return;
      void enter();
    };

    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    events.forEach((ev) => window.addEventListener(ev, onGesture));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onGesture));
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [enabled, enter]);
}
