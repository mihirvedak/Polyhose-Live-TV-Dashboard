import { useEffect, useMemo, useState } from 'react';
import { ControlBarVisibility } from '../lib/controlVisibility';

/** Hidden until the mouse, touchpad, touch or a key is used; hides after `delayMs`. */
export function useControlBar(delayMs: number) {
  const [visible, setVisible] = useState(false);
  const [ctrl] = useState(() => new ControlBarVisibility(delayMs, setVisible));

  useEffect(() => ctrl.setDelay(delayMs), [ctrl, delayMs]);

  useEffect(() => {
    const onActivity = () => ctrl.activity();
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) ctrl.leaveWindow();
    };
    const events = ['mousemove', 'pointermove', 'touchstart', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      ctrl.dispose();
    };
  }, [ctrl]);

  const barHandlers = useMemo(
    () => ({
      onPointerEnter: () => ctrl.enterBar(),
      onPointerLeave: () => ctrl.leaveBar(),
    }),
    [ctrl],
  );

  return { visible, barHandlers };
}
