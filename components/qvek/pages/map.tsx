"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Badge, Flag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageState } from "@/lib/qvek/page-state";
import { KIND_LABEL, ZC, ZONE_BADGE, locText, vKind, type VKind } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { useAdmin } from "../admin-context";
import { ControlButton, EmptyState, Plate } from "../bits";
import { Icon } from "../icon";
import { useAutoRefresh } from "../use-auto-refresh";

const FleetLeafletMap = dynamic(
  () => import("../fleet-leaflet-map").then((m) => m.FleetLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-stage" style={{ display: "grid", placeItems: "center" }}>
        <span className="spinner" />
      </div>
    ),
  },
);

const KINDS: ("all" | VKind)[] = ["all", "active", "grace", "immobilized", "repair", "offline", "available", "recovery"];

function MapSide() {
  const admin = useAdmin();
  const [m, setM] = usePageState("map");
  const s = store.state;
  const z = s.config.zones;
  const cnt = { operational: 0, warning: 0, disarm: 0 };
  s.vehicles.forEach((v) => cnt[D.zoneOf(v.pos)]++);
  const v = m.sel ? G.vehicle(m.sel) : null;

  let sel;
  if (v) {
    const r = G.vehicleRider(v);
    const k = vKind(v);
    const zz = D.zoneOf(v.pos);
    const rec = s.recoveries.find((x) => x.vehicleId === v.id && !x.closedAt);
    const tone = k === "active" ? "green" : k === "available" ? "blue" : k === "offline" ? "grey" : k === "recovery" ? "violet" : k === "immobilized" ? "red" : "amber";
    sel = (
      <section className="card">
        <div className="card__head">
          <h2>
            <Plate v={v} />
          </h2>
          <button type="button" className="icon-btn" aria-label="Clear selection" onClick={() => setM({ sel: null })}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="card__body" style={{ display: "grid", gap: 12 }}>
          <div className="badge-row">
            <Badge tone={tone}>{KIND_LABEL[k]}</Badge>
            <Badge tone={ZONE_BADGE[zz][0]}>{ZONE_BADGE[zz][1]}</Badge>
            {D.isIdle(v) ? <Flag tone="amber" icon="clock">Idle 72h+</Flag> : null}
          </div>
          {zz === "warning" ? (
            <div className="notice notice--warn">
              <Icon name="alert" size={16} />
              <span>
                Rider is in the warning zone ({z.operational}–{z.warning} km). Rider and admin have been alerted.
              </span>
            </div>
          ) : null}
          {zz === "disarm" ? (
            <div className="notice notice--error">
              <Icon name="lock" size={16} />
              <span>Beyond {z.warning} km — documented rule: vehicle is immobilized automatically (via IOP GPS).</span>
            </div>
          ) : null}
          <dl className="kv">
            <dt>Rider</dt>
            <dd>{r ? r.name + " · " + r.customerId : "Unassigned"}</dd>
            <dt>Distance</dt>
            <dd>{U.dist(v.pos).toFixed(1)} km from hub</dd>
            <dt>Position</dt>
            <dd>{locText(v)}</dd>
            <dt>Last GPS update</dt>
            <dd>{U.fmtDateTime(v.lastGps)}</dd>
            <dt>Plan validity</dt>
            <dd>{r && r.plan ? U.fmtDate(r.plan.end) : "—"}</dd>
          </dl>
          <div className="actions-row">
            <Button size="sm" onClick={() => admin.openVehicle(v.id)}>
              <Icon name="externalLink" size={15} />
              Open record
            </Button>
            {r ? <ControlButton v={v} /> : null}
            {rec ? (
              <Button size="sm" onClick={() => admin.copyRecoveryLink(v.id, rec.id)}>
                <Icon name="copy" size={15} />
                Copy recovery link
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    );
  } else {
    sel = (
      <section className="card">
        <div className="card__body">
          <EmptyState icon="pin" title="Select a vehicle" text="Click a marker to see its rider, zone and last GPS update." />
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      {sel}
      <section className="card">
        <div className="card__head">
          <h2>
            <Icon name="crosshair" size={16} />
            Geofence zones
          </h2>
          <p>Radius from the hub</p>
        </div>
        <div className="card__body zone-list">
          <div className="zone-row">
            <i style={{ background: "#20C76B" }} />
            <div>
              <b>Operational</b>
              <small>Within {z.operational} km · normal use</small>
            </div>
            <span className="count">{cnt.operational}</span>
          </div>
          <div className="zone-row">
            <i style={{ background: "#F5B942" }} />
            <div>
              <b>Warning</b>
              <small>
                {z.operational}–{z.warning} km · rider &amp; admin alerted
              </small>
            </div>
            <span className="count">{cnt.warning}</span>
          </div>
          <div className="zone-row">
            <i style={{ background: "#F16A73" }} />
            <div>
              <b>Disarm</b>
              <small>Beyond {z.warning} km · auto-immobilized</small>
            </div>
            <span className="count">{cnt.disarm}</span>
          </div>
          <p className="field__hint">Zones are configured in IOP GPS; breach events reach the backend by webhook.</p>
        </div>
      </section>
    </div>
  );
}

export function MapPage() {
  const router = useRouter();
  useStore();
  useAutoRefresh();
  const [m, setM] = usePageState("map");
  const s = store.state;

  const n = (k: "all" | VKind) => (k === "all" ? s.vehicles.length : s.vehicles.filter((v) => vKind(v) === k).length);
  const vs = s.vehicles.filter((v) => m.filter === "all" || vKind(v) === m.filter);
  const sel = vs.find((v) => v.id === m.sel);
  const visibleIds = useMemo(() => new Set(vs.map((v) => v.id)), [vs]);

  const select = (id: string) => {
    setM({ sel: id || null });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fleet map</h1>
          <p>All vehicles coloured by status, with the three geofence zones around the hub.</p>
        </div>
        <div className="page-head__actions">
          <div className="seg" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected="false" onClick={() => router.push("/dashboard")}>
              <Icon name="list" size={15} />
              List view
            </button>
            <button type="button" role="tab" aria-selected="true">
              <Icon name="map" size={15} />
              Map view
            </button>
          </div>
        </div>
      </div>
      <div className="map-shell">
        <section className="card map-card">
          <div className="toolbar">
            <div className="chip-filter" role="group" aria-label="Filter markers">
              {KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={m.filter === k} onClick={() => setM({ filter: k })}>
                  {k !== "all" ? <i style={{ width: 8, height: 8, borderRadius: "50%", background: ZC[k], display: "inline-block" }} /> : null}
                  {k === "all" ? "All" : KIND_LABEL[k]}{" "}
                  <span className="count">{n(k)}</span>
                </button>
              ))}
            </div>
          </div>
          <FleetLeafletMap
            visibleIds={visibleIds}
            selectedId={sel?.id ?? null}
            onSelect={select}
          />
            <span className="map-banner">
              <Icon name="info" size={13} />
              Last known GPS positions · OpenStreetMap
              {vs.some((v) => !v.hasGps) ? (
                <> · {vs.filter((v) => !v.hasGps).length} without signal ({vs.filter((v) => !v.hasGps).map((v) => v.regNo).join(", ")})</>
              ) : null}
            </span>
            <div className="map-legend">
              <div className="map-legend__row">
                {(Object.keys(KIND_LABEL) as VKind[]).map((k) => (
                  <span key={k}>
                    <i style={{ background: ZC[k] }} />
                    {KIND_LABEL[k]}
                  </span>
                ))}
              </div>
              <div className="map-legend__row">
                <span>
                  <i className="ring" style={{ borderColor: "#20C76B" }} />≤15 km
                </span>
                <span>
                  <i className="ring" style={{ borderColor: "#F5B942" }} />
                  15–25 km
                </span>
                <span>
                  <i style={{ background: "#F16A73", opacity: 0.5 }} />
                  &gt;25 km
                </span>
              </div>
            </div>
        </section>
        <div id="map-side">
          <MapSide />
        </div>
      </div>
    </>
  );
}
