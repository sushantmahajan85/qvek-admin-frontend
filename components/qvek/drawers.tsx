"use client";

/* Bodies of the vehicle-record and rider slide-over drawers (ported from vehicleDrawerHTML / riderDrawerHTML). */
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/features/config/api";
import { requestKyc } from "@/features/live/requests";
import { mockCaptureEnabled, useMockCapture, usePayments } from "@/features/payments/hooks";
import { D, G, store } from "@/lib/qvek/store";
import { ZONE_BADGE, appStage, locText } from "@/lib/qvek/selectors";
import type { HistoryType, KycKey, Rider, Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { useAdmin } from "./admin-context";
import { AssetBadge, ControlButton, FinFilterSeg, FinRow, Plate, PlanStateBadge, RiderLink } from "./bits";
import { DOC_TITLES, DocSvg } from "./doc-svg";
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
    </>
  );
}

export function DocTiles({ r }: { r: Rider }) {
  const admin = useAdmin();
  const fileFor = (k: KycKey) => r.kycInfo?.docs.find((d) => d.kind === k) ?? null;
  return (
    <div className="doc-grid">
      {(["aadhaar", "pan", "dl"] as KycKey[]).map((k) => {
        const d = r.kyc[k] || { status: "missing" as const };
        const file = fileFor(k);
        if (d.status === "missing" && !file) {
          return (
            <div key={k} className="doc doc--missing">
              <div className="doc__thumb"><Icon name="file" size={26} /></div>
              <div className="doc__meta">
                <b>{DOC_TITLES[k]}</b>
                <Badge tone="red">Missing</Badge>
              </div>
            </div>
          );
        }
        return (
          <button key={k} type="button" className="doc" onClick={() => admin.viewDoc(r.id, k)}>
            <div className="doc__thumb">
              {file ? (
                // Real uploaded file; the signed URL loads the thumbnail itself.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={DOC_TITLES[k]} loading="lazy" />
              ) : d.sample ? (
                <DocSvg kind={k} name={r.name} phone={r.phone} />
              ) : (
                <Icon name="image" size={26} />
              )}
            </div>
            <div className="doc__meta">
              <b>{DOC_TITLES[k]}</b>
              <small>{file?.name ?? d.file ?? "Uploaded"}</small>
              {d.status === "verified" ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Submitted</Badge>}
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
  const el = D.eligibility(r);
  const edits = r.edits || [];

  return (
    <>
      {st === "pending" ? (
        <div className="dsec" style={{ borderColor: "#4E3E18" }}>
          <h3>
            Decision <Badge tone="amber">Pending review</Badge>
          </h3>
          {!k.complete ? (
            <div className="notice notice--warn" style={{ marginBottom: 12 }}>
              <Icon name="alert" size={16} />
              <span>
                {r.kycLoaded ? "KYC details are incomplete (" + k.submitted + "/3). Add them from “Edit KYC” before approving." : "Loading KYC details…"}
              </span>
            </div>
          ) : null}
          <div className="notice notice--info" style={{ marginBottom: 12 }}>
            <Icon name="info" size={16} />
            <span>
              Approving confirms the ₹3,000 deposit <b>and</b> the first week&apos;s rent were collected offline. It unlocks the rider app.
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
          KYC documents {k.allVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">{k.submitted}/3 submitted</Badge>}{" "}
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
        {r.kycInfo?.docs.length ? (
          <div className="actions-row" style={{ marginTop: 8 }}>
            {r.kycInfo.docs.map((d) => (
              <a key={d.key} className="link" href={d.url} target="_blank" rel="noreferrer">
                {d.key.split("/").pop()}
              </a>
            ))}
          </div>
        ) : null}
        <p className="field__hint" style={{ marginTop: 8 }}>Only the last 4 digits are stored. Uploaded file links expire after 5 minutes.</p>
      </div>

      <div className="dsec">
        <h3>
          Security deposit{" "}
          {r.deposit.status === "received" ? <Badge tone="green">Received</Badge> : r.deposit.status === "refunded" ? <Badge tone="violet">Refunded</Badge> : <Badge tone="amber">Pending</Badge>}
        </h3>
        {r.deposit.status === "received" ? (
          <dl className="kv">
            <dt>Amount</dt>
            <dd>{U.money(r.deposit.amount)}</dd>
            <dt>Mode</dt>
            <dd>{r.deposit.mode === "online" ? "Paid online (in-app)" : "Offline — recorded by admin"}</dd>
            <dt>Date</dt>
            <dd>{U.fmtDateTime(r.deposit.at)}</dd>
          </dl>
        ) : r.deposit.status === "refunded" ? (
          <p className="cell-sub">Deposit refunded after return.</p>
        ) : (
          <p style={{ color: "var(--text-2)", fontSize: 13 }}>
            Required amount: <b>{U.money(s.config.deposit)}</b>, collected offline with the first week&apos;s rent. It is recorded when the application is approved.
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
    </>
  );
}
