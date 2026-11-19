import { hhmm } from '../../../tv/lib/format';
import type { MachineDetail } from '../../../tv/types';
import { BlockLoading } from './BlockLoading';

export function DowntimeBlock({ detail }: { detail: MachineDetail | null }) {
  const d = detail?.downtime;

  return (
    <section className="block panel downtime-block">
      <div className="block-head">
        <div className="card-label">Downtime this shift</div>
      </div>
      {!d ? (
        <BlockLoading />
      ) : (
        <>
          <div className="dt-figures">
            <div>
              <div className="dt-value">{d.stops}</div>
              <div className="dt-label">stops</div>
            </div>
            <div>
              <div className="dt-value">
                {d.minutesLost} <span className="dt-unit">min</span>
              </div>
              <div className="dt-label">lost</div>
            </div>
            <div>
              <div className="dt-value">{d.changeovers}</div>
              <div className="dt-label">changeovers</div>
            </div>
          </div>
          {d.latest.length ? (
            <ul className="dt-list">
              {d.latest.map((s) => (
                <li key={s.start}>
                  <span className="dt-time">{hhmm(s.start)}</span>
                  <span className={`dt-reason ${s.kind === 'changeover' ? 'tone-warn' : 'tone-bad'}`}>{s.reason}</span>
                  <span className="dt-dur">{s.durationMin} min</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="block-empty">No stops this shift</div>
          )}
        </>
      )}
    </section>
  );
}
