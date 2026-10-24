"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, type MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageState, type PageState } from "@/lib/qvek/page-state";
import { ZONE_BADGE, counts, locText, matchVehicle } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import type { Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { useAdmin } from "../admin-context";
import {
  AssetBadge,
  ControlButton,
  EmptyState,
  FinFilterSeg,
  FinRow,
  GpsCell,
  LogRow,
  Pager,
  PlanCell,
  PlanStateBadge,
  Plate,
  SearchBox,
  SortTh,
  VFlags,
} from "../bits";
import { Icon } from "../icon";
import { FleetGpsHealth } from "../fleet-gps-health";
import { useUI } from "../ui-context";
import { useAutoRefresh } from "../use-auto-refresh";

const PER = 8;

function dashVehicles(d: PageState["dashboard"]) {
  let vs = store.state.vehicles.filter((v) => matchVehicle(v, d.q));
  const f = d.filter;
  vs = vs.filter((v) => {
    const r = G.vehicleRider(v);
    if (f === "all") return true;
    if (f === "active") return v.status === "Active" && !v.immobilized && v.online;
    if (f === "immobilized") return v.immobilized;
    if (f === "grace") return !!(r && r.grace && !r.grace.lapsed);
    if (f === "idle") return D.isIdle(v);
    if (f === "offline") return !v.online;
    if (f === "recovery") return v.status === "Marked_for_recovery";
    return v.status === f;
  });
  const k = d.sort.k;
  const dir = d.sort.d;
  const val = (v: Vehicle): string | number => {
    const r = G.vehicleRider(v);
    if (k === "vehicle") return v.regNo;
    if (k === "rider") return r ? r.name : "~";
    if (k === "plan") return r && r.plan ? (r.grace && !r.grace.lapsed ? r.grace.end : r.plan.end) : Infinity;
    if (k === "gps") return v.lastGps;
    if (k === "chassis") return v.chassisNo;
    return v.regNo;
  };
  vs.sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });
  return vs;
}

function RowDetail({ v, fin, onFin }: { v: Vehicle; fin: string; onFin: (f: string) => void }) {
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

function SkeletonTable() {
  const w = [90, 110, 90, 120, 100, 120];
  return (
    <div className="table-wrap">
      <table className="table">
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td style={{ width: 40 }}>
                <div className="skel" style={{ width: 16 }} />
              </td>
              {w.map((x, j) => (
                <td key={j}>
                  <div className="skel" style={{ width: x }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const ui = useUI();
  useStore();
  useAutoRefresh();
  const [d, setD] = usePageState("dashboard");

  // Skeleton on the first visit only (the prototype showed it for 420 ms after boot).
  useEffect(() => {
    if (d.loaded) return;
    const t = setTimeout(() => setD({ loaded: true }), 420);
    return () => clearTimeout(t);
  }, [d.loaded, setD]);

  const c = counts();
  const stat = (key: string, label: string, val: number, icon: string, tone: string, sub: string) => (
    <button type="button" className="stat" aria-pressed={d.filter === key} onClick={() => setD({ filter: key, page: 1 })}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        <span className={"stat__icon " + tone}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat__value">{val}</div>
      <div className="stat__sub">{sub}</div>
    </button>
  );
  const chips: [string, string][] = [
    ["all", "All"],
    ["active", "Active"],
    ["immobilized", "Immobilized"],
    ["grace", "Grace period"],
    ["Inactive", "Inactive"],
    ["Repair_req", "Repair_req"],
    ["recovery", "Marked for recovery"],
    ["Returned", "Returned"],
    ["offline", "Offline"],
    ["idle", "Idle 72h+"],
  ];

  const vs = dashVehicles(d);
  const total = vs.length;
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(d.page, pages);
  const rows = vs.slice((page - 1) * PER, page * PER);
  const selIds = Object.keys(d.sel).filter((k) => d.sel[k]);
  const allOnPage = rows.length > 0 && rows.every((v) => d.sel[v.id]);

  const onSort = (k: string) =>
    setD((x) => {
      if (x.sort.k === k) x.sort = { k, d: (x.sort.d * -1) as 1 | -1 };
      else x.sort = { k, d: k === "gps" ? -1 : 1 };
      x.page = 1;
    });

  const toggleRow = (v: Vehicle, e: MouseEvent<HTMLTableRowElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, a, .link, .btn, .seg, .fin-list") && !t.closest(".expander")) return;
    setD((x) => {
      x.open = { ...x.open, [v.id]: !x.open[v.id] };
    });
  };

  const bulkCopy = async () => {
    const txt = selIds
      .map((id) => {
        const v = G.vehicle(id);
        return v ? v.regNo + " · " + v.chassisNo : "";
      })
      .join("\n");
    const ok = await ui.copy(txt);
    ui.toast(ok ? selIds.length + " vehicle numbers copied" : "Copy failed — select and copy manually", { type: ok ? "success" : "error" });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fleet dashboard</h1>
          <p>Every vehicle with its rider, plan validity and last GPS update. Click a row to expand.</p>
        </div>
        <div className="page-head__actions">
          <div className="seg" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected="true">
              <Icon name="list" size={15} />
              List view
            </button>
            <button type="button" role="tab" aria-selected="false" onClick={() => router.push("/map")}>
              <Icon name="map" size={15} />
              Map view
            </button>
          </div>
        </div>
      </div>
      <div className="stats">
        {stat("all", "Total fleet", c.fleet, "scooter", "tone-blue", "Single scooter type")}
        {stat("active", "Active & running", c.active, "checkCircle", "tone-green", "Valid plan, online")}
        {stat("immobilized", "Immobilized", c.immobilized, "lock", "tone-red", "Expiry, disarm or manual")}
        {stat("grace", "In grace period", c.grace, "hourglass", "tone-amber", "24 h to recharge")}
        {stat("recovery", "Marked for recovery", c.recovery, "pin", "tone-violet", "Share location link")}
        {stat("idle", "Idle 72h+", c.idle, "clock", "tone-amber", "Warehouse excluded")}
      </div>
      <FleetGpsHealth />
      <section className="card">
        <div className="toolbar">
          <SearchBox value={d.q} onChange={(q) => setD({ q, page: 1 })} placeholder="Search rider name, phone, Customer ID, vehicle no. or chassis no." />
          <div className="chip-filter" role="group" aria-label="Status filter">
            {chips.map((x) => (
              <button key={x[0]} type="button" aria-pressed={d.filter === x[0]} onClick={() => setD({ filter: x[0], page: 1 })}>
                {x[1]}
              </button>
            ))}
          </div>
        </div>
        <div id="dash-table">
          {!d.loaded ? (
            <SkeletonTable />
          ) : (
            <>
              {selIds.length ? (
                <div className="bulkbar" role="region" aria-label="Bulk actions">
                  <Icon name="checkCircle" size={16} />
                  {selIds.length} selected
                  <span className="grow" />
                  <Button variant="green-ghost" size="sm" onClick={bulkCopy}>
                    <Icon name="copy" size={15} />
                    Copy vehicle numbers
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => setD({ sel: {} })}>
                    Clear
                  </Button>
                </div>
              ) : null}
              {!rows.length ? (
                <EmptyState
                  icon="search"
                  title="No vehicles match"
                  text="Try a different search or clear the status filter."
                  action={
                    <Button size="sm" onClick={() => setD({ filter: "all", q: "", page: 1 })}>
                      <Icon name="refresh" size={15} />
                      Reset filters
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="table table--stack">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>
                            <input
                              type="checkbox"
                              className="rowcheck"
                              aria-label="Select all on page"
                              checked={allOnPage}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setD((x) => {
                                  const next = { ...x.sel };
                                  rows.forEach((v) => (next[v.id] = on));
                                  x.sel = next;
                                });
                              }}
                            />
                          </th>
                          <th>Status</th>
                          <SortTh label="Vehicle No." sortKey="vehicle" sort={d.sort} onSort={onSort} />
                          <th>Motor No.</th>
                          <SortTh label="Chassis No." sortKey="chassis" sort={d.sort} onSort={onSort} />
                          <SortTh label="Rider" sortKey="rider" sort={d.sort} onSort={onSort} />
                          <th>Customer ID</th>
                          <SortTh label="Plan validity" sortKey="plan" sort={d.sort} onSort={onSort} />
                          <SortTh label="Last GPS update" sortKey="gps" sort={d.sort} onSort={onSort} />
                          <th style={{ width: 44 }}>
                            <span className="sr-only">Expand</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((v) => {
                          const r = G.vehicleRider(v);
                          const open = !!d.open[v.id];
                          return (
                            <Fragment key={v.id}>
                              <tr className={"row-main" + (open ? " is-open" : "")} aria-expanded={open} onClick={(e) => toggleRow(v, e)}>
                                <td className="cell-hide-sm">
                                  <input
                                    type="checkbox"
                                    className="rowcheck"
                                    aria-label={"Select " + v.regNo}
                                    checked={!!d.sel[v.id]}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const on = e.target.checked;
                                      setD((x) => {
                                        x.sel = { ...x.sel, [v.id]: on };
                                      });
                                    }}
                                  />
                                </td>
                                <td data-label="Status" className="cell-full status-cell">
                                  <div className="badge-row">
                                    <AssetBadge status={v.status} />
                                    <VFlags v={v} />
                                  </div>
                                </td>
                                <td data-label="Vehicle No.">
                                  <Plate v={v} />
                                </td>
                                <td data-label="Motor No.">
                                  <span className="cell-mono">{v.motorNo}</span>
                                </td>
                                <td data-label="Chassis No.">
                                  <span className="cell-mono">{v.chassisNo}</span>
                                </td>
                                <td data-label="Rider">
                                  {r ? (
                                    <>
                                      <span className="cell-main">{r.name}</span>
                                      <span className="cell-sub">{U.phone(r.phone)}</span>
                                    </>
                                  ) : (
                                    <span className="cell-sub">Unassigned</span>
                                  )}
                                </td>
                                <td data-label="Customer ID">
                                  <span className="cell-mono">{r ? r.customerId : "—"}</span>
                                </td>
                                <td data-label="Plan validity">
                                  <PlanCell r={r} />
                                </td>
                                <td data-label="Last GPS update">
                                  <GpsCell v={v} />
                                </td>
                                <td className="cell-exp">
                                  <button type="button" className="expander" aria-label={(open ? "Collapse" : "Expand") + " details for " + v.regNo}>
                                    <Icon name="chevronDown" size={18} />
                                  </button>
                                </td>
                              </tr>
                              {open ? (
                                <tr className="row-detail">
                                  <td colSpan={10}>
                                    <RowDetail
                                      v={v}
                                      fin={d.fin[v.id] || "all"}
                                      onFin={(f) =>
                                        setD((x) => {
                                          x.fin = { ...x.fin, [v.id]: f };
                                        })
                                      }
                                    />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={page} total={total} per={PER} onPage={(p) => setD({ page: p })} />
                </>
              )}
            </>
          )}
        </div>
      </section>
      <p className="field__hint" style={{ marginTop: 10 }}>
        <Icon name="info" size={13} /> Locations and GPS timestamps come from IOP GPS via the backend; positions on the map are relative to the hub.
      </p>
    </>
  );
}
