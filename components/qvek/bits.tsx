"use client";

/*
 * Small presentational pieces shared by the admin pages and drawers — each one renders the exact
 * markup (and class names) of the corresponding helper in the prototype's admin.js.
 */
import type { CSSProperties, ReactNode } from "react";

import { Badge, Flag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { D, G } from "@/lib/qvek/store";
import { ASSET, FIN_STATUS, FIN_STYLE, LOG_ICON, LOG_TITLE, STATUS_DESC } from "@/lib/qvek/selectors";
import type { FinanceEntry, LogEntry, Rider, Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { useAdmin } from "./admin-context";
import { Icon } from "./icon";

export const Plate = ({ v }: { v: Vehicle }) => <span className="plate">{v.regNo}</span>;

export function Avatar({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <span className="avatar" style={style}>
      {U.initials(name)}
    </span>
  );
}

export function AssetBadge({ status }: { status: string | null | undefined }) {
  const a = status ? ASSET[status] : undefined;
  if (!a || !status) return <Badge tone="grey">{status || "—"}</Badge>;
  return (
    <Badge tone={a[0]} icon={a[2]} title={status + " — " + STATUS_DESC[status]}>
      {a[1]}
    </Badge>
  );
}

/** Status flags shown next to a vehicle's badge (immobilized, offline, grace, idle, zone, warehouse). */
export function VFlags({ v }: { v: Vehicle }) {
  const r = G.vehicleRider(v);
  const z = D.zoneOf(v.pos);
  return (
    <>
      {v.immobilized ? <Flag tone="red" icon="lock">Immobilized</Flag> : null}
      {!v.online ? <Flag tone="grey" icon="wifiOff">Offline</Flag> : null}
      {r && r.grace && !r.grace.lapsed ? <Flag tone="amber" icon="hourglass">Grace</Flag> : null}
      {D.isIdle(v) ? <Flag tone="amber" icon="clock">Idle 72h+</Flag> : null}
      {z === "warning" ? <Flag tone="amber" icon="navigation">Warning zone</Flag> : null}
      {z === "disarm" ? <Flag tone="red" icon="navigation">Disarm zone</Flag> : null}
      {D.inWarehouse(v) ? <Flag tone="blue" icon="warehouse">Warehouse</Flag> : null}
    </>
  );
}

export function PlanCell({ r }: { r: Rider | undefined }) {
  if (!r) return <span className="cell-sub">—</span>;
  const t = D.now();
  if (r.grace && !r.grace.lapsed) {
    return (
      <>
        <span className="cell-main" style={{ color: "var(--warning)" }}>Expired · grace</span>
        <span className="cell-sub">{U.fmtDuration(r.grace.end - t)} left to recharge</span>
      </>
    );
  }
  if (!r.plan) return <span className="cell-sub">No plan yet</span>;
  if (r.plan.end <= t) {
    return (
      <>
        <span className="cell-main" style={{ color: "var(--error)" }}>Expired</span>
        <span className="cell-sub">{U.fmtDate(r.plan.end)}</span>
      </>
    );
  }
  return (
    <>
      <span className="cell-main">{U.fmtDateTime(r.plan.end)}</span>
      <span className="cell-sub">
        {r.plan.name} · {U.fmtDuration(r.plan.end - t)} left
      </span>
    </>
  );
}

/** Valid / Grace / Expired badge shown in rental-status blocks. */
export function PlanStateBadge({ r }: { r: Rider }) {
  if (r.grace && !r.grace.lapsed) return <Badge tone="amber">Grace · {U.fmtDuration(r.grace.end - D.now())} left</Badge>;
  if (r.plan && r.plan.end > D.now()) return <Badge tone="green">Valid</Badge>;
  return <Badge tone="red">Expired</Badge>;
}

export function GpsCell({ v }: { v: Vehicle }) {
  return (
    <>
      <span className="cell-main" style={v.online ? undefined : { color: "var(--text-2)" }}>{U.relTime(v.lastGps, D.now())}</span>
      <span className="cell-sub">{U.fmtDateTime(v.lastGps)}</span>
    </>
  );
}

export function FinRow({ e, showRider }: { e: FinanceEntry; showRider?: boolean }) {
  const st = e.status === "failed" ? ["alertCircle", "tone-red"] : FIN_STYLE[e.type] || ["receipt", "tone-grey"];
  const r = showRider ? G.rider(e.riderId) : null;
  const fs = FIN_STATUS[e.status];
  return (
    <div className="fin-row">
      <span className={"fin-row__icon " + st[1]}>
        <Icon name={st[0]} size={15} />
      </span>
      <div style={{ minWidth: 0 }}>
        <b>{e.title}</b>
        <small>
          {U.fmtDateTime(e.at)}
          {e.periodStart ? " · " + U.fmtDate(e.periodStart) + " → " + U.fmtDate(e.periodEnd) : ""}
          {r ? " · " + r.name : ""}
        </small>
      </div>
      <div className="fin-row__amt">
        <b className={e.status === "failed" ? "struck" : ""}>
          {e.type === "refund" ? "−" : ""}
          {U.money(e.amount)}
        </b>
        <Badge tone={fs[0]}>{fs[1]}</Badge>
      </div>
    </div>
  );
}

const FIN_TABS: [string, string][] = [
  ["all", "All"],
  ["recharge", "Recharge Payments"],
  ["service", "Service Logs"],
];

export function FinFilterSeg({ cur, onPick }: { cur: string; onPick: (f: string) => void }) {
  return (
    <div className="seg" role="tablist" aria-label="Filter financial history">
      {FIN_TABS.map((x) => (
        <button key={x[0]} type="button" role="tab" aria-selected={cur === x[0]} onClick={(e) => { e.stopPropagation(); onPick(x[0]); }}>
          {x[1]}
        </button>
      ))}
    </div>
  );
}

export function RiderLink({ r }: { r: Rider | undefined }) {
  const admin = useAdmin();
  if (!r) return <span className="cell-sub">Unassigned</span>;
  return (
    <button type="button" className="link" onClick={() => admin.openRider(r.id)}>
      {r.name}
    </button>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={24} />
      </span>
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

export interface SortValue {
  k: string;
  d: 1 | -1;
}

export function SortTh({ label, sortKey, sort, onSort, className }: { label: string; sortKey: string; sort: SortValue; onSort: (k: string) => void; className?: string }) {
  const on = sort.k === sortKey;
  return (
    <th className={className} aria-sort={on ? (sort.d > 0 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        <Icon name={on ? (sort.d > 0 ? "chevronUp" : "chevronDown") : "sort"} size={13} />
      </button>
    </th>
  );
}

export function Pager({ page, total, per, onPage }: { page: number; total: number; per: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / per));
  const p = Math.min(page, pages);
  const from = total ? (p - 1) * per + 1 : 0;
  return (
    <div className="table-foot">
      <span>
        Showing {from}–{Math.min(total, p * per)} of {total}
      </span>
      <div className="pager">
        <button type="button" disabled={p <= 1} aria-label="Previous page" onClick={() => onPage(p - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((i) => (
          <button key={i} type="button" aria-current={i === p ? "page" : undefined} onClick={() => onPage(i)}>
            {i}
          </button>
        ))}
        <button type="button" disabled={p >= pages} aria-label="Next page" onClick={() => onPage(p + 1)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search">
      <span className="sr-only">Search</span>
      <Icon name="search" size={16} />
      <input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value ? (
        <button type="button" className="search__clear" aria-label="Clear search" onClick={() => onChange("")}>
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </label>
  );
}

export function LogRow({ l }: { l: LogEntry }) {
  const ic = LOG_ICON[l.action] || ["activity", "tone-grey"];
  const v = G.vehicle(l.vehicleId);
  return (
    <div className="tl-row">
      <span className={"tl-dot " + ic[1]}>
        <Icon name={ic[0]} size={15} />
      </span>
      <div>
        <b>
          {LOG_TITLE[l.action] || l.action}
          {v ? " · " + v.regNo : ""}{" "}
          {l.mode === "auto" ? <Badge tone="blue" icon="radio">Automatic</Badge> : <Badge tone="violet" icon="user">Manual</Badge>}
        </b>
        <p>{l.reason}</p>
        <time>
          {U.fmtDateTime(l.at)} · {l.by}
        </time>
      </div>
    </div>
  );
}

export function ControlButton({ v, size = "sm" }: { v: Vehicle; size?: "sm" | "default" | "lg" }) {
  const admin = useAdmin();
  return v.immobilized ? (
    <Button variant="green-ghost" size={size} onClick={() => admin.control(v.id, "reactivate")}>
      <Icon name="unlock" size={15} />
      Unlock / reactivate
    </Button>
  ) : (
    <Button variant="danger-ghost" size={size} onClick={() => admin.control(v.id, "immobilize")}>
      <Icon name="lock" size={15} />
      Immobilize
    </Button>
  );
}

/** Form field wrapper used by the replacement / expense forms (`fld` in the prototype). */
export function Field({
  id,
  label,
  req,
  err,
  hint,
  span,
  children,
}: {
  id?: string;
  label: string;
  req?: boolean;
  err?: string;
  hint?: string | null;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={"field" + (err ? " has-error" : "") + (span ? " span-2" : "")}>
      <label htmlFor={id}>
        {label}
        {req ? (
          <>
            {" "}
            <span className="req">*</span>
          </>
        ) : null}
      </label>
      {children}
      {err ? (
        <div className="field__error">
          <Icon name="alertCircle" size={13} />
          {err}
        </div>
      ) : hint ? (
        <div className="field__hint">{hint}</div>
      ) : null}
    </div>
  );
}

/** Inline error line used inside modals (`<div class="field__error">` + alert icon). */
export function FieldError({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="field__error" style={style}>
      <Icon name="alertCircle" size={13} />
      {children}
    </div>
  );
}
