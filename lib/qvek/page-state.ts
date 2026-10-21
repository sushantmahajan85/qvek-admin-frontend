"use client";

/*
 * Per-page UI state (search text, filters, sort, pagination, form drafts).
 * The prototype kept this in a module-level object so it survived navigation; this keeps the same
 * behaviour (e.g. "Replace vehicle" pre-fills the replacement form on the next page) but exposes it
 * through a typed hook so components re-render when their slice changes.
 */
import { useCallback, useSyncExternalStore } from "react";
import { D } from "./store";
import { U } from "./utils";
import type { ExpenseType } from "./types";

export interface SortState {
  k: string;
  d: 1 | -1;
}

export interface PageState {
  dashboard: {
    q: string;
    filter: string;
    sort: SortState;
    page: number;
    open: Record<string, boolean>;
    fin: Record<string, string>;
    sel: Record<string, boolean>;
    loaded: boolean;
  };
  map: { filter: string; sel: string | null; zoom: number; cx: number; cy: number };
  onboarding: { tab: string; q: string };
  riders: { q: string; filter: string; page: number };
  vehicles: { q: string; filter: string; page: number; sort: SortState };
  assignment: { rider: string | null; vehicle: string | null; q: string };
  replacement: {
    form: { riderId: string; newVehicleId: string; reason: string; reasonOther: string; date: string; oldOdo: string; newOdo: string };
    err: Record<string, string>;
  };
  finance: { q: string; f: string; status: string; sort: SortState; page: number };
  expenses: {
    form: { type: ExpenseType; amount: string; date: string; riderId: string; vehicleId: string; notes: string };
    err: Record<string, string>;
    filter: string;
  };
  controls: { log: string; q: string };
}

export const emptyReplacementForm = (): PageState["replacement"]["form"] => ({
  riderId: "",
  newVehicleId: "",
  reason: "",
  reasonOther: "",
  date: "",
  oldOdo: "",
  newOdo: "",
});

export const emptyExpenseForm = (type: ExpenseType = "repair"): PageState["expenses"]["form"] => ({
  type,
  amount: "",
  date: "",
  riderId: "",
  vehicleId: "",
  notes: "",
});

const ps: PageState = {
  dashboard: { q: "", filter: "all", sort: { k: "vehicle", d: 1 }, page: 1, open: {}, fin: {}, sel: {}, loaded: false },
  map: { filter: "all", sel: null, zoom: 1, cx: 0, cy: 0 },
  onboarding: { tab: "pending", q: "" },
  riders: { q: "", filter: "all", page: 1 },
  vehicles: { q: "", filter: "all", page: 1, sort: { k: "chassis", d: 1 } },
  assignment: { rider: null, vehicle: null, q: "" },
  replacement: { form: emptyReplacementForm(), err: {} },
  finance: { q: "", f: "all", status: "all", sort: { k: "date", d: -1 }, page: 1 },
  expenses: { form: emptyExpenseForm(), err: {}, filter: "all" },
  controls: { log: "all", q: "" },
};

let psVersion = 0;
const psListeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  psListeners.add(fn);
  return () => {
    psListeners.delete(fn);
  };
};
const notify = () => {
  psVersion += 1;
  psListeners.forEach((fn) => fn());
};

/** Today's date (demo clock) as yyyy-mm-dd — default for the date inputs. */
export const today = () => U.isoDate(D.now());

type Updater<K extends keyof PageState> = (patch: Partial<PageState[K]> | ((s: PageState[K]) => void)) => void;

/** Returns the live slice and an updater. The updater accepts a patch object or a mutator. */
export function usePageState<K extends keyof PageState>(key: K): [PageState[K], Updater<K>] {
  useSyncExternalStore(subscribe, () => psVersion, () => 0);
  const update = useCallback<Updater<K>>(
    (patch) => {
      if (typeof patch === "function") patch(ps[key]);
      else Object.assign(ps[key], patch);
      notify();
    },
    [key],
  );
  return [ps[key], update];
}

/** Direct (non-hook) access for event handlers that need to read the latest value synchronously. */
export const getPageState = <K extends keyof PageState>(key: K): PageState[K] => ps[key];

/** Imperative patch used by cross-page actions (e.g. "Replace vehicle" pre-filling the form). */
export function patchPageState<K extends keyof PageState>(key: K, patch: Partial<PageState[K]>) {
  Object.assign(ps[key], patch);
  notify();
}

export { notify as notifyPageState };
