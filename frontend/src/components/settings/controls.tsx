import { useEffect, useRef, type ReactNode } from 'react';

export type CheckState = boolean | 'mixed';

export function Checkbox({
  checked,
  onChange,
  disabled,
  label,
  title,
}: {
  checked: CheckState;
  onChange(next: boolean): void;
  disabled?: boolean;
  label?: ReactNode;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = checked === 'mixed';
  }, [checked]);
  const input = (
    <input
      ref={ref}
      type="checkbox"
      className="cbx"
      checked={checked === true}
      disabled={disabled}
      title={title}
      aria-checked={checked === 'mixed' ? 'mixed' : checked}
      onChange={() => onChange(checked !== true)}
    />
  );
  if (!label) return input;
  return (
    <label className={`cbx-label${disabled ? ' is-disabled' : ''}`} title={title}>
      {input}
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`seg-btn${value === o.value ? ' is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle-knob" />
    </button>
  );
}
