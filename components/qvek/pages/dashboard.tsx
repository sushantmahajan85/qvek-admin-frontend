"use client";

import { useRouter } from "next/navigation";
import { Fragment, type MouseEvent } from "react";

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
// Tracker health strip (vendor counts / SIM expiry / stale devices) removed from
// the dashboard per operations request. Component kept in fleet-gps-health.tsx.
// import { FleetGpsHealth } from "../fleet-gps-health";
import { RowDetail } from "../dashboard-detail";
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

export function DashboardPage() {
  const router = useRouter();
  const ui = useUI();
  useStore();
  useAutoRefresh();
  const [d, setD] = usePageState("dashboard");

  const c = counts();
  const graceHours = useStore().config.graceHours;
  const stat = (_key: string, label: string, val: number, icon: string, tone: string, sub: string) => (
    <div className="stat">
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        <span className={"stat__icon " + tone}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat__value">{val}</div>
      <div className="stat__sub">{sub}</div>
    </div>
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
        {stat("grace", "In grace period", c.grace, "hourglass", "tone-amber", `${graceHours} h to recharge`)}
        {stat("recovery", "Marked for recovery", c.recovery, "pin", "tone-violet", "Share location link")}
        {stat("idle", "Idle 72h+", c.idle, "clock", "tone-amber", "Warehouse excluded")}
      </div>
      {/* Tracker health section removed from the dashboard.
      <FleetGpsHealth /> */}
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
                          <th>IOP ID</th>
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
                                <td data-label="IOP ID">
                                  <span className="cell-mono">{v.iopId || "—"}</span>
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
        </div>
      </section>
      <p className="field__hint" style={{ marginTop: 10 }}>
        <Icon name="info" size={13} /> Locations and GPS timestamps come from IOP GPS via the backend; positions on the map are relative to the hub.
      </p>
    </>
  );
}
