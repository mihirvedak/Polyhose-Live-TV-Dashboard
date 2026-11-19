import { limitsFor, PARAMS_BY_STAGE, setTagFor, tagFor, type ParamConfig } from '../../../tv/config/parameters';
import { STAGE_BY_KEY } from '../../../tv/config/stages';
import { formatNumber, formatPct } from '../../../tv/lib/format';
import type { Machine, MachineLive, ParamReading } from '../../../tv/types';
import { Sparkline } from '../../common/Sparkline';
import { BlockLoading } from './BlockLoading';

interface Props {
  machine: Machine;
  live: MachineLive | null;
}

type TileState = 'ok' | 'high' | 'low' | 'live' | 'running' | 'stopped' | 'fault' | 'noFault' | 'notConnected';

const CHIP_TEXT: Record<TileState, string> = {
  ok: 'In limit',
  high: 'High',
  low: 'Low',
  live: 'Live',
  running: 'Running',
  stopped: 'Stopped',
  fault: 'Fault',
  noFault: 'No fault',
  notConnected: 'Not connected',
};

function tileState(p: ParamConfig, reading: ParamReading | undefined, limits: { lo: number; hi: number } | null, running: boolean): TileState {
  if (!reading) return 'notConnected';
  if (reading.value == null) return 'stopped';
  if (p.kind === 'state') return reading.value > 0 ? 'running' : 'stopped';
  if (p.kind === 'fault') return reading.value !== 0 ? 'fault' : 'noFault';
  if (!running) return 'stopped';
  if (p.kind === 'counter' || !limits) return 'live';
  if (reading.value > limits.hi) return 'high';
  if (reading.value < limits.lo) return 'low';
  return 'ok';
}

export function ParamsBlock({ machine, live }: Props) {
  const params = PARAMS_BY_STAGE[machine.stage];
  const running = live?.status.status === 'running';

  return (
    <section className="block panel params-block">
      <div className="block-head">
        <div className="card-label">Live process parameters · {STAGE_BY_KEY[machine.stage].label}</div>
        <div className="legend">
          <span className="legend-item">
            <i className="swatch swatch-band" />
            band = set ± tolerance
          </span>
          <span className="legend-item">last 60 min</span>
        </div>
      </div>
      {!live ? (
        <BlockLoading />
      ) : (
        <div className="params-grid">
          {params.map((p) => {
            const tag = tagFor(machine.id, p);
            const setTag = setTagFor(machine.id, p);
            const reading = tag ? live.params[tag] : undefined;
            const setPoint = setTag ? (live.params[setTag]?.value ?? null) : null;
            const limits = limitsFor(p, setPoint);
            return (
              <ParamTile
                key={p.key}
                param={p}
                reading={reading}
                setPoint={setPoint}
                limits={limits}
                state={tileState(p, reading, limits, running)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

interface TileProps {
  param: ParamConfig;
  reading?: ParamReading;
  setPoint: number | null;
  limits: { lo: number; hi: number } | null;
  state: TileState;
}

function ParamTile({ param, reading, setPoint, limits, state }: TileProps) {
  const alert = state === 'high' || state === 'low' || state === 'fault';
  const value = reading?.value ?? null;
  const tone = alert ? 'warn' : state === 'stopped' ? 'muted' : 'brand';

  let main = formatNumber(value, param.decimals);
  let lines: [string, string] = [' ', ' '];
  if (param.kind === 'measure') {
    lines = [
      `Set ${param.setTag ? formatNumber(setPoint, param.decimals) : '—'}`,
      limits ? `${formatNumber(limits.lo, param.decimals)}–${formatNumber(limits.hi, param.decimals)}` : ' ',
    ];
  } else if (param.kind === 'counter' && param.setTag) {
    lines = [`Set ${formatNumber(setPoint, 0)}`, setPoint && value != null ? `${formatPct(value / setPoint)} of set` : ' '];
  } else if (param.kind === 'state') {
    main = value == null ? '—' : value > 0 ? 'Running' : 'Stopped';
  } else if (param.kind === 'fault') {
    lines = [value ? 'Active fault' : 'No active fault', ' '];
  }

  return (
    <div className={`param-tile state-${state}`}>
      <div className="param-head">
        <span className="param-name">{param.label}</span>
        <span className={`chip chip-${state}`}>{CHIP_TEXT[state]}</span>
      </div>
      {state === 'notConnected' ? (
        <div className="param-nc">Tag not mapped for this machine</div>
      ) : (
        <div className="param-body">
          <div className="param-values">
            <div className={`param-value${param.kind === 'state' ? ' param-value-word' : ''}`}>
              {main}
              {param.unit && <span className="param-unit">{param.unit}</span>}
            </div>
            <div className="param-limits">
              <div>{lines[0]}</div>
              <div>{lines[1]}</div>
            </div>
          </div>
          {param.kind !== 'fault' && (
            <Sparkline values={reading?.history ?? []} lo={limits?.lo} hi={limits?.hi} tone={tone} step={param.kind === 'state'} />
          )}
        </div>
      )}
    </div>
  );
}
