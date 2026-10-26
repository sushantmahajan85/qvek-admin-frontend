"use client";

/*
 * Modal flows (approve / reject / status / vehicle record / KYC / add rider / …).
 * Each one keeps the prototype's dialog design and copy; the actions call the real API through the
 * feature hooks (features/*), except the few that have no backend endpoint yet — those are simulated
 * locally (features/live/sim-actions.ts) and say so.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useUpdateRecord, useCreateVehicle, useDisarmVehicle, useReactivateVehicle } from "@/features/fleet/hooks";
import { useUpsertKyc } from "@/features/kyc/hooks";
import { useVerifyPayment } from "@/features/payments/hooks";
import { kycSchema } from "@/features/kyc/api";
import { ASSET_TO_API } from "@/features/live/map-state";
import { simVehicleStatus } from "@/features/live/sim-actions";
import { riderKeys } from "@/features/riders/api";
import { useApproveRider, useCreateRider, useRejectRider, useTransitionRider, useUpdateRider } from "@/features/riders/hooks";
import { STATUS_DESC, FIN_STATUS } from "@/lib/qvek/selectors";
import { D, G, L, store } from "@/lib/qvek/store";
import type { AssetStatus, KycKey, Rider, Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { AssetBadge, FieldError } from "./bits";
import { DOC_TITLES } from "./doc-svg";
import { Icon } from "./icon";
import { Modal } from "./modal";
import { useUI } from "./ui-context";

/* ---------------------------------------------------------------- immobilize / unlock (real API) */
export function ControlFlow({ id, op }: { id: string; op: "immobilize" | "reactivate" }) {
  const disarm = useDisarmVehicle();
  const reactivate = useReactivateVehicle();
  const busy = disarm.isPending || reactivate.isPending;
  const v = G.vehicle(id)!;
  const r = G.vehicleRider(v);
  const im = op === "immobilize";
  const [sel, setSel] = useState("");
  const [other, setOther] = useState("");
  const [err, setErr] = useState(false);
  const otherRef = useRef<HTMLInputElement>(null);
  const reasons = im ? ["Recovery in progress", "Suspected misuse", "Rider request", "Safety check"] : ["Recovery — agent on site", "Issue resolved", "Rider back in operational zone", "Payment verified manually"];

  useEffect(() => {
    if (sel === "other") otherRef.current?.focus();
  }, [sel]);

  return (
    <Modal
      title={(im ? "Immobilize " : "Unlock ") + v.regNo + "?"}
      icon={im ? "lock" : "unlock"}
      tone={im ? "danger" : "primary"}
      size="sm"
      subtitle={r ? "Rider: " + r.name + " · " + r.customerId : "No rider assigned"}
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: im ? "Immobilize" : "Unlock",
          kind: im ? "danger" : "primary",
          icon: im ? "lock" : "unlock",
          busy: busy ? "Sending to tracker…" : undefined,
          onClick: async () => {
            const reason = sel === "other" ? other.trim() : sel;
            if (!reason) {
              setErr(true);
              return false;
            }
            try {
              if (im) await disarm.mutateAsync({ id: v.id, reason });
              else await reactivate.mutateAsync({ id: v.id, reason });
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      {im ? (
        <p>The scooter will be immobilized via the IOP relay. The rider is not notified automatically yet.</p>
      ) : (
        <p>
          The scooter will be reactivated via the IOP relay.{" "}
          {v.immobilizedReason === "plan_expiry" && r && !(r.plan && r.plan.end > D.now()) ? (
            <>
              <b>Note:</b> the rider’s plan is not valid.
            </>
          ) : null}
        </p>
      )}
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="ctl-reason">
          Reason <span className="req">*</span>
        </label>
        <select
          className="select"
          id="ctl-reason"
          value={sel}
          onChange={(e) => {
            setSel(e.target.value);
            setErr(false);
          }}
        >
          <option value="">Select a reason</option>
          {reasons.map((x) => (
            <option key={x}>{x}</option>
          ))}
          <option value="other">Other…</option>
        </select>
        <input
          ref={otherRef}
          className="input"
          id="ctl-other"
          placeholder="Describe the reason"
          style={{ marginTop: 8 }}
          hidden={sel !== "other"}
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
        {err ? <FieldError>Select or enter a reason.</FieldError> : null}
      </div>
      <p className="field__hint" style={{ marginTop: 10 }}>Sent through the backend to the IOP GPS relay. The vehicle flips state only after the relay confirms; failures keep the current state.</p>
    </Modal>
  );
}

/* ---------------------------------------------------------------- approve */
export function ApproveFlow({ id }: { id: string }) {
  const r = G.rider(id)!;
  const approve = useApproveRider(id);
  const k = D.kycSummary(r);
  const [paid, setPaid] = useState(false);
  return (
    <Modal
      title={"Approve " + r.name + "?"}
      icon="userCheck"
      tone="primary"
      size="sm"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Approve",
          kind: "primary",
          icon: "check",
          disabled: !paid,
          busy: approve.isPending ? "Approving…" : undefined,
          onClick: async () => {
            try {
              // The hook toasts success / the server's error code (features/riders/hooks.ts).
              await approve.mutateAsync(true);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <ul className="checklist">
        <li className={k.complete || k.submitted > 0 ? "ok" : "no"}>
          <span className="tick"><Icon name={k.complete || k.submitted > 0 ? "check" : "x"} size={14} /></span>
          {k.complete ? "KYC documents reviewed (3/3)" : k.submitted > 0 ? "KYC details on file (" + k.submitted + "/3)" : "No KYC details on file"}
        </li>
        <li className={paid ? "ok" : "no"}>
          <span className="tick"><Icon name={paid ? "check" : "x"} size={14} /></span>Deposit + first week rent collected offline
        </li>
      </ul>
      <div className="notice notice--warn" style={{ marginTop: 12 }}>
        <Icon name="alert" size={16} />
        <span>Approval confirms the ₹3,000 security deposit and the first week&apos;s rent were collected offline. It unlocks the rider app.</span>
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" id="ap-paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Paid token collected
      </label>
      <p style={{ marginTop: 12 }}>The rider keeps the Customer ID they were issued at sign-up.</p>
    </Modal>
  );
}

/* ---------------------------------------------------------------- reject */
export function RejectFlow({ id }: { id: string }) {
  const r = G.rider(id)!;
  const reject = useRejectRider(id);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState(false);
  return (
    <Modal
      title={"Reject " + r.name + "’s application?"}
      icon="ban"
      tone="danger"
      size="sm"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Reject application",
          kind: "danger",
          busy: reject.isPending ? "Rejecting…" : undefined,
          onClick: async () => {
            const v = reason.trim();
            if (v.length < 3) {
              setErr(true);
              return false;
            }
            try {
              await reject.mutateAsync(v);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <div className="field">
        <label htmlFor="rj-reason">
          Reason (stored in the audit log) <span className="req">*</span>
        </label>
        <textarea
          className="textarea"
          id="rj-reason"
          maxLength={200}
          placeholder="e.g. PAN photo is blurry — please re-apply with a clear image"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {err ? <FieldError>Enter a short reason (at least 3 characters).</FieldError> : null}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- change status */
const SERVER_BACKED = new Set<AssetStatus>(["Marked_for_recovery", "Returned", "Blacklisted"]);

export function StatusFlow({ kind, id }: { kind: "rider" | "vehicle"; id: string }) {
  const ui = useUI();
  const isR = kind === "rider";
  const obj = (isR ? G.rider(id) : G.vehicle(id))!;
  const holder = isR ? (obj as Rider) : G.vehicleRider(obj as Vehicle);
  const transition = useTransitionRider(holder ? holder.id : "");
  const options: AssetStatus[] = isR ? ["Inactive", "Active", "Marked_for_recovery", "Blacklisted", "Returned"] : ["Inactive", "Active", "Marked_for_recovery", "Returned", "Repair_req"];
  const [sel, setSel] = useState<string | null>(obj.status);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const label = isR ? (obj as Rider).name : (obj as { regNo: string }).regNo;
  return (
    <Modal
      title={"Change " + (isR ? "rider" : "vehicle") + " status"}
      subtitle={isR ? (obj as Rider).name + " · " + ((obj as Rider).customerId ?? "applicant") : (obj as { regNo: string }).regNo}
      icon="flag"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Update status",
          kind: "primary",
          busy: transition.isPending ? "Saving…" : undefined,
          onClick: async () => {
            const rs = reason.trim();
            if (!sel || sel === obj.status) {
              setErr("Choose a different status.");
              return false;
            }
            if (rs.length < 3) {
              setErr("Add a short reason (at least 3 characters) — it is recorded in the audit log.");
              return false;
            }
            const next = sel as AssetStatus;
            // Rider lifecycle changes are real (audited by the backend); vehicle-only overrides are simulated.
            if (holder && (isR || SERVER_BACKED.has(next))) {
              try {
                await transition.mutateAsync({ status: ASSET_TO_API[next], reason: rs });
              } catch {
                return false;
              }
            } else {
              simVehicleStatus(obj as Vehicle, next, rs);
              ui.toast(label + " → " + next, { title: "Simulated — vehicle status is server-driven", type: "info" });
            }
          },
        },
      ]}
    >
      <div className="pick-list" role="radiogroup" aria-label="Status" style={{ maxHeight: "none" }}>
        {options.map((o) => (
          <button key={o} type="button" className="pick" role="radio" aria-checked={sel === o} onClick={() => setSel(o)}>
            <span className="radio-dot" />
            <span className="pick__body">
              <b>
                <AssetBadge status={o} /> <span className="cell-mono" style={{ marginLeft: 6 }}>{o}</span>
              </b>
              <small style={{ whiteSpace: "normal", marginTop: 4 }}>{STATUS_DESC[o]}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="st-reason">
          Reason / note <span className="req">*</span>
        </label>
        <input className="input" id="st-reason" placeholder="Why is the status changing?" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err ? <FieldError>{err}</FieldError> : null}
      </div>
      {isR ? (
        <p className="field__hint" style={{ marginTop: 8 }}>Every transition is audited with your name and reason. Blacklisted riders cannot be moved without a director override.</p>
      ) : (
        <p className="field__hint" style={{ marginTop: 8 }}>
          Marked for recovery / Returned / Blacklisted change the assigned rider on the server. Active, Inactive and Repair_req are simulated here — vehicle status is driven by IOP and the rental rules.
        </p>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- vehicle record (chassis / motor / controller) */
export function ComponentsFlow({ id }: { id: string }) {
  const v = G.vehicle(id)!;
  const update = useUpdateRecord(id);
  const blank = (s: string) => (s === "—" ? "" : s);
  const [chassis, setChassis] = useState(blank(v.chassisNo));
  const [motor, setMotor] = useState(blank(v.motorNo));
  const [ctrl, setCtrl] = useState(blank(v.controllerNo));
  const [err, setErr] = useState("");
  return (
    <Modal
      title="Update vehicle record"
      subtitle={"Chassis " + v.chassisNo + " (master record)"}
      icon="cpu"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Save changes",
          kind: "primary",
          icon: "check",
          busy: update.isPending ? "Saving…" : undefined,
          onClick: async () => {
            const ch = chassis.trim().toUpperCase();
            const mo = motor.trim().toUpperCase();
            const co = ctrl.trim().toUpperCase();
            const re = /^[A-Z0-9-]{2,64}$/;
            if ((ch && !re.test(ch)) || (mo && !re.test(mo)) || (co && !re.test(co))) {
              setErr("Use letters, digits or hyphens (2–64 characters).");
              return false;
            }
            const patch = {
              ...(ch && ch !== blank(v.chassisNo) ? { chassisNo: ch } : {}),
              ...(mo && mo !== blank(v.motorNo) ? { motorNo: mo } : {}),
              ...(co && co !== blank(v.controllerNo) ? { controllerNo: co } : {}),
            };
            if (!Object.keys(patch).length) {
              setErr("No changes to save.");
              return false;
            }
            const dupe = store.state.vehicles.find((x) => x.id !== v.id && ((patch.chassisNo && x.chassisNo === patch.chassisNo) || (patch.motorNo && x.motorNo === patch.motorNo) || (patch.controllerNo && x.controllerNo === patch.controllerNo)));
            if (dupe) {
              setErr("That number is already linked to " + dupe.regNo + ".");
              return false;
            }
            try {
              // The hook toasts success / the server's error code (features/fleet/hooks.ts).
              await update.mutateAsync(patch);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <div className="notice notice--info" style={{ marginBottom: 14 }}>
        <Icon name="info" size={16} />
        <span>Use this when a chassis, motor or controller number changes. The previous number is kept in the vehicle history.</span>
      </div>
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="cm-chassis">Chassis No. (master)</label>
          <input className="input" id="cm-chassis" value={chassis} onChange={(e) => setChassis(e.target.value)} autoComplete="off" />
          <div className="field__hint">Current: {v.chassisNo}</div>
        </div>
        <div className="field">
          <label htmlFor="cm-motor">Motor No.</label>
          <input className="input" id="cm-motor" value={motor} onChange={(e) => setMotor(e.target.value)} autoComplete="off" />
          <div className="field__hint">Current: {v.motorNo}</div>
        </div>
        <div className="field">
          <label htmlFor="cm-ctrl">Controller No.</label>
          <input className="input" id="cm-ctrl" value={ctrl} onChange={(e) => setCtrl(e.target.value)} autoComplete="off" />
          <div className="field__hint">Current: {v.controllerNo}</div>
        </div>
      </div>
      {err ? <FieldError style={{ marginTop: 8 }}>{err}</FieldError> : null}
    </Modal>
  );
}

/* ---------------------------------------------------------------- add vehicle */
export function AddVehicleFlow() {
  const create = useCreateVehicle();
  const [vehicleNo, setVehicleNo] = useState("");
  const [iopId, setIopId] = useState("");
  const [chassis, setChassis] = useState("");
  const [motor, setMotor] = useState("");
  const [ctrl, setCtrl] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const cls = (f: string, extra = "") => "field" + extra + (errs[f] ? " has-error" : "");
  const err = (f: string) => (errs[f] ? <FieldError>{errs[f]}</FieldError> : null);
  return (
    <Modal
      title="Add vehicle"
      subtitle="Registers a scooter in the fleet"
      icon="scooter"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Add vehicle",
          kind: "primary",
          icon: "plus",
          busy: create.isPending ? "Adding…" : undefined,
          onClick: async () => {
            const e: Record<string, string> = {};
            const vn = vehicleNo.trim();
            const io = iopId.trim();
            const ch = chassis.trim();
            if (vn.length < 2) e.vehicleNo = "Enter the vehicle number (e.g. QVEK-003).";
            if (!io) e.iopId = "Enter the IOP device id.";
            if (ch && ch.length < 2) e.chassis = "Chassis number is too short.";
            setErrs(e);
            if (Object.keys(e).length) return false;
            try {
              await create.mutateAsync({
                vehicleNo: vn,
                iopId: io,
                ...(ch ? { chassisNo: ch } : {}),
                ...(motor.trim() ? { motorNo: motor.trim() } : {}),
                ...(ctrl.trim() ? { controllerNo: ctrl.trim() } : {}),
              });
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <form id="av-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          <div className={cls("vehicleNo")}>
            <label htmlFor="av-no">
              Vehicle number <span className="req">*</span>
            </label>
            <input className="input" id="av-no" autoComplete="off" placeholder="e.g. QVEK-003" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
            {err("vehicleNo")}
          </div>
          <div className={cls("iopId")}>
            <label htmlFor="av-iop">
              IOP device id <span className="req">*</span>
            </label>
            <input className="input" id="av-iop" autoComplete="off" value={iopId} onChange={(e) => setIopId(e.target.value)} />
            {err("iopId")}
          </div>
          <div className={cls("chassis", " span-2")}>
            <label htmlFor="av-chassis">Chassis No. (master record)</label>
            <input className="input" id="av-chassis" autoComplete="off" value={chassis} onChange={(e) => setChassis(e.target.value)} />
            {err("chassis")}
          </div>
          <div className="field">
            <label htmlFor="av-motor">Motor No.</label>
            <input className="input" id="av-motor" autoComplete="off" value={motor} onChange={(e) => setMotor(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="av-ctrl">Controller No.</label>
            <input className="input" id="av-ctrl" autoComplete="off" value={ctrl} onChange={(e) => setCtrl(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- KYC document preview */
export function DocPreviewFlow({ riderId, docKey }: { riderId: string; docKey: KycKey }) {
  const r = G.rider(riderId)!;
  const d = r.kyc[docKey];
  const file = r.kycInfo?.docs.find((x) => x.kind === docKey) ?? null;
  const name = file?.name ?? "";
  const isPdf = /\.pdf$/i.test(name) || /\.pdf$/i.test(file?.key ?? "");
  return (
    <Modal
      title={DOC_TITLES[docKey] + " — " + r.name}
      subtitle={(d.file || name || "") + " · " + (d.status === "verified" ? "Verified" : "Submitted " + U.fmtDate(d.at))}
      size="lg"
      icon="idCard"
      actions={[
        ...(file
          ? [{ label: "Open full document", kind: "primary" as const, onClick: () => { window.open(file.url, "_blank", "noopener"); } }]
          : []),
        { label: "Close", kind: "ghost" },
      ]}
    >
      {file && !isPdf ? (
        <div className="doc-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={DOC_TITLES[docKey]} />
        </div>
      ) : file ? (
        <div className="empty">
          <span className="empty__icon"><Icon name="file" size={24} /></span>
          <b>{name || d.file}</b>
          <p>PDF preview isn&apos;t embedded — open the full document to review it, then verify from the KYC section.</p>
        </div>
      ) : (
        <div className="empty">
          <span className="empty__icon"><Icon name="image" size={24} /></span>
          <b>{d.file}</b>
          <p>Only the last 4 digits of the number are stored — full numbers never persist.</p>
        </div>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- edit rider details (real) */
export function EditRiderFlow({ id }: { id: string }) {
  const r = G.rider(id)!;
  const save = useUpdateRider(id);
  const known = L.platforms.includes(r.platform);
  const [name, setName] = useState(r.name);
  const [phone, setPhone] = useState(r.phone);
  const [age, setAge] = useState(String(r.age));
  const [platform, setPlatform] = useState(known ? r.platform : "Other");
  const [other, setOther] = useState(known ? "" : r.platform);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const otherRef = useRef<HTMLInputElement>(null);
  const showOther = platform === "Other";

  const fieldCls = (f: string, extra = "") => "field" + extra + (errs[f] ? " has-error" : "");
  const err = (f: string) => (errs[f] ? <FieldError>{errs[f]}</FieldError> : null);

  return (
    <Modal
      title="Edit rider details"
      subtitle={r.name + (r.customerId ? " · " + r.customerId : " · applicant")}
      icon="pencil"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Save changes",
          kind: "primary",
          icon: "check",
          busy: save.isPending ? "Saving…" : undefined,
          onClick: async () => {
            const nm = name.trim().replace(/\s+/g, " ");
            const ph = phone.trim().replace(/\D/g, "");
            const ag = Number(age.trim());
            const isOther = platform === "Other";
            const pf = isOther ? other.trim() : platform;
            const e: Record<string, string> = {};
            if (nm.length < 3 || !/^[A-Za-z][A-Za-z .'-]+$/.test(nm)) e.name = "Enter the full name (letters only, at least 3 characters).";
            if (!/^[6-9]\d{9}$/.test(ph.slice(-10)) || ph.length < 10) e.phone = "Enter a valid 10-digit mobile number.";
            if (!ag || ag < 16 || ag > 100) e.age = "Age must be between 16 and 100.";
            if (!pf) e[isOther ? "other" : "platform"] = "Enter the platform name.";
            const dupe = store.state.riders.find((x) => x.id !== id && x.phone.replace(/\D/g, "").slice(-10) === ph.slice(-10) && x.application.status !== "rejected");
            if (!e.phone && dupe) e.phone = "This mobile number is already registered to " + dupe.name + ".";
            setErrs(e);
            if (Object.keys(e).length) return false;
            const patch: { name?: string; phone?: string; age?: number; platform?: string } = {};
            if (nm !== r.name) patch.name = nm;
            if (ph !== r.phone) patch.phone = ph;
            if (ag !== r.age) patch.age = ag;
            if (pf !== r.platform) patch.platform = pf;
            if (!Object.keys(patch).length) {
              setErrs({ name: "No changes to save." });
              return false;
            }
            try {
              // The hook toasts success / the server's error code (features/riders/hooks.ts).
              await save.mutateAsync(patch);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <form id="er-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          <div className={fieldCls("name", " span-2")}>
            <label htmlFor="er-name">
              Full name <span className="req">*</span>
            </label>
            <input className="input" id="er-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            {err("name")}
          </div>
          <div className={fieldCls("phone")}>
            <label htmlFor="er-phone">
              Mobile number <span className="req">*</span>
            </label>
            <div className="input-prefix">
              <span>+91</span>
              <input id="er-phone" inputMode="numeric" maxLength={13} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field__hint">The rider signs in with this number.</div>
            {err("phone")}
          </div>
          <div className={fieldCls("age")}>
            <label htmlFor="er-age">
              Age <span className="req">*</span>
            </label>
            <input className="input" id="er-age" type="number" min={16} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
            {err("age")}
          </div>
          <div className={fieldCls("platform")}>
            <label htmlFor="er-platform">
              Work platform <span className="req">*</span>
            </label>
            <select
              className="select"
              id="er-platform"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                if (e.target.value === "Other") setTimeout(() => otherRef.current?.focus(), 0);
              }}
            >
              {L.platforms.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {err("platform")}
          </div>
          <div className={fieldCls("other")} id="er-other-wrap" hidden={!showOther}>
            <label htmlFor="er-other">
              Platform name <span className="req">*</span>
            </label>
            <input ref={otherRef} className="input" id="er-other" value={other} onChange={(e) => setOther(e.target.value)} />
            {err("other")}
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>Changes are saved to the rider record and audited.</p>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- KYC details (real) */
export function EditKycFlow({ id }: { id: string }) {
  const r = G.rider(id)!;
  const save = useUpsertKyc(id);
  const info = r.kycInfo;
  const [form, setForm] = useState({ fullName: info?.fullName ?? "", aadhaarNo: "", panNo: "", dlNo: "" });
  const [verified, setVerified] = useState(info?.verified ?? false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const cls = (f: string, extra = "") => "field" + extra + (errs[f] ? " has-error" : "");
  const err = (f: string) => (errs[f] ? <FieldError>{errs[f]}</FieldError> : null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal
      title="Edit KYC details"
      subtitle={r.name}
      icon="idCard"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Save KYC",
          kind: "primary",
          icon: "check",
          busy: save.isPending ? "Saving…" : undefined,
          onClick: async () => {
            const parsed = kycSchema.safeParse({ ...form, verified });
            if (!parsed.success) {
              const e: Record<string, string> = {};
              parsed.error.issues.forEach((i) => {
                const k = String(i.path[0]);
                if (!e[k]) e[k] = i.message;
              });
              setErrs(e);
              return false;
            }
            setErrs({});
            try {
              // The hook toasts success / the server's error code (features/kyc/hooks.ts).
              await save.mutateAsync(parsed.data);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <div id="ek-body">
        <p style={{ marginBottom: 12 }}>
          Enter the details from the rider&apos;s documents. Only the last 4 digits are stored — full numbers never persist. Leave a number blank to keep what is on file.
        </p>
        <div className="form-grid">
          <div className={cls("fullName", " span-2")}>
            <label htmlFor="kyc-name">Full name</label>
            <input className="input" id="kyc-name" autoComplete="off" placeholder="As per Aadhaar" value={form.fullName} onChange={set("fullName")} />
            {err("fullName")}
          </div>
          <div className={cls("aadhaarNo")}>
            <label htmlFor="kyc-aadhaar">Aadhaar number</label>
            <input className="input" id="kyc-aadhaar" inputMode="numeric" autoComplete="off" placeholder={info?.aadhaar ?? "12 digits"} value={form.aadhaarNo} onChange={set("aadhaarNo")} />
            {err("aadhaarNo")}
          </div>
          <div className={cls("panNo")}>
            <label htmlFor="kyc-pan">PAN</label>
            <input className="input" id="kyc-pan" autoComplete="off" placeholder={info?.pan ?? "10 characters"} value={form.panNo} onChange={set("panNo")} />
            {err("panNo")}
          </div>
          <div className={cls("dlNo", " span-2")}>
            <label htmlFor="kyc-dl">Driving licence</label>
            <input className="input" id="kyc-dl" autoComplete="off" placeholder={info?.dlNo ?? "DL number"} value={form.dlNo} onChange={set("dlNo")} />
            {err("dlNo")}
          </div>
          <div className="field span-2">
            <label className="check">
              <input type="checkbox" id="kyc-verified" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Mark KYC as verified
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- add rider (real) */
export function AddRiderFlow({ onAdded }: { onAdded: (riderId: string) => void }) {
  const qc = useQueryClient();
  const create = useCreateRider();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [platform, setPlatform] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const fieldCls = (f: string, extra = "") => "field" + extra + (errs[f] ? " has-error" : "");
  const err = (f: string) => (errs[f] ? <FieldError>{errs[f]}</FieldError> : null);

  return (
    <Modal
      title="Add rider"
      subtitle="Same onboarding form as the Rider app"
      icon="userPlus"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Add rider",
          kind: "primary",
          icon: "userPlus",
          busy: create.isPending ? "Adding…" : undefined,
          onClick: async () => {
            const nm = name.trim();
            const ph = phone.trim().replace(/\D/g, "");
            const ag = age.trim() ? Number(age.trim()) : undefined;
            const pf = platform.trim();
            const e: Record<string, string> = {};
            if (nm.length < 2) e.name = "Enter the full name.";
            if (!/^[6-9]\d{9}$/.test(ph)) e.phone = "Enter a valid 10-digit mobile number.";
            else if (G.riderByPhone("+91" + ph)) e.phone = "This number is already registered.";
            if (ag !== undefined && (!ag || ag < 16 || ag > 100)) e.age = "Age must be between 16 and 100.";
            setErrs(e);
            if (Object.keys(e).length) return false;
            try {
              const rider = await create.mutateAsync({ name: nm, phone: "+91" + ph, ...(ag ? { age: ag } : {}), ...(pf ? { platform: pf } : {}) });
              // Wait for the rider list to include the new rider before opening their drawer.
              await qc.refetchQueries({ queryKey: riderKeys.all });
              setTimeout(() => onAdded(rider.id), 150);
            } catch {
              return false;
            }
          },
        },
      ]}
    >
      <form id="ar-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          <div className={fieldCls("name")}>
            <label htmlFor="ar-name">
              Full name <span className="req">*</span>
            </label>
            <input className="input" id="ar-name" autoComplete="off" placeholder="As on Aadhaar" value={name} onChange={(e) => setName(e.target.value)} />
            {err("name")}
          </div>
          <div className={fieldCls("phone")}>
            <label htmlFor="ar-phone">
              Mobile number <span className="req">*</span>
            </label>
            <div className="input-prefix">
              <span>+91</span>
              <input id="ar-phone" inputMode="numeric" maxLength={10} placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </div>
            {err("phone")}
          </div>
          <div className={fieldCls("age")}>
            <label htmlFor="ar-age">Age</label>
            <input className="input" id="ar-age" type="number" min={16} max={100} placeholder="16+" value={age} onChange={(e) => setAge(e.target.value)} />
            {err("age")}
          </div>
          <div className={fieldCls("platform")}>
            <label htmlFor="ar-platform">Work platform</label>
            <select className="select" id="ar-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Select platform</option>
              {L.platforms.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {err("platform")}
          </div>
          <div className="field span-2">
            <div className="field__hint">The application starts as Pending. Add KYC details from the rider&apos;s profile, then approve once the deposit + first week rent are collected offline.</div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- transaction detail */
export function FinDetailFlow({ id, onOpenRider }: { id: string; onOpenRider: (riderId: string) => void }) {
  const e = store.state.finance.find((x) => x.id === id)!;
  const r = G.rider(e.riderId);
  const v = G.vehicle(e.vehicleId);
  const fs = FIN_STATUS[e.status];
  const verify = useVerifyPayment();
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState(false);
  const canVerify = e.status === "pending" && !!e.paymentId;
  return (
    <Modal
      title={e.title}
      subtitle={U.fmtDateTime(e.at) + " · " + e.ref}
      icon="receipt"
      size="sm"
      actions={[
        ...(r ? [{ label: "Open rider", kind: "ghost" as const, onClick: () => { setTimeout(() => onOpenRider(r.id), 50); } }] : []),
        ...(canVerify
          ? [
              {
                label: "Mark verified",
                kind: "primary" as const,
                icon: "check" as const,
                busy: verify.isPending ? "Verifying…" : undefined,
                onClick: async () => {
                  const rs = reason.trim();
                  if (rs.length < 3) {
                    setReasonErr(true);
                    return false;
                  }
                  try {
                    // The hook toasts success / the server's error code (features/payments/hooks.ts).
                    await verify.mutateAsync({ paymentId: e.paymentId as string, reason: rs });
                  } catch {
                    return false;
                  }
                },
              },
            ]
          : []),
        { label: "Close", kind: "primary" as const },
      ]}
    >
      <dl className="kv">
        <dt>Amount</dt>
        <dd style={{ fontSize: 16, fontWeight: 700 }}>
          {e.type === "refund" ? "−" : ""}
          {U.money(e.amount)}
        </dd>
        <dt>Status</dt>
        <dd><Badge tone={fs[0]}>{fs[1]}</Badge></dd>
        <dt>Type</dt>
        <dd>{L.finType[e.type]}</dd>
        <dt>Rider</dt>
        <dd>{r ? r.name + " · " + (r.customerId || "applicant") : "—"}</dd>
        <dt>Vehicle</dt>
        <dd>{v ? v.regNo : "—"}</dd>
        {e.planName ? (
          <>
            <dt>Plan</dt>
            <dd>{e.planName}</dd>
          </>
        ) : null}
        {e.periodStart ? (
          <>
            <dt>Period</dt>
            <dd>{U.fmtDateTime(e.periodStart) + " → " + U.fmtDateTime(e.periodEnd)}</dd>
          </>
        ) : null}
        <dt>Method</dt>
        <dd>{e.method}</dd>
        {e.note ? (
          <>
            <dt>Note</dt>
            <dd>{e.note}</dd>
          </>
        ) : null}
      </dl>
      {e.type === "recharge" || e.type === "first_cycle" ? (
        <p className="field__hint" style={{ marginTop: 12 }}>UPI recharges are verified by the backend before the plan is extended.</p>
      ) : null}
      {e.status === "pending" ? (
        e.paymentId ? (
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="fin-verify-reason">
              Verify manually <span className="req">*</span>
            </label>
            <input
              className="input"
              id="fin-verify-reason"
              placeholder="e.g. UPI credited, webhook never arrived"
              value={reason}
              onChange={(ev) => {
                setReason(ev.target.value);
                setReasonErr(false);
              }}
            />
            {reasonErr ? <FieldError>Enter why you are verifying (at least 3 characters) — recorded in the audit log.</FieldError> : null}
            <p className="field__hint" style={{ marginTop: 8 }}>
              Only use this when the money actually arrived but the gateway webhook was lost. It runs the same capture path as the webhook (extends the rental, reactivates after grace) and is audited with your name.
            </p>
          </div>
        ) : (
          <p className="field__hint" style={{ marginTop: 12 }}>Only gateway payments can be verified here.</p>
        )
      ) : null}
    </Modal>
  );
}

/* ---------------------------------------------------------------- clipboard fallback */
export function CopyManualFlow({ text }: { text: string }) {
  return (
    <Modal title="Copy the link manually" size="sm" icon="copy" actions={[{ label: "Close", kind: "primary" }]}>
      <textarea className="textarea" readOnly style={{ minHeight: 110 }} value={text} />
    </Modal>
  );
}

/* ---------------------------------------------------------------- mark for recovery */
export function ManualRecoveryFlow() {
  const vs = store.state.vehicles.filter((v) => v.riderId && v.status !== "Marked_for_recovery");
  const [vid, setVid] = useState("");
  const [reason, setReason] = useState("");
  const [imm, setImm] = useState(true);
  const [err, setErr] = useState("");
  const veh = G.vehicle(vid);
  const transition = useTransitionRider(veh?.riderId ?? "");
  const disarm = useDisarmVehicle();
  return (
    <Modal
      title="Mark a vehicle for recovery"
      icon="pin"
      size="md"
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Mark for recovery",
          kind: "danger",
          icon: "pin",
          busy: transition.isPending || disarm.isPending ? "Saving…" : undefined,
          onClick: async () => {
            const rs = reason.trim();
            if (!veh || !veh.riderId || rs.length < 3) {
              setErr("Choose a vehicle and enter a reason (at least 3 characters).");
              return false;
            }
            try {
              // Real: moves the rider to MARKED_FOR_RECOVERY (audited); the fleet then flags the vehicle.
              await transition.mutateAsync({ status: "MARKED_FOR_RECOVERY", reason: rs });
            } catch {
              return false;
            }
            if (imm) {
              try {
                await disarm.mutateAsync({ id: veh.id, reason: "Recovery in progress" });
              } catch {
                return false;
              }
            }
          },
        },
      ]}
    >
      <div className="field">
        <label htmlFor="mr-v">
          Vehicle <span className="req">*</span>
        </label>
        <select className="select" id="mr-v" value={vid} onChange={(e) => setVid(e.target.value)}>
          <option value="">Select vehicle</option>
          {vs.map((v) => (
            <option key={v.id} value={v.id}>
              {v.regNo} · {G.vehicleRider(v)!.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="mr-r">
          Reason <span className="req">*</span>
        </label>
        <input className="input" id="mr-r" placeholder="e.g. Rider unreachable for 3 days" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" id="mr-imm" checked={imm} onChange={(e) => setImm(e.target.checked)} /> Also immobilize the vehicle now (via IOP relay)
      </label>
      {err ? <FieldError style={{ marginTop: 8 }}>{err}</FieldError> : null}
    </Modal>
  );
}
