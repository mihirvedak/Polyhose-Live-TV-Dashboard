import { useEffect, useRef, useState } from 'react';
import { tvDataSource } from '../../services/tvDataSource';
import type { MachineDetail, MachineLive } from '../types';

export const LIVE_REFRESH_MS = 5_000;
export const DETAIL_REFRESH_MS = 30_000;
export const STALE_AFTER_MS = 120_000;

export interface MachineData {
  live: MachineLive | null;
  detail: MachineDetail | null;
  /** Clock time of the last successful refresh of either feed */
  lastSuccess: number | null;
  failing: boolean;
}

interface CacheEntry {
  live: MachineLive | null;
  detail: MachineDetail | null;
  lastSuccess: number | null;
}

/**
 * Live data for the machine on screen: parameters and status every 5 s,
 * OEE / PIR data every 30 s. Last good values per machine are kept, so a
 * failed refresh never blanks the screen.
 */
export function useMachineData(machineId: string | null): MachineData {
  const cache = useRef(new Map<string, CacheEntry>());
  const [data, setData] = useState<MachineData>({ live: null, detail: null, lastSuccess: null, failing: false });

  useEffect(() => {
    if (!machineId) {
      setData({ live: null, detail: null, lastSuccess: null, failing: false });
      return;
    }
    let cancelled = false;
    const entry = cache.current.get(machineId) ?? { live: null, detail: null, lastSuccess: null };
    cache.current.set(machineId, entry);
    setData({ ...entry, failing: false });

    const publish = (failing: boolean) => {
      if (!cancelled) setData({ ...entry, failing });
    };

    const loadLive = async () => {
      try {
        entry.live = await tvDataSource.getLive(machineId);
        entry.lastSuccess = Date.now();
        publish(false);
      } catch (e) {
        console.error(`[TV] live refresh failed for ${machineId}`, e);
        publish(true);
      }
    };
    const loadDetail = async () => {
      try {
        entry.detail = await tvDataSource.getDetail(machineId);
        entry.lastSuccess = Date.now();
        publish(false);
      } catch (e) {
        console.error(`[TV] detail refresh failed for ${machineId}`, e);
        publish(true);
      }
    };

    void loadLive();
    // Detail is reused while fresh so quick rotation does not hammer the API
    const detailAge = entry.detail ? Date.now() - new Date(entry.detail.fetchedAt).getTime() : Infinity;
    if (detailAge > DETAIL_REFRESH_MS / 2) void loadDetail();

    const liveId = setInterval(loadLive, LIVE_REFRESH_MS);
    const detailId = setInterval(loadDetail, DETAIL_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(liveId);
      clearInterval(detailId);
    };
  }, [machineId]);

  return data;
}

export function isStale(data: MachineData, now: number): boolean {
  if (data.failing) return true;
  return data.lastSuccess != null && now - data.lastSuccess > STALE_AFTER_MS;
}
