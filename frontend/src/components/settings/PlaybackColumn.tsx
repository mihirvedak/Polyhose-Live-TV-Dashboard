import { useState } from 'react';
import { formatSeconds } from '../../tv/lib/format';
import { buildPlaylist, loopSeconds, MAX_SECONDS, MIN_SECONDS } from '../../tv/lib/rotation';
import type { HideDelayMs, Machine, MachineStatusInfo, RotationOrder, ThemeSetting, TvProfile } from '../../tv/types';
import { Segmented, Toggle } from './controls';

const QUICK = [5, 10, 15, 20, 30, 60];

interface Props {
  draft: TvProfile;
  update(patch: Partial<TvProfile>): void;
  machines: Machine[];
  statuses: Record<string, MachineStatusInfo>;
  onValidity(valid: boolean): void;
}

export function PlaybackColumn({ draft, update, machines, statuses, onValidity }: Props) {
  const [text, setText] = useState(String(draft.secondsPerMachine));
  const n = Number(text);
  const error =
    text.trim() === '' ? 'Enter a number of seconds' : !Number.isInteger(n) ? 'Whole seconds only' : n < MIN_SECONDS ? `Minimum ${MIN_SECONDS} s` : n > MAX_SECONDS ? `Maximum ${MAX_SECONDS} s` : null;

  const setSeconds = (t: string) => {
    setText(t);
    const v = Number(t);
    const ok = t.trim() !== '' && Number.isInteger(v) && v >= MIN_SECONDS && v <= MAX_SECONDS;
    onValidity(ok);
    if (ok) update({ secondsPerMachine: v });
  };

  const playlist = buildPlaylist(draft, machines, statuses);
  const overrides = playlist.filter((p) => draft.machines.find((e) => e.machineId === p.machineId)?.seconds != null);
  const plain = playlist.length - overrides.length;
  const shortName = (id: string) => id.split('_').pop() ?? id;
  const summary = playlist.length
    ? [
        plain ? `${plain} machine${plain === 1 ? '' : 's'} × ${draft.secondsPerMachine} s` : null,
        ...overrides.map((o) => `${shortName(o.machineId)} at ${o.seconds} s`),
      ]
        .filter(Boolean)
        .join(' + ')
    : 'no machines in the loop';

  return (
    <section className="set-col">
      <div className="set-col-head">
        <div className="card-label">3 · Playback</div>
      </div>

      <div className="pb-group">
        <div className="pb-title">Time on each machine</div>
        <div className="pb-sub">Applies to every machine unless set on the machine row</div>
        <div className="pb-quick">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              className={`pb-pick${!error && n === q ? ' is-on' : ''}`}
              aria-pressed={!error && n === q}
              onClick={() => setSeconds(String(q))}
            >
              {q} s
            </button>
          ))}
        </div>
        <label className="pb-custom">
          <span className="muted">Custom</span>
          <span className={`pb-input${error ? ' is-error' : ''}`}>
            <input type="number" min={MIN_SECONDS} max={MAX_SECONDS} value={text} onChange={(e) => setSeconds(e.target.value)} aria-invalid={!!error} aria-describedby="seconds-hint" />
            <span className="muted">sec</span>
          </span>
          <span id="seconds-hint" className={error ? 'field-error' : 'muted'}>
            {error ?? `min ${MIN_SECONDS} · max ${MAX_SECONDS}`}
          </span>
        </label>
      </div>

      <div className="pb-loop">
        <div className="pb-loop-value">{formatSeconds(loopSeconds(playlist))}</div>
        <div className="pb-loop-sub">full loop · {summary}</div>
      </div>

      <div className="pb-group">
        <div className="pb-title">Order</div>
        <Segmented<RotationOrder>
          ariaLabel="Order"
          value={draft.order}
          onChange={(order) => update({ order })}
          options={[
            { value: 'stage', label: 'By stage' },
            { value: 'downFirst', label: 'Down machines first' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </div>

      <div className="pb-rows">
        <div className="pb-row">
          <div>
            <div className="pb-row-title">Skip machines with no signal</div>
            <div className="pb-sub">Shown again when they reconnect</div>
          </div>
          <Toggle label="Skip machines with no signal" checked={draft.skipNoSignal} onChange={(skipNoSignal) => update({ skipNoSignal })} />
        </div>
        <div className="pb-row">
          <div>
            <div className="pb-row-title">Jump to a machine when it goes down</div>
            <div className="pb-sub">Shows it for one turn, then continues</div>
          </div>
          <Toggle label="Jump to a machine when it goes down" checked={draft.jumpToDown} onChange={(jumpToDown) => update({ jumpToDown })} />
        </div>
        <div className="pb-row">
          <div>
            <div className="pb-row-title">Full screen on first touch</div>
            <div className="pb-sub">Browsers need one click, tap or key press · F toggles</div>
          </div>
          <Toggle
            label="Full screen on first touch"
            checked={draft.autoFullscreen ?? true}
            onChange={(autoFullscreen) => update({ autoFullscreen })}
          />
        </div>
        <div className="pb-row">
          <div>
            <div className="pb-row-title">Colours</div>
            <div className="pb-sub">Auto: Night from 19:00 to 07:00</div>
          </div>
          <Segmented<ThemeSetting>
            ariaLabel="Colours"
            size="sm"
            value={draft.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'day', label: 'Day' },
              { value: 'night', label: 'Night' },
            ]}
          />
        </div>
        <div className="pb-row">
          <div>
            <div className="pb-row-title">Hide controls after</div>
            <div className="pb-sub">Controls show on mouse / touch movement</div>
          </div>
          <Segmented<HideDelayMs>
            ariaLabel="Hide controls after"
            size="sm"
            value={draft.hideControlsAfterMs}
            onChange={(hideControlsAfterMs) => update({ hideControlsAfterMs })}
            options={[
              { value: 2000, label: '2 s' },
              { value: 3000, label: '3 s' },
              { value: 5000, label: '5 s' },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
