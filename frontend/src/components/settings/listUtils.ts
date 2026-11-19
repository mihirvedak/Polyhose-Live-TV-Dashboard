import type { CheckState } from './controls';

export function triState(values: boolean[]): CheckState {
  if (!values.length) return false;
  const on = values.filter(Boolean).length;
  return on === 0 ? false : on === values.length ? true : 'mixed';
}

/** Move `from` to the position of `to` in a list. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
