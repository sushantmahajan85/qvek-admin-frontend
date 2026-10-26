"use client";

/* Fleet GPS health strip (Phase D): vendor counts, SIM-expiry and stale-tracker watchlists. */

import { Badge } from "@/components/ui/badge";
import { useFleetHealth } from "@/features/fleet/hooks";
import { U } from "@/lib/qvek/utils";
import { Icon } from "./icon";

const CARD_STYLE = { marginBottom: 16 } as const;

export function FleetGpsHealth() {
  const health = useFleetHealth();
  if (health.isLoading) {
    return (
      <section className="card" aria-label="GPS health" style={CARD_STYLE}>
        <div className="card__head">
          <h2>
            <Icon name="scooter" size={16} /> Tracker health
          </h2>
          <p>Reading tracker health…</p>
        </div>
        <div className="card__body">
          <div className="badge-row">
            <span className="skel" style={{ width: 180 }} />
            <span className="skel" style={{ width: 140 }} />
            <span className="skel" style={{ width: 120 }} />
          </div>
        </div>
      </section>
    );
  }
  if (health.isError || !health.data) {
    return (
      <section className="card" aria-label="GPS health" style={CARD_STYLE}>
        <div className="card__head">
          <h2>
            <Icon name="scooter" size={16} /> Tracker health
          </h2>
          <button type="button" className="link" onClick={() => health.refetch()}>
            Retry
          </button>
        </div>
        <div className="card__body">
          <p className="cell-sub">Tracker health unavailable — fleet data below is still live.</p>
        </div>
      </section>
    );
  }
  const h = health.data;
  const sim = h.simExpiring.length;
  const stale = h.stale.length;
  const total = Object.values(h.byStatus).reduce((a, n) => a + (Number(n) || 0), 0);
  const allOk = sim === 0 && stale === 0;
  return (
    <section className="card" aria-label="GPS health" style={CARD_STYLE}>
      <div className="card__head">
        <h2>
          <Icon name="scooter" size={16} /> Tracker health
        </h2>
        <div className="badge-row">
          <span className="cell-sub">
            {total} tracked · Vendor:{" "}
            {h.vendor ? `${h.vendor.moveNum} moving · ${h.vendor.staticNum} parked · ${h.vendor.offlineNum} offline` : "unavailable (mock)"}
          </span>
          <button type="button" className="link" onClick={() => health.refetch()}>
            Refresh
          </button>
        </div>
      </div>
      <div className="card__body">
        <div className="badge-row">
          {Object.entries(h.byStatus).map(([s, n]) => (
            <Badge key={s} tone={s === "ACTIVE" ? "green" : s === "IMMOBILIZED" ? "red" : s === "OFFLINE" ? "grey" : "amber"}>
              {s}: {n}
            </Badge>
          ))}
          <Badge tone={sim > 0 ? "amber" : "green"} icon="zap">
            {sim} SIM{sim === 1 ? "" : "s"} expiring ≤ 14 days
          </Badge>
          <Badge tone={stale > 0 ? "red" : "green"} icon="clock">
            {stale} stale tracker{stale === 1 ? "" : "s"}
          </Badge>
        </div>
        {allOk ? (
          <p className="cell-sub" style={{ marginTop: 8 }}>
            All trackers reporting normally — no SIM renewals or stale devices.
          </p>
        ) : (
          <>
            {sim > 0 ? (
              <p className="cell-sub" style={{ marginTop: 8 }}>
                SIM expiring: {h.simExpiring.slice(0, 5).map((v) => `${v.vehicleNo}${v.simEndTime ? ` (${U.fmtShortDate(new Date(v.simEndTime).getTime())})` : ""}`).join(", ")}
                {sim > 5 ? ` +${sim - 5} more` : ""} — renew from the vehicle drawer.
              </p>
            ) : null}
            {stale > 0 ? (
              <p className="cell-sub" style={{ marginTop: 6 }}>
                Stale: {h.stale.slice(0, 5).map((v) => v.vehicleNo).join(", ")}
                {stale > 5 ? ` +${stale - 5} more` : ""} — no ping beyond the offline threshold.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
