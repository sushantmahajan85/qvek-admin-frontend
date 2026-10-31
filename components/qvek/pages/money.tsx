"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { emptyExpenseForm, getPageState, patchPageState, today, usePageState } from "@/lib/qvek/page-state";
import { FIN_STATUS, FIN_STYLE } from "@/lib/qvek/selectors";
import { D, G, L, store } from "@/lib/qvek/store";
import { useLogExpense } from "@/features/fleet/hooks";
import type { ExpenseType } from "@/lib/qvek/types";
import { U } from "@/lib/qvek/utils";
import { useStore } from "@/lib/qvek/use-store";
import { useAdmin } from "../admin-context";
import { EmptyState, Field, FinFilterSeg, Pager, SearchBox, SortTh } from "../bits";
import { Icon } from "../icon";
import { useUI } from "../ui-context";

/* ---------------------------------------------------------------- Financial history */
export function FinancePage() {
  const admin = useAdmin();
  useStore();
  const [st, setSt] = usePageState("finance");
  const all = store.state.finance;
  const sum = (fn: (e: (typeof all)[number]) => boolean) => all.filter(fn).reduce((s, e) => s + e.amount, 0);
  const rent = sum((e) => e.status === "success" && (e.type === "recharge" || e.type === "first_cycle"));
  const deps =
    sum((e) => e.status === "success" && e.type === "deposit") -
    sum((e) => e.status === "success" && e.type === "refund") -
    sum((e) => e.status === "success" && e.type === "deposit_deduction");
  const svc = sum((e) => e.status === "success" && ["service", "repair", "servicing"].includes(e.type));
  const pend = all.filter((e) => e.status === "pending").length;
  const failed = all.filter((e) => e.status === "failed").length;

  let list = D.financeFilter(all.slice(), st.f);
  if (st.status !== "all") list = list.filter((e) => e.status === st.status);
  if (st.q) {
    const q = st.q.toLowerCase().replace(/\s/g, "");
    list = list.filter((e) => {
      const r = G.rider(e.riderId);
      const v = G.vehicle(e.vehicleId);
      return [e.ref, e.title, r && r.name, r && r.customerId, r && r.phone, v && v.regNo].some((x) => x && String(x).toLowerCase().replace(/\s/g, "").includes(q));
    });
  }
  const k = st.sort.k;
  const d = st.sort.d;
  list.sort((a, b) => {
    const x = k === "amount" ? a.amount : a.at;
    const y = k === "amount" ? b.amount : b.at;
    return (x - y) * d;
  });
  const per = 12;
  const page = Math.min(st.page, Math.max(1, Math.ceil(list.length / per)));

  const onSort = (key: string) =>
    setSt((x) => {
      if (x.sort.k === key) x.sort = { k: key, d: (x.sort.d * -1) as 1 | -1 };
      else x.sort = { k: key, d: key === "date" ? -1 : 1 };
      x.page = 1;
    });

  const statC = (label: string, val: string | number, icon: string, tone: string, sub: string) => (
    <div className="stat">
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        <span className={"stat__icon " + tone}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="stat__value" style={{ fontSize: 22 }}>{val}</div>
      <div className="stat__sub">{sub}</div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Financial history</h1>
          <p>All riders’ deposits, recharges, adjusted first cycles, service logs and refunds. Riders only see their own records in the app.</p>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>
        {statC("Rent collected", U.money(rent), "zap", "tone-green", "Successful recharges")}
        {statC("Deposits held (net)", U.money(deps), "shield", "tone-blue", "After refunds & expenses")}
        {statC("Service & repair logs", U.money(svc), "wrench", "tone-amber", "Logged against riders")}
        {statC("Pending", pend, "clock", "tone-amber", "Awaiting confirmation")}
        {statC("Failed", failed, "alertCircle", "tone-red", "Not confirmed")}
      </div>
      <section className="card">
        <div className="toolbar">
          <SearchBox value={st.q} onChange={(q) => setSt({ q, page: 1 })} placeholder="Search rider, Customer ID, vehicle or reference" />
          <FinFilterSeg cur={st.f} onPick={(f) => setSt({ f, page: 1 })} />
          <label className="sr-only" htmlFor="fin-status">Status</label>
          <select className="select" id="fin-status" style={{ width: "auto", height: 38 }} value={st.status} onChange={(e) => setSt({ status: e.target.value, page: 1 })}>
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div id="fin-table">
          {!list.length ? (
            <EmptyState icon="receipt" title="No transactions" text="Nothing matches the current filters." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <SortTh label="Date" sortKey="date" sort={st.sort} onSort={onSort} />
                      <th>Rider</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Plan / period</th>
                      <SortTh label="Amount" sortKey="amount" sort={st.sort} onSort={onSort} className="num" />
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice((page - 1) * per, page * per).map((e) => {
                      const r = G.rider(e.riderId);
                      const v = G.vehicle(e.vehicleId);
                      const ic = e.status === "failed" ? ["alertCircle", "tone-red"] : FIN_STYLE[e.type] || ["receipt", "tone-grey"];
                      const fs = FIN_STATUS[e.status];
                      return (
                        <tr key={e.id} className="row-main" onClick={() => admin.finDetail(e.id)}>
                          <td data-label="Date">
                            <span className="cell-main">{U.fmtDate(e.at)}</span>
                            <span className="cell-sub">{U.fmtTime(e.at)}</span>
                          </td>
                          <td data-label="Rider">
                            {r ? (
                              <>
                                <span className="cell-main">{r.name}</span>
                                <span className="cell-sub">{r.customerId || "Applicant"}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td data-label="Vehicle">{v ? <span className="cell-mono">{v.regNo}</span> : <span className="cell-sub">—</span>}</td>
                          <td data-label="Type" className="cell-full">
                            <div className="row">
                              <span className={"fin-row__icon " + ic[1]} style={{ width: 26, height: 26 }}>
                                <Icon name={ic[0]} size={13} />
                              </span>
                              <span>
                                <span className="cell-main" style={{ whiteSpace: "normal" }}>{e.title}</span>
                                <span className="cell-sub">
                                  {L.finType[e.type]} · {e.method}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td data-label="Plan / period">
                            {e.planName ? <span className="cell-main">{e.planName}</span> : null}
                            {e.periodStart ? (
                              <span className="cell-sub">
                                {U.fmtDate(e.periodStart)} → {U.fmtDate(e.periodEnd)}
                              </span>
                            ) : e.planName ? null : (
                              <span className="cell-sub">—</span>
                            )}
                          </td>
                          <td data-label="Amount" className="num">
                            <span className="cell-main" style={e.status === "failed" ? { textDecoration: "line-through", color: "var(--text-3)" } : undefined}>
                              {e.type === "refund" ? "−" : ""}
                              {U.money(e.amount)}
                            </span>
                          </td>
                          <td data-label="Status">
                            <Badge tone={fs[0]}>{fs[1]}</Badge>
                          </td>
                          <td data-label="Reference">
                            <span className="cell-mono">{e.ref}</span>
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

/* ---------------------------------------------------------------- Expenses */
const TYPES: [ExpenseType, string, string][] = [
  ["pending_deposit", "Pending deposit", "wallet"],
  ["repair", "Repair", "wrench"],
  ["servicing", "Servicing", "cog"],
];

const PAYERS: ["company" | "rider" | "deposit", string, string][] = [
  ["company", "Company", "briefcase"],
  ["rider", "Rider", "user"],
  ["deposit", "Rider deposit", "shield"],
];

const PAYER_LABEL: Record<string, [string, "grey" | "blue" | "violet"]> = {
  company: ["Company", "grey"],
  rider: ["Rider", "blue"],
  deposit: ["Rider deposit", "violet"],
};

export function ExpensesPage() {
  const ui = useUI();
  const logExpense = useLogExpense();
  useStore();
  const [st, setSt] = usePageState("expenses");
  const f = st.form;
  const e = st.err;
  const s = store.state;
  const riders = s.riders.filter((r) => r.application.status !== "rejected");
  const vehicles = s.vehicles;
  const list = s.expenses.filter((x) => st.filter === "all" || x.type === st.filter).sort((a, b) => b.at - a.at);
  const total = (t: string) => s.expenses.filter((x) => t === "all" || x.type === t).reduce((sum, x) => sum + x.amount, 0);
  const payerRider = f.riderId ? G.rider(f.riderId) : null;
  const depositRemaining = payerRider ? Math.max(0, payerRider.deposit.amount - (payerRider.deposit.used ?? 0)) : 0;

  const setForm = (patch: Partial<typeof f>) =>
    setSt((x) => {
      x.form = { ...x.form, ...patch };
    });

  const reset = () => setSt({ form: emptyExpenseForm(f.type), err: {} });

  const save = async () => {
    const form = getPageState("expenses").form;
    const er: Record<string, string> = {};
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) er.amount = "Enter an amount greater than 0.";
    else if (amt > 500000) er.amount = "Amount looks too large.";
    if (form.type === "pending_deposit" && !form.riderId) er.riderId = "A pending deposit must be linked to a rider.";
    if (form.type === "pending_deposit" && form.riderId) {
      const r = G.rider(form.riderId);
      if (r && r.deposit.status === "received") er.riderId = "This rider’s deposit is already received.";
    }
    if (form.type !== "pending_deposit" && !form.vehicleId) er.vehicleId = "Repair and servicing expenses must be linked to a vehicle.";
    if (form.type !== "pending_deposit" && !form.notes.trim()) er.notes = "Describe the work done.";
    if (form.paidBy !== "company" && !form.riderId) {
      er.riderId = "Select the rider who pays, or switch to Company.";
    }
    if (form.paidBy === "deposit" && form.riderId) {
      const pr = G.rider(form.riderId);
      const held = pr?.deposit.status === "received";
      const remaining = pr ? Math.max(0, pr.deposit.amount - (pr.deposit.used ?? 0)) : 0;
      if (!held) er.riderId = "This rider has no security deposit on record.";
      else if (remaining <= 0) er.riderId = "This rider's security deposit is fully used.";
      else if (!er.amount && amt > remaining) {
        er.amount = `Deposit remaining is ${U.money(remaining)} — reduce the amount.`;
      }
    }
    patchPageState("expenses", { err: er });
    if (Object.keys(er).length) {
      ui.toast("Please fix the highlighted fields.", { type: "error" });
      return;
    }
    const kind = form.type === "pending_deposit" ? "DEPOSIT_PENDING" : form.type === "repair" ? "REPAIR" : "SERVICING";
    const paidBy = form.paidBy === "deposit" ? "RIDER_DEPOSIT" : form.paidBy === "rider" ? "RIDER" : "COMPANY";
    try {
      // The hook toasts success / the server's error code (features/fleet/hooks.ts).
      await logExpense.mutateAsync({
        kind,
        paidBy,
        amountPaise: Math.round(amt * 100),
        ...(form.riderId ? { riderId: form.riderId } : {}),
        ...(form.vehicleId ? { vehicleId: form.vehicleId } : {}),
        ...(form.notes.trim() ? { note: form.notes.trim() } : {}),
      });
      patchPageState("expenses", { form: emptyExpenseForm(form.type), err: {} });
    } catch {
      /* surfaced by the hook's onError toast */
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p>Log pending security deposits and repair or servicing expenses. Entries linked to a rider appear in their financial history.</p>
        </div>
      </div>
      <div id="exp">
        <div className="grid-2-eq">
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="plus" size={16} />
                New expense
              </h2>
              <p>Logged against a vehicle or rider</p>
            </div>
            <form className="card__body" id="exp-form" noValidate onSubmit={(ev) => ev.preventDefault()}>
              <div className="field" style={{ marginBottom: 16 }}>
                <span className="field__label">
                  Expense type <span className="req">*</span>
                </span>
                <div className="seg" role="radiogroup" aria-label="Expense type" style={{ width: "fit-content" }}>
                  {TYPES.map((t) => (
                    // aria-pressed is what the shared `.seg` styles key off for the selected look (matches the prototype).
                    // eslint-disable-next-line jsx-a11y/role-supports-aria-props
                    <button key={t[0]} type="button" role="radio" aria-pressed={f.type === t[0]} aria-checked={f.type === t[0]} onClick={() => setSt({ form: { ...f, type: t[0] }, err: {} })}>
                      <Icon name={t[2]} size={15} />
                      {t[1]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <span className="field__label">
                  Paid by <span className="req">*</span>
                </span>
                <div className="seg" role="radiogroup" aria-label="Who pays" style={{ width: "fit-content" }}>
                  {PAYERS.map((p) => (
                    // eslint-disable-next-line jsx-a11y/role-supports-aria-props
                    <button key={p[0]} type="button" role="radio" aria-pressed={f.paidBy === p[0]} aria-checked={f.paidBy === p[0]} onClick={() => setSt({ form: { ...f, paidBy: p[0] }, err: {} })}>
                      <Icon name={p[2]} size={15} />
                      {p[1]}
                    </button>
                  ))}
                </div>
                <div className="field__hint" style={{ marginTop: 6 }}>
                  {f.paidBy === "company"
                    ? "Business expense — no rider needed."
                    : f.paidBy === "rider"
                      ? "Rider pays out of pocket; the amount appears in their financial history."
                      : payerRider
                        ? `${U.money(depositRemaining)} available from ${payerRider.name}'s security deposit${
                            payerRider.deposit.status === "received" ? "" : " (no deposit held)"
                          }.`
                        : "Pick a rider with a held security deposit."}
                </div>
              </div>
              <div className="form-grid">
                <Field id="ex-amount" label="Amount" req err={e.amount}>
                  <div className="input-prefix">
                    <span>₹</span>
                    <input id="ex-amount" type="number" inputMode="decimal" min={1} step={1} value={f.amount} placeholder="0" onChange={(ev) => setForm({ amount: ev.target.value })} />
                  </div>
                </Field>
                <Field
                  id="ex-rider"
                  label="Related rider"
                  req={f.type === "pending_deposit" || f.paidBy !== "company"}
                  err={e.riderId}
                  hint={
                    f.type === "pending_deposit"
                      ? null
                      : f.paidBy === "company"
                        ? "Optional — adds an entry to this rider’s financial history"
                        : f.paidBy === "deposit"
                          ? "The expense is deducted from this rider’s security deposit"
                          : "The rider bears this expense"
                  }
                >
                  <select
                    className="select"
                    id="ex-rider"
                    value={f.riderId}
                    onChange={(ev) => {
                      const rid = ev.target.value;
                      const r = G.rider(rid);
                      setForm(rid && r && r.vehicleId ? { riderId: rid, vehicleId: r.vehicleId } : { riderId: rid });
                    }}
                  >
                    <option value="">{f.type === "pending_deposit" ? "Select rider" : "None"}</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.customerId ? " · " + r.customerId : " · applicant"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="ex-vehicle" label="Related vehicle" req={f.type !== "pending_deposit"} err={e.vehicleId}>
                  <select className="select" id="ex-vehicle" value={f.vehicleId} onChange={(ev) => setForm({ vehicleId: ev.target.value })}>
                    <option value="">{f.type === "pending_deposit" ? "None" : "Select vehicle"}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNo} · {v.chassisNo}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="ex-notes" label="Description / notes" req={f.type !== "pending_deposit"} err={e.notes} span>
                  <textarea className="textarea" id="ex-notes" placeholder="e.g. Brake pad replacement, labour included" maxLength={240} value={f.notes} onChange={(ev) => setForm({ notes: ev.target.value })} />
                </Field>
              </div>
            </form>
            <div className="card__foot">
              <Button variant="subtle" onClick={reset}>Clear</Button>
              <Button variant="primary" onClick={save}>
                <Icon name="check" size={16} />
                Save expense
              </Button>
            </div>
          </section>
          <section className="card">
            <div className="card__head">
              <h2>
                <Icon name="receipt" size={16} />
                Expense log
              </h2>
              <p>Total {U.money(total(st.filter))}</p>
            </div>
            <div className="toolbar">
              <div className="seg" role="tablist" aria-label="Filter expenses">
                <button type="button" role="tab" aria-selected={st.filter === "all"} onClick={() => setSt({ filter: "all" })}>
                  All
                </button>
                {TYPES.map((t) => (
                  <button key={t[0]} type="button" role="tab" aria-selected={st.filter === t[0]} onClick={() => setSt({ filter: t[0] })}>
                    {t[1]}
                  </button>
                ))}
              </div>
            </div>
            {list.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Paid by</th>
                      <th>Linked to</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((x) => {
                      const r = G.rider(x.riderId);
                      const v = G.vehicle(x.vehicleId);
                      return (
                        <tr key={x.id}>
                          <td>
                            <span className="cell-main">{U.fmtShortDate(new Date(x.date + "T12:00").getTime())}</span>
                          </td>
                          <td>
                            <span className="cell-main">{L.expenseType[x.type]}</span>
                            <span className="cell-sub" style={{ whiteSpace: "normal" }}>{x.notes || "—"}</span>
                          </td>
                          <td>
                            <Badge tone={PAYER_LABEL[x.paidBy][1]}>{PAYER_LABEL[x.paidBy][0]}</Badge>
                          </td>
                          <td>
                            {v ? <span className="cell-mono">{v.regNo}</span> : null}
                            {r ? (
                              <span className="cell-sub">
                                {r.name}
                                {x.financeId ? " · in history" : ""}
                              </span>
                            ) : null}
                            {!v && !r ? <span className="cell-sub">—</span> : null}
                          </td>
                          <td className="num">
                            <span className="cell-main">{U.money(x.amount)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card__body">
                <EmptyState icon="receipt" title="No expenses" text="Saved expenses appear here." />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
