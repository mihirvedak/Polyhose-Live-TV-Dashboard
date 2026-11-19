import { STAGE_BY_KEY } from '../../tv/config/stages';
import { dayMonthYear, formatDuration, hhmm, minutesBetween, normaliseId } from '../../tv/lib/format';
import type { Machine, MachineLive, MachineStatusInfo } from '../../tv/types';
import { Wordmark } from '../common/Wordmark';
import { STATUS_CLASS } from '../common/status';

interface Props {
  machine: Machine;
  live: MachineLive | null;
  now: Date;
  isMock: boolean;
}

function statusPillText(s: MachineStatusInfo, now: Date): string {
  switch (s.status) {
    case 'running':
      return `Running · ${formatDuration(minutesBetween(s.since, now))}`;
    case 'down':
      return s.reason ? `Down · ${s.reason}` : 'Down';
    case 'changeover':
      if (!s.reason) return 'Changeover';
      return /changeover/i.test(s.reason) ? s.reason : `Changeover · ${s.reason}`;
    case 'noSignal':
      return 'No signal';
  }
}

export function TvHeader({ machine, live, now, isMock }: Props) {
  const stage = STAGE_BY_KEY[machine.stage];
  const status = live?.status;
  const opId = normaliseId(live?.operator.id);
  const shift = live?.shift;

  return (
    <header className="tv-header">
      <div className="tv-header-left">
        <Wordmark size={34} />
        <span className="tv-header-divider" />
        <div className="tv-machine">
          <div className="tv-machine-name" title={machine.name}>
            {machine.name}
          </div>
          <div className="tv-machine-stage">
            {stage.label} · stage {stage.index} of 6
          </div>
        </div>
        {status && (
          <div className={`status-pill status-pill-lg ${STATUS_CLASS[status.status]}`}>
            <span className="status-dot" />
            <span className="status-pill-text">{statusPillText(status, now)}</span>
          </div>
        )}
      </div>

      <div className="tv-header-people">
        <div className="tv-person">
          <div className="card-label">Operator</div>
          <div className="tv-person-name">{live?.operator.name ?? (opId ? `ID ${opId}` : '—')}</div>
          <div className="tv-person-sub">{live?.operator.name && opId ? `ID ${opId}` : ' '}</div>
        </div>
        <div className="tv-person">
          <div className="card-label">Supervisor</div>
          <div className="tv-person-name">{live?.supervisor.name ?? '—'}</div>
          <div className="tv-person-sub">
            {stage.label}
            {live?.supervisor.shift ? ` · Shift ${live.supervisor.shift}` : ''}
          </div>
        </div>
      </div>

      <div className="tv-header-right">
        {isMock && <span className="sample-badge">Sample data</span>}
        <div className="tv-clock">
          <div className="tv-clock-time">{hhmm(now)}</div>
          <div className="tv-clock-sub">
            {shift ? `Shift ${shift.name} · ` : ''}
            {dayMonthYear(now)}
          </div>
        </div>
      </div>
    </header>
  );
}
