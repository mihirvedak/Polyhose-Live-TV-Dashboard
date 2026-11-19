import { oeeTone } from '../../../tv/lib/calc';
import { dayMonthTime, formatDuration, formatMetres, formatNumber, formatPct, normaliseId } from '../../../tv/lib/format';
import type { MachineDetail } from '../../../tv/types';
import { BlockLoading } from './BlockLoading';

export function LastPirBlock({ detail }: { detail: MachineDetail | null }) {
  const last = detail?.lastPir;
  const next = detail?.nextInQueue;

  return (
    <section className="block panel lastpir-block">
      <div className="block-head">
        <div className="card-label">Last PIR on this machine</div>
      </div>
      {!detail ? (
        <BlockLoading />
      ) : !last ? (
        <div className="block-empty">No earlier PIR on this machine</div>
      ) : (
        <>
          <div className="lastpir-title">
            <span className="lastpir-number">{last.pir}</span>
            <span className="lastpir-size">{last.hoseSize}</span>
          </div>
          <dl className="kv">
            <dt>Produced / plan</dt>
            <dd>
              {formatMetres(last.producedM)} / {last.planM == null ? '—' : formatMetres(last.planM)} m
              {last.planM ? ` · ${formatPct(last.producedM / last.planM)}` : ''}
            </dd>
            <dt>Ran</dt>
            <dd>
              {dayMonthTime(last.from)} → {dayMonthTime(last.to)}
            </dd>
            <dt>Run time · downtime</dt>
            <dd>
              {formatDuration(last.runMin)} · <span className="muted">{formatDuration(last.downMin)}</span>
            </dd>
            <dt>OEE · avg speed</dt>
            <dd>
              <span className={`tone-${oeeTone(last.oee)}`}>{formatPct(last.oee)}</span> · {formatNumber(last.avgSpeed, 1)} m/min
            </dd>
            <dt>Operator</dt>
            <dd>{last.operator.name ?? (normaliseId(last.operator.id) ? `ID ${normaliseId(last.operator.id)}` : '—')}</dd>
          </dl>
        </>
      )}
      {detail && (
        <div className="queue">
          <span className="muted">Next in queue</span>
          <b>{next ? `${next.pir} · ${next.hoseSize} · ${next.planM == null ? 'plan missing' : `${formatMetres(next.planM)} m`}` : 'Nothing queued'}</b>
        </div>
      )}
    </section>
  );
}
