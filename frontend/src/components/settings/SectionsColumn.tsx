import { useState } from 'react';
import { ALL_SECTION_KEYS, SECTION_BY_KEY } from '../../tv/config/sections';
import type { SectionKey, TvProfile } from '../../tv/types';
import { IconGrip } from '../common/Icons';
import { Checkbox } from './controls';
import { moveItem } from './listUtils';
import { LayoutThumb } from './LayoutThumb';

interface Props {
  draft: TvProfile;
  update(patch: Partial<TvProfile>): void;
}

export function SectionsColumn({ draft, update }: Props) {
  // Full order including hidden sections, so unchecking keeps a row in place
  const [order, setOrder] = useState<SectionKey[]>(() => [
    ...draft.defaultSections,
    ...ALL_SECTION_KEYS.filter((k) => !draft.defaultSections.includes(k)),
  ]);
  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const enabled = new Set(draft.defaultSections);

  const commit = (nextOrder: SectionKey[], nextEnabled: Set<SectionKey>) => {
    setOrder(nextOrder);
    update({ defaultSections: nextOrder.filter((k) => nextEnabled.has(k)) });
  };

  const toggle = (k: SectionKey, on: boolean) => {
    const next = new Set(enabled);
    if (on) next.add(k);
    else next.delete(k);
    if (!next.size) return;
    commit(order, next);
  };

  const onDrop = (target: SectionKey) => {
    if (!dragKey) return;
    commit(moveItem(order, order.indexOf(dragKey), order.indexOf(target)), enabled);
    setDragKey(null);
  };

  return (
    <section className="set-col">
      <div className="set-col-head">
        <div className="card-label">2 · Sections on screen</div>
        <span className="set-col-note">Default for all machines</span>
      </div>

      <div className="sec-list">
        {order.map((k) => {
          const meta = SECTION_BY_KEY[k];
          const on = enabled.has(k);
          const last = on && enabled.size === 1;
          return (
            <div
              key={k}
              className={`sec-row${on ? '' : ' is-off'}${dragKey === k ? ' is-dragging' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(k)}
            >
              <span
                className="grip"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  setDragKey(k);
                }}
                onDragEnd={() => setDragKey(null)}
                title="Drag to reorder"
              >
                <IconGrip size={14} />
              </span>
              <Checkbox checked={on} disabled={last} onChange={(v) => toggle(k, v)} title={last ? 'At least one section must stay on' : undefined} />
              <div className="sec-text">
                <div className="sec-name">{meta.label}</div>
                <div className="sec-desc">{meta.description}</div>
              </div>
              <LayoutThumb highlight={k} className={on ? '' : 'is-off'} />
            </div>
          );
        })}
      </div>

      <div className="sec-preview">
        <div className="card-label">Preview · hidden sections give their space to the rest</div>
        <LayoutThumb sections={draft.defaultSections} labels />
      </div>
    </section>
  );
}
