"use client";

/*
 * Modal flows (approve / reject / status / vehicle record / KYC / add rider / …).
 * Each one keeps the prototype's dialog design and copy; the actions call the real API through the
 * feature hooks (features/*), except the few that have no backend endpoint yet — those are simulated
 * locally (features/live/sim-actions.ts) and say so.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { Value } from "react-phone-number-input";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPhoneInput } from "@/components/ui/phone-input";
import { riderIndianPhoneError, SUPPORT_PHONE_ERROR, toSupportPhoneE164 } from "@/lib/phone";
import { useBulkCreateVehicles, useUpdateRecord, useCreateVehicle, useDisarmVehicle, useReactivateVehicle } from "@/features/fleet/hooks";
import { vehicleRecordSchema, vehicleSchema, type BulkVehiclesResult } from "@/features/fleet/api";
import {
  CHASSIS_NO_ERROR,
  COMPONENT_ID_MAX,
  IOP_ID_ERROR,
  IOP_ID_MAX,
  MOTOR_NO_ERROR,
  sanitizeIopIdInput,
  sanitizeVehicleIdentifierInput,
  VEHICLE_IDENTIFIER_ERROR,
  VEHICLE_NO_ERROR,
  VEHICLE_NO_MAX,
  vehicleIdentifierError,
  iopIdError,
} from "@/features/fleet/identifiers";
import { downloadTemplateXlsx, IMPORT_LIMIT, parseVehiclesFile, type ParsedImport } from "@/features/fleet/import";
import {
  addVehicleFieldError,
  collectAddVehicleErrors,
  formErrorsFromApiValidation,
} from "@/features/fleet/validation-errors";
import { AUDIT_REASON_MAX, auditReasonError } from "@/lib/audit-reason";
import { ApiError } from "@/lib/api-client";
import { useUpsertKyc } from "@/features/kyc/hooks";
import { useVerifyPayment } from "@/features/payments/hooks";
import { kycSchema } from "@/features/kyc/api";
import { ASSET_TO_API } from "@/features/live/map-state";
import { simVehicleStatus } from "@/features/live/sim-actions";
import { riderKeys } from "@/features/riders/api";
import { useApproveRider, useCreateRider, useRejectRider, useTransitionRider, useUpdateRider } from "@/features/riders/hooks";
import { useSupport } from "@/features/config/hooks";
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
            if (!reason || auditReasonError(reason)) {
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
          maxLength={AUDIT_REASON_MAX}
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            setErr(false);
          }}
        />
        {err ? (
          <FieldError>
            {sel === "other" && other.trim() ? auditReasonError(other) ?? "Select or enter a reason." : "Select or enter a reason."}
          </FieldError>
        ) : null}
      </div>
      <p className="field__hint" style={{ marginTop: 10 }}>Sent through the backend to the IOP GPS relay. The vehicle flips state only after the relay confirms; failures keep the current state.</p>
    </Modal>
  );
}

/* ---------------------------------------------------------------- approve */
export function ApproveFlow({ id }: { id: string }) {
  const r = G.rider(id)!;
  const approve = useApproveRider(id);
  const support = useSupport();
  const plans = (support.data?.depositPlans ?? []).filter((p) => p.enabled);
  const k = D.kycSummary(r);
  const [paid, setPaid] = useState(false);
  const [tier, setTier] = useState<string>("");
  const selectedTier = plans.find((p) => p.id === tier) ?? plans[0];
  // The rider may already have paid the deposit in-app (Razorpay webhook sets
  // paidToken + a VERIFIED DEPOSIT row). Then the admin must not mark it again —
  // approve is allowed as-is and the server won't create a second deposit row.
  const depositOnFile = r.deposit.status === "received";
  const depositAmount = r.deposit.amount || (selectedTier ? Math.round(selectedTier.depositPaise / 100) : 0) || store.state.config.deposit;
  const canApprove = depositOnFile || (paid && !!selectedTier);
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
          disabled: !canApprove,
          busy: approve.isPending ? "Approving…" : undefined,
          onClick: async () => {
            try {
              // markOffline=false when the deposit is already on file (in-app payment).
              await approve.mutateAsync({
                paidToken: !depositOnFile,
                ...(!depositOnFile && selectedTier ? { depositPlanId: selectedTier.id } : {}),
              });
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
          {k.complete ? "KYC documents reviewed (" + k.total + "/" + k.total + " required)" : k.submitted > 0 ? "KYC details on file (" + k.submitted + "/" + k.total + " required)" : "No KYC details on file"}
        </li>
        <li className={canApprove ? "ok" : "no"}>
          <span className="tick"><Icon name={canApprove ? "check" : "x"} size={14} /></span>
          {depositOnFile
            ? `Security deposit already received (${U.money(depositAmount)})`
            : "Deposit + first week rent collected offline"}
        </li>
      </ul>
      {depositOnFile ? (
        <div className="notice notice--info" style={{ marginTop: 12 }}>
          <Icon name="checkCircle" size={16} />
          <span>
            The {U.money(depositAmount)} deposit is already on record (paid in the app or recorded
            earlier). Approving now does not create a second deposit entry — nothing needs to be marked
            offline.
          </span>
        </div>
      ) : (
        <>
          <div className="notice notice--warn" style={{ marginTop: 12 }}>
            <Icon name="alert" size={16} />
            <span>Approval confirms the {U.money(depositAmount)} security deposit and locks the daily rent for this rider.</span>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="ap-tier">Security-deposit plan</label>
            <select id="ap-tier" className="input" value={selectedTier?.id ?? ""} onChange={(e) => setTier(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {U.money(Math.round(p.dailyRentPaise / 100))}/day
                </option>
              ))}
            </select>
          </div>
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" id="ap-paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Deposit collected offline
          </label>
        </>
      )}
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
            const rErr = auditReasonError(v);
            if (rErr) {
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
        {err ? <FieldError>{auditReasonError(reason) ?? "Enter a short reason (at least 3 characters)."}</FieldError> : null}
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
            const reasonErr = auditReasonError(rs);
            if (reasonErr) {
              setErr(reasonErr);
              return false;
            }
            const next = sel as AssetStatus;
            // Rider lifecycle changes are real (audited by the backend); vehicle-only overrides are simulated.
            if (holder && (isR || SERVER_BACKED.has(next))) {
              try {
                await transition.mutateAsync({ status: ASSET_TO_API[next], reason: rs });
              } catch (err) {
                if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
                  setErr(auditReasonError(rs) ?? err.message);
                }
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
        <input
          className="input"
          id="st-reason"
          maxLength={AUDIT_REASON_MAX}
          placeholder="e.g. Rider unreachable — scooter parked at hub"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (err) setErr("");
          }}
        />
        {err ? <FieldError>{err}</FieldError> : auditReasonError(reason) ? <FieldError>{auditReasonError(reason)}</FieldError> : null}
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
  const [vehicleNo, setVehicleNo] = useState(blank(v.regNo));
  const [iopId, setIopId] = useState(blank(v.iopId ?? ""));
  const [chassis, setChassis] = useState(blank(v.chassisNo));
  const [motor, setMotor] = useState(blank(v.motorNo));
  const [ctrl, setCtrl] = useState(blank(v.controllerNo));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const cls = (f: string, extra = "") => "field" + extra + (errs[f] ? " has-error" : "");
  const fieldErr = (f: string) => (errs[f] ? <FieldError>{errs[f]}</FieldError> : null);
  const live = {
    vehicleNo: vehicleIdentifierError(vehicleNo, 2, false, VEHICLE_NO_MAX, VEHICLE_NO_ERROR),
    iopId: iopIdError(iopId),
    chassis: vehicleIdentifierError(chassis, 2, false, COMPONENT_ID_MAX, CHASSIS_NO_ERROR),
    motor: vehicleIdentifierError(motor, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR),
    controller: vehicleIdentifierError(ctrl, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR),
  };
  return (
    <Modal
      title="Update vehicle record"
      subtitle={`Registration ${v.regNo} · ${v.status}`}
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
            const vn = sanitizeVehicleIdentifierInput(vehicleNo, VEHICLE_NO_MAX).trim().toUpperCase();
            const io = sanitizeIopIdInput(iopId).trim();
            const ch = sanitizeVehicleIdentifierInput(chassis).trim().toUpperCase();
            const mo = sanitizeVehicleIdentifierInput(motor).trim().toUpperCase();
            const co = sanitizeVehicleIdentifierInput(ctrl).trim().toUpperCase();
            const e: Record<string, string> = {};
            if (vehicleIdentifierError(vn, 2, false, VEHICLE_NO_MAX, VEHICLE_NO_ERROR)) {
              e.vehicleNo = VEHICLE_NO_ERROR;
            }
            if (iopIdError(io)) e.iopId = IOP_ID_ERROR;
            if (vehicleIdentifierError(ch, 2, false, COMPONENT_ID_MAX, CHASSIS_NO_ERROR)) {
              e.chassis = CHASSIS_NO_ERROR;
            }
            if (vehicleIdentifierError(mo, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR)) {
              e.motor = MOTOR_NO_ERROR;
            }
            if (vehicleIdentifierError(co, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR)) {
              e.controller = MOTOR_NO_ERROR;
            }
            setErrs(e);
            if (Object.keys(e).length) return false;
            const parsed = vehicleRecordSchema.safeParse({
              vehicleNo: vn,
              iopId: io,
              chassisNo: ch,
              motorNo: mo,
              controllerNo: co,
            });
            if (!parsed.success) {
              const toFormField = (path: string) =>
                ({ chassisNo: 'chassis', motorNo: 'motor', controllerNo: 'controller' }[path] ?? path);
              for (const issue of parsed.error.issues) {
                const key = toFormField(String(issue.path[0] ?? ''));
                if (key && !e[key]) e[key] = issue.message;
              }
              setErrs(e);
              return false;
            }
            const patch = parsed.data;
            const dupe = store.state.vehicles.find(
              (x) =>
                x.id !== v.id &&
                (x.regNo.toLowerCase() === patch.vehicleNo.toLowerCase() ||
                  (x.iopId && x.iopId.toLowerCase() === patch.iopId.toLowerCase()) ||
                  x.chassisNo === patch.chassisNo),
            );
            if (dupe) {
              setErrs({ vehicleNo: `That number is already linked to ${dupe.regNo}.` });
              return false;
            }
            try {
              await update.mutateAsync(patch);
            } catch (err) {
              if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
                setErrs(formErrorsFromApiValidation(err.message));
              }
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
        <div className={cls("vehicleNo")}>
          <label htmlFor="cm-vehicle">
            Registration No. <span className="req">*</span>
          </label>
          <input
            className="input"
            id="cm-vehicle"
            maxLength={VEHICLE_NO_MAX}
            value={vehicleNo}
            onChange={(e) => setVehicleNo(sanitizeVehicleIdentifierInput(e.target.value, VEHICLE_NO_MAX))}
            autoComplete="off"
          />
          {fieldErr("vehicleNo") ?? (live.vehicleNo ? <FieldError>{live.vehicleNo}</FieldError> : null)}
        </div>
        <div className={cls("iopId")}>
          <label htmlFor="cm-iop">
            IOP device ID <span className="req">*</span>
          </label>
          <input
            className="input"
            id="cm-iop"
            inputMode="numeric"
            placeholder="e.g. 868720065959201"
            maxLength={IOP_ID_MAX}
            value={iopId}
            onChange={(e) => setIopId(sanitizeIopIdInput(e.target.value))}
            autoComplete="off"
          />
          {fieldErr("iopId") ?? (live.iopId ? <FieldError>{live.iopId}</FieldError> : null)}
        </div>
        <div className={cls("chassis", " span-2")}>
          <label htmlFor="cm-chassis">
            Chassis No. (master) <span className="req">*</span>
          </label>
          <input
            className="input"
            id="cm-chassis"
            maxLength={COMPONENT_ID_MAX}
            value={chassis}
            onChange={(e) => setChassis(sanitizeVehicleIdentifierInput(e.target.value))}
            autoComplete="off"
          />
          {fieldErr("chassis") ?? (live.chassis ? <FieldError>{live.chassis}</FieldError> : null)}
        </div>
        <div className={cls("motor")}>
          <label htmlFor="cm-motor">
            Motor No. <span className="req">*</span>
          </label>
          <input
            className="input"
            id="cm-motor"
            maxLength={COMPONENT_ID_MAX}
            value={motor}
            onChange={(e) => setMotor(sanitizeVehicleIdentifierInput(e.target.value))}
            autoComplete="off"
          />
          {fieldErr("motor") ?? (live.motor ? <FieldError>{live.motor}</FieldError> : null)}
        </div>
        <div className={cls("controller")}>
          <label htmlFor="cm-ctrl">
            Controller No. <span className="req">*</span>
          </label>
          <input
            className="input"
            id="cm-ctrl"
            maxLength={COMPONENT_ID_MAX}
            value={ctrl}
            onChange={(e) => setCtrl(sanitizeVehicleIdentifierInput(e.target.value))}
            autoComplete="off"
          />
          {fieldErr("controller") ?? (live.controller ? <FieldError>{live.controller}</FieldError> : null)}
        </div>
      </div>
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
  const live = {
    vehicleNo: addVehicleFieldError("vehicleNo", vehicleNo),
    iopId: addVehicleFieldError("iopId", iopId),
    chassis: addVehicleFieldError("chassis", chassis),
    motor: addVehicleFieldError("motor", motor),
    controller: addVehicleFieldError("controller", ctrl),
  };
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
            const vn = sanitizeVehicleIdentifierInput(vehicleNo, VEHICLE_NO_MAX).trim().toUpperCase();
            const io = sanitizeIopIdInput(iopId).trim();
            const ch = sanitizeVehicleIdentifierInput(chassis).trim().toUpperCase();
            const mo = sanitizeVehicleIdentifierInput(motor).trim().toUpperCase();
            const co = sanitizeVehicleIdentifierInput(ctrl).trim().toUpperCase();
            const e = collectAddVehicleErrors({
              vehicleNo: vn,
              iopId: io,
              chassis: ch,
              motor: mo,
              controller: co,
            });
            setErrs(e);
            if (Object.keys(e).length) return false;
            const payload = vehicleSchema.safeParse({
              vehicleNo: vn,
              iopId: io,
              chassisNo: ch,
              motorNo: mo,
              controllerNo: co,
            });
            if (!payload.success) {
              setErrs(
                collectAddVehicleErrors({
                  vehicleNo: vn,
                  iopId: io,
                  chassis: ch,
                  motor: mo,
                  controller: co,
                }),
              );
              return false;
            }
            try {
              await create.mutateAsync(payload.data);
            } catch (err) {
              if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
                setErrs(formErrorsFromApiValidation(err.message));
              }
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
            <input
              className="input"
              id="av-no"
              autoComplete="off"
              placeholder="e.g. QVEK-003"
              maxLength={VEHICLE_NO_MAX}
              value={vehicleNo}
              onChange={(e) => setVehicleNo(sanitizeVehicleIdentifierInput(e.target.value, VEHICLE_NO_MAX))}
            />
            {err("vehicleNo") ?? (live.vehicleNo ? <FieldError>{live.vehicleNo}</FieldError> : null)}
          </div>
          <div className={cls("iopId")}>
            <label htmlFor="av-iop">
              IOP device id <span className="req">*</span>
            </label>
            <input
              className="input"
              id="av-iop"
              inputMode="numeric"
              placeholder="e.g. 868720065959201"
              autoComplete="off"
              maxLength={IOP_ID_MAX}
              value={iopId}
              onChange={(e) => setIopId(sanitizeIopIdInput(e.target.value))}
            />
            {err("iopId") ?? (live.iopId ? <FieldError>{live.iopId}</FieldError> : null)}
          </div>
          <div className={cls("chassis", " span-2")}>
            <label htmlFor="av-chassis">
              Chassis No. (master record) <span className="req">*</span>
            </label>
            <input
              className="input"
              id="av-chassis"
              autoComplete="off"
              maxLength={COMPONENT_ID_MAX}
              value={chassis}
              onChange={(e) => setChassis(sanitizeVehicleIdentifierInput(e.target.value))}
            />
            {err("chassis") ?? (live.chassis ? <FieldError>{live.chassis}</FieldError> : null)}
          </div>
          <div className={cls("motor")}>
            <label htmlFor="av-motor">
              Motor No. <span className="req">*</span>
            </label>
            <input
              className="input"
              id="av-motor"
              autoComplete="off"
              maxLength={COMPONENT_ID_MAX}
              value={motor}
              onChange={(e) => setMotor(sanitizeVehicleIdentifierInput(e.target.value))}
            />
            {err("motor") ?? (live.motor ? <FieldError>{live.motor}</FieldError> : null)}
          </div>
          <div className={cls("controller")}>
            <label htmlFor="av-ctrl">
              Controller No. <span className="req">*</span>
            </label>
            <input
              className="input"
              id="av-ctrl"
              autoComplete="off"
              maxLength={COMPONENT_ID_MAX}
              value={ctrl}
              onChange={(e) => setCtrl(sanitizeVehicleIdentifierInput(e.target.value))}
            />
            {err("controller") ?? (live.controller ? <FieldError>{live.controller}</FieldError> : null)}
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- bulk import (XLSX / CSV) */
export function BulkAddVehiclesFlow() {
  const bulk = useBulkCreateVehicles();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [result, setResult] = useState<BulkVehiclesResult | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setError("");
    setResult(null);
    setParsed(null);
    try {
      const p = await parseVehiclesFile(file);
      setParsed(p);
      setFileName(file.name);
    } catch (e) {
      setError((e as Error).message || "Could not read that file.");
      setFileName(file.name);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveTemplate = async () => {
    setError("");
    try {
      await downloadTemplateXlsx();
    } catch {
      setError("Could not build the template file. Check your browser's download permissions and retry.");
    }
  };

  const runImport = async () => {
    if (!parsed?.rows.length) return false;
    try {
      const d = await bulk.mutateAsync(parsed.rows.map(({ row: _row, ...rest }) => rest));
      setResult(d);
    } catch {
      /* surfaced by the hook's onError toast */
    }
    return false; // keep the dialog open to show per-row results
  };

  const done = result ? result.created + result.restored : 0;
  const skipped = result?.results.filter((r) => r.status === "skipped") ?? [];

  return (
    <Modal
      title="Import vehicles"
      subtitle="Upload an XLSX or CSV sheet — validated before anything is saved"
      icon="upload"
      size="lg"
      actions={
        result
          ? [{ label: "Done", kind: "primary", icon: "check" }]
          : [
              { label: "Close", kind: "ghost" },
              ...(parsed?.rows.length
                ? [
                    {
                      label: `Import ${parsed.rows.length} vehicle${parsed.rows.length === 1 ? "" : "s"}`,
                      kind: "primary" as const,
                      icon: "upload",
                      close: false,
                      busy: bulk.isPending ? "Importing…" : undefined,
                      onClick: runImport,
                    },
                  ]
                : []),
            ]
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv,text/csv"
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {result ? (
        <>
          <div className="empty" style={{ paddingBottom: 8 }}>
            <span className="empty__icon"><Icon name="fileCheck" size={24} /></span>
            <b>{done} vehicle{done === 1 ? "" : "s"} imported</b>
            <p>
              {result.created} added
              {result.restored ? ` · ${result.restored} restored from deleted records` : ""}
              {result.skipped ? ` · ${result.skipped} skipped` : ""}
            </p>
          </div>
          {skipped.length ? (
            <div className="table-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Vehicle No.</th>
                    <th>IOP ID</th>
                    <th>Why it was skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((r) => (
                    <tr key={`${r.index}-${r.vehicleNo}`}>
                      <td className="num">{r.index + 1}</td>
                      <td className="cell-mono">{r.vehicleNo}</td>
                      <td className="cell-mono">{r.iopId}</td>
                      <td>{r.message ?? r.code ?? "Duplicate"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="field__hint">Every row was imported. No duplicates found.</p>
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ marginBottom: 6 }}>
              <b>Required:</b> <span className="cell-mono">Vehicle No.</span> and <span className="cell-mono">IOP ID</span>
            </p>
            <p className="cell-sub" style={{ marginBottom: 10 }}>
              Optional: Chassis No., Motor No., Controller No., Type. Up to {IMPORT_LIMIT} rows per import.
              The header row can be anywhere in the first 10 rows.
            </p>
            <div className="table-wrap" style={{ marginBottom: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Required</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="cell-mono">Vehicle No.</td><td>Yes</td><td className="cell-mono">QVEK-001</td></tr>
                  <tr><td className="cell-mono">IOP ID</td><td>Yes</td><td className="cell-mono">868720065959201</td></tr>
                  <tr><td className="cell-mono">Chassis No.</td><td className="cell-sub">Optional</td><td className="cell-mono">CH-10001</td></tr>
                  <tr><td className="cell-mono">Motor No.</td><td className="cell-sub">Optional</td><td className="cell-mono">MT-10001</td></tr>
                  <tr><td className="cell-mono">Controller No.</td><td className="cell-sub">Optional</td><td className="cell-mono">CT-10001</td></tr>
                  <tr><td className="cell-mono">Type</td><td className="cell-sub">Optional</td><td className="cell-mono">LIGHT_2W</td></tr>
                </tbody>
              </table>
            </div>
            <div className="actions-row">
              <Button variant="primary" onClick={() => void saveTemplate()} disabled={reading}>
                <Icon name="file" size={16} />
                Download XLSX template
              </Button>
              <Button onClick={() => fileRef.current?.click()} disabled={reading}>
                <Icon name="upload" size={16} />
                {reading ? "Reading…" : "Upload filled sheet"}
              </Button>
            </div>
            <p className="field__hint" style={{ marginTop: 8 }}>
              The template contains these exact headers plus a field guide on its second sheet. If an IOP ID
              starts with 0, format that Excel column as Text so the leading zero is kept.
            </p>
            {fileName ? <p className="field__hint" style={{ marginTop: 10 }}>{fileName}</p> : null}
          </div>

          {error ? <FieldError style={{ marginBottom: 12 }}>{error}</FieldError> : null}

          {parsed ? (
            <>
              <div className="badge-row" style={{ marginBottom: 10 }}>
                <Badge tone="grey">{parsed.total} rows read</Badge>
                <Badge tone={parsed.rows.length ? "green" : "grey"}>{parsed.rows.length} ready</Badge>
                {parsed.issues.length ? <Badge tone="amber">{parsed.issues.length} with problems</Badge> : null}
              </div>
              {parsed.issues.length ? (
                <div className="table-wrap" style={{ maxHeight: 240, overflowY: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Vehicle No.</th>
                        <th>IOP ID</th>
                        <th>Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.issues.map((i) => (
                        <tr key={`${i.row}-${i.message}`}>
                          <td className="num">{i.row}</td>
                          <td className="cell-mono">{i.vehicleNo || "—"}</td>
                          <td className="cell-mono">{i.iopId || "—"}</td>
                          <td>{i.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="field__hint">No problems found in the sheet.</p>
              )}
              <p className="field__hint" style={{ marginTop: 10 }}>
                Rows with problems are left out. IOP IDs that already exist in the fleet are reported after
                import — they are never overwritten. Deleted vehicles are restored when re-added.
              </p>
            </>
          ) : null}
        </>
      )}
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
  const [phone, setPhone] = useState<Value | undefined>(r.phone || undefined);
  const phoneLiveErr = riderIndianPhoneError(phone);
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
            const normalizedPhone = toSupportPhoneE164(phone);
            const ph = normalizedPhone?.replace(/\D/g, "") ?? "";
            const ag = Number(age.trim());
            const isOther = platform === "Other";
            const pf = isOther ? other.trim() : platform;
            const e: Record<string, string> = {};
            if (nm.length < 3 || !/^[A-Za-z][A-Za-z .'-]+$/.test(nm)) e.name = "Enter the full name (letters only, at least 3 characters).";
            if (!normalizedPhone?.startsWith("+91")) e.phone = SUPPORT_PHONE_ERROR;
            if (!ag || ag < 16 || ag > 100) e.age = "Age must be between 16 and 100.";
            if (!pf) e[isOther ? "other" : "platform"] = "Enter the platform name.";
            const dupe = store.state.riders.find((x) => x.id !== id && x.phone.replace(/\D/g, "").slice(-10) === ph.slice(-10) && x.application.status !== "rejected");
            if (!e.phone && dupe) e.phone = "This mobile number is already registered to " + dupe.name + ".";
            setErrs(e);
            if (Object.keys(e).length) return false;
            const patch: { name?: string; phone?: string; age?: number; platform?: string } = {};
            if (nm !== r.name) patch.name = nm;
            if (normalizedPhone && normalizedPhone !== r.phone) patch.phone = normalizedPhone;
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
            <AdminPhoneInput
              id="er-phone"
              countries={["IN"]}
              value={phone}
              onChange={setPhone}
              hasError={!!errs.phone || !!phoneLiveErr}
              placeholder="Enter mobile number"
            />
            <div className="field__hint">The rider signs in with this number.</div>
            {errs.phone ? err("phone") : phoneLiveErr ? <FieldError>{phoneLiveErr}</FieldError> : null}
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
            <label htmlFor="kyc-dl">Driving licence (optional)</label>
            <input className="input" id="kyc-dl" autoComplete="off" placeholder={info?.dlNo ?? "DL number, if available"} value={form.dlNo} onChange={set("dlNo")} />
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
  const [phone, setPhone] = useState<Value | undefined>(undefined);
  const phoneLiveErr = riderIndianPhoneError(phone);
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
            const normalizedPhone = toSupportPhoneE164(phone);
            const ag = age.trim() ? Number(age.trim()) : undefined;
            const pf = platform.trim();
            const e: Record<string, string> = {};
            if (nm.length < 2) e.name = "Enter the full name.";
            if (!normalizedPhone?.startsWith("+91")) e.phone = SUPPORT_PHONE_ERROR;
            else if (G.riderByPhone(normalizedPhone)) e.phone = "This number is already registered.";
            if (ag !== undefined && (!ag || ag < 16 || ag > 100)) e.age = "Age must be between 16 and 100.";
            setErrs(e);
            if (Object.keys(e).length) return false;
            try {
              const rider = await create.mutateAsync({
                name: nm,
                phone: normalizedPhone!,
                ...(ag ? { age: ag } : {}),
                ...(pf ? { platform: pf } : {}),
              });
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
            <AdminPhoneInput
              id="ar-phone"
              countries={["IN"]}
              value={phone}
              onChange={setPhone}
              hasError={!!errs.phone || !!phoneLiveErr}
              placeholder="Enter mobile number"
            />
            {errs.phone ? err("phone") : phoneLiveErr ? <FieldError>{phoneLiveErr}</FieldError> : null}
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
                  if (auditReasonError(rs)) {
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
              maxLength={AUDIT_REASON_MAX}
              placeholder="e.g. UPI credited, webhook never arrived"
              value={reason}
              onChange={(ev) => {
                setReason(ev.target.value);
                setReasonErr(false);
              }}
            />
            {reasonErr ? (
              <FieldError>{auditReasonError(reason) ?? "Enter why you are verifying — recorded in the audit log."}</FieldError>
            ) : null}
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
            if (!veh || !veh.riderId) {
              setErr("Choose a vehicle and enter a reason (at least 3 characters).");
              return false;
            }
            const reasonErr = auditReasonError(rs);
            if (reasonErr) {
              setErr(reasonErr);
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
        <input
          className="input"
          id="mr-r"
          maxLength={AUDIT_REASON_MAX}
          placeholder="e.g. Rider unreachable for 3 days"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (err) setErr("");
          }}
        />
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" id="mr-imm" checked={imm} onChange={(e) => setImm(e.target.checked)} /> Also immobilize the vehicle now (via IOP relay)
      </label>
      {err ? <FieldError style={{ marginTop: 8 }}>{err}</FieldError> : null}
    </Modal>
  );
}
