interface SparklineProps {
  values: (number | null)[];
  /** Limit band; omitted for counters and states */
  lo?: number;
  hi?: number;
  width?: number;
  height?: number;
  tone?: 'brand' | 'warn' | 'muted';
  /** Draw as steps (on/off signals) */
  step?: boolean;
}

/** 60-minute trend with the limit band shaded. Gaps (null) break the line. */
export function Sparkline({ values, lo, hi, width = 92, height = 36, tone = 'brand', step = false }: SparklineProps) {
  const nums = values.filter((v): v is number => v != null);
  const pad = 3;
  if (!nums.length) {
    return <svg className="sparkline" width={width} height={height} aria-hidden="true" />;
  }
  const hasBand = lo != null && hi != null && hi > lo;
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (hasBand) {
    const bandPad = (hi - lo) * 0.6;
    min = Math.min(lo - bandPad, min);
    max = Math.max(hi + bandPad, max);
  }
  if (max === min) {
    min -= 1;
    max += 1;
  }
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / (max - min));
  const x = (i: number) => pad + ((width - pad * 2) * i) / Math.max(1, values.length - 1);

  let d = '';
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (v == null) {
      prev = null;
      return;
    }
    if (prev == null) d += `M${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    else if (step) d += `H${x(i).toFixed(1)}V${y(v).toFixed(1)}`;
    else d += `L${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    prev = v;
  });

  const lastIdx = values.map((v) => v != null).lastIndexOf(true);
  const last = values[lastIdx];

  return (
    <svg className={`sparkline tone-${tone}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {hasBand && <rect className="sparkline-band" x={0} y={y(hi)} width={width} height={Math.max(1, y(lo) - y(hi))} rx={2} />}
      <path className="sparkline-line" d={d} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last != null && <circle className="sparkline-dot" cx={x(lastIdx)} cy={y(last)} r={3} />}
    </svg>
  );
}
