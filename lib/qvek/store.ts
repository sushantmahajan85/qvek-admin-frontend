/*
 * Read model for the admin UI.
 *
 * The UI was designed against a synchronous, in-memory model (riders, vehicles, finance, …). In the live
 * app that model is *derived* from the Qvek API: `features/live` fetches with TanStack Query, maps the
 * responses into this `State` shape (see features/live/map-state.ts) and hands it over with `replace`.
 * Components then read it through `G` / `D` / `store.state` exactly as before; `useStore()` (use-store.ts)
 * re-renders them when a new snapshot arrives.
 *
 * Nothing in here talks to the network and nothing is persisted.
 */
import type { AssetStatus, Config, ExpenseType, KycKey, Rider, State, Vehicle, Zone, FinanceEntry } from "./types";
import { U } from "./utils";

export const DEFAULT_CONFIG: Config = {
  dailyRate: 0,
  deposit: 3000,
  plans: [],
  cycleDay: 2, // Tuesday
  cycleHour: 10,
  graceHours: 24,
  zones: { operational: 15, warning: 25 },
  warehouseRadius: 0.6,
  idleHours: 72,
  support: { call: "", whatsapp: "", hours: "" },
  hubName: "Qvek Hub",
  admin: { id: "", password: "", otp: "", name: "Fleet Admin" },
  riderOtp: "",
};

export function emptyState(): State {
  return {
    version: 1,
    clock: { base: 0, setAt: 0 },
    config: U.clone(DEFAULT_CONFIG),
    hub: null,
    riders: [],
    vehicles: [],
    finance: [],
    expenses: [],
    notifications: [],
    logs: [],
    replacements: [],
    recoveries: [],
    alerts: [],
    seq: { customer: 0, ref: 0 },
  };
}

let state: State = emptyState();
let version = 0;

function S(): State {
  return state;
}

/* ----------------------------------------------------------- lookups */
export const G = {
  rider: (id: string | null | undefined) => (id ? S().riders.find((r) => r.id === id) : undefined),
  vehicle: (id: string | null | undefined) => (id ? S().vehicles.find((v) => v.id === id) : undefined),
  riderByPhone: (p: string) => S().riders.find((r) => r.phone === p),
  plan: (id: string) => S().config.plans.find((p) => p.id === id),
  riderVehicle: (r: Rider | null | undefined) => (r && r.vehicleId ? G.vehicle(r.vehicleId) : undefined),
  vehicleRider: (v: Vehicle | null | undefined) => (v && v.riderId ? G.rider(v.riderId) : undefined),
};

/* ----------------------------------------------------------- derived views */
function zoneOf(pos: { x: number; y: number }): Zone {
  const c = S().config;
  const d = U.dist(pos);
  if (d <= c.zones.operational) return "operational";
  if (d <= c.zones.warning) return "warning";
  return "disarm";
}

export const D = {
  now: () => Date.now(),
  zoneOf: (pos: { x: number; y: number }) => zoneOf(pos),
  inWarehouse: (v: Vehicle) => v.hasGps && U.dist(v.pos) <= S().config.warehouseRadius,
  /** 72 h idle flag — computed by the backend (warehouse vehicles already excluded). */
  isIdle: (v: Vehicle) => v.idle,
  mapsUrl: (v: Vehicle) => v.mapsUrl,
  /** Mirrors the backend's assignment rules: ACTIVE rider + paid token + first verified recharge + no vehicle. */
  eligibility(r: Rider) {
    const t = Date.now();
    const checks = [
      { key: "approved", label: "Application approved", ok: r.application.status === "approved" },
      { key: "deposit", label: "Security deposit received", ok: r.deposit.status === "received" },
      { key: "recharge", label: "First recharge completed (valid plan)", ok: !!(r.firstCycleDone && r.plan && r.plan.end > t) },
      { key: "novehicle", label: "No active vehicle (one per rider)", ok: !r.vehicleId },
      { key: "standing", label: "Not blacklisted / returned", ok: !(["Blacklisted", "Returned", "Marked_for_recovery"] as (AssetStatus | null)[]).includes(r.status) },
    ];
    return { ok: checks.every((c) => c.ok), checks };
  },
  financeFilter(entries: FinanceEntry[], f: string) {
    if (f === "recharge") return entries.filter((e) => e.type === "recharge" || e.type === "first_cycle");
    if (f === "service") return entries.filter((e) => e.type === "service" || e.type === "repair" || e.type === "servicing");
    return entries;
  },
  kycSummary(r: Rider) {
    const keys: KycKey[] = ["aadhaar", "pan", "dl"];
    const docs = keys.map((k) => (r.kyc && r.kyc[k]) || { status: "missing" as const });
    const verified = docs.filter((d) => d.status === "verified").length;
    const submitted = docs.filter((d) => d.status !== "missing").length;
    return { verified, submitted, total: 3, complete: submitted === 3, allVerified: verified === 3 };
  },
  availableVehicles() {
    return S().vehicles.filter((v) => !v.riderId && v.status === "Inactive");
  },
};

/* ----------------------------------------------------------- store */
export const store = {
  get state(): State {
    return state;
  },
  get version() {
    return version;
  },
  /** Swaps in a new snapshot (called by the live-data provider while it renders; no subscribers to notify). */
  replace(next: State) {
    if (next === state) return;
    state = next;
    version += 1;
  },
};

export const L = {
  assetStatus: { Inactive: "Inactive", Active: "Active", Marked_for_recovery: "Marked for recovery", Blacklisted: "Blacklisted", Returned: "Returned", Repair_req: "Repair required" } as Record<AssetStatus, string>,
  finType: { deposit: "Security deposit", recharge: "Recharge", first_cycle: "Adjusted first cycle", service: "Service charge", repair: "Repair", servicing: "Servicing", refund: "Refund" } as Record<string, string>,
  expenseType: { pending_deposit: "Pending security deposit", repair: "Repair expense", servicing: "Servicing expense" } as Record<ExpenseType, string>,
  platforms: ["Swiggy", "Zomato", "Zepto", "Blinkit", "Rapido", "Amazon Flex", "Dunzo", "Other"],
};
