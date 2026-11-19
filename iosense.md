# IOsense API tracking · Polyhose Machine TV

All TV data goes through one typed adapter, `TvDataSource`
(`frontend/src/services/tvDataSource.ts`). **Today every method runs on the
mock adapter** (`mockTvDataSource.ts`, sample data, "SAMPLE DATA" badge on
screen). No IOsense functionIDs are called yet.

When an IOsense call is wired in, add its functionID / resource ID to the
table below and flip the status.

| Adapter method | Needed for | IOsense source (planned) | functionID / resource ID | Status |
|---|---|---|---|---|
| `listMachines()` | Machine list, stage per machine | Assets / devices (influx) for the 34 machines | — | Mock |
| `getStatuses()` | Settings live state, skip no-signal, jump-to-down | OEE event table (Timeline): Machine status, Event start, Downtime Reason, Disconnect | — | Mock |
| `getLive(id)` · status, people | Header pill, operator, supervisor | OEE event table: Machine status, Operator ID (float → string), shift; Operator master; supervisor roster | — | Mock |
| `getLive(id)` · params | Block 3 parameter tiles + 60 min sparklines | Device (influx) tags per machine, mapped in `tv/config/parameters.ts` (see below) | — | Mock |
| `getDetail(id)` · `oee` | Block 1 OEE / A / P / Q / production | Existing OEE calculation (Source tab): prod time, planned time, actual m, ideal m/min, good m, total m per period | — | Mock |
| `getDetail(id)` · `currentPir`, `lastPir`, `nextInQueue` | Blocks 2 and 4 | Stage Link mapping (PIR ↔ MPIR, PIR ↔ machine per stage) + PIR master (plan, hose size, due date) | — | Mock |
| `getDetail(id)` · `timeline`, `hourly`, `downtime` | Blocks 5 and 6 | OEE event table: events, durations, reasons; ideal speed × hose size table for hourly target | — | Mock |
| `listProfiles()` / `saveProfile()` / `deleteProfile()` | TV profiles (Settings) | Settings store per TV profile (API to be chosen) · cached in `localStorage` | — | Mock (`localStorage`) |

## Live parameter tags (Block 3)

Taken from the machine's I/O Sense device tabs. Sensor ids are still placeholders in
`frontend/src/tv/config/parameters.ts` and must be replaced with the real ids.

| Device tab | Tag (placeholder) | Used as |
|---|---|---|
| Speed | `ACTUAL_LINE_SPEED` (mpm) · `STANDARD_SPEED` | Line speed tile; Standard Speed is the live set point (±10% band); also feeds ETA |
| Speed | `ACTUAL_RPM` · `SET_RPM` | Machine speed tile; Set RPM is the live set point (±5% band) |
| Length | `ACTUAL_LENGTH` · `SET_LENGTH` | Length tile, % of set length |
| Dia | not confirmed | Dia tile shows "Not connected" until mapped |
| Drum | `DRUM_IN` · `DRUM_OUT` | Drum in / Drum out tiles |
| Run Status | `RUN_STATUS` (1 / 0) | Run status tile |
| PIR Details | `FAULT_CODE` | Fault code tile (0 = no fault) |
| PIR Details | `PIR_NUMBER` · `OPERATOR_ID` · `SUPERVISOR_ID` | Current PIR number and header operator / supervisor IDs |

Tolerances (±10% line speed, ±5% RPM) are placeholders to confirm with Polyhose.

## Notes for wiring

- Login comes first: get the access token, keep it in session storage, and pass it to the adapter.
  Credentials go in `.env` (see `.env.example`), never in code.
- Operator IDs arrive as floats (`201476.0`): use `normaliseId()` from `tv/lib/format.ts`.
- Performance above 100% is capped in `tv/lib/calc.ts` and logged as a warning (ideal rates set too low).
- Metres everywhere, Indian digit grouping (`formatMetres`).
