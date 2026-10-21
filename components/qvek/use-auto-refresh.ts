"use client";

import { useEffect, useState } from "react";

import { useUI } from "./ui-context";

/**
 * Re-renders a page every 30 s so relative times ("5 min ago", "2h 10m left") stay fresh — the
 * prototype did this for the dashboard, riders, controls and map pages. It is skipped while the
 * user is typing in the page, or while a modal / drawer / menu is open.
 */
export function useAutoRefresh() {
  const ui = useUI();
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const a = document.activeElement as HTMLElement | null;
      const editing = !!a && !!a.closest("#content") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && (a as HTMLInputElement).type !== "checkbox";
      if (editing || ui.hasLayers() || document.querySelector(".menu")) return;
      setN((n) => n + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [ui]);
}
