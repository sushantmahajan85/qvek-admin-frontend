"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { D, store } from "./store";

/** Bumped by the live-data provider every time a new snapshot of the read model is installed. */
export const StoreVersionContext = createContext(0);

/**
 * Subscribes a component to the live read model: it re-renders whenever the API data (or a simulated
 * local action) produces a new snapshot. Components read the snapshot via `store.state` / `G` / `D`.
 */
export function useStore() {
  useContext(StoreVersionContext);
  return store.state;
}

/** Wall clock (ms). Re-renders once a second — used by the sidebar card, topbar chip and settings. */
export function useDemoClock() {
  const [t, setT] = useState(() => D.now());
  useEffect(() => {
    const id = setInterval(() => setT(D.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}
