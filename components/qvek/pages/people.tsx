"use client";

import { useRouter } from "next/navigation";

import { Badge, Flag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageState } from "@/lib/qvek/page-state";
import { STATUS_DESC, appStage, counts, matchRider } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { useAdmin } from "../admin-context";
import { AssetBadge, Avatar, EmptyState, Pager, PlanCell, Plate, SearchBox } from "../bits";
import { Icon } from "../icon";
import { useAutoRefresh } from "../use-auto-refresh";

/* ---------------------------------------------------------------- Rider onboarding */
export function OnboardingPage() {
  const admin = useAdmin();
  useStore();
  const [o, setO] = usePageState("onboarding");
  // Purged (anonymised) accounts stay in finance history but never in people lists.
  const s = store.state.riders.filter((r) => !r.purged);
  const c = counts();
  const n = (t: string) => s.filter((r) => r.application && (t === "all" || appStage(r) === t)).length;
  const tabs: [string, string][] = [
    ["pending", "Pending review"],
    ["deposit", "Awaiting deposit"],
    ["approved", "Approved"],
    ["rejected", "Rejected"],
    ["all", "All"],
  ];

  let list = s.filter((r) => r.application && matchRider(r, o.q));
  if (o.tab !== "all") list = list.filter((r) => appStage(r) === o.tab);
  list = list.slice().sort((a, b) => b.application.submittedAt - a.application.submittedAt);

  const stat = (label: string, val: number, icon: string, tone: string, sub: string) => (
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rider onboarding &amp; approval</h1>
          <p>Review in-app applications, verify KYC, record deposits and approve riders.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" onClick={() => admin.addRider()}>
            <Icon name="userPlus" size={16} />
            Add rider
          </Button>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        {stat("Pending review", c.pendingApps, "fileCheck", "tone-amber", "KYC to verify")}
        {stat("Awaiting deposit", c.awaitingDeposit, "wallet", "tone-blue", "Approved, app still locked")}
        {stat("Eligible for vehicle", c.eligible, "scooter", "tone-green", "Approved + deposit + recharge")}
        {stat("Rejected", n("rejected"), "ban", "tone-red", "Can re-apply in app")}
      </div>
      <section className="card">
        <div className="toolbar">
          <div className="seg" role="tablist" aria-label="Application status">
            {tabs.map((t) => (
              <button key={t[0]} type="button" role="tab" aria-selected={o.tab === t[0]} onClick={() => setO({ tab: t[0] })}>
                {t[1]} <span className="count">{n(t[0])}</span>
              </button>
            ))}
          </div>
          <div className="toolbar__end">
            <SearchBox value={o.q} onChange={(q) => setO({ q })} placeholder="Search name, phone, Customer ID" />
          </div>
        </div>
        <div id="ob-table">
          {!list.length ? (
            <EmptyState
              icon="userCheck"
              title={o.tab === "pending" ? "No applications waiting" : "Nothing here"}
              text={o.tab === "pending" ? "New in-app sign-ups appear here for review." : "No applications match this filter."}
            />
          ) : (
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Applied</th>
                    <th>Platform</th>
                    <th>KYC</th>
                    <th>Deposit</th>
                    <th>Application</th>
                    <th>Source</th>
                    <th style={{ width: 150 }}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const k = D.kycSummary(r);
                    const st = appStage(r);
                    const stB = {
                      pending: <Badge tone="amber">Pending review</Badge>,
                      deposit: <Badge tone="blue">Approved · deposit due</Badge>,
                      approved: <Badge tone="green">Approved</Badge>,
                      rejected: <Badge tone="red">Rejected</Badge>,
                    }[st];
                    return (
                      <tr key={r.id} className="row-main" onClick={() => admin.openRider(r.id)}>
                        <td data-label="Applicant" className="cell-full">
                          <div className="row">
                            <Avatar name={r.name} />
                            <div>
                              <span className="cell-main">{r.name}</span>
                              <span className="cell-sub">
                                {U.phone(r.phone)}
                                {r.customerId ? " · " + r.customerId : ""}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Applied">
                          <span className="cell-main">{U.fmtDate(r.application.submittedAt)}</span>
                          <span className="cell-sub">{U.relTime(r.application.submittedAt, D.now())}</span>
                        </td>
                        <td data-label="Platform">{r.platform}</td>
                        <td data-label="KYC">
                          <div className="badge-row">
                            {k.allVerified ? <Badge tone="green">Verified {k.total}/{k.total}</Badge> : k.complete ? <Badge tone="amber">Submitted {k.total}/{k.total}</Badge> : <Badge tone="red">{k.submitted}/{k.total} uploaded</Badge>}
                            {k.dlSubmitted ? <Badge tone="blue">+ DL</Badge> : null}
                          </div>
                        </td>
                        <td data-label="Deposit">
                          {r.deposit.status === "received" ? (
                            <Badge tone="green">
                              {U.money(r.deposit.amount)} · {r.deposit.mode === "online" ? "online" : "offline"}
                            </Badge>
                          ) : r.deposit.status === "refunded" ? (
                            <Badge tone="violet">Refunded</Badge>
                          ) : (
                            <Badge tone="amber">Pending</Badge>
                          )}
                        </td>
                        <td data-label="Application">{stB}</td>
                        <td data-label="Source">
                          {r.source === "admin" ? <Badge tone="violet" icon="user">Admin</Badge> : <Badge tone="grey" icon="smartphone">App</Badge>}
                        </td>
                        <td className="cell-full">
                          <div className="actions-row" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm">
                              {st === "pending" ? "Review" : "Open"}
                              <Icon name="chevronRight" size={15} />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger-ghost"
                              aria-label={`Delete ${r.name}`}
                              title={`Delete ${r.name}`}
                              onClick={() => admin.deleteRider(r.id)}
                            >
                              <Icon name="trash" size={15} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Riders */
function StatusLegend() {
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card__head">
        <h2>
          <Icon name="info" size={16} />
          Rider / asset status options
        </h2>
        <p>From the MVP scope</p>
      </div>
      <div className="card__body">
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {Object.keys(STATUS_DESC).map((k) => (
                <tr key={k}>
                  <td style={{ width: 220 }}>
                    <AssetBadge status={k} />{" "}
                    <span className="cell-mono" style={{ marginLeft: 6 }}>
                      {k}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-2)" }}>{STATUS_DESC[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function RidersPage() {
  const router = useRouter();
  const admin = useAdmin();
  useStore();
  useAutoRefresh();
  const [st, setSt] = usePageState("riders");
  const opts: [string, string][] = [
    ["all", "All"],
    ["Active", "Active"],
    ["grace", "In grace"],
    ["Inactive", "Inactive"],
    ["Blacklisted", "Blacklisted"],
    ["Returned", "Returned"],
  ];
  // Purged (anonymised) accounts stay in finance history but never in people lists.
  const all = store.state.riders.filter((r) => !r.purged);
  const n = (k: string) => all.filter((r) => r.application.status === "approved" && (k === "all" || (k === "grace" ? r.grace && !r.grace.lapsed : r.status === k))).length;

  let list = all.filter((r) => r.application.status === "approved" && matchRider(r, st.q));
  if (st.filter !== "all") list = list.filter((r) => (st.filter === "grace" ? r.grace && !r.grace.lapsed : r.status === st.filter));
  list = list.slice().sort((a, b) => String(a.customerId).localeCompare(String(b.customerId)));
  const per = 10;
  const page = Math.min(st.page, Math.max(1, Math.ceil(list.length / per)));
  const pageList = list.slice((page - 1) * per).slice(0, per);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Riders</h1>
          <p>Approved riders, their status, vehicle and plan. Status values follow the MVP scope.</p>
        </div>
        <div className="page-head__actions">
          <Button onClick={() => router.push("/onboarding")}>
            <Icon name="userCheck" size={16} />
            Onboarding queue
          </Button>
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          <SearchBox value={st.q} onChange={(q) => setSt({ q, page: 1 })} placeholder="Search name, phone or Customer ID" />
          <div className="chip-filter" role="group" aria-label="Status filter">
            {opts.map((o) => (
              <button key={o[0]} type="button" aria-pressed={st.filter === o[0]} onClick={() => setSt({ filter: o[0], page: 1 })}>
                {o[1]} <span className="count">{n(o[0])}</span>
              </button>
            ))}
          </div>
        </div>
        <div id="riders-table">
          {!list.length ? (
            <EmptyState icon="users" title="No riders found" text="Try another search or status." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Customer ID</th>
                      <th>Status</th>
                      <th>Vehicle</th>
                      <th>Plan validity</th>
                      <th>Deposit</th>
                      <th style={{ width: 170 }}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageList.map((r) => {
                      const v = G.riderVehicle(r);
                      return (
                        <tr key={r.id} className="row-main" onClick={() => admin.openRider(r.id)}>
                          <td data-label="Rider" className="cell-full">
                            <div className="row">
                              <Avatar name={r.name} />
                              <div>
                                <span className="cell-main">{r.name}</span>
                                <span className="cell-sub">
                                  {U.phone(r.phone)} · {r.platform}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td data-label="Customer ID">
                            <span className="cell-mono">{r.customerId}</span>
                          </td>
                          <td data-label="Status">
                            <div className="badge-row">
                              <AssetBadge status={r.status} />
                              {r.grace && !r.grace.lapsed ? <Flag tone="amber" icon="hourglass">Grace</Flag> : null}
                            </div>
                          </td>
                          <td data-label="Vehicle">
                            {v ? (
                              <>
                                <Plate v={v} />
                                <span className="cell-sub" style={{ display: "block" }}>IOP {v.iopId || "—"}</span>
                              </>
                            ) : (
                              <span className="cell-sub">—</span>
                            )}
                          </td>
                          <td data-label="Plan validity">
                            <PlanCell r={r} />
                          </td>
                          <td data-label="Deposit">
                            {r.deposit.status === "received" ? <Badge tone="green">Received</Badge> : r.deposit.status === "refunded" ? <Badge tone="violet">Refunded</Badge> : <Badge tone="amber">Pending</Badge>}
                          </td>
                          <td className="cell-full">
                            <div className="actions-row" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  admin.riderStatus(r.id);
                                }}
                              >
                                <Icon name="flag" size={15} />
                                Status
                              </Button>
                              <Button
                                size="sm"
                                variant="danger-ghost"
                                aria-label={`Delete ${r.name}`}
                                title={`Delete ${r.name}`}
                                onClick={() => admin.deleteRider(r.id)}
                              >
                                <Icon name="trash" size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={page} total={list.length} per={per} onPage={(p) => setSt({ page: p })} />
            </>
          )}
        </div>
      </section>
      <StatusLegend />
    </>
  );
}
