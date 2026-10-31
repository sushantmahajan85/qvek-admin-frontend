"use client";

import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { emptyReplacementForm, getPageState, patchPageState, today, usePageState } from "@/lib/qvek/page-state";
import { matchRider, matchVehicle } from "@/lib/qvek/selectors";
import { D, G, store } from "@/lib/qvek/store";
import { useAssignVehicle, useReplaceVehicle } from "@/features/fleet/hooks";
import type { Vehicle } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { AssetBadge, Avatar, EmptyState, Field, GpsCell, LogRow, Plate, SearchBox, SortTh, Pager, VFlags } from "../bits";
import { useAdmin } from "../admin-context";
import { Icon } from "../icon";
import { useUI } from "../ui-context";

/* ---------------------------------------------------------------- Vehicles */
export function VehiclesPage() {
  const admin = useAdmin();
  useStore();
  const [st, setSt] = usePageState("vehicles");
  const opts: [string, string][] = [
    ["all", "All"],
    ["Active", "Active"],
    ["Inactive", "Inactive (available)"],
    ["immobilized", "Immobilized"],
    ["Repair_req", "Repair_req"],
    ["Marked_for_recovery", "Marked for recovery"],
    ["Returned", "Returned"],
  ];

  let list = store.state.vehicles.filter((v) => matchVehicle(v, st.q));
  if (st.filter !== "all") list = list.filter((v) => (st.filter === "immobilized" ? v.immobilized : v.status === st.filter));
  const k = st.sort.k;
  const dir = st.sort.d;
  const val = (v: Vehicle): string | number => (k === "chassis" ? v.chassisNo : k === "odo" ? (v.odometer ?? -1) : k === "gps" ? v.lastGps : v.regNo);
  list = list.slice().sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });
  const per = 10;
  const page = Math.min(st.page, Math.max(1, Math.ceil(list.length / per)));

  const onSort = (key: string) =>
    setSt((x) => {
      if (x.sort.k === key) x.sort = { k: key, d: (x.sort.d * -1) as 1 | -1 };
      else x.sort = { k: key, d: key === "gps" ? -1 : 1 };
      x.page = 1;
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicles</h1>
          <p>The Chassis No. is the master record, linked to its Motor No. and Controller No. Replaced numbers stay in history.</p>
        </div>
        <div className="page-head__actions">
          <Button onClick={() => admin.importVehicles()}>
            <Icon name="upload" size={16} />
            Import XLSX
          </Button>
          <Button variant="primary" onClick={() => admin.addVehicle()}>
            <Icon name="plus" size={16} />
            Add vehicle
          </Button>
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          <SearchBox value={st.q} onChange={(q) => setSt({ q, page: 1 })} placeholder="Search vehicle, IOP id, chassis, motor, controller or rider" />
          <div className="chip-filter" role="group" aria-label="Status filter">
            {opts.map((o) => (
              <button key={o[0]} type="button" aria-pressed={st.filter === o[0]} onClick={() => setSt({ filter: o[0], page: 1 })}>
                {o[1]}
              </button>
            ))}
          </div>
        </div>
        <div id="veh-table">
          {!list.length ? (
            <EmptyState icon="scooter" title="No vehicles found" text="Try another search or filter." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <SortTh label="Chassis No. (master)" sortKey="chassis" sort={st.sort} onSort={onSort} />
                      <SortTh label="Vehicle No." sortKey="reg" sort={st.sort} onSort={onSort} />
                      <th>IOP ID</th>
                      <th>Motor No.</th>
                      <th>Controller No.</th>
                      <th>Status</th>
                      <th>Rider</th>
                      <SortTh label="Odometer" sortKey="odo" sort={st.sort} onSort={onSort} className="num" />
                      <SortTh label="Last GPS" sortKey="gps" sort={st.sort} onSort={onSort} />
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice((page - 1) * per, page * per).map((v) => {
                      const r = G.vehicleRider(v);
                      return (
                        <tr key={v.id} className="row-main" onClick={() => admin.openVehicle(v.id)}>
                          <td data-label="Chassis No.">
                            <span className="cell-mono" style={{ color: "var(--text)" }}>{v.chassisNo}</span>
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
                          <td data-label="Controller No.">
                            <span className="cell-mono">{v.controllerNo}</span>
                          </td>
                          <td data-label="Status" className="cell-full">
                            <div className="badge-row">
                              <AssetBadge status={v.status} />
                              <VFlags v={v} />
                            </div>
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
                          <td data-label="Odometer" className="num">
                            {U.km(v.odometer)}
                          </td>
                          <td data-label="Last GPS">
                            <GpsCell v={v} />
                          </td>
                          <td data-label="Actions" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="danger-ghost"
                              aria-label={`Delete ${v.regNo}`}
                              title={`Delete ${v.regNo}`}
                              onClick={() => admin.deleteVehicle(v.id)}
                            >
                              <Icon name="trash" size={15} />
                            </Button>
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
    </>
  );
}

/* ---------------------------------------------------------------- Vehicle assignment */
function RecentLogs({ actions, n }: { actions: string[]; n: number }) {
  const ls = store.state.logs.filter((l) => actions.includes(l.action)).sort((a, b) => b.at - a.at).slice(0, n);
  return ls.length ? <div className="tl">{ls.map((l) => <LogRow key={l.id} l={l} />)}</div> : <p className="cell-sub">No assignments yet.</p>;
}

export function AssignmentPage() {
  const ui = useUI();
  const assign = useAssignVehicle();
  useStore();
  const [a, setA] = usePageState("assignment");

  const riders = store.state.riders.filter((r) => r.application.status === "approved" && !r.vehicleId && !["Blacklisted", "Returned"].includes(r.status || "") && matchRider(r, a.q));
  riders.sort((x, y) => Number(D.eligibility(y).ok) - Number(D.eligibility(x).ok));
  const r = a.rider ? G.rider(a.rider) : null;
  const el = r ? D.eligibility(r) : null;
  const vehicles = D.availableVehicles();
  const v = a.vehicle && vehicles.some((x) => x.id === a.vehicle) ? G.vehicle(a.vehicle) : null;
  const canAssign = !!(r && el && el.ok && v);
  let why = "";
  if (!r) why = "Select a rider.";
  else if (el && !el.ok) why = "Rider is not eligible yet: " + el.checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join(", ") + ".";
  else if (!v) why = "Select an available vehicle.";

  const doAssign = async () => {
    if (!r || !v) return;
    const ok = await ui.confirm({
      title: "Assign " + v.regNo + " to " + r.name + "?",
      icon: "link",
      body: (
        <>
          <dl className="kv">
            <dt>Rider</dt>
            <dd>
              {r.name} · {r.customerId}
            </dd>
            <dt>Vehicle</dt>
            <dd>{v.regNo}</dd>
            <dt>Chassis / Motor / Controller</dt>
            <dd className="cell-mono">
              {v.chassisNo} / {v.motorNo} / {v.controllerNo}
            </dd>
            <dt>Plan</dt>
            <dd>
              {r.plan!.name} until {U.fmtDate(r.plan!.end)}
            </dd>
          </dl>
          <p style={{ marginTop: 12 }}>The rider’s Home screen will show this vehicle immediately.</p>
        </>
      ),
      confirmLabel: "Assign vehicle",
      confirmIcon: "link",
    });
    if (!ok) return;
    try {
      // The hook toasts success / the server's error code (features/fleet/hooks.ts).
      await assign.mutateAsync({ riderId: r.id, vehicleId: v.id });
      setA({ rider: null, vehicle: null });
    } catch {
      /* surfaced by the hook's onError toast */
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicle assignment</h1>
          <p>Link an available scooter to an approved rider after their first recharge.</p>
        </div>
      </div>
      <div id="assign">
        <div className="grid-2">
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="link" size={16} />
                Assign a vehicle
              </h2>
              <p>One active vehicle per rider</p>
            </div>
            <div className="card__body" style={{ display: "grid", gap: 18 }}>
              <div>
                <p className="field__label" style={{ marginBottom: 8 }}>1 · Approved rider</p>
                <label className="search" style={{ maxWidth: "none", marginBottom: 8 }}>
                  <span className="sr-only">Search riders</span>
                  <Icon name="search" size={16} />
                  <input type="search" placeholder="Search rider" value={a.q} onChange={(e) => setA({ q: e.target.value })} />
                </label>
                <div className="pick-list" role="radiogroup" aria-label="Rider">
                  {riders.length ? (
                    riders.map((x) => {
                      const e = D.eligibility(x);
                      return (
                        <button key={x.id} type="button" className="pick" role="radio" aria-checked={a.rider === x.id} onClick={() => setA({ rider: x.id })}>
                          <span className="radio-dot" />
                          <Avatar name={x.name} />
                          <span className="pick__body">
                            <b>{x.name}</b>
                            <small>
                              {x.customerId} · {U.phone(x.phone)}
                            </small>
                          </span>
                          {e.ok ? <Badge tone="green">Eligible</Badge> : <Badge tone="amber">{e.checks.filter((c) => !c.ok).length} pending</Badge>}
                        </button>
                      );
                    })
                  ) : (
                    <p className="cell-sub">No approved riders without a vehicle.</p>
                  )}
                </div>
              </div>
              {r && el ? (
                <div className="summary">
                  <p className="field__label" style={{ marginBottom: 10 }}>
                    Eligibility · {r.name} ({r.customerId})
                  </p>
                  <ul className="checklist">
                    {el.checks.map((c) => (
                      <li key={c.key} className={c.ok ? "ok" : "no"}>
                        <span className="tick">
                          <Icon name={c.ok ? "check" : "x"} size={14} />
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  <dl className="kv" style={{ marginTop: 12 }}>
                    <dt>Plan / recharge</dt>
                    <dd>{r.plan ? r.plan.name + " · until " + U.fmtDateTime(r.plan.end) : "No recharge yet"}</dd>
                  </dl>
                </div>
              ) : null}
              <div>
                <p className="field__label" style={{ marginBottom: 8 }}>
                  2 · Available vehicle{" "}
                  <span className="cell-sub" style={{ display: "inline" }}>
                    ({vehicles.length} in warehouse, status Inactive)
                  </span>
                </p>
                <div className="pick-list" role="radiogroup" aria-label="Vehicle">
                  {vehicles.length ? (
                    vehicles.map((x) => (
                      <button key={x.id} type="button" className="pick" role="radio" aria-checked={a.vehicle === x.id} onClick={() => setA({ vehicle: x.id })}>
                        <span className="radio-dot" />
                        <span className="pick__body">
                          <b>{x.regNo}</b>
                          <small>
                            IOP {x.iopId || "—"} · Chassis {x.chassisNo} · {U.km(x.odometer)}
                          </small>
                        </span>
                        <AssetBadge status={x.status} />
                      </button>
                    ))
                  ) : (
                    <p className="cell-sub">No vehicles available. Return or repair a vehicle first.</p>
                  )}
                </div>
              </div>
              {v ? (
                <div className="summary">
                  <p className="field__label" style={{ marginBottom: 10 }}>Vehicle record</p>
                  <dl className="kv">
                    <dt>Registration No.</dt>
                    <dd>
                      <Plate v={v} />
                    </dd>
                    <dt>IOP device ID</dt>
                    <dd className="cell-mono">{v.iopId || "—"}</dd>
                    <dt>Chassis No.</dt>
                    <dd className="cell-mono">{v.chassisNo}</dd>
                    <dt>Motor No.</dt>
                    <dd className="cell-mono">{v.motorNo}</dd>
                    <dt>Controller No.</dt>
                    <dd className="cell-mono">{v.controllerNo}</dd>
                    <dt>Current status</dt>
                    <dd>
                      <AssetBadge status={v.status} />
                    </dd>
                  </dl>
                </div>
              ) : null}
            </div>
            <div className="card__foot" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="cell-sub" style={{ whiteSpace: "normal" }}>{why}</span>
              <Button variant="primary" disabled={!canAssign} onClick={doAssign}>
                <Icon name="link" size={16} />
                Assign vehicle
              </Button>
            </div>
          </section>
          <div className="stack">
            <div className="notice notice--info">
              <Icon name="info" size={16} />
              <span>
                <b>Assignment rules:</b> the rider must be approved, have the security deposit recorded and a successful first recharge. A rider can hold only one active vehicle.
              </span>
            </div>
            <section className="card">
              <div className="card__head">
                <h2>
                  <Icon name="history" size={16} />
                  Recent assignments
                </h2>
              </div>
              <div className="card__body">
                <RecentLogs actions={["assign", "replace"]} n={6} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Vehicle replacement */
const REASONS = ["Breakdown", "Repair required", "Accident damage", "Battery fault", "Other"];

export function ReplacementPage() {
  const ui = useUI();
  const replace = useReplaceVehicle();
  useStore();
  const [st, setSt] = usePageState("replacement");
  const f = st.form;
  const e = st.err;

  const riders = store.state.riders.filter((r) => r.vehicleId);
  const r = f.riderId ? G.rider(f.riderId) : null;
  const oldV = r ? G.riderVehicle(r) : null;
  const avail = D.availableVehicles();
  const newVid = f.newVehicleId && avail.some((v) => v.id === f.newVehicleId) ? f.newVehicleId : "";
  const newV = newVid ? G.vehicle(newVid) : null;
  const hist = store.state.replacements.slice().sort((a, b) => b.at - a.at);

  const setForm = (patch: Partial<typeof f>) => setSt((x) => {
    x.form = { ...x.form, ...patch };
  });

  const reset = () => setSt({ form: { ...emptyReplacementForm(), date: today() }, err: {} });

  const submit = async () => {
    const form = getPageState("replacement").form;
    const er: Record<string, string> = {};
    const rr = form.riderId ? G.rider(form.riderId) : null;
    const ov = rr ? G.riderVehicle(rr) : null;
    const nv = form.newVehicleId ? G.vehicle(form.newVehicleId) : null;
    if (!rr) er.riderId = "Select a rider.";
    if (!nv) er.newVehicleId = "Select the replacement vehicle.";
    if (!form.reason) er.reason = "Select a reason.";
    if (form.reason === "Other" && !form.reasonOther.trim()) er.reasonOther = "Describe the reason.";
    // Odometer readings are optional on the API; when given they must not go backwards.
    const oo = Number(form.oldOdo);
    const no = Number(form.newOdo);
    if (form.oldOdo !== "" && (isNaN(oo) || oo < 0)) er.oldOdo = "Enter a valid odometer reading.";
    else if (form.oldOdo !== "" && ov && ov.odometer != null && oo < ov.odometer) er.oldOdo = "Cannot be lower than the last recorded " + U.km(ov.odometer) + ".";
    if (form.newOdo !== "" && (isNaN(no) || no < 0)) er.newOdo = "Enter a valid odometer reading.";
    else if (form.newOdo !== "" && nv && nv.odometer != null && no < nv.odometer) er.newOdo = "Cannot be lower than the last recorded " + U.km(nv.odometer) + ".";
    patchPageState("replacement", { err: er });
    if (Object.keys(er).length) {
      ui.toast("Please fix the highlighted fields.", { type: "error" });
      setTimeout(() => document.querySelector<HTMLElement>("#replace .has-error input, #replace .has-error select")?.focus(), 0);
      return;
    }
    const reason = form.reason === "Other" ? form.reasonOther.trim() : form.reason;
    const ok = await ui.confirm({
      title: "Confirm vehicle replacement",
      icon: "swap",
      body: (
        <>
          <div className="summary__arrow" style={{ marginBottom: 12 }}>
            <div className="vtile">
              <small>Old</small>
              <b>{ov!.regNo}</b>
              <small>{form.oldOdo !== "" ? U.num(oo) + " km" : "—"}</small>
            </div>
            <Icon name="arrowRight" size={20} />
            <div className="vtile">
              <small>New</small>
              <b>{nv!.regNo}</b>
              <small>{form.newOdo !== "" ? U.num(no) + " km" : "—"}</small>
            </div>
          </div>
          <dl className="kv">
            <dt>Rider</dt>
            <dd>
              {rr!.name} · {rr!.customerId}
            </dd>
            <dt>Reason</dt>
            <dd>{reason}</dd>
            <dt>Plan</dt>
            <dd>Continues uninterrupted</dd>
          </dl>
        </>
      ),
      confirmLabel: "Replace vehicle",
      confirmIcon: "swap",
    });
    if (!ok) return;
    try {
      // The hook toasts success / the server's error code (features/fleet/hooks.ts).
      await replace.mutateAsync({
        riderId: rr!.id,
        newVehicleId: nv!.id,
        reason,
        ...(form.oldOdo !== "" ? { odometerOldKm: oo } : {}),
        ...(form.newOdo !== "" ? { odometerNewKm: no } : {}),
      });
      reset();
    } catch {
      /* surfaced by the hook's onError toast */
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicle replacement</h1>
          <p>Swap a rider’s current vehicle for another one (breakdown or repair). The rental continues.</p>
        </div>
      </div>
      <div id="replace">
        <div className="grid-2">
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="swap" size={16} />
                Replacement form
              </h2>
              <p>Rental continues uninterrupted</p>
            </div>
            <form className="card__body" id="replace-form" noValidate onSubmit={(ev) => ev.preventDefault()}>
              <div className="form-grid">
                <Field id="rp-rider" label="Rider" req err={e.riderId} span>
                  <select
                    className="select"
                    id="rp-rider"
                    value={f.riderId}
                    onChange={(ev) => {
                      const rid = ev.target.value;
                      const rr = G.rider(rid);
                      const ov = rr ? G.riderVehicle(rr) : null;
                      setForm({ riderId: rid, oldOdo: ov && ov.odometer != null ? String(ov.odometer) : "" });
                    }}
                  >
                    <option value="">Select a rider with a vehicle</option>
                    {riders.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · {x.customerId} · {G.riderVehicle(x)!.regNo}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="field">
                  <span className="field__label">Old vehicle</span>
                  <div className="input" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)" }}>
                    {oldV ? (
                      <>
                        <Plate v={oldV} />
                        <span className="cell-sub">{oldV.iopId ? `IOP ${oldV.iopId}` : ""} · {oldV.chassisNo}</span>
                      </>
                    ) : (
                      <span className="cell-sub">Auto-filled from rider</span>
                    )}
                  </div>
                </div>
                <Field id="rp-new" label="New vehicle" req err={e.newVehicleId} hint={avail.length ? "Only unassigned, Inactive vehicles are listed." : "No vehicles available."}>
                  <select
                    className="select"
                    id="rp-new"
                    value={newVid}
                    onChange={(ev) => {
                      const nv = G.vehicle(ev.target.value);
                      setForm({ newVehicleId: ev.target.value, newOdo: nv && nv.odometer != null ? String(nv.odometer) : "" });
                    }}
                  >
                    <option value="">Select available vehicle</option>
                    {avail.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNo} · IOP {v.iopId || "—"} · {U.km(v.odometer)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="rp-reason" label="Replacement reason" req err={e.reason}>
                  <select className="select" id="rp-reason" value={f.reason} onChange={(ev) => setForm({ reason: ev.target.value })}>
                    <option value="">Select reason</option>
                    {REASONS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                {f.reason === "Other" ? (
                  <Field id="rp-other" label="Describe the reason" req err={e.reasonOther} span>
                    <input className="input" id="rp-other" value={f.reasonOther} placeholder="e.g. Rider request" onChange={(ev) => setForm({ reasonOther: ev.target.value })} />
                  </Field>
                ) : null}
                <Field id="rp-oldodo" label="Old vehicle odometer (km)" err={e.oldOdo} hint={oldV && oldV.odometer != null ? "Must be ≥ last recorded " + U.km(oldV.odometer) : "Optional"}>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    id="rp-oldodo"
                    value={f.oldOdo}
                    placeholder={oldV && oldV.odometer != null ? "Last recorded " + oldV.odometer : "km"}
                    onChange={(ev) => setForm({ oldOdo: ev.target.value })}
                  />
                </Field>
                <Field id="rp-newodo" label="New vehicle odometer (km)" err={e.newOdo} hint={newV && newV.odometer != null ? "Last recorded " + U.km(newV.odometer) : "Optional"}>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    id="rp-newodo"
                    value={f.newOdo}
                    placeholder={newV && newV.odometer != null ? "Last recorded " + newV.odometer : "km"}
                    onChange={(ev) => setForm({ newOdo: ev.target.value })}
                  />
                </Field>
              </div>
              <div className="summary" style={{ marginTop: 18 }}>
                <p className="field__label" style={{ marginBottom: 10 }}>Summary</p>
                <div className="summary__arrow">
                  <div className="vtile">
                    <small>Old vehicle</small>
                    <b>{oldV ? oldV.regNo : "—"}</b>
                    <small>{f.oldOdo ? U.num(Number(f.oldOdo)) + " km" : ""}</small>
                  </div>
                  <Icon name="arrowRight" size={20} />
                  <div className="vtile">
                    <small>New vehicle</small>
                    <b>{newV ? newV.regNo : "—"}</b>
                    <small>{f.newOdo ? U.num(Number(f.newOdo)) + " km" : ""}</small>
                  </div>
                </div>
                <p className="cell-sub" style={{ marginTop: 10, whiteSpace: "normal" }}>
                  {r ? r.name + "’s plan (" + (r.plan ? r.plan.name + " until " + U.fmtDate(r.plan.end) : "none") + ") continues. " : ""}
                  {f.reason ? "The old vehicle returns to the pool — update its record to Repair_req from the vehicle drawer if it needs repair." : ""}
                </p>
              </div>
            </form>
            <div className="card__foot">
              <Button variant="subtle" onClick={reset}>Clear</Button>
              <Button variant="primary" onClick={submit}>
                <Icon name="swap" size={16} />
                Review &amp; confirm
              </Button>
            </div>
          </section>
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="history" size={16} />
                Replacement history
              </h2>
              <p>{hist.length} records</p>
            </div>
            {hist.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Rider</th>
                      <th>Old → New</th>
                      <th>Reason</th>
                      <th className="num">Odometer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hist.map((h) => {
                      const rr = G.rider(h.riderId);
                      const o = G.vehicle(h.oldVehicleId);
                      const n = G.vehicle(h.newVehicleId);
                      return (
                        <tr key={h.id}>
                          <td>
                            <span className="cell-main">{U.fmtShortDate(new Date(h.date + "T12:00").getTime())}</span>
                          </td>
                          <td>{rr ? rr.name : "—"}</td>
                          <td>
                            <span className="cell-main">{o ? o.regNo : "?"}</span>
                            <span className="cell-sub">→ {n ? n.regNo : "?"}</span>
                          </td>
                          <td>{h.reason}</td>
                          <td className="num">
                            <span className="cell-main">{U.num(h.oldOdo)}</span>
                            <span className="cell-sub">{U.num(h.newOdo)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card__body">
                <EmptyState icon="swap" title="No replacements yet" text="Completed swaps appear here." />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
