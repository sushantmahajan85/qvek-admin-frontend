"use client";

/* Live vendor GPS for one vehicle (Phase D): fresh fix, 7-day odometer, SIM expiry + renewal. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useSimRenew, useVehicleLive, useVehicleOdometer } from "@/features/fleet/hooks";
import { Badge } from "@/components/ui/badge";
import { U } from "@/lib/qvek/utils";
import { Icon } from "./icon";

export function VehicleGpsSection({ vehicleId }: { vehicleId: string }) {
  const live = useVehicleLive(vehicleId);
  const w = React.useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    return { from, to };
  }, []);
  const odo = useVehicleOdometer(vehicleId, w.from, w.to);
  const renew = useSimRenew();

  const simEnd = (live.data?.vehicle as { simEndTime?: string } | undefined)?.simEndTime;
  const simSoon = simEnd ? new Date(simEnd).getTime() - Date.now() < 14 * 24 * 3600 * 1000 : false;

  return (
    <div className="dsec">
      <h3>
        Live GPS{" "}
        {live.data?.fix ? (
          <Badge tone={live.data.fix.online ? "green" : "amber"}>{live.data.fix.online ? "Online" : "Stale fix"}</Badge>
        ) : null}
      </h3>
      {live.isLoading ? (
        <p className="cell-sub">Reading tracker…</p>
      ) : live.isError || !live.data ? (
        <p className="cell-sub">
          Tracker unreachable.{" "}
          <button type="button" className="link" onClick={() => live.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        <dl className="kv">
          <dt>Tracker</dt>
          <dd>{live.data.fix ? (live.data.fix.online ? "Online" : "Stale fix") : "No fix yet"}</dd>
          <dt>Last fix</dt>
          <dd>{live.data.fix ? U.fmtDateTime(new Date(live.data.fix.at).getTime()) : "—"}</dd>
          <dt>7-day distance</dt>
          <dd>{odo.data ? U.km(odo.data.miles) : odo.isLoading ? "…" : "—"}</dd>
          <dt>SIM expiry</dt>
          <dd>
            {simEnd ? U.fmtDateTime(new Date(simEnd).getTime()) : "Unknown"}{" "}
            {simSoon ? <Badge tone="amber">Expiring</Badge> : null}
          </dd>
        </dl>
      )}
      <div className="actions-row" style={{ marginTop: 10 }}>
        <Button size="sm" disabled={renew.isPending} onClick={() => renew.mutate(vehicleId)}>
          <Icon name="zap" size={15} />
          {renew.isPending ? "Renewing…" : "Renew SIM"}
        </Button>
      </div>
      <p className="field__hint" style={{ marginTop: 8 }}>Live fix and odometer come from the vendor tracker; renewal tops up its data SIM.</p>
    </div>
  );
}
