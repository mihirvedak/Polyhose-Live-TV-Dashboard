import type { ReactNode } from 'react';
import { buildLayout } from '../../tv/lib/layout';
import type { Machine, MachineDetail, MachineLive, SectionKey } from '../../tv/types';
import { CurrentPirBlock } from './blocks/CurrentPirBlock';
import { DowntimeBlock } from './blocks/DowntimeBlock';
import { LastPirBlock } from './blocks/LastPirBlock';
import { OeeBlock } from './blocks/OeeBlock';
import { ParamsBlock } from './blocks/ParamsBlock';
import { TimelineBlock } from './blocks/TimelineBlock';

interface Props {
  machine: Machine;
  sections: SectionKey[];
  live: MachineLive | null;
  detail: MachineDetail | null;
  now: Date;
}

/** Body grid: enabled sections reflow through generated grid areas. */
export function MachineBody({ machine, sections, live, detail, now }: Props) {
  const layout = buildLayout(sections);

  const blocks: Record<SectionKey, () => ReactNode> = {
    oee: () => <OeeBlock machine={machine} live={live} detail={detail} now={now} />,
    currentPir: () => <CurrentPirBlock machine={machine} live={live} detail={detail} now={now} />,
    params: () => <ParamsBlock machine={machine} live={live} />,
    lastPir: () => <LastPirBlock detail={detail} />,
    timeline: () => <TimelineBlock live={live} detail={detail} now={now} />,
    downtime: () => <DowntimeBlock detail={detail} />,
  };

  return (
    <main
      className="tv-body"
      style={{ gridTemplateAreas: layout.areas, gridTemplateRows: layout.rows, gridTemplateColumns: layout.columns }}
    >
      {sections.map((key) => (
        <div key={key} className={`tv-area area-${key}`} style={{ gridArea: key }}>
          {blocks[key]()}
        </div>
      ))}
    </main>
  );
}
