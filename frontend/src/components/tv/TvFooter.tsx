import { hhmm } from '../../tv/lib/format';

interface Props {
  lastSuccess: number | null;
  stale: boolean;
  now: Date;
  progress: number;
  nextName: string | null;
  position: number;
  total: number;
}

export function TvFooter({ lastSuccess, stale, now, progress, nextName, position, total }: Props) {
  const ago = lastSuccess == null ? null : Math.max(0, Math.round((now.getTime() - lastSuccess) / 1000));

  return (
    <footer className="tv-footer">
      <div className={`tv-live${stale ? ' is-stale' : ''}`}>
        <span className="live-dot" />
        <b>Faclon Labs</b>
        <span className="muted">
          · I/O Sense OEE ·{' '}
          {stale
            ? `Data delayed · last update ${lastSuccess ? hhmm(new Date(lastSuccess)) : '—'}`
            : ago == null
              ? 'connecting…'
              : `live · updated ${ago} s ago`}
        </span>
      </div>
      <div className="tv-footer-progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="tv-footer-next">
        {nextName ? (
          <>
            <span className="muted">Next · </span>
            <b>{nextName}</b>
            <span className="muted">
              {' '}
              · {position} / {total}
            </span>
          </>
        ) : (
          <span className="muted">
            {position} / {total}
          </span>
        )}
      </div>
    </footer>
  );
}
