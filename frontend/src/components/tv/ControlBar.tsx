import type { PlayMode } from '../../tv/lib/rotation';
import { IconGear, IconNext, IconPause, IconPlay, IconPrev, IconStop } from '../common/Icons';

interface Props {
  visible: boolean;
  mode: PlayMode;
  position: number;
  total: number;
  machineName: string | null;
  seconds: number | null;
  canStep: boolean;
  onPrev(): void;
  onToggle(): void;
  onStop(): void;
  onNext(): void;
  onSettings(): void;
  barHandlers: { onPointerEnter(): void; onPointerLeave(): void };
}

export function ControlBar(p: Props) {
  const playing = p.mode === 'playing';
  const suffix = p.mode === 'paused' ? ' · Paused' : p.mode === 'stopped' ? ' · Stopped' : '';

  return (
    <div
      className={`control-bar${p.visible ? ' is-visible' : ''}`}
      role="toolbar"
      aria-label="Playback controls"
      {...p.barHandlers}
      // A mouse click must not leave focus behind (it would keep the bar
      // visible and swallow Space); keyboard focus stays.
      onPointerUp={() => (document.activeElement as HTMLElement | null)?.blur()}
    >
      <button type="button" className="cb-btn" onClick={p.onPrev} disabled={!p.canStep} aria-label="Previous machine">
        <IconPrev />
      </button>
      <button type="button" className="cb-btn cb-play" onClick={p.onToggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause size={30} /> : <IconPlay size={30} />}
      </button>
      <button
        type="button"
        className={`cb-btn${p.mode === 'stopped' ? ' is-stopped' : ''}`}
        onClick={p.onStop}
        aria-label="Stop"
        aria-pressed={p.mode === 'stopped'}
      >
        <IconStop />
      </button>
      <button type="button" className="cb-btn" onClick={p.onNext} disabled={!p.canStep} aria-label="Next machine">
        <IconNext />
      </button>
      <div className="cb-status" aria-live="polite">
        <b>
          {p.position} / {p.total}
        </b>
        {p.machineName ? ` · ${p.machineName}` : ''}
        {p.seconds ? ` · ${p.seconds} s each` : ''}
        {suffix}
      </div>
      <span className="cb-sep" />
      <button type="button" className="cb-btn" onClick={p.onSettings} aria-label="Settings">
        <IconGear />
      </button>
    </div>
  );
}
