import { computeOee, oeeTone } from '../../../tv/lib/calc';
import { formatMetres, formatPct, hhmm } from '../../../tv/lib/format';
import type { Machine, MachineDetail, MachineLive, PeriodKey } from '../../../tv/types';
import { BlockLoading } from './BlockLoading';

const PERIOD_LABEL: Record<PeriodKey, string> = {
  current: 'Current shift',
  prev: 'Previous shift',
  yesterday: 'Yesterday',
  month: 'Current month',
};

interface Props {
  machine: Machine;
  live: MachineLive | null;
  detail: MachineDetail | null;
  now: Date;
}

export function OeeBlock({ machine, live, detail, now }: Props) {
  const noSignal = live?.status.status === 'noSignal';

  return (
    <section className="block card oee-block">
      <div className="block-head">
        <div className="card-label">OEE · {machine.name.replace(/_/g, ' ')}</div>
        <div className="legend">
          <span className="legend-item">
            <i className="swatch swatch-bad" />
            ≤40%
          </span>
          <span className="legend-item">
            <i className="swatch swatch-good" />
            ≥65% target
          </span>
        </div>
      </div>
      {!detail ? (
        <BlockLoading />
      ) : (
        <table className="oee-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>OEE</th>
              <th>A</th>
              <th>P</th>
              <th>Q</th>
              <th>Prod. m</th>
            </tr>
          </thead>
          <tbody>
            {detail.oee.map((row) => {
              const isCurrent = row.key === 'current';
              const blank = isCurrent && noSignal;
              const r = blank ? null : computeOee(row, machine.id);
              const sub =
                isCurrent && live
                  ? `Shift ${live.shift.name} · ${hhmm(live.shift.start)}–${hhmm(now)}`
                  : row.key === 'prev'
                    ? `${row.label} · ${row.sublabel}`
                    : row.sublabel;
              return (
                <tr key={row.key} className={isCurrent ? 'is-current' : undefined}>
                  <td>
                    <div className="oee-period">{PERIOD_LABEL[row.key]}</div>
                    <div className="oee-period-sub">{sub}</div>
                  </td>
                  <td className={`oee-main tone-${oeeTone(r?.oee)}`}>{formatPct(r?.oee)}</td>
                  <td className={`tone-${oeeTone(r?.availability)}`}>{formatPct(r?.availability)}</td>
                  <td>{formatPct(r?.performance)}</td>
                  <td>{formatPct(r?.quality)}</td>
                  <td className="num-right">{blank ? '—' : formatMetres(row.actualM)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
