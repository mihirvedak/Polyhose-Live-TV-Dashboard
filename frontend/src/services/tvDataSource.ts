import type { Machine, MachineDetail, MachineLive, MachineStatusInfo, TvProfile } from '../tv/types';
import { createMockTvDataSource } from './mockTvDataSource';

/**
 * Everything the TV screen and Settings need, behind one typed adapter so the
 * mock and the real IOsense APIs can be swapped without touching components.
 * See iosense.md for how each method maps to platform APIs.
 */
export interface TvDataSource {
  readonly kind: 'mock' | 'iosense';
  listMachines(): Promise<Machine[]>;
  /** Status for every machine (Settings list, skip / jump-to-down) */
  getStatuses(): Promise<MachineStatusInfo[]>;
  /** Status, people and process parameters · refreshed every 5 s */
  getLive(machineId: string): Promise<MachineLive>;
  /** OEE, PIRs, timeline, hourly output, downtime · refreshed every 30 s */
  getDetail(machineId: string): Promise<MachineDetail>;
  listProfiles(): Promise<TvProfile[]>;
  saveProfile(profile: TvProfile): Promise<TvProfile>;
  deleteProfile(id: string): Promise<void>;
}

// The IOsense adapter is not wired yet; every data source runs on the mock.
export const tvDataSource: TvDataSource = createMockTvDataSource();
