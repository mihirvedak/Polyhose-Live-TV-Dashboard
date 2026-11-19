import { STAGES } from '../../../tv/config/stages';
import { computeEta, remainingMetres } from '../../../tv/lib/calc';
import { dayMonth, dayMonthTime, formatMetres, formatNumber, hhmm } from '../../../tv/lib/format';
import type { Machine, MachineDetail, MachineLive, StageProgress } from '../../../tv/types';
import { STATUS_CLASS, STATUS_WORD } from '../../common/status';
import { BlockLoading } from './BlockLoading';

interface Props {
  machine: Machine;
  live: MachineLive | null;
  detail: MachineDetail | null;
  now: Date;
}

export function CurrentPirBlock({ machine, live, detail, now }: Props) {
  const status = live?.status;
  const pir = detail?.currentPir;

  return (
    <section className="block panel pir-block">
      <div className="block-head">
        <div className="card-label brand">Current PIR</div>
        {status && (
          <span className={`chip chip-strong ${STATUS_CLASS[status.status]}`}>{STATUS_WORD[status.status]}</span>
        )}
      </div>
      {!detail || !live ? (
        <BlockLoading />
      ) : !pir ? (
        <div className="block-empty">
          {status?.status === 'noSignal'
            ? `No PIR running · no signal since ${hhmm(status.since)}`
            : 'No PIR running on this machine · last PIR shown alongside'}
        </div>
      ) : (
        <PirBody machine={machine} live={live} detail={detail} now={now} />
      )}
    </section>
  );
}

function PirBody({ machine, live, detail, now }: Required<Props> & { live: MachineLive; detail: MachineDetail }) {
  const pir = detail.currentPir!;
  const status = live.status.status;
  const remaining = remainingMetres(pir.planM, pir.producedHereM);
  const eta = computeEta(now, pir.planM, pir.producedHereM, live.lineSpeed, status);
  const pct = pir.planM ? Math.min(1, pir.producedHereM / pir.planM) : 0;

  return (
    <>
      <div className="pir-top">
        <div className="pir-number">{pir.pir}</div>
        <div className="pir-meta">
          <div className="pir-size">
            {pir.hoseSize} · MPIR <span className="mono">{pir.mpir}</span>
          </div>
          <div className="pir-dates">
            <span className="nowrap">Due {dayMonth(pir.dueDate)}</span> · <span className="nowrap">started {dayMonthTime(pir.startedAt)}</span>
          </div>
        </div>
        <div className="pir-figures">
          <Figure label="Plan" value={pir.planM == null ? '—' : formatMetres(pir.planM)} />
          <Figure label="Produced here" value={formatMetres(pir.producedHereM)} />
          {remaining == null ? (
            <Figure label="Remaining · ETA" value="Plan missing" tone="warn" wide />
          ) : (
            <>
              <Figure label="Remaining" value={formatMetres(remaining)} tone="warn" />
              <Figure
                label="ETA"
                value={eta.kind === 'time' ? hhmm(eta.at) : eta.kind === 'done' ? 'Done' : 'Stopped'}
                tone={eta.kind === 'stopped' ? 'bad' : undefined}
                small={eta.kind === 'stopped'}
              />
            </>
          )}
        </div>
      </div>

      <div className="progress pir-progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>

      <div className="pir-info">
        <span>
          Line speed now <b>{formatNumber(live.lineSpeed, 1)} m/min</b>
        </span>
        <span>
          Avg this PIR <b>{formatNumber(pir.avgSpeed, 1)} m/min</b>
        </span>
        <span className="muted pir-info-hint">metres · stage-wise for this PIR ↓</span>
      </div>

      <div className="stage-strip">
        {STAGES.map((s) => {
          const prog = pir.stages.find((p) => p.stage === s.key);
          return <StageCard key={s.key} label={s.short} progress={prog} isHere={s.key === machine.stage} />;
        })}
      </div>
    </>
  );
}

function Figure({
  label,
  value,
  tone,
  small,
  wide,
}: {
  label: string;
  value: string;
  tone?: 'warn' | 'bad';
  small?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`figure${wide ? ' figure-wide' : ''}`}>
      <div className="figure-label">{label}</div>
      <div className={`figure-value${tone ? ` tone-${tone}` : ''}${small ? ' figure-value-sm' : ''}`}>{value}</div>
    </div>
  );
}

function StageCard({ label, progress, isHere }: { label: string; progress?: StageProgress; isHere: boolean }) {
  const done = progress?.doneM ?? 0;
  const plan = progress?.planM ?? null;
  const complete = plan != null && done >= plan;
  const pct = plan ? Math.min(1, done / plan) : 0;
  const kind = complete ? 'complete' : isHere ? 'here' : progress?.partLot ? 'partlot' : 'idle';
  const left = plan != null ? Math.max(0, plan - done) : null;

  return (
    <div className={`stage-card${isHere ? ' is-here' : ''}`}>
      <div className="stage-card-label">{label}</div>
      <div className="stage-card-qty">
        <b>{formatMetres(done)}</b>
        <span className="muted"> / {plan == null ? '—' : formatMetres(plan)}</span>
      </div>
      <div className="stage-bar">
        <div className={`stage-bar-fill fill-${kind}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={`stage-card-foot foot-${kind}`}>
        {complete ? '✓ done' : left == null ? 'plan missing' : `${formatMetres(left)} left`}
      </div>
    </div>
  );
}
