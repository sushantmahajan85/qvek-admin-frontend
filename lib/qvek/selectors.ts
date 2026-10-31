/* Pure helpers + lookup tables shared by the admin pages (ported from the top of the prototype's admin.js). */
import { D, G, store } from "./store";
import type { LogAction, Rider, Vehicle, Zone } from "./types";
import { U } from "./utils";

export type Tone = "green" | "amber" | "red" | "blue" | "violet" | "grey" | "outline";

/** [badge tone, label, icon] per asset / rider status. */
export const ASSET: Record<string, [Tone, string, string | null]> = {
  Active: ["green", "Active", "checkCircle"],
  Inactive: ["grey", "Inactive", null],
  Marked_for_recovery: ["violet", "Marked for recovery", "pin"],
  Blacklisted: ["red", "Blacklisted", "ban"],
  Returned: ["blue", "Returned", "undo"],
  Repair_req: ["amber", "Repair required", "wrench"],
};

export const STATUS_DESC: Record<string, string> = {
  Inactive: "Approved but no active plan or vehicle.",
  Active: "Valid plan, vehicle running.",
  Marked_for_recovery: "Auto-set after grace period lapses, or set manually. Shows the recovery location icon.",
  Blacklisted: "Rider blocked from further rentals.",
  Returned: "Rider has submitted the vehicle back.",
  Repair_req: "Vehicle needs repair before next assignment.",
};

export const FIN_STYLE: Record<string, [string, string]> = {
  deposit: ["shield", "tone-blue"],
  recharge: ["zap", "tone-green"],
  first_cycle: ["calendar", "tone-green"],
  service: ["wrench", "tone-amber"],
  repair: ["wrench", "tone-amber"],
  servicing: ["wrench", "tone-amber"],
  refund: ["undo", "tone-violet"],
  deposit_deduction: ["shieldAlert", "tone-amber"],
};
export const FIN_STATUS: Record<string, [Tone, string]> = {
  success: ["green", "Success"],
  pending: ["amber", "Pending"],
  failed: ["red", "Failed"],
};

export const LOG_ICON: Record<LogAction, [string, string]> = {
  immobilize: ["lock", "tone-red"],
  reactivate: ["unlock", "tone-green"],
  mark_recovery: ["pin", "tone-violet"],
  assign: ["link", "tone-blue"],
  replace: ["swap", "tone-blue"],
  status: ["flag", "tone-amber"],
  component: ["cpu", "tone-grey"],
  recovery: ["navigation", "tone-violet"],
};
export const LOG_TITLE: Record<LogAction, string> = {
  immobilize: "Immobilized",
  reactivate: "Reactivated",
  mark_recovery: "Marked for recovery",
  assign: "Vehicle assigned",
  replace: "Vehicle replaced",
  status: "Status changed",
  component: "Component updated",
  recovery: "Recovery step",
};

export const ZONE_BADGE: Record<Zone, [Tone, string]> = {
  operational: ["green", "Operational"],
  warning: ["amber", "Warning zone"],
  disarm: ["red", "Disarm zone"],
};

/* ---------------------------------------------------------------- map */
export type VKind = "active" | "immobilized" | "grace" | "repair" | "offline" | "available" | "recovery";
export const ZC: Record<VKind, string> = {
  active: "#20C76B",
  immobilized: "#F16A73",
  grace: "#F5B942",
  repair: "#FF9F5A",
  offline: "#8A97AB",
  available: "#61A7FF",
  recovery: "#A98BFF",
};
export const KIND_LABEL: Record<VKind, string> = {
  active: "Active",
  immobilized: "Immobilized",
  grace: "Grace period",
  repair: "Repair required",
  offline: "Offline",
  available: "Available / returned",
  recovery: "Marked for recovery",
};

export function vKind(v: Vehicle): VKind {
  const r = G.vehicleRider(v);
  if (v.status === "Marked_for_recovery") return "recovery";
  if (r && r.grace && !r.grace.lapsed) return "grace";
  if (v.immobilized) return "immobilized";
  if (v.status === "Repair_req") return "repair";
  if (!v.online) return "offline";
  if (!v.riderId) return "available";
  return "active";
}

export function locText(v: Vehicle) {
  const d = U.dist(v.pos);
  if (D.inWarehouse(v)) return "At the hub warehouse";
  return d.toFixed(1) + " km " + U.bearing(v.pos) + " of hub";
}

/* ---------------------------------------------------------------- search / counts */
export function matchRider(r: Rider, q: string) {
  if (!q) return true;
  q = q.toLowerCase().replace(/\s/g, "");
  return [r.name, r.phone, r.customerId].some((x) => x && String(x).toLowerCase().replace(/\s/g, "").includes(q));
}
export function matchVehicle(v: Vehicle, q: string) {
  if (!q) return true;
  const qq = q.toLowerCase().replace(/\s/g, "");
  if ([v.regNo, v.iopId, v.chassisNo, v.motorNo, v.controllerNo].some((x) => String(x).toLowerCase().replace(/\s/g, "").includes(qq))) return true;
  const r = G.vehicleRider(v);
  return r ? matchRider(r, q) : false;
}

export function counts() {
  const s = store.state;
  const vs = s.vehicles;
  return {
    fleet: vs.length,
    active: vs.filter((v) => v.status === "Active" && !v.immobilized && v.online).length,
    immobilized: vs.filter((v) => v.immobilized).length,
    grace: s.riders.filter((r) => r.grace && !r.grace.lapsed).length,
    recovery: vs.filter((v) => v.status === "Marked_for_recovery").length,
    idle: vs.filter((v) => D.isIdle(v)).length,
    pendingApps: s.riders.filter((r) => r.application.status === "pending").length,
    awaitingDeposit: s.riders.filter((r) => r.application.status === "approved" && r.deposit.status !== "received").length,
    eligible: s.riders.filter((r) => D.eligibility(r).ok).length,
    unreadAlerts: s.alerts.filter((a) => !a.read).length,
  };
}

/** Onboarding stage of an application. */
export function appStage(r: Rider): "rejected" | "pending" | "deposit" | "approved" {
  if (r.application.status === "rejected") return "rejected";
  if (r.application.status === "pending") return "pending";
  if (r.deposit.status !== "received") return "deposit";
  return "approved";
}
