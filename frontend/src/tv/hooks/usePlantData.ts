import { useEffect, useState } from 'react';
import { tvDataSource } from '../../services/tvDataSource';
import type { Machine, MachineStatusInfo } from '../types';

let machinesPromise: Promise<Machine[]> | null = null;

function loadMachines(): Promise<Machine[]> {
  if (!machinesPromise) {
    machinesPromise = tvDataSource.listMachines().catch((e) => {
      machinesPromise = null;
      throw e;
    });
  }
  return machinesPromise;
}

export function useMachines(): { machines: Machine[] | null; error: string | null } {
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const list = await loadMachines();
        if (!cancelled) {
          setMachines(list);
          setError(null);
        }
      } catch (e) {
        console.error('[TV] machine list failed', e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load machines');
          retry = setTimeout(load, 10_000);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, []);

  return { machines, error };
}

/** Status of every machine, polled every `intervalMs`. Keeps the last good map on failure. */
export function useStatuses(intervalMs = 5000): Record<string, MachineStatusInfo> {
  const [statuses, setStatuses] = useState<Record<string, MachineStatusInfo>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await tvDataSource.getStatuses();
        if (!cancelled) setStatuses(Object.fromEntries(list.map((s) => [s.machineId, s])));
      } catch (e) {
        console.error('[TV] status refresh failed', e);
      }
    };
    void load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return statuses;
}
