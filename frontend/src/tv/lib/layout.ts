import { SECTION_BY_KEY } from '../config/sections';
import type { SectionKey, ThemeSetting } from '../types';

export interface GridLayout {
  areas: string;
  rows: string;
  columns: string;
}

const COLS = 12;

/**
 * Ordered sections → CSS grid areas on a 12-column grid. Sections are paired
 * two per row; widths follow each section's weight. A lone section takes the
 * full row, so hidden sections never leave a hole.
 */
export function buildLayout(sections: SectionKey[]): GridLayout {
  const rows: SectionKey[][] = [];
  for (let i = 0; i < sections.length; i += 2) rows.push(sections.slice(i, i + 2));

  const areaRows = rows.map((row) => {
    if (row.length === 1) return Array(COLS).fill(row[0]).join(' ');
    const [a, b] = row;
    const wa = SECTION_BY_KEY[a].width;
    const wb = SECTION_BY_KEY[b].width;
    const spanA = Math.min(COLS - 3, Math.max(3, Math.round((COLS * wa) / (wa + wb))));
    return [...Array(spanA).fill(a), ...Array(COLS - spanA).fill(b)].join(' ');
  });

  const heights = rows.map((row) => Math.max(...row.map((k) => SECTION_BY_KEY[k].height)));

  return {
    areas: areaRows.map((r) => `"${r}"`).join(' '),
    rows: heights.map((h) => `minmax(0, ${h}fr)`).join(' '),
    columns: `repeat(${COLS}, minmax(0, 1fr))`,
  };
}

/** Auto: Night from 19:00 to 07:00 */
export function resolveTheme(setting: ThemeSetting, now: Date): 'day' | 'night' {
  if (setting !== 'auto') return setting;
  const h = now.getHours();
  return h >= 19 || h < 7 ? 'night' : 'day';
}
