/* Formatting + small helpers shared across the admin UI (ported 1:1 from the prototype's `U`). */
import type { Pos } from "./types";

export const MIN = 60e3;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const U = {
  MIN,
  HOUR,
  DAY,
  uid(prefix?: string) {
    return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 8);
  },
  money(n: number | string) {
    return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  },
  fmtDate(ms: number | null | undefined, withYear?: boolean) {
    if (!ms) return "—";
    const o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
    if (withYear) o.year = "numeric";
    return new Date(ms).toLocaleDateString("en-IN", o).replace(/,/g, "");
  },
  fmtShortDate(ms: number | null | undefined) {
    return ms ? new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  },
  fmtTime(ms: number | null | undefined) {
    return ms
      ? new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
      : "—";
  },
  fmtDateTime(ms: number | null | undefined) {
    return ms ? U.fmtDate(ms) + ", " + U.fmtTime(ms) : "—";
  },
  isoDate(ms: number) {
    const d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  },
  relTime(ms: number | null | undefined, now: number) {
    if (!ms) return "—";
    const d = now - ms;
    if (d < 0) return "in " + U.fmtDuration(-d);
    if (d < MIN) return "just now";
    if (d < HOUR) return Math.floor(d / MIN) + " min ago";
    if (d < DAY) return Math.floor(d / HOUR) + " h ago";
    return Math.floor(d / DAY) + " d ago";
  },
  durParts(ms: number) {
    ms = Math.max(0, ms);
    return {
      d: Math.floor(ms / DAY),
      h: Math.floor((ms % DAY) / HOUR),
      m: Math.floor((ms % HOUR) / MIN),
      s: Math.floor((ms % MIN) / 1000),
    };
  },
  fmtDuration(ms: number) {
    const p = U.durParts(ms);
    if (p.d > 0) return p.d + "d " + p.h + "h";
    if (p.h > 0) return p.h + "h " + p.m + "m";
    return Math.max(p.m, 0) + "m";
  },
  pad(n: number) {
    return String(n).padStart(2, "0");
  },
  phone(p: string | null | undefined) {
    return p ? "+91 " + String(p).slice(0, 5) + " " + String(p).slice(5) : "—";
  },
  initials(name: string | null | undefined) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  },
  dist(pos: Pos | null | undefined) {
    return pos ? Math.sqrt(pos.x * pos.x + pos.y * pos.y) : 0;
  },
  bearing(pos: Pos) {
    const a = (Math.atan2(pos.x, pos.y) * 180) / Math.PI;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(((a + 360) % 360) / 45) % 8];
  },
  clone<T>(o: T): T {
    return JSON.parse(JSON.stringify(o));
  },
  sameDay(a: number, b: number) {
    return U.isoDate(a) === U.isoDate(b);
  },
  /** Odometer reading, or an em dash when none is recorded. */
  km(n: number | null | undefined) {
    return n == null ? "—" : n.toLocaleString("en-IN") + " km";
  },
  /** `1,234` style number with Indian digit grouping. */
  num(n: number) {
    return n.toLocaleString("en-IN");
  },
};
