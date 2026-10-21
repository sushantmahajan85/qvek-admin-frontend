"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageState } from "@/lib/qvek/page-state";
import { ZONE_BADGE, locText, matchVehicle } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import type { RecoveryStep } from "@/lib/qvek/types";
import { useAdmin } from "../admin-context";
import { AssetBadge, ControlButton, EmptyState, FieldError, LogRow, Plate, SearchBox } from "../bits";
import { Icon } from "../icon";
import { MiniMap } from "../map-parts";
import { useSetSupport } from "@/features/config/hooks";
import { useSetupMfa } from "@/features/auth/hooks";
import { mockCaptureEnabled } from "@/features/payments/hooks";
import { useAutoRefresh } from "../use-auto-refresh";

/* ---------------------------------------------------------------- Recovery */
const STEPS: [RecoveryStep, string, string][] = [
  ["shared", "Share location in Recovery Agents WhatsApp group", "Copy the link below and paste it in the group"],
  ["agentCalled", "Agent reached the scooter and called Admin", "Confirm once the agent is on site"],
  ["unlocked", "Admin unlocks the scooter", "Reactivates the vehicle so it can be ridden back"],
  ["returned", "Scooter ridden back to the facility", "Closes the recovery · vehicle → Returned"],
];

export function RecoveryPage() {
  const admin = useAdmin();
  useStore();
  const s = store.state;
  const open = s.recoveries.filter((r) => !r.closedAt).sort((a, b) => b.markedAt - a.markedAt);
  const closed = s.recoveries.filter((r) => r.closedAt).sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recovery</h1>
          <p>Assets marked for recovery — automatically after a lapsed grace period or manually. No separate agent app in Phase 1.</p>
        </div>
        <div className="page-head__actions">
          <Button onClick={() => admin.manualRecovery()}>
            <Icon name="pin" size={16} />
            Mark a vehicle for recovery
          </Button>
        </div>
      </div>
      {open.length ? (
        <div className="rec-grid">
          {open.map((rc) => {
            const v = G.vehicle(rc.vehicleId)!;
            const r = G.rider(rc.riderId);
            const link = v.mapsUrl ?? "No GPS fix yet";
            const nextIdx = STEPS.findIndex((st) => !rc.steps[st[0]]);
            return (
              <section className="card rec-card" key={rc.id}>
                <div className="card__head">
                  <h2>
                    <Icon name="pin" size={16} />
                    <Plate v={v} />
                  </h2>
                  <div className="badge-row">
                    <AssetBadge status={v.status} />
                    {rc.mode === "auto" ? <Badge tone="blue" icon="radio">Automatic</Badge> : <Badge tone="violet" icon="user">Manual</Badge>}
                  </div>
                </div>
                <div className="card__body">
                  <dl className="kv">
                    <dt>Rider</dt>
                    <dd>{r ? r.name + " · " + r.customerId : "—"}</dd>
                    <dt>Rider status</dt>
                    <dd>{r ? <AssetBadge status={r.status} /> : "—"}</dd>
                    <dt>Phone</dt>
                    <dd>{r ? U.phone(r.phone) : "—"}</dd>
                    <dt>Marked</dt>
                    <dd>{U.fmtDateTime(rc.markedAt)}</dd>
                    <dt>Reason</dt>
                    <dd>{rc.reason}</dd>
                    <dt>Vehicle state</dt>
                    <dd>{v.immobilized ? <Badge tone="red" icon="lock">Immobilized</Badge> : <Badge tone="green" icon="unlock">Unlocked</Badge>}</dd>
                  </dl>
                  <div>
                    <p className="field__label" style={{ marginBottom: 8 }}>Last known location</p>
                    <div className="mini-map">
                      <MiniMap v={v} />
                    </div>
                    <p className="cell-sub" style={{ marginTop: 6, whiteSpace: "normal" }}>
                      {locText(v)} · last GPS {U.fmtDateTime(v.lastGps)} (mock)
                    </p>
                  </div>
                  <div>
                    <p className="field__label" style={{ marginBottom: 8 }}>
                      Location link{" "}
                      <span className="badge badge--blue badge--noicon" style={{ height: 20, fontSize: 10.5, marginLeft: 4 }}>Google Maps</span>
                    </p>
                    <div className="link-box">
                      <Icon name="link" size={15} />
                      <code title={link}>{link}</code>
                      <Button variant="primary" size="sm" onClick={() => admin.copyRecoveryLink(v.id, rc.id)}>
                        <Icon name="copy" size={15} />
                        Copy
                      </Button>
                    </div>
                    <p className="field__hint" style={{ marginTop: 6 }}>Opens the vehicle&apos;s last known IOP GPS position in Google Maps.</p>
                  </div>
                  <div className="steps-v">
                    {STEPS.map((st, i) => {
                      const done = rc.steps[st[0]];
                      let btn = null;
                      if (!done && i === nextIdx) {
                        if (st[0] === "shared")
                          btn = (
                            <Button size="sm" onClick={() => admin.copyRecoveryLink(v.id, rc.id)}>
                              <Icon name="copy" size={14} />
                              Copy link
                            </Button>
                          );
                        else if (st[0] === "agentCalled")
                          btn = (
                            <Button size="sm" onClick={() => admin.recoveryStep(rc.id, "agentCalled")}>
                              <Icon name="phone" size={14} />
                              Mark called
                            </Button>
                          );
                        else if (st[0] === "unlocked")
                          btn = (
                            <Button variant="green-ghost" size="sm" onClick={() => admin.recoveryStep(rc.id, "unlocked")}>
                              <Icon name="unlock" size={14} />
                              Unlock
                            </Button>
                          );
                        else
                          btn = (
                            <Button size="sm" onClick={() => admin.recoveryStep(rc.id, "returned")}>
                              <Icon name="warehouse" size={14} />
                              Mark returned
                            </Button>
                          );
                      }
                      return (
                        <div className={"step-v" + (done ? " done" : "")} key={st[0]}>
                          <span className="step-v__n">{done ? <Icon name="check" size={14} /> : i + 1}</span>
                          <div>
                            <b>{st[1]}</b>
                            <small>{done ? "Done " + U.fmtDateTime(done) : st[2]}</small>
                          </div>
                          {btn}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="card">
          <EmptyState icon="pin" title="No active recoveries" text="Vehicles marked for recovery will show here with a copyable location link." />
        </section>
      )}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__head">
          <h2>
            <Icon name="history" size={16} />
            Closed recoveries
          </h2>
          <p>{closed.length} records</p>
        </div>
        {closed.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Rider</th>
                  <th>Marked</th>
                  <th>Closed</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((rc) => {
                  const v = G.vehicle(rc.vehicleId)!;
                  const r = G.rider(rc.riderId);
                  return (
                    <tr key={rc.id}>
                      <td>
                        <Plate v={v} />
                      </td>
                      <td>{r ? r.name : "—"}</td>
                      <td>{U.fmtDateTime(rc.markedAt)}</td>
                      <td>{U.fmtDateTime(rc.closedAt)}</td>
                      <td>{rc.mode === "auto" ? <Badge tone="blue">Automatic</Badge> : <Badge tone="violet">Manual</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card__body">
            <p className="cell-sub">None yet.</p>
          </div>
        )}
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Vehicle controls */
const REASONS: Record<string, string> = {
  plan_expiry: "Plan expired (automatic)",
  disarm_zone: "Disarm zone >25 km (automatic)",
  manual: "Manual admin action",
};

export function ControlsPage() {
  useStore();
  useAutoRefresh();
  const [st, setSt] = usePageState("controls");
  const s = store.state;

  const vs = s.vehicles.filter((v) => (v.riderId || v.immobilized) && matchVehicle(v, st.q)).sort((a, b) => Number(b.immobilized) - Number(a.immobilized));
  const logs = s.logs.filter((l) => st.log === "all" || l.mode === st.log).sort((a, b) => b.at - a.at);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicle controls</h1>
          <p>Immobilize or unlock vehicles. Automatic actions come from the backend rules; manual actions need confirmation and are logged.</p>
        </div>
      </div>
      <div className="notice notice--info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <span>
          <b>Simulated for now.</b> The backend has no immobilize / unlock endpoint yet, so these actions are recorded in this browser only. Real commands will go through the backend and the IOP GPS API — the browser never controls a vehicle directly.
        </span>
      </div>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card__head">
          <h2>
            <Icon name="power" size={16} />
            Manual controls
          </h2>
          <SearchBox value={st.q} onChange={(q) => setSt({ q })} placeholder="Search vehicle or rider" />
        </div>
        <div id="ctl-table">
          {!vs.length ? (
            <EmptyState icon="scooter" title="No vehicles" text="No vehicles match." />
          ) : (
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Rider</th>
                    <th>Current state</th>
                    <th>Reason</th>
                    <th>Zone</th>
                    <th style={{ width: 190 }}>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vs.map((v) => {
                    const r = G.vehicleRider(v);
                    const z = D.zoneOf(v.pos);
                    return (
                      <tr key={v.id}>
                        <td data-label="Vehicle">
                          <Plate v={v} />
                        </td>
                        <td data-label="Rider">
                          {r ? (
                            <>
                              <span className="cell-main">{r.name}</span>
                              <span className="cell-sub">{r.customerId}</span>
                            </>
                          ) : (
                            <span className="cell-sub">Unassigned</span>
                          )}
                        </td>
                        <td data-label="State">{v.immobilized ? <Badge tone="red" icon="lock">Immobilized</Badge> : <Badge tone="green" icon="power">Running</Badge>}</td>
                        <td data-label="Reason">
                          <span className="cell-sub" style={{ whiteSpace: "normal" }}>
                            {v.immobilized ? (v.immobilizedReason && REASONS[v.immobilizedReason]) || "—" : "—"}
                          </span>
                        </td>
                        <td data-label="Zone">
                          <Badge tone={ZONE_BADGE[z][0]}>{ZONE_BADGE[z][1]}</Badge>
                        </td>
                        <td className="cell-full">
                          <ControlButton v={v} />
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
      <div className="grid-2-eq">
        <section className="card">
          <div className="card__head">
            <h2>
              <Icon name="radio" size={16} />
              Automation rules
            </h2>
            <Badge tone="blue" icon="radio">Automatic</Badge>
          </div>
          <div className="card__body">
            <div className="tl">
              <div className="tl-row">
                <span className="tl-dot tone-red">
                  <Icon name="lock" size={15} />
                </span>
                <div>
                  <b>Immobilize on plan expiry</b>
                  <p>Immediately when the rental plan ends. A {s.config.graceHours}-hour grace period starts.</p>
                </div>
              </div>
              <div className="tl-row">
                <span className="tl-dot tone-red">
                  <Icon name="navigation" size={15} />
                </span>
                <div>
                  <b>Immobilize in the disarm zone</b>
                  <p>When the vehicle goes beyond {s.config.zones.warning} km from the hub.</p>
                </div>
              </div>
              <div className="tl-row">
                <span className="tl-dot tone-green">
                  <Icon name="unlock" size={15} />
                </span>
                <div>
                  <b>Reactivate after recharge</b>
                  <p>On a server-confirmed recharge within the grace period.</p>
                </div>
              </div>
              <div className="tl-row">
                <span className="tl-dot tone-violet">
                  <Icon name="pin" size={15} />
                </span>
                <div>
                  <b>Blacklist &amp; mark for recovery</b>
                  <p>If the grace period lapses without a recharge.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card__head">
            <h2>
              <Icon name="activity" size={16} />
              Activity log
            </h2>
            <div className="seg" role="tablist" aria-label="Filter log">
              {(
                [
                  ["all", "All"],
                  ["auto", "Automatic"],
                  ["manual", "Manual"],
                ] as const
              ).map((t) => (
                <button key={t[0]} type="button" role="tab" aria-selected={st.log === t[0]} onClick={() => setSt({ log: t[0] })}>
                  {t[1]}
                </button>
              ))}
            </div>
          </div>
          <div className="card__body" id="ctl-log" style={{ maxHeight: 520, overflowY: "auto" }}>
            {logs.length ? <div className="tl">{logs.slice(0, 30).map((l) => <LogRow key={l.id} l={l} />)}</div> : <EmptyState icon="activity" title="No activity" text="Control actions appear here." />}
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Settings */
function PricingCard() {
  const c = store.state.config;
  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="zap" size={16} />
          Rental plans &amp; pricing
        </h2>
        <Badge tone="blue">Set by the server</Badge>
      </div>
      <form className="card__body" id="price-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          {c.plans.map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={"pl-" + p.id}>
                {p.name} ({p.weeks * 7} days)
              </label>
              <div className="input-prefix">
                <span>₹</span>
                <input id={"pl-" + p.id} type="number" value={p.price} readOnly />
              </div>
            </div>
          ))}
          <div className="field">
            <label htmlFor="pl-deposit">Security deposit</label>
            <div className="input-prefix">
              <span>₹</span>
              <input id="pl-deposit" type="number" value={c.deposit} readOnly />
            </div>
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          All plans run Tuesday to Tuesday. Prices and the deposit are configured on the server (WEEKLY_RENT_PAISE and plan config) and are read-only here.
        </p>
      </form>
    </section>
  );
}

function SupportCard() {
  const c = store.state.config;
  const save = useSetSupport();
  const [call, setCall] = useState(c.support.call);
  const [err, setErr] = useState(false);

  const submit = () => {
    const v = call.trim();
    if (v.length < 10 || v.length > 16) {
      setErr(true);
      return;
    }
    setErr(false);
    save.mutate(v);
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="headset" size={16} />
          Support contact (Rider app)
        </h2>
      </div>
      <form className="card__body" id="support-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="sp-call">Call number</label>
            <input className="input" id="sp-call" inputMode="tel" maxLength={16} placeholder="+91XXXXXXXXXX" value={call} onChange={(e) => setCall(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sp-wa">WhatsApp number</label>
            <input className="input" id="sp-wa" value={c.support.whatsapp || "Not configured"} readOnly />
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>Shown on the rider app&apos;s Contact Admin buttons. Weekly rent is set on the server.</p>
        {err ? <FieldError>Enter a number with 10–16 characters (e.g. +91XXXXXXXXXX).</FieldError> : null}
      </form>
      <div className="card__foot">
        <Button variant="primary" disabled={save.isPending} onClick={submit}>
          <Icon name="check" size={16} />
          {save.isPending ? "Saving…" : "Save contact"}
        </Button>
      </div>
    </section>
  );
}

function MfaCard() {
  const setup = useSetupMfa();
  const [url, setUrl] = useState<string | null>(null);
  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="shield" size={16} />
          Two-factor authentication
        </h2>
      </div>
      <div className="card__body">
        {!url ? (
          <p style={{ color: "var(--text-2)", fontSize: 13 }}>Protect this shared login with an authenticator app. The next sign-in asks for a 6-digit code.</p>
        ) : (
          <>
            <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 8 }}>Scan this URL in your authenticator app (or paste it), then sign out and back in to verify:</p>
            <div className="link-box">
              <code title={url}>{url}</code>
            </div>
          </>
        )}
      </div>
      {!url ? (
        <div className="card__foot">
          <Button disabled={setup.isPending} onClick={() => setup.mutate(undefined, { onSuccess: (d) => setUrl(d.otpauthUrl) })}>
            <Icon name="lock" size={16} />
            {setup.isPending ? "Generating…" : "Enable 2FA"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function TestPaymentsNote() {
  if (!mockCaptureEnabled) return null;
  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="flask" size={16} />
          Test payments
        </h2>
        <Badge tone="amber">Dev only</Badge>
      </div>
      <div className="card__body">
        <p style={{ color: "var(--text-2)", fontSize: 13 }}>
          Test payment capture is enabled (<code>NEXT_PUBLIC_ENABLE_MOCK_CAPTURE=1</code>): pending payments appear on a rider&apos;s profile with a “Simulate capture” button. Never enable this in production.
        </p>
      </div>
    </section>
  );
}

export function SettingsPage() {
  const admin = useAdmin();
  const s = useStore();
  const c = s.config;
  // Remount the support form when the saved number changes on the server.
  const supportKey = JSON.stringify(c.support);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Contact numbers, plans, security and test tooling.</p>
        </div>
      </div>
      <div className="grid-2-eq">
        <div className="stack">
          <SupportCard key={supportKey} />
          <PricingCard />
        </div>
        <div className="stack">
          <MfaCard />
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="user" size={16} />
                Admin account
              </h2>
            </div>
            <div className="card__body">
              <dl className="kv">
                <dt>Signed in as</dt>
                <dd>{c.admin.id || "Admin"}</dd>
                <dt>Access</dt>
                <dd>Single admin (Phase 1)</dd>
              </dl>
            </div>
            <div className="card__foot">
              <Button onClick={() => admin.logout()}>
                <Icon name="logout" size={16} />
                Log out
              </Button>
            </div>
          </section>
          <TestPaymentsNote />
        </div>
      </div>
    </>
  );
}