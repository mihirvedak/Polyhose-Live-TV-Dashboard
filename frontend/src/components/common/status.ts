import type { MachineStatus } from '../../tv/types';

/** A status colour is always shown with its word. */
export const STATUS_WORD: Record<MachineStatus, string> = {
  running: 'Running',
  down: 'Down',
  changeover: 'Changeover',
  noSignal: 'No signal',
};

export const STATUS_CLASS: Record<MachineStatus, string> = {
  running: 'is-running',
  down: 'is-down',
  changeover: 'is-changeover',
  noSignal: 'is-nosignal',
};
