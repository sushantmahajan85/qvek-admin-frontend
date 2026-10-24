"use client";

/* Fleet GPS health strip (Phase D): vendor counts, SIM-expiry and stale-tracker watchlists. */

import { useFleetHealth } from "@/features/fleet/hooks";
import { Icon } from "./icon";

export function FleetGpsHealth() {
  const health = useFleetHealth();
  if (health.isLoading) {
    return (
      <section className="card" aria-label="GPS health">
        <p className="cell-sub">Reading tracker health…</p>
      </section>
    );
  }
  if (health.isError || !health.data) return null;
  const h = health.data;
  const sim = h.simExpiring.length;
  const stale = h.stale.length;
  return (
    <section className="card" aria-label="GPS health">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <b>
          <Icon name="scooter" size={16} /> Tracker health
        </b>
        <span className="cell-sub">
          Vendor: {h.vendor ? `${h.vendor.moveNum} moving · ${h.vendor.staticNum} parked · ${h.vendor.offlineNum} offline` : "unavailable"}
        </span>
      </div>
      <div className="badge-row" style={{ marginTop: 8 }}>
        <span className="cell-sub">
          <Icon name="zap" size={14} /> {sim} SIM{sim === 1 ? "" : "s"} expiring ≤ 14 days
        </span>
        <span className="cell-sub">
          <Icon name="clock" size={14} /> {stale} stale tracker{stale === 1 ? "" : "s"}
        </span>
      </div>
      {sim > 0 ? (
        <p className="cell-sub" style={{ marginTop: 6 }}>
          Renew from the vehicle drawer: {h.simExpiring.slice(0, 5).map((v) => v.vehicleNo).join(", ")}
          {sim > 5 ? ` +${sim - 5} more` : ""}
        </p>
      ) : null}
    </section>
  );
}
