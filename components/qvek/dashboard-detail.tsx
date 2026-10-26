"use client";

/* Dashboard row expansion: rider + vehicle + rental + finance + activity.
 * Extracted from pages/dashboard.tsx; behavior unchanged. */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { D, G, store } from "@/lib/qvek/store";
import type { Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { ZONE_BADGE, locText } from "@/lib/qvek/selectors";
import { useAdmin } from "./admin-context";
import { AssetBadge, ControlButton, FinFilterSeg, FinRow, LogRow, PlanStateBadge } from "./bits";
import { Icon } from "./icon";

export function RowDetail({ v, fin, onFin }: { v: Vehicle; fin: string; onFin: (f: string) => void }) {
  const admin = useAdmin();
  const s = store.state;
  const r = G.vehicleRider(v);
  const z = D.zoneOf(v.pos);
  const entries = r ? D.financeFilter(s.finance.filter((e) => e.riderId === r.id), fin).sort((a, b) => b.at - a.at) : [];
  const logs = s.logs.filter((l) => l.vehicleId === v.id).sort((a, b) => b.at - a.at).slice(0, 4);
  const rec = s.recoveries.find((x) => x.vehicleId === v.id && !x.closedAt);
  return (
    <div className="detail">
      <div className="detail__block">
        <h3>
          Rider{" "}
          {r ? (
            <button type="button" className="link" onClick={() => admin.openRider(r.id)}>
              Open
            </button>
          ) : null}
        </h3>
        {r ? (
          <dl className="kv">
            <dt>Name</dt>
            <dd>{r.name}</dd>
            <dt>Phone</dt>
            <dd>{U.phone(r.phone)}</dd>
            <dt>Customer ID</dt>
            <dd className="cell-mono">{r.customerId}</dd>
            <dt>Platform</dt>
            <dd>{r.platform}</dd>
            <dt>Status</dt>
            <dd>
              <AssetBadge status={r.status} />
            </dd>
          </dl>
        ) : (
          <p className="cell-sub" style={{ whiteSpace: "normal" }}>
            No rider assigned. {v.status === "Inactive" ? "Available for assignment." : ""}
          </p>
        )}
      </div>
      <div className="detail__block">
        <h3>
          Vehicle{" "}
          <button type="button" className="link" onClick={() => admin.openVehicle(v.id)}>
            Open record
          </button>
        </h3>
        <dl className="kv">
          <dt>Chassis (master)</dt>
          <dd className="cell-mono">{v.chassisNo}</dd>
          <dt>Motor No.</dt>
          <dd className="cell-mono">{v.motorNo}</dd>
          <dt>Controller No.</dt>
          <dd className="cell-mono">{v.controllerNo}</dd>
          <dt>Odometer</dt>
          <dd>{U.km(v.odometer)}</dd>
          <dt>Location</dt>
          <dd>{locText(v)}</dd>
          <dt>Zone</dt>
          <dd>
            <Badge tone={ZONE_BADGE[z][0]}>{ZONE_BADGE[z][1]}</Badge>
          </dd>
        </dl>
      </div>
      <div className="detail__block">
        <h3>Rental status</h3>
        {r ? (
          <dl className="kv">
            <dt>Plan</dt>
            <dd>{r.plan ? r.plan.name : "—"}</dd>
            <dt>Valid until</dt>
            <dd>{r.plan ? U.fmtDateTime(r.plan.end) : "—"}</dd>
            <dt>Plan state</dt>
            <dd>
              <PlanStateBadge r={r} />
            </dd>
            <dt>Deposit</dt>
            <dd>{r.deposit.status === "received" ? <Badge tone="green">{U.money(r.deposit.amount)}</Badge> : <Badge tone="amber">{r.deposit.status}</Badge>}</dd>
            <dt>Last GPS</dt>
            <dd>{U.fmtDateTime(v.lastGps)}</dd>
          </dl>
        ) : (
          <dl className="kv">
            <dt>Last GPS</dt>
            <dd>{U.fmtDateTime(v.lastGps)}</dd>
          </dl>
        )}
      </div>
      <div className="detail__block detail__wide">
        <h3>
          Financial history &amp; service logs <FinFilterSeg cur={fin} onPick={onFin} />
        </h3>
        {r ? (
          entries.length ? (
            <>
              <div className="fin-list">{entries.slice(0, 6).map((e) => <FinRow key={e.id} e={e} />)}</div>
              {entries.length > 6 ? (
                <p className="cell-sub" style={{ marginTop: 8 }}>
                  +{entries.length - 6} more —{" "}
                  <button type="button" className="link" onClick={() => admin.openRider(r.id)}>
                    view all
                  </button>
                </p>
              ) : null}
            </>
          ) : (
            <p className="cell-sub">No records for this filter.</p>
          )
        ) : (
          <p className="cell-sub">No rider linked.</p>
        )}
      </div>
      <div className="detail__block detail__wide">
        <h3>Recent vehicle activity</h3>
        {logs.length ? <div className="tl">{logs.map((l) => <LogRow key={l.id} l={l} />)}</div> : <p className="cell-sub">No activity recorded.</p>}
      </div>
      <div className="detail__wide actions-row">
        <ControlButton v={v} />
        {r ? (
          <Button size="sm" onClick={() => admin.goReplace(r.id)}>
            <Icon name="swap" size={15} />
            Replace vehicle
          </Button>
        ) : v.status === "Inactive" ? (
          <Button size="sm" onClick={() => admin.goAssignVehicle(v.id)}>
            <Icon name="link" size={15} />
            Assign to rider
          </Button>
        ) : null}
        {rec ? (
          <Button size="sm" onClick={() => admin.copyRecoveryLink(v.id, rec.id)}>
            <Icon name="pin" size={15} />
            Copy recovery link
          </Button>
        ) : null}
        <Button size="sm" onClick={() => admin.showOnMap(v.id)}>
          <Icon name="map" size={15} />
          View on map
        </Button>
        <Button variant="subtle" size="sm" onClick={() => admin.openVehicle(v.id)}>
          <Icon name="externalLink" size={15} />
          Full record
        </Button>
      </div>
    </div>
  );
}
