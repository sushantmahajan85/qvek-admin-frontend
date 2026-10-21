"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { Badge, Flag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageState, patchPageState, usePageState } from "@/lib/qvek/page-state";
import { KIND_LABEL, ZC, ZONE_BADGE, locText, vKind, type VKind } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { useAdmin } from "../admin-context";
import { ControlButton, EmptyState, Plate } from "../bits";
import { Icon } from "../icon";
import { HubMark, MapBase, MapZones, Marker } from "../map-parts";
import { useAutoRefresh } from "../use-auto-refresh";

const KINDS: ("all" | VKind)[] = ["all", "active", "grace", "immobilized", "repair", "offline", "available", "recovery"];

const viewBoxOf = (m: { zoom: number; cx: number; cy: number }) => {
  const w = 760 / m.zoom;
  const h = 600 / m.zoom;
  return (m.cx - w / 2).toFixed(1) + " " + (m.cy - h / 2).toFixed(1) + " " + w.toFixed(1) + " " + h.toFixed(1);
};

function zoomMap(f: number) {
  const m = getPageState("map");
  patchPageState("map", { zoom: Math.max(0.8, Math.min(14, m.zoom * f)) });
}

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
  const stageRef = useRef<HTMLDivElement>(null);
  const focusId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; w: number } | null>(null);
  const s = store.state;

  const n = (k: "all" | VKind) => (k === "all" ? s.vehicles.length : s.vehicles.filter((v) => vKind(v) === k).length);
  const vs = s.vehicles.filter((v) => m.filter === "all" || vKind(v) === m.filter);
  const sel = vs.find((v) => v.id === m.sel);

  const select = (id: string) => {
    focusId.current = id || null;
    setM({ sel: id || null });
  };

  // After a marker is chosen, keep keyboard focus on it (the prototype re-rendered then focused it).
  useEffect(() => {
    if (!focusId.current) return;
    const mk = document.querySelector<SVGGElement>('.marker[data-id="' + focusId.current + '"]');
    mk?.focus({ preventScroll: true });
    focusId.current = null;
  });

  // Wheel zoom needs a non-passive listener so the page does not scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomMap(e.deltaY < 0 ? 1.25 : 0.8);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest(".marker") || t.closest("button")) return;
    const svg = document.getElementById("fleet-map");
    if (!svg) return;
    const cur = getPageState("map");
    drag.current = { x: e.clientX, y: e.clientY, cx: cur.cx, cy: cur.cy, w: svg.clientWidth };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const scale = 760 / getPageState("map").zoom / d.w;
    patchPageState("map", { cx: d.cx - (e.clientX - d.x) * scale, cy: d.cy - (e.clientY - d.y) * scale });
  };
  const onUp = () => {
    drag.current = null;
    setDragging(false);
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
          <div
            className="map-stage"
            id="map-stage"
            ref={stageRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div id="map-svg-wrap" style={{ width: "100%", height: "100%" }}>
              <svg
                id="fleet-map"
                className={dragging ? "dragging" : undefined}
                viewBox={viewBoxOf(m)}
                role="application"
                aria-label={"Fleet map with " + vs.length + " vehicles. Use the zoom buttons or drag to pan."}
              >
                <MapBase />
                <MapZones labels />
                <HubMark />
                {vs.filter((v) => v !== sel).map((v) => (
                  <Marker key={v.id} v={v} selected={false} onSelect={select} />
                ))}
                {sel ? <Marker v={sel} selected onSelect={select} /> : null}
              </svg>
            </div>
            <span className="map-banner">
              <Icon name="info" size={13} />
              Last known GPS positions
            </span>
            <div className="map-ctrls">
              <button type="button" aria-label="Zoom in" onClick={() => zoomMap(1.4)}>
                <Icon name="plus" size={16} />
              </button>
              <button type="button" aria-label="Zoom out" onClick={() => zoomMap(1 / 1.4)}>
                <Icon name="minus" size={16} />
              </button>
              <button type="button" aria-label="Zoom to hub warehouse" onClick={() => setM({ zoom: 9, cx: 0, cy: 0 })}>
                <Icon name="warehouse" size={16} />
              </button>
              <button type="button" aria-label="Reset view" onClick={() => setM({ zoom: 1, cx: 0, cy: 0 })}>
                <Icon name="crosshair" size={16} />
              </button>
            </div>
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
          </div>
        </section>
        <div id="map-side">
          <MapSide />
        </div>
      </div>
    </>
  );
}
