"use client";

/* Bodies of the vehicle-record and rider slide-over drawers (ported from vehicleDrawerHTML / riderDrawerHTML). */
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { useCancelRiderDeletion, usePurgeRider, useRefundDeposit, useReturnRider } from "@/features/riders/hooks";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/features/config/api";
import { requestKyc } from "@/features/live/requests";
import { mockCaptureEnabled, useMockCapture, usePayments } from "@/features/payments/hooks";
import { D, G, store } from "@/lib/qvek/store";
import { ZONE_BADGE, appStage, locText } from "@/lib/qvek/selectors";
import type { HistoryType, KycKey, Rider, Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { kycTileModels } from "@/lib/qvek/kyc-tiles";
import { useAdmin } from "./admin-context";
import { AssetBadge, ControlButton, FinFilterSeg, FinRow, Plate, PlanStateBadge, RiderLink } from "./bits";
import { DocSvg } from "./doc-svg";
import { useUI } from "./ui-context";
import { Icon } from "./icon";
import { MiniMap } from "./map-parts";
import { VehicleGpsSection } from "./vehicle-gps";

const HICON: Record<HistoryType, [string, string]> = {
  created: ["sparkle", "tone-grey"],
  component: ["cpu", "tone-blue"],
  assignment: ["link", "tone-green"],
  replacement: ["swap", "tone-blue"],
  status: ["flag", "tone-amber"],
  control: ["power", "tone-red"],
  expense: ["wrench", "tone-amber"],
};
const REASONS: Record<string, string> = {
  plan_expiry: "Plan expired (automatic)",
  disarm_zone: "Entered disarm zone (automatic)",
  manual: "Manual admin action",
};

export function VehicleDrawerBody({ v, fin, onFin }: { v: Vehicle; fin: string; onFin: (f: string) => void }) {
  const admin = useAdmin();
  const s = store.state;
  const r = G.vehicleRider(v);
  const z = D.zoneOf(v.pos);
  const hist = v.history.slice().sort((a, b) => b.at - a.at);
  const entries = r
    ? D.financeFilter(s.finance.filter((e) => e.riderId === r.id && (!e.vehicleId || e.vehicleId === v.id)), fin).sort((a, b) => b.at - a.at)
    : [];
  const rec = s.recoveries.find((x) => x.vehicleId === v.id && !x.closedAt);
  return (
    <>
      <div className="dsec">
        <h3>
          Identity{" "}
          <Button size="sm" onClick={() => admin.editComponents(v.id)}>
            <Icon name="pencil" size={14} />
            Update record
          </Button>
        </h3>
        <dl className="kv">
          <dt>Chassis No. (master)</dt>
          <dd className="cell-mono" style={{ color: "var(--text)" }}>{v.chassisNo}</dd>
          <dt>Motor No.</dt>
          <dd className="cell-mono">{v.motorNo}</dd>
          <dt>Controller No.</dt>
          <dd className="cell-mono">{v.controllerNo}</dd>
          <dt>Registration No.</dt>
          <dd><Plate v={v} /></dd>
          <dt>IOP device ID</dt>
          <dd className="cell-mono">{v.iopId || "—"}</dd>
          <dt>Model</dt>
          <dd>{v.model}</dd>
          <dt>Odometer</dt>
          <dd>{U.km(v.odometer)}</dd>
        </dl>
      </div>

      <div className="dsec">
        <h3>
          Controls{" "}
          {v.immobilized ? <Badge tone="red" icon="lock">Immobilized</Badge> : <Badge tone="green" icon="power">Running</Badge>}
        </h3>
        {v.immobilized ? (
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
            Reason: <b>{(v.immobilizedReason && REASONS[v.immobilizedReason]) || "—"}</b>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>Vehicle is running normally.</p>
        )}
        <div className="actions-row">
          <ControlButton v={v} size="sm" />
          <Button size="sm" onClick={() => admin.vehicleStatus(v.id)}>
            <Icon name="flag" size={15} />
            Change status
          </Button>
          {rec ? (
            <Button size="sm" onClick={() => admin.copyRecoveryLink(v.id, rec.id)}>
              <Icon name="pin" size={15} />
              Copy recovery link
            </Button>
          ) : null}
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>Sent through the backend to the IOP GPS relay — the vehicle flips state only after the relay confirms.</p>
      </div>

      <div className="dsec">
        <h3>Assignment</h3>
        {r ? (
          <>
            <dl className="kv">
              <dt>Rider</dt>
              <dd><RiderLink r={r} /></dd>
              <dt>Customer ID</dt>
              <dd className="cell-mono">{r.customerId}</dd>
              <dt>Plan validity</dt>
              <dd>{r.plan ? U.fmtDateTime(r.plan.end) : "—"}</dd>
              <dt>Plan state</dt>
              <dd><PlanStateBadge r={r} /></dd>
            </dl>
            <div className="actions-row" style={{ marginTop: 12 }}>
              <Button size="sm" onClick={() => admin.goReplace(r.id)}>
                <Icon name="swap" size={15} />
                Replace vehicle
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="cell-sub" style={{ whiteSpace: "normal" }}>
              Not assigned.{v.status === "Inactive" ? "" : " Set status to Inactive once ready for the next rider."}
            </p>
            {v.status === "Inactive" ? (
              <div className="actions-row" style={{ marginTop: 10 }}>
                <Button size="sm" onClick={() => admin.goAssignVehicle(v.id)}>
                  <Icon name="link" size={15} />
                  Assign to rider
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="dsec">
        <h3>
          Location <Badge tone={ZONE_BADGE[z][0]}>{ZONE_BADGE[z][1]}</Badge>
        </h3>
        <div className="mini-map">
          <MiniMap v={v} />
        </div>
        <dl className="kv" style={{ marginTop: 10 }}>
          <dt>Position</dt>
          <dd>{locText(v)}</dd>
          <dt>Last GPS update</dt>
          <dd>{U.fmtDateTime(v.lastGps)} · {v.online ? "online" : "offline"}</dd>
          <dt>Last movement</dt>
          <dd>{U.fmtDateTime(v.lastMoved)}</dd>
          <dt>72-hour idle flag</dt>
          <dd>
            {D.inWarehouse(v) ? (
              <Badge tone="blue">Excluded — warehouse</Badge>
            ) : D.isIdle(v) ? (
              <Badge tone="amber">Idle {Math.floor((D.now() - v.lastMoved) / U.HOUR)}h</Badge>
            ) : (
              <Badge tone="green">Moving</Badge>
            )}
          </dd>
        </dl>
        <p className="field__hint" style={{ marginTop: 8 }}>Last known IOP GPS position, shown relative to the hub.</p>
      </div>

      <VehicleGpsSection vehicleId={v.id} />

      <div className="dsec">
        <h3>
          Vehicle history <span className="cell-sub">{hist.length} events</span>
        </h3>
        <div className="tl">
          {hist.map((h) => {
            const ic = HICON[h.type] || ["activity", "tone-grey"];
            return (
              <div className="tl-row" key={h.id}>
                <span className={"tl-dot " + ic[1]}>
                  <Icon name={ic[0]} size={15} />
                </span>
                <div>
                  <b>{h.title}</b>
                  <p>{h.detail || ""}</p>
                  {h.old ? (
                    <p>
                      <span className="cell-mono" style={{ textDecoration: "line-through" }}>{h.old}</span> →{" "}
                      <span className="cell-mono" style={{ color: "var(--text)" }}>{h.new}</span>{" "}
                      <span className="cell-sub" style={{ display: "inline" }}>(previous number kept)</span>
                    </p>
                  ) : null}
                  <time>{U.fmtDateTime(h.at)}</time>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {r ? (
        <div className="dsec">
          <h3>
            Financial history &amp; service logs <FinFilterSeg cur={fin} onPick={onFin} />
          </h3>
          {entries.length ? (
            <div className="fin-list">{entries.map((e) => <FinRow key={e.id} e={e} />)}</div>
          ) : (
            <p className="cell-sub">No records for this filter.</p>
          )}
        </div>
      ) : null}

      <div className="dsec">
        <h3>Danger zone</h3>
        <p className="field__hint" style={{ marginBottom: 10 }}>
          Deleting removes this scooter from the fleet, map and alerts. It is refused while a rider holds it.
          History is kept, and re-adding the same IOP ID restores the record.
        </p>
        <Button size="sm" variant="danger" onClick={() => admin.deleteVehicle(v.id)}>
          <Icon name="trash" size={15} />
          Delete vehicle
        </Button>
      </div>
    </>
  );
}


export function DocTiles({ r }: { r: Rider }) {
  const admin = useAdmin();
  // Server-driven doc list (App content → KYC documents); unknown kinds render
  // generically. Labelling/fallback rules live in lib/qvek/kyc-tiles.ts.
  const tiles = kycTileModels(r, store.state.config.kycDocs);
  return (
    <div className="doc-grid">
      {tiles.map((tile) => {
        const badge =
          tile.status === "verified" ? (
            <Badge tone="green">Verified</Badge>
          ) : tile.status === "submitted" ? (
            <Badge tone="amber">Submitted</Badge>
          ) : tile.required ? (
            <Badge tone="red">Missing</Badge>
          ) : (
            <Badge tone="grey">Optional</Badge>
          );

        if (tile.status === "missing" && !tile.fileUrl) {
          return (
            <div key={tile.kind} className="doc doc--missing">
              <div className="doc__thumb"><Icon name="file" size={26} /></div>
              <div className="doc__meta">
                <b>{tile.title}</b>
                {badge}
              </div>
            </div>
          );
        }

        if (!tile.known) {
          // Custom kinds: open the uploaded file directly (no preview modal yet).
          return (
            <a key={tile.kind} className="doc" href={tile.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <div className="doc__thumb"><Icon name="image" size={26} /></div>
              <div className="doc__meta">
                <b>{tile.title}</b>
                <small>{tile.fileName ?? "Uploaded"}</small>
                {badge}
              </div>
            </a>
          );
        }

        return (
          <button key={tile.kind} type="button" className="doc" onClick={() => admin.viewDoc(r.id, tile.kind as KycKey)}>
            <div className="doc__thumb">
              {tile.fileUrl ? (
                // Real uploaded file; the signed URL loads the thumbnail itself.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tile.fileUrl} alt={tile.title} loading="lazy" />
              ) : (
                <Icon name="image" size={26} />
              )}
            </div>
            <div className="doc__meta">
              <b>{tile.title}</b>
              <small>{tile.fileName ?? "Uploaded"}</small>
              {badge}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Dev-only: simulate a gateway capture for a rider's pending payments (NEXT_PUBLIC_ENABLE_MOCK_CAPTURE=1). */
function TestPayments({ riderId }: { riderId: string }) {
  const { data } = usePayments(riderId, mockCaptureEnabled);
  const capture = useMockCapture(riderId);
  if (!mockCaptureEnabled) return null;
  const pending = (data ?? []).filter((p) => p.status === "PENDING");
  if (!pending.length) return null;
  return (
    <div className="dsec">
      <h3>
        Test payments <Badge tone="amber">Dev only</Badge>
      </h3>
      <div className="fin-list">
        {pending.map((p) => (
          <div className="fin-row" key={p.id}>
            <span className="fin-row__icon tone-amber">
              <Icon name="flask" size={15} />
            </span>
            <div style={{ minWidth: 0 }}>
              <b>
                {formatPaise(p.amountPaise)} · {p.kind}
              </b>
              <small>{p.gatewayOrderId}</small>
            </div>
            <Button size="sm" disabled={capture.isPending} onClick={() => capture.mutate(p.id)}>
              Simulate capture
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiderDrawerBody({ r, fin, onFin }: { r: Rider; fin: string; onFin: (f: string) => void }) {
  const admin = useAdmin();
  // Fetch this rider's KYC record (pending riders are fetched up-front by the live-data provider).
  useEffect(() => {
    requestKyc(r.id);
  }, [r.id]);
  const s = store.state;
  const v = G.riderVehicle(r);
  const k = D.kycSummary(r);
  const st = appStage(r);
  const entries = D.financeFilter(s.finance.filter((e) => e.riderId === r.id), fin).sort((a, b) => b.at - a.at);
  const depositUsed = r.deposit.used ?? 0;
  const depositRemaining = Math.max(0, r.deposit.amount - depositUsed);
  const el = D.eligibility(r);
  const edits = r.edits || [];
  const purge = usePurgeRider(r.id);
  const cancelDeletion = useCancelRiderDeletion(r.id);
  const refund = useRefundDeposit(r.id);
  const doReturn = useReturnRider(r.id);
  const ui = useUI();

  const confirmReturn = () => {
    void (async () => {
      const ok = await ui.confirm({
        title: `Mark ${r.name}'s scooter as returned?`,
        icon: "warehouse",
        confirmLabel: "Return vehicle",
        body: (
          <>
            <p>The active assignment ends and the scooter is released as <b>Inactive</b> (available again).</p>
            <p style={{ marginTop: 10 }}>The rider moves to <b>Returned</b>. Use &ldquo;Repair&rdquo; instead from the vehicle drawer if it needs work.</p>
          </>
        ),
      });
      if (ok) doReturn.mutate({ reason: "vehicle returned to hub" });
    })();
  };

  const confirmRefund = () => {
    void (async () => {
      const amount = depositRemaining;
      const ok = await ui.confirm({
        title: `Refund ${U.money(amount)} deposit to ${r.name}?`,
        icon: "rupee",
        confirmLabel: "Record refund",
        body: (
          <p>
            Adds a <b>refund</b> row to the rider&rsquo;s financial history and audits it. Pay the money
            out of band (cash/UPI) — this records the settlement, it does not transfer funds.
          </p>
        ),
      });
      if (ok) refund.mutate("security deposit refunded");
    })();
  };

  const confirmPurge = () => {
    void (async () => {
      const ok = await ui.confirm({
        title: `Purge ${r.name}'s data?`,
        icon: "trash",
        kind: "danger",
        confirmLabel: "Purge permanently",
        body: (
          <>
            <p>
              Personal data is anonymised and unrecoverable: profile, KYC numbers, uploaded documents,
              push tokens and sessions are removed.
            </p>
            <p style={{ marginTop: 10 }}>
              Payment, expense and rental rows are kept with minimised identifiers for tax and dispute
              retention. This action is audited.
            </p>
          </>
        ),
      });
      if (ok) purge.mutate();
    })();
  };

  return (
    <>
      {r.application.status === "approved" ? (
        <div className="dsec">
          <h3>
            Return &amp; settlement <Badge tone="blue">Before deletion</Badge>
          </h3>
          <dl className="kv">
            <dt>Vehicle</dt>
            <dd>
              {v ? (
                <>
                  <Plate v={v} />
                  <span className="cell-sub" style={{ display: "block" }}>IOP {v.iopId || "—"}</span>
                </>
              ) : (
                <span className="cell-sub">Returned / none</span>
              )}
            </dd>
            <dt>Deposit</dt>
            <dd>
              {r.deposit.status === "received" ? (
                <Badge tone="green">{U.money(r.deposit.amount)} held</Badge>
              ) : r.deposit.status === "refunded" ? (
                <Badge tone="violet">Refunded</Badge>
              ) : (
                <Badge tone="amber">Pending</Badge>
              )}
            </dd>
          </dl>
          <div className="actions-row" style={{ marginTop: 12 }}>
            {v ? (
              <Button size="sm" disabled={doReturn.isPending} onClick={confirmReturn}>
                <Icon name="warehouse" size={15} />
                {doReturn.isPending ? "Returning…" : "Mark vehicle returned"}
              </Button>
            ) : null}
            {r.deposit.status === "received" && depositRemaining > 0 ? (
              <Button size="sm" variant="subtle" disabled={refund.isPending} onClick={confirmRefund}>
                <Icon name="rupee" size={15} />
                {refund.isPending ? "Recording…" : `Refund deposit (${U.money(depositRemaining)})`}
              </Button>
            ) : null}
          </div>
          <p className="field__hint" style={{ marginTop: 10 }}>
            Account purge requires the scooter back and the deposit refunded, so riders can&rsquo;t lose their
            refund when their contact details are anonymised.
          </p>
        </div>
      ) : null}
      {r.deletionRequestedAt ? (
        <div className="dsec" style={{ borderColor: "#5A2632" }}>
          <h3>
            Deletion requested <Badge tone="red">Account deletion</Badge>
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            Requested on <b>{U.fmtDateTime(r.deletionRequestedAt)}</b>. The rider cannot log in while the
            request is open. Privacy requests must be honoured within 30 days; the daily job purges
            automatically after that if the account is clear.
          </p>
          <div className="actions-row" style={{ marginTop: 12 }}>
            <Button variant="danger-ghost" size="sm" disabled={purge.isPending} onClick={confirmPurge}>
              <Icon name="trash" size={15} />
              {purge.isPending ? "Purging…" : "Purge data now"}
            </Button>
            <Button
              variant="subtle"
              size="sm"
              disabled={cancelDeletion.isPending}
              onClick={() => cancelDeletion.mutate()}
            >
              <Icon name="undo" size={15} />
              {cancelDeletion.isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          </div>
        </div>
      ) : null}
      {st === "pending" ? (
        <div className="dsec" style={{ borderColor: "#4E3E18" }}>
          <h3>
            Decision <Badge tone="amber">Pending review</Badge>
          </h3>
              {!k.complete ? (
                <div className="notice notice--warn" style={{ marginBottom: 12 }}>
                  <Icon name="alert" size={16} />
                  <span>
                      {r.kycLoaded ? "KYC details are incomplete (" + k.submitted + "/" + k.total + " required). Add them from “Edit KYC” before approving." : "Loading KYC details…"}
                  </span>
                </div>
              ) : null}
          <div className="notice notice--info" style={{ marginBottom: 12 }}>
            <Icon name="info" size={16} />
            <span>
              Approving confirms the {U.money(store.state.config.deposit)} deposit.
            </span>
          </div>
          <div className="actions-row">
            <Button variant="primary" onClick={() => admin.approve(r.id)}>
              <Icon name="check" size={16} />
              Approve
            </Button>
            <Button variant="danger-ghost" onClick={() => admin.reject(r.id)}>
              <Icon name="x" size={16} />
              Reject
            </Button>
          </div>
        </div>
      ) : st === "rejected" ? (
        <div className="notice notice--error">
          <Icon name="ban" size={16} />
          <span>
            <b>Rejected</b> {U.fmtDate(r.application.reviewedAt)} — {r.application.note || "No reason recorded"}
          </span>
        </div>
      ) : st === "deposit" ? (
        <div className="notice notice--warn">
          <Icon name="wallet" size={16} />
          <span>
            <b>Approved, awaiting deposit.</b> Record the deposit when received offline, or the rider can pay in-app.
          </span>
        </div>
      ) : null}

      <div className="dsec">
        <h3>
          Profile{" "}
          <Button size="sm" onClick={() => admin.editRider(r.id)}>
            <Icon name="pencil" size={14} />
            Edit details
          </Button>
        </h3>
        <dl className="kv">
          <dt>Full name</dt>
          <dd>{r.name}</dd>
          <dt>Mobile</dt>
          <dd>{U.phone(r.phone)}</dd>
          <dt>Age</dt>
          <dd>{r.age}</dd>
          <dt>Work platform</dt>
          <dd>{r.platform}</dd>
          <dt>Customer ID</dt>
          <dd className={r.customerId ? "cell-mono" : undefined}>{r.customerId || "Assigned on approval"}</dd>
          <dt>Applied</dt>
          <dd>{U.fmtDateTime(r.application.submittedAt)} · {r.source === "admin" ? "by admin" : "in app"}</dd>
          {edits.length ? (
            <>
              <dt>Last edited</dt>
              <dd>{U.fmtDateTime(edits[edits.length - 1].at)} · by admin</dd>
            </>
          ) : null}
        </dl>
        {edits.length ? (
          <details className="edit-log">
            <summary>Edit history ({edits.length})</summary>
            {edits
              .slice()
              .reverse()
              .map((e, i) => (
                <p key={i}>
                  <b>{U.fmtDateTime(e.at)}</b> · {e.by}
                  <br />
                  {e.what}
                </p>
              ))}
          </details>
        ) : null}
      </div>

      <div className="dsec">
      <h3>
        KYC documents {k.allVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">{k.submitted}/{k.total} submitted</Badge>}{" "}
          <Button size="sm" onClick={() => admin.editKyc(r.id)}>
            <Icon name="pencil" size={14} />
            Edit KYC
          </Button>
        </h3>
        <DocTiles r={r} />
        {r.kycInfo?.fullName ? (
          <p className="field__hint" style={{ marginTop: 8 }}>
            Name on KYC: <b style={{ color: "var(--text)" }}>{r.kycInfo.fullName}</b>
          </p>
        ) : null}
        <p className="field__hint" style={{ marginTop: 8 }}>Only the last 4 digits of the number are stored. Click a card to open the uploaded file.</p>
      </div>

      <div className="dsec">
        <h3>
          Security deposit{" "}
          {r.deposit.status === "received" ? <Badge tone="green">Received</Badge> : r.deposit.status === "refunded" ? <Badge tone="violet">Refunded</Badge> : <Badge tone="amber">Pending</Badge>}
        </h3>
        {r.deposit.status === "received" ? (
          <dl className="kv">
            <dt>Collected</dt>
            <dd>{U.money(r.deposit.amount)}</dd>
            {depositUsed > 0 ? (
              <>
                <dt>Used for expenses</dt>
                <dd>{U.money(depositUsed)}</dd>
                <dt>Remaining</dt>
                <dd>
                  {U.money(depositRemaining)}{" "}
                  {depositRemaining === 0 ? <Badge tone="amber">Fully used</Badge> : null}
                </dd>
              </>
            ) : null}
            <dt>Mode</dt>
            <dd>{r.deposit.mode === "online" ? "Paid online (in-app)" : "Offline — recorded by admin"}</dd>
            <dt>Date</dt>
            <dd>{U.fmtDateTime(r.deposit.at)}</dd>
          </dl>
        ) : r.deposit.status === "refunded" ? (
          <p className="cell-sub">Deposit refunded after return.</p>
        ) : (
          <p style={{ color: "var(--text-2)", fontSize: 13 }}>
            Required amount: <b>{U.money(s.config.deposit)}</b>, collected offline or User can Pay online. It is recorded when the application is approved.
          </p>
        )}
      </div>

      {r.application.status === "approved" ? (
        <div className="dsec">
          <h3>
            Rental &amp; vehicle{" "}
            <Button size="sm" onClick={() => admin.riderStatus(r.id)}>
              <Icon name="flag" size={14} />
              Change status
            </Button>
          </h3>
          <dl className="kv">
            <dt>Status</dt>
            <dd><AssetBadge status={r.status} /></dd>
            <dt>Vehicle</dt>
            <dd>
              {v ? (
                <button type="button" className="link" onClick={() => admin.openVehicle(v.id)}>
                  {v.regNo}
                </button>
              ) : (
                "—"
              )}
            </dd>
            <dt>Plan</dt>
            <dd>{r.plan ? r.plan.name : "—"}</dd>
            <dt>Valid until</dt>
            <dd>{r.plan ? U.fmtDateTime(r.plan.end) : "—"}</dd>
            {r.grace && !r.grace.lapsed ? (
              <>
                <dt>Grace ends</dt>
                <dd style={{ color: "var(--warning)" }}>{U.fmtDateTime(r.grace.end)}</dd>
              </>
            ) : null}
          </dl>
          {!v && el.ok ? (
            <div className="actions-row" style={{ marginTop: 12 }}>
              <Button variant="primary" size="sm" onClick={() => admin.goAssign(r.id)}>
                <Icon name="link" size={15} />
                Assign vehicle
              </Button>
            </div>
          ) : null}
          {!v && !el.ok && r.status === "Inactive" ? (
            <p className="field__hint" style={{ marginTop: 10 }}>
              Vehicle assignment unlocks after: {el.checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="dsec">
        <h3>
          Financial history <FinFilterSeg cur={fin} onPick={onFin} />
        </h3>
        {entries.length ? (
          <div className="fin-list">{entries.map((e) => <FinRow key={e.id} e={e} />)}</div>
        ) : (
          <p className="cell-sub">No records for this filter.</p>
        )}
      </div>
      <TestPayments riderId={r.id} />

      {!r.deletionRequestedAt ? (
        <div className="dsec">
          <h3>Danger zone</h3>
          <p className="field__hint" style={{ marginBottom: 10 }}>
            Deleting removes this rider from every list and blocks app login. Profile, KYC numbers,
            documents, push tokens and sessions are erased; payment and rental rows are kept with
            minimised identifiers. Blocked while a scooter is assigned or a deposit is still held.
          </p>
          <Button size="sm" variant="danger" onClick={() => admin.deleteRider(r.id)}>
            <Icon name="trash" size={15} />
            Delete rider
          </Button>
        </div>
      ) : null}
    </>
  );
}
