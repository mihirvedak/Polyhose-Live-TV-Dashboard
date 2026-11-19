import { describe, expect, it } from 'vitest';
import { buildLayout, resolveTheme } from '../../tv/lib/layout';

const rowsOf = (areas: string) => areas.match(/"[^"]+"/g)!.map((r) => r.slice(1, -1).split(' '));

describe('buildLayout', () => {
  it('matches the reference layout with all six sections', () => {
    const rows = rowsOf(buildLayout(['oee', 'currentPir', 'params', 'lastPir', 'timeline', 'downtime']).areas);
    expect(rows).toHaveLength(3);
    expect(rows[0].filter((c) => c === 'oee')).toHaveLength(5);
    expect(rows[1].filter((c) => c === 'params')).toHaveLength(8);
    expect(rows[2].filter((c) => c === 'timeline')).toHaveLength(8);
  });

  it('gives hidden sections’ space to the rest: no empty cells', () => {
    const rows = rowsOf(buildLayout(['oee', 'currentPir', 'params', 'lastPir', 'timeline']).areas);
    expect(rows[2]).toEqual(Array(12).fill('timeline'));
    for (const row of rows) expect(row).toHaveLength(12);
  });

  it('a single section fills the screen', () => {
    const l = buildLayout(['params']);
    expect(rowsOf(l.areas)).toEqual([Array(12).fill('params')]);
    expect(l.rows).toBe('minmax(0, 1fr)');
  });
});

describe('resolveTheme', () => {
  it('auto is night from 19:00 to 07:00', () => {
    expect(resolveTheme('auto', new Date('2026-11-17T19:00:00'))).toBe('night');
    expect(resolveTheme('auto', new Date('2026-11-17T06:59:00'))).toBe('night');
    expect(resolveTheme('auto', new Date('2026-11-17T07:00:00'))).toBe('day');
    expect(resolveTheme('night', new Date('2026-11-17T12:00:00'))).toBe('night');
  });
});
