import { useMemo, useState } from 'react';
import { SECTIONS } from '../../tv/config/sections';
import { STAGES } from '../../tv/config/stages';
import { clampSeconds, MAX_SECONDS, MIN_SECONDS } from '../../tv/lib/rotation';
import type { Machine, MachineStatusInfo, SectionKey, StageKey, TvProfile, TvProfileMachine } from '../../tv/types';
import { IconChevron, IconGrip } from '../common/Icons';
import { STATUS_CLASS, STATUS_WORD } from '../common/status';
import { Checkbox } from './controls';
import { moveItem, triState } from './listUtils';

interface Props {
  draft: TvProfile;
  update(patch: Partial<TvProfile> | ((p: TvProfile) => Partial<TvProfile>)): void;
  machines: Machine[];
  statuses: Record<string, MachineStatusInfo>;
}

export function MachinesColumn({ draft, update, machines, statuses }: Props) {
  const [query, setQuery] = useState('');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<StageKey>>(() => {
    const partial = STAGES.filter((s) => {
      const states = draft.machines.filter((e) => machines.find((m) => m.id === e.machineId)?.stage === s.key).map((e) => e.enabled);
      return triState(states) === 'mixed';
    }).map((s) => s.key);
    if (partial.length) return new Set(partial);
    const firstOn = STAGES.find((s) => draft.machines.some((e) => e.enabled && machines.find((m) => m.id === e.machineId)?.stage === s.key));
    return new Set(firstOn ? [firstOn.key] : []);
  });

  const byId = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);
  const entries = draft.machines.filter((e) => byId.has(e.machineId));
  const q = query.trim().toLowerCase();
  const matches = (m: Machine) =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || STAGES.find((s) => s.key === m.stage)!.label.toLowerCase().includes(q);

  const setEntries = (fn: (e: TvProfileMachine) => TvProfileMachine | null) =>
    update((p) => ({ machines: p.machines.map((e) => fn(e) ?? e) }));
  const setEnabled = (ids: Set<string>, enabled: boolean) => setEntries((e) => (ids.has(e.machineId) ? { ...e, enabled } : null));
  const patchEntry = (id: string, patch: Partial<TvProfileMachine>) => setEntries((e) => (e.machineId === id ? { ...e, ...patch } : null));

  const selected = entries.filter((e) => e.enabled).length;

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    update((p) => {
      const from = p.machines.findIndex((e) => e.machineId === dragId);
      const to = p.machines.findIndex((e) => e.machineId === targetId);
      return { machines: moveItem(p.machines, from, to), order: 'custom' };
    });
    setDragId(null);
  };

  const toggleExpanded = (k: StageKey) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <section className="set-col">
      <div className="set-col-head">
        <div className="card-label">1 · Machines on this TV</div>
      </div>
      <input
        className="set-search"
        type="search"
        placeholder="⌕ Search machine, stage or ID…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search machines"
      />
      <div className="set-toolbar">
        <Checkbox
          checked={triState(entries.map((e) => e.enabled))}
          onChange={(on) => setEnabled(new Set(entries.map((e) => e.machineId)), on)}
          label="Select all"
        />
        <button type="button" className="link" onClick={() => update((p) => ({ machines: p.machines.map((e) => ({ ...e, enabled: statuses[e.machineId]?.status === 'running' })) }))}>
          Only running
        </button>
        <button type="button" className="link" onClick={() => setEnabled(new Set(entries.map((e) => e.machineId)), false)}>
          Clear
        </button>
        <span className="set-hint">
          Drag <IconGrip size={13} /> to change order
        </span>
      </div>
      <div className="set-counter">
        <b>{selected}</b> of {entries.length} selected
      </div>

      <div className="set-groups">
        {STAGES.map((stage) => {
          const groupEntries = entries.filter((e) => byId.get(e.machineId)!.stage === stage.key);
          const visible = groupEntries.filter((e) => matches(byId.get(e.machineId)!));
          if (q && !visible.length) return null;
          const isOpen = q ? true : expanded.has(stage.key);
          const on = groupEntries.filter((e) => e.enabled).length;
          return (
            <div key={stage.key} className="set-group">
              <div className="set-group-head">
                <Checkbox
                  checked={triState(groupEntries.map((e) => e.enabled))}
                  onChange={(v) => setEnabled(new Set(groupEntries.map((e) => e.machineId)), v)}
                />
                <button type="button" className="set-group-toggle" onClick={() => toggleExpanded(stage.key)} aria-expanded={isOpen}>
                  <b>{stage.label}</b>
                  <span className="muted">{` · ${on} of ${groupEntries.length}`}</span>
                  <span className="set-group-chev">
                    <IconChevron open={isOpen} />
                  </span>
                </button>
              </div>
              {isOpen &&
                visible.map((e) => (
                  <MachineRow
                    key={e.machineId}
                    machine={byId.get(e.machineId)!}
                    entry={e}
                    profile={draft}
                    status={statuses[e.machineId]}
                    open={openPanel === e.machineId}
                    dragging={dragId === e.machineId}
                    onToggleOpen={() => setOpenPanel((id) => (id === e.machineId ? null : e.machineId))}
                    onEnabled={(v) => patchEntry(e.machineId, { enabled: v })}
                    onPatch={(patch) => patchEntry(e.machineId, patch)}
                    onDragStart={() => setDragId(e.machineId)}
                    onDragEnd={() => setDragId(null)}
                    onDrop={() => onDrop(e.machineId)}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface RowProps {
  machine: Machine;
  entry: TvProfileMachine;
  profile: TvProfile;
  status?: MachineStatusInfo;
  open: boolean;
  dragging: boolean;
  onToggleOpen(): void;
  onEnabled(v: boolean): void;
  onPatch(p: Partial<TvProfileMachine>): void;
  onDragStart(): void;
  onDragEnd(): void;
  onDrop(): void;
}

function MachineRow({ machine, entry, profile, status, open, dragging, onToggleOpen, onEnabled, onPatch, onDragStart, onDragEnd, onDrop }: RowProps) {
  const sections = entry.sections ?? profile.defaultSections;
  const custom = entry.sections != null;
  const chip = !entry.enabled ? 'Hidden' : custom ? `Custom · ${sections.length} of ${SECTIONS.length}` : 'All sections';
  const st = status?.status;

  const toggleSection = (k: SectionKey, on: boolean) => {
    const set = new Set(sections);
    if (on) set.add(k);
    else set.delete(k);
    const next = SECTIONS.map((s) => s.key).filter((key) => set.has(key));
    const same = next.length === profile.defaultSections.length && next.every((x) => profile.defaultSections.includes(x));
    onPatch({ sections: same ? undefined : next });
  };

  return (
    <>
      <div
        className={`set-row${dragging ? ' is-dragging' : ''}${open ? ' is-open' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <span
          className="grip"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          title="Drag to change order"
        >
          <IconGrip size={14} />
        </span>
        <Checkbox checked={entry.enabled} onChange={onEnabled} />
        <span className={`set-row-name ${st ? STATUS_CLASS[st] : ''}`}>
          <span className="status-dot" />
          <span className="set-row-label">{machine.name}</span>
        </span>
        <span className={`set-row-state state-${st ?? 'unknown'}`}>{st ? STATUS_WORD[st] : '—'}</span>
        <button type="button" className={`set-chip${custom && entry.enabled ? ' is-custom' : ''}`} onClick={onToggleOpen} aria-expanded={open}>
          {chip}
          {entry.seconds ? ` · ${entry.seconds} s` : ''}
          <span className="set-chip-caret">{open ? '▴' : '▾'}</span>
        </button>
      </div>
      {open && (
        <div className="set-row-panel">
          <div className="set-row-sections">
            {SECTIONS.map((s) => (
              <Checkbox
                key={s.key}
                checked={sections.includes(s.key)}
                onChange={(v) => toggleSection(s.key, v)}
                label={s.short === 'Live parameters' ? 'Live parameters' : s.label.replace(' & next in queue', '').replace(' & hourly output', '').replace(' this shift', '')}
              />
            ))}
          </div>
          <SecondsOverride value={entry.seconds} fallback={profile.secondsPerMachine} onChange={(v) => onPatch({ seconds: v })} />
          {(custom || entry.seconds) && (
            <button type="button" className="link" onClick={() => onPatch({ sections: undefined, seconds: undefined })}>
              Use defaults
            </button>
          )}
        </div>
      )}
    </>
  );
}

function SecondsOverride({ value, fallback, onChange }: { value?: number; fallback: number; onChange(v: number | undefined): void }) {
  const [text, setText] = useState(value ? String(value) : '');
  const n = Number(text);
  const invalid = text !== '' && (!Number.isInteger(n) || n < MIN_SECONDS || n > MAX_SECONDS);

  return (
    <label className="set-row-seconds">
      <input
        type="number"
        min={MIN_SECONDS}
        max={MAX_SECONDS}
        placeholder={String(fallback)}
        value={text}
        aria-invalid={invalid}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const v = Number(t);
          if (t === '') onChange(undefined);
          else if (Number.isInteger(v) && v >= MIN_SECONDS && v <= MAX_SECONDS) onChange(clampSeconds(v));
        }}
      />
      <span className="muted">s on this machine{text === '' ? ` (default ${fallback} s)` : ''}</span>
      {invalid && <span className="field-error">5–300 s</span>}
    </label>
  );
}
