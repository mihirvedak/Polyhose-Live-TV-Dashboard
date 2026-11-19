import { formatMetres, hhmm } from '../../../tv/lib/format';
import type { MachineDetail, MachineLive, SegmentKind } from '../../../tv/types';
import { BlockLoading } from './BlockLoading';

interface Props {
  live: MachineLive | null;
  detail: MachineDetail | null;
  now: Date;
}

const LEGEND: { kind: SegmentKind; label: string }[] = [
  { kind: 'production', label: 'Production' },
  { kind: 'downtime', label: 'Downtime' },
  { kind: 'changeover', label: 'Changeover' },
  { kind: 'noSignal', label: 'No signal' },
];

/** On target when the hour reaches 85% of its target. */
export const HOURLY_OK_RATIO = 0.85;

export function TimelineBlock({ live, detail, now }: Props) {
  if (!live || !detail) {
    return (
      <section className="block panel timeline-block">
        <div className="block-head">
          <div className="card-label">Shift timeline</div>
        </div>
        <BlockLoading />
      </section>
    );
  }

  const start = new Date(live.shift.start).getTime();
  const end = new Date(live.shift.end).getTime();
  const span = end - start;
  const pos = (t: number) => `${Math.min(100, Math.max(0, ((t - start) / span) * 100))}%`;
  const hours = Array.from({ length: Math.round(span / 3_600_000) + 1 }, (_, i) => start + i * 3_600_000);
  const nowT = now.getTime();

  return (
    <section className="block panel timeline-block">
      <div className="block-head">
        <div className="card-label">
          Shift {live.shift.name} timeline · {hhmm(live.shift.start)} → {hhmm(live.shift.end)}
        </div>
        <div className="legend">
          {LEGEND.map((l) => (
            <span key={l.kind} className="legend-item">
              <i className={`swatch seg-${l.kind}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="timeline">
        <div className="timeline-track">
          {detail.timeline.map((s) => {
            const a = new Date(s.start).getTime();
            const b = new Date(s.end).getTime();
            return (
              <div
                key={s.start}
                className={`timeline-seg seg-${s.kind}`}
                style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }}
              />
            );
          })}
          <div className="timeline-now" style={{ left: pos(nowT) }} />
        </div>
        <div className="timeline-hours">
          {hours.map((h) => (
            <span key={h} style={{ left: pos(h) }}>
              {hhmm(new Date(h))}
            </span>
          ))}
        </div>
      </div>

      <div className="hourly">
        {detail.hourly.map((h) => {
          const t = new Date(h.hourStart).getTime();
          const isNow = nowT >= t && nowT < t + 3_600_000;
          const ratio = h.metres == null || !h.target ? 0 : h.metres / h.target;
          // The running hour is judged against the elapsed part of its target
          const judged = isNow ? ratio / Math.max(0.05, (nowT - t) / 3_600_000) : ratio;
          const ok = judged >= HOURLY_OK_RATIO;
          return (
            <div key={h.hourStart} className="hourly-col">
              <div className="hourly-value">{h.metres == null ? '—' : `${formatMetres(h.metres)} m`}</div>
              <div className="hourly-box">
                {h.metres != null && (
                  <div className={`hourly-fill ${ok ? 'is-ok' : 'is-low'}`} style={{ height: `${Math.max(8, Math.min(1, ratio) * 100)}%` }} />
                )}
              </div>
              <div className="hourly-label">
                {hhmm(h.hourStart)}
                {isNow ? ' · now' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
