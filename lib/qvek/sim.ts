"use client";

/*
 * Locally *simulated* admin actions.
 *
 * A few things in the admin UI have no backend endpoint yet (immobilize / unlock, vehicle status overrides,
 * recovery progress steps, rider profile edits, the activity log of those actions). They still work in the
 * UI, but their effect lives only in this browser (localStorage) and is layered over the live API data by
 * `features/live/map-state.ts`. Every one of these actions shows a "simulated" toast. When the backend grows
 * the endpoint, swap the `sim` call for an API mutation and delete the matching branch here.
 */
import type { AssetStatus, HistoryItem, ImmobilizeReason, LogEntry, Recovery, RecoveryStep, RiderEdit } from "./types";

const KEY = "qvek-admin-sim-v1";

export interface SimData {
  vehicles: Record<string, { status?: AssetStatus; immobilized?: boolean; immobilizedReason?: ImmobilizeReason | null }>;
  riders: Record<string, { name?: string; phone?: string; age?: number; platform?: string }>;
  riderEdits: Record<string, RiderEdit[]>;
  logs: LogEntry[];
  history: Record<string, HistoryItem[]>;
  recoverySteps: Record<string, Partial<Record<RecoveryStep, number>>>;
  closedRecoveries: Recovery[];
  alertsRead: string[];
}

const empty = (): SimData => ({ vehicles: {}, riders: {}, riderEdits: {}, logs: [], history: {}, recoverySteps: {}, closedRecoveries: [], alertsRead: [] });

let data: SimData | null = null;
let version = 0;
const listeners = new Set<() => void>();

function load(): SimData {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<SimData>) };
  } catch {
    /* corrupt / blocked storage — start clean */
  }
  return empty();
}

export const sim = {
  get data(): SimData {
    if (!data) data = load();
    return data;
  },
  get version() {
    return version;
  },
  update(fn: (d: SimData) => void) {
    fn(sim.data);
    version += 1;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(sim.data));
    } catch {
      /* storage full / blocked */
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  reset() {
    sim.update((d) => Object.assign(d, empty()));
  },
};

export const SIM_NOTE = "Simulated in this browser — the backend has no endpoint for this yet.";
