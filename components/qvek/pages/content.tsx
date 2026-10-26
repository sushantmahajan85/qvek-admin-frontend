"use client";

/* App content — server-driven rider UI (tabs, actions, KYC docs, plans, help,
 * contact, languages). Each card edits one /config/ui section; the rider app
 * falls back to today's UI when a section is missing or invalid. */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSetUiSection, useUiConfig } from "@/features/config/hooks";
import type { UiSectionName } from "@/features/config/api";
import { FieldError } from "../bits";
import { Icon } from "../icon";

const TAB_LABELS: Record<string, string> = { home: "Home", recharge: "Recharge", history: "History", alerts: "Alerts", account: "Account" };
const RIDER_ICONS = [
  "home-outline",
  "flash-outline",
  "receipt-outline",
  "notifications-outline",
  "person-outline",
  "bicycle-outline",
  "storefront-outline",
  "headset-outline",
  "wallet-outline",
  "document-text-outline",
  "id-card-outline",
  "calendar-outline",
  "lock-closed-outline",
  "hourglass-outline",
  "shield-checkmark-outline",
  "navigate-outline",
  "call-outline",
  "moon-outline",
  "language-outline",
  "log-out-outline",
  "pause-circle-outline",
  "construct-outline",
];
const ROUTES = ["/(tabs)/recharge", "/(tabs)/history", "/(tabs)/alerts", "/contact", "/terms"];

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowTools({ onUp, onDown, onRemove, canRemove = true }: { onUp: () => void; onDown: () => void; onRemove: () => void; canRemove?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button type="button" className="btn btn--subtle btn--sm" aria-label="Move up" onClick={onUp} style={{ padding: "4px 8px" }}>
        <Icon name="chevronUp" size={14} />
      </button>
      <button type="button" className="btn btn--subtle btn--sm" aria-label="Move down" onClick={onDown} style={{ padding: "4px 8px" }}>
        <Icon name="chevronDown" size={14} />
      </button>
      {canRemove ? (
        <button type="button" className="btn btn--subtle btn--sm" aria-label="Remove" onClick={onRemove} style={{ padding: "4px 8px" }}>
          <Icon name="trash" size={14} />
        </button>
      ) : null}
    </div>
  );
}

function CardShell({ title, icon, err, onSave, saving, loading, children, hint }: {
  title: string;
  icon: string;
  err: string | null;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name={icon} size={16} />
          {title}
        </h2>
      </div>
      <div className="card__body" style={{ display: "grid", gap: 12 }}>
        {children}
        {hint ? <p className="field__hint" style={{ marginTop: 0 }}>{hint}</p> : null}
        {err ? <FieldError>{err}</FieldError> : null}
      </div>
      <div className="card__foot">
        <Button variant="primary" disabled={saving || loading} onClick={onSave}>
          <Icon name="check" size={16} />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}

function useSectionSaver(section: UiSectionName) {
  const save = useSetUiSection();
  const [err, setErr] = useState<string | null>(null);
  const submit = (value: unknown) => {
    setErr(null);
    save.mutate(
      { section, value },
      { onError: () => setErr("Save failed — check the values and retry.") },
    );
  };
  return { submit, err, setErr, saving: save.isPending };
}

function Check({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="check" htmlFor={id} style={{ margin: 0 }}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} /> {label}
    </label>
  );
}

/* ---------------------------------------------------------------- tabs */
function TabsCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("tabs");
  type Row = { id: string; title: string; icon: string; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.tabs.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.length) {
      setErr("Keep at least one tab.");
      return;
    }
    if (rows.some((r) => !r.title.trim())) {
      setErr("Every tab needs a title.");
      return;
    }
    submit(rows.map((r) => ({ ...r, title: r.title.trim() })));
  };

  return (
    <CardShell title="Bottom tabs" icon="smartphone" err={err} onSave={save} saving={saving} loading={!!ui.isLoading} hint="Hidden tabs disappear from the rider app (Alerts ships hidden). Order here = order in the app.">
      {rows.map((r, i) => (
        <div key={r.id} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Tab</label>
            <input className="input" value={TAB_LABELS[r.id] ?? r.id} readOnly />
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" value={r.title} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
          </div>
          <div className="field">
            <label>Icon</label>
            <select className="select" value={r.icon} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, icon: e.target.value } : y)))}>
              {RIDER_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Check id={`tab-en-${r.id}`} label="Shown" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => {}} canRemove={false} />
          </div>
        </div>
      ))}
      {!rows.length && !ui.isLoading ? <p className="cell-sub">No tabs — reload to restore defaults.</p> : null}
    </CardShell>
  );
}

/* ---------------------------------------------------------------- quick actions */
function QuickActionsCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("quickActions");
  type Row = { icon: string; label: string; route: string; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.quickActions.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.length) {
      setErr("Keep at least one action.");
      return;
    }
    if (rows.some((r) => !r.label.trim())) {
      setErr("Every action needs a label.");
      return;
    }
    submit(rows.map((r) => ({ ...r, label: r.label.trim() })));
  };

  return (
    <CardShell title="Home quick actions" icon="zap" err={err} onSave={save} saving={saving} loading={!!ui.isLoading}>
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Icon</label>
            <select className="select" value={r.icon} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, icon: e.target.value } : y)))}>
              {RIDER_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Label</label>
            <input className="input" value={r.label} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
          </div>
          <div className="field">
            <label>Opens</label>
            <select className="select" value={r.route} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, route: e.target.value } : y)))}>
              {ROUTES.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Check id={`qa-en-${i}`} label="Shown" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="subtle" size="sm" onClick={() => setRows((x) => [...x, { icon: "flash-outline", label: "", route: ROUTES[0], enabled: true }])}>
          <Icon name="plus" size={15} /> Add action
        </Button>
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- account sections */
function AccountSectionsCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("accountSections");
  type Row = { id: string; title: string; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.accountSections.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.length) {
      setErr("Keep at least one section.");
      return;
    }
    if (rows.some((r) => !r.title.trim())) {
      setErr("Every section needs a title.");
      return;
    }
    submit(rows.map((r) => ({ ...r, title: r.title.trim() })));
  };

  return (
    <CardShell title="Account sections" icon="user" err={err} onSave={save} saving={saving} loading={!!ui.isLoading} hint="Sections of the rider Account screen. Rows inside stay the same — this only shows, hides and reorders whole sections.">
      {rows.map((r, i) => (
        <div key={r.id} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Section</label>
            <input className="input" value={r.id} readOnly />
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" value={r.title} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Check id={`as-en-${r.id}`} label="Shown" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => {}} canRemove={false} />
          </div>
        </div>
      ))}
    </CardShell>
  );
}

/* ---------------------------------------------------------------- KYC docs */
function KycDocsCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("kycDocs");
  type Row = { kind: string; title: string; hint: string; required: boolean; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.kycDocs.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.filter((r) => r.enabled && r.required).length) {
      setErr("Keep at least one enabled, required document — approvals count on it.");
      return;
    }
    if (rows.some((r) => !r.kind.trim() || !r.title.trim())) {
      setErr("Every document needs a kind and a title.");
      return;
    }
    const kinds = rows.map((r) => r.kind.trim());
    if (new Set(kinds).size !== kinds.length) {
      setErr("Document kinds must be unique.");
      return;
    }
    submit(rows.map((r) => ({ kind: r.kind.trim(), title: r.title.trim(), hint: r.hint.trim() || "Upload a clear photo or PDF", required: r.required, enabled: r.enabled })));
  };

  return (
    <CardShell
      title="KYC documents"
      icon="idCard"
     
      err={err}
      onSave={save}
      saving={saving}
      loading={!!ui.isLoading}
      hint="Required + enabled documents drive onboarding validation, rider upload rows and admin approval counts. New kinds work end-to-end (uploads attach under the new kind)."
    >
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Kind</label>
            <input className="input" value={r.kind} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, kind: e.target.value } : y)))} placeholder="e.g. voter" />
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" value={r.title} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
          </div>
          <div className="field">
            <label>Hint</label>
            <input className="input" value={r.hint} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, hint: e.target.value } : y)))} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Check id={`kd-req-${i}`} label="Required" checked={r.required} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, required: v } : y)))} />
            <Check id={`kd-en-${i}`} label="Shown" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="subtle" size="sm" onClick={() => setRows((x) => [...x, { kind: "", title: "", hint: "", required: false, enabled: true }])}>
          <Icon name="plus" size={15} /> Add document
        </Button>
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- plans */
function PlansCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("plans");
  type Row = { id: string; days: string; label: string; ribbon: string; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.plans.map((t) => ({ id: t.id, days: String(t.days), label: t.label, ribbon: t.ribbon ?? "", enabled: t.enabled })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    const parsed = rows.map((r) => ({ id: r.id.trim(), days: Number(r.days), label: r.label.trim(), ribbon: r.ribbon.trim() || null, enabled: r.enabled }));
    if (!parsed.length) {
      setErr("Keep at least one plan.");
      return;
    }
    if (parsed.some((r) => !r.id || !r.label)) {
      setErr("Every plan needs an id and a label.");
      return;
    }
    if (new Set(parsed.map((r) => r.id)).size !== parsed.length) {
      setErr("Plan ids must be unique.");
      return;
    }
    if (parsed.some((r) => !Number.isInteger(r.days) || r.days < 1 || r.days > 365)) {
      setErr("Plan length must be 1–365 days.");
      return;
    }
    if (!parsed.some((r) => r.enabled)) {
      setErr("Keep at least one plan enabled.");
      return;
    }
    submit(parsed);
  };

  return (
    <CardShell
      title="Plan catalog"
      icon="zap"
     
      err={err}
      onSave={save}
      saving={saving}
      loading={!!ui.isLoading}
      hint="New plans work end-to-end (quoted, charged and extended by their day count; priced pro-rata from weekly until given an explicit price). Removing a plan id with pending payments leaves those payments payable under the weekly fallback."
    >
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Plan id</label>
            <input className="input" value={r.id} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, id: e.target.value } : y)))} placeholder="e.g. DIWALI" />
          </div>
          <div className="field">
            <label>Days</label>
            <input className="input" type="number" min={1} max={365} value={r.days} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, days: e.target.value } : y)))} />
          </div>
          <div className="field">
            <label>Label</label>
            <input className="input" value={r.label} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="e.g. Diwali" />
          </div>
          <div className="field">
            <label>Ribbon</label>
            <input className="input" value={r.ribbon} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, ribbon: e.target.value } : y)))} placeholder="Optional" />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Check id={`pl-en-${i}`} label="Offered" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="subtle" size="sm" onClick={() => setRows((x) => [...x, { id: "", days: "7", label: "", ribbon: "", enabled: true }])}>
          <Icon name="plus" size={15} /> Add plan
        </Button>
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- help */
function HelpCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("helpSections");
  type Row = { icon: string; title: string; body: string };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.helpSections.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.length) {
      setErr("Keep at least one help row.");
      return;
    }
    if (rows.some((r) => !r.title.trim() || !r.body.trim())) {
      setErr("Every row needs a title and a body.");
      return;
    }
    submit(rows.map((r) => ({ icon: r.icon, title: r.title.trim(), body: r.body.trim() })));
  };

  return (
    <CardShell
      title="Help & Terms rows"
      icon="info"
     
      err={err}
      onSave={save}
      saving={saving}
      loading={!!ui.isLoading}
      hint="Shown on the rider Terms screen in this order. Use {graceHours} anywhere to insert the configured grace window."
    >
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Icon</label>
            <select className="select" value={r.icon} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, icon: e.target.value } : y)))}>
              {RIDER_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" value={r.title} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
          </div>
          <div className="field span-2">
            <label>Body</label>
            <textarea className="textarea" value={r.body} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, body: e.target.value } : y)))} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="subtle" size="sm" onClick={() => setRows((x) => [...x, { icon: "info", title: "", body: "" }])}>
          <Icon name="plus" size={15} /> Add row
        </Button>
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- contact */
function ContactCard() {
  const ui = useUiConfig();
  const { submit, saving } = useSectionSaver("contact");
  const [call, setCall] = useState(true);
  const [wa, setWa] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setCall(ui.data.contact.showCall);
    setWa(ui.data.contact.showWhatsApp);
    setHydrated(true);
  }, [ui.data, hydrated]);

  return (
    <CardShell title="Contact channels" icon="headset" err={null} onSave={() => submit({ showCall: call, showWhatsApp: wa })} saving={saving} loading={!!ui.isLoading} hint="Numbers themselves live under Settings → Support contact. At least one channel should stay on.">
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Check id="ct-call" label="Call button" checked={call} onChange={setCall} />
        <Check id="ct-wa" label="WhatsApp button" checked={wa} onChange={setWa} />
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- languages */
function LanguagesCard() {
  const ui = useUiConfig();
  const { submit, err, setErr, saving } = useSectionSaver("languages");
  type Row = { code: string; label: string; enabled: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!ui.data || hydrated) return;
    setRows(ui.data.languages.map((t) => ({ ...t })));
    setHydrated(true);
  }, [ui.data, hydrated]);

  const save = () => {
    if (!rows.filter((r) => r.enabled).length) {
      setErr("Keep at least one language enabled.");
      return;
    }
    if (rows.some((r) => !r.code.trim() || !r.label.trim())) {
      setErr("Every language needs a code and a label.");
      return;
    }
    submit(rows.map((r) => ({ code: r.code.trim(), label: r.label.trim(), enabled: r.enabled })));
  };

  return (
    <CardShell title="Languages" icon="languages" err={err} onSave={save} saving={saving} loading={!!ui.isLoading} hint="Only languages bundled in the app render — unknown codes fall back to English.">
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="field">
            <label>Code</label>
            <input className="input" value={r.code} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, code: e.target.value } : y)))} placeholder="e.g. ta" />
          </div>
          <div className="field">
            <label>Label</label>
            <input className="input" value={r.label} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="e.g. தமிழ்" />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Check id={`lg-en-${i}`} label="Shown" checked={r.enabled} onChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, enabled: v } : y)))} />
            <RowTools onUp={() => setRows((x) => move(x, i, -1))} onDown={() => setRows((x) => move(x, i, 1))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="subtle" size="sm" onClick={() => setRows((x) => [...x, { code: "", label: "", enabled: true }])}>
          <Icon name="plus" size={15} /> Add language
        </Button>
      </div>
    </CardShell>
  );
}

export function ContentPage() {
  const ui = useUiConfig();
  if (ui.isError) {
    return (
      <div className="content" style={{ maxWidth: 560, margin: "12vh auto" }}>
        <div className="card">
          <div className="empty">
            <b>Could not load app content</b>
            <p>Check that the backend is running, then retry.</p>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => ui.refetch()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h1>App content</h1>
          <p>What riders see — tabs, actions, KYC, plans, help, contact, languages. Changes apply within minutes, no app release.</p>
        </div>
      </div>
      {ui.isLoading ? (
        <section className="card"><div className="card__body"><p className="cell-sub">Loading app content…</p></div></section>
      ) : (
        <div className="grid-2-eq">
          <div className="stack">
            <TabsCard />
            <QuickActionsCard />
            <AccountSectionsCard />
            <ContactCard />
            <LanguagesCard />
          </div>
          <div className="stack">
            <KycDocsCard />
            <PlansCard />
            <HelpCard />
          </div>
        </div>
      )}
    </>
  );
}
