import { ALL_SECTION_KEYS, SECTION_BY_KEY } from '../../tv/config/sections';
import { buildLayout } from '../../tv/lib/layout';
import type { SectionKey } from '../../tv/types';

/** Mini machine-screen layout. `highlight` marks one block; `labels` names each block. */
export function LayoutThumb({
  sections = ALL_SECTION_KEYS,
  highlight,
  labels = false,
  className = '',
}: {
  sections?: SectionKey[];
  highlight?: SectionKey;
  labels?: boolean;
  className?: string;
}) {
  const layout = buildLayout(sections);
  return (
    <div className={`layout-thumb ${labels ? 'is-large' : ''} ${className}`} aria-hidden={!labels}>
      <div className="layout-thumb-header" />
      <div
        className="layout-thumb-grid"
        style={{ gridTemplateAreas: layout.areas, gridTemplateRows: layout.rows, gridTemplateColumns: layout.columns }}
      >
        {sections.map((k) => (
          <div key={k} className={`layout-thumb-cell${k === highlight ? ' is-hl' : ''}`} style={{ gridArea: k }}>
            {labels ? SECTION_BY_KEY[k].short : null}
          </div>
        ))}
      </div>
    </div>
  );
}
