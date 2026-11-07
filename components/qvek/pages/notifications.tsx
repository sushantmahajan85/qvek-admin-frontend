"use client";

/* Notifications — a three-tab workspace:
 *   Automated  → grouped, searchable list of every system push (toggle / edit)
 *   Broadcasts → history + composer
 *   Activity   → what the platform actually sent recently
 * Design follow-ups: Mobbin (Buffer/Beehiiv toggle groups, Turo template table,
 * Intercom/Resend composer + preview, Deel activity feed). */

import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlertItem } from "@/features/alerts/api";
import { useAlerts } from "@/features/alerts/hooks";
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  type AudienceCounts,
  type BroadcastAudience,
  type BroadcastRecord,
  type NotificationTemplate,
} from "@/features/notifications/api";
import {
  useBroadcasts,
  useNotificationAudience,
  useNotificationTemplates,
  useResetNotificationTemplate,
  useSaveNotificationTemplate,
  useSendBroadcast,
} from "@/features/notifications/hooks";
import { FieldError } from "../bits";
import { Icon } from "../icon";
import { Modal } from "../modal";
import { useModal, useUI } from "../ui-context";

type Tab = "automated" | "broadcasts" | "activity";

const CATEGORY_META: Record<NotificationTemplate["category"], { icon: string; tone: string }> = {
  payments: { icon: "wallet", tone: "tone-green" },
  rental: { icon: "calendar", tone: "tone-amber" },
  account: { icon: "user", tone: "tone-blue" },
  fleet: { icon: "scooter", tone: "tone-violet" },
  safety: { icon: "shield", tone: "tone-red" },
  broadcast: { icon: "send", tone: "tone-blue" },
};

const CATEGORY_ORDER: NotificationTemplate["category"][] = [
  "payments",
  "rental",
  "account",
  "fleet",
  "safety",
];

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("en-IN") : "—";
}

function withExamples(text: string, tpl: NotificationTemplate): string {
  return text.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = tpl.vars.find((x) => x.key === key);
    return v ? v.example : `{${key}}`;
  });
}

function PhonePreview({ title, body }: { title: string; body?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-2)",
        borderRadius: 22,
        padding: "10px 10px 16px",
        background: "linear-gradient(180deg, var(--surface-2), var(--surface))",
        maxWidth: 300,
      }}
      aria-label="Notification preview"
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px 10px", fontSize: 11, color: "var(--text-3)" }}>
        <span>9:41</span>
        <span style={{ display: "flex", gap: 4 }}>
          <Icon name="signal" size={12} />
          <Icon name="wifi" size={12} />
        </span>
      </div>
      <div
        style={{
          background: "rgba(255,255,255,.08)",
          border: "1px solid var(--border-2)",
          borderRadius: 14,
          padding: 11,
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
        }}
      >
        <span className="tone-green" style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", flex: "none" }}>
          <Icon name="bell" size={14} />
        </span>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 12.5, display: "block" }}>{title || "Notification title"}</b>
          <span style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.4, display: "block", marginTop: 2 }}>
            {body || "Your message appears here."}
          </span>
          <span style={{ color: "var(--text-3)", fontSize: 10.5, display: "block", marginTop: 4 }}>Qvek · now</span>
        </div>
      </div>
      <p className="field__hint" style={{ margin: "10px 6px 0", fontSize: 11 }}>
        Shown by the phone even when the rider app is closed.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- template modal */
function TemplateEditor({ tpl }: { tpl: NotificationTemplate }) {
  const { close } = useModal();
  const save = useSaveNotificationTemplate();
  const reset = useResetNotificationTemplate();
  const [enabled, setEnabled] = useState(tpl.enabled);
  const [title, setTitle] = useState(tpl.title);
  const [body, setBody] = useState(tpl.body);
  const [err, setErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"title" | "body">("title");

  const insertVar = (key: string) => {
    const token = `{${key}}`;
    const isTitle = lastField.current === "title";
    const value = isTitle ? title : body;
    const el = isTitle ? titleRef.current : bodyRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (isTitle) setTitle(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = async (): Promise<boolean> => {
    if (!title.trim()) {
      setErr("Title cannot be empty.");
      return false;
    }
    setErr(null);
    try {
      await save.mutateAsync({
        kind: tpl.kind,
        input: { enabled: tpl.locked ? true : enabled, title, body },
      });
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefault = async (): Promise<boolean> => {
    try {
      await reset.mutateAsync(tpl.kind);
      return true;
    } catch {
      return false;
    }
  };

  const meta = CATEGORY_META[tpl.category];
  return (
    <Modal
      size="xl"
      title={`Edit — ${tpl.label}`}
      subtitle={
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone="outline">{CATEGORY_LABELS[tpl.category]}</Badge>
          <code style={{ fontSize: 11.5 }}>{tpl.kind}</code>
          {tpl.locked ? <Badge tone="red" icon="lock">Safety — always on</Badge> : null}
          {tpl.isCustom ? <Badge tone="blue">Customised</Badge> : <Badge tone="grey">Default</Badge>}
        </span>
      }
      icon={meta.icon}
      actions={[
        { label: "Cancel", kind: "ghost" },
        {
          label: "Reset to default",
          kind: "danger-ghost",
          icon: "undo",
          disabled: !tpl.isCustom || save.isPending || reset.isPending,
          busy: reset.isPending ? "Resetting…" : undefined,
          onClick: resetToDefault,
        },
        {
          label: "Save",
          kind: "primary",
          icon: "check",
          busy: save.isPending ? "Saving…" : undefined,
          onClick: submit,
        },
      ]}
    >
      <div className="grid-2">
        <div className="stack">
          <div className="field">
            <label htmlFor="nt-title">Title · max 140</label>
            <input
              id="nt-title"
              ref={titleRef}
              className="input"
              maxLength={140}
              value={title}
              onFocus={() => (lastField.current = "title")}
              onChange={(e) => setTitle(e.target.value)}
              disabled={save.isPending}
              autoFocus
            />
            <div className="field__hint">{title.length}/140</div>
          </div>
          <div className="field">
            <label htmlFor="nt-body">Body · max 280</label>
            <textarea
              id="nt-body"
              ref={bodyRef}
              className="textarea"
              rows={4}
              maxLength={280}
              value={body}
              onFocus={() => (lastField.current = "body")}
              onChange={(e) => setBody(e.target.value)}
              disabled={save.isPending}
            />
            <div className="field__hint">{body.length}/280</div>
          </div>

          {tpl.vars.length ? (
            <div className="field">
              <label>Insert a variable</label>
              <div className="badge-row">
                {tpl.vars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="badge badge--outline"
                    title={`${v.label} · e.g. ${v.example}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertVar(v.key)}
                    style={{ cursor: "pointer" }}
                  >
                    {`{${v.key}}`}
                  </button>
                ))}
              </div>
              <div className="field__hint">Inserted at the cursor in the last field you focused.</div>
            </div>
          ) : null}

          <div className="field">
            <label>Delivery</label>
            <label className="check" htmlFor="nt-enabled" style={{ margin: 0 }}>
              <input
                id="nt-enabled"
                type="checkbox"
                checked={tpl.locked ? true : enabled}
                disabled={tpl.locked || save.isPending}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {tpl.locked ? "Safety alerts are always sent" : "Send this notification"}
            </label>
            <div className="field__hint">
              When off, the alert still appears in the in-app feed but no phone notification is sent.
            </div>
          </div>

          {err ? <FieldError>{err}</FieldError> : null}
        </div>

        <div className="stack">
          <div className="field__label">Preview</div>
          <PhonePreview title={withExamples(title, tpl)} body={withExamples(body, tpl)} />
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- broadcast modal */
function BroadcastComposer({ counts }: { counts?: AudienceCounts }) {
  const ui = useUI();
  const send = useSendBroadcast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState<BroadcastAudience>("ALL_RIDERS");
  const [riderId, setRiderId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [dedupeKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}`,
  );

  const countFor: Record<BroadcastAudience, number | undefined> = {
    ALL_RIDERS: counts?.allRiders,
    ACTIVE_RIDERS: counts?.activeRiders,
    GRACE_RIDERS: counts?.graceRiders,
    ADMINS: counts?.admins,
    RIDER: 1,
  };

  const submit = async (): Promise<boolean> => {
    if (!title.trim()) {
      setErr("Add a title.");
      return false;
    }
    if (aud === "RIDER" && !riderId.trim()) {
      setErr("Enter the rider id for a single-rider message.");
      return false;
    }
    setErr(null);
    const ok = await ui.confirm({
      title: "Send this notification?",
      icon: "send",
      kind: "primary",
      confirmLabel: "Send now",
      confirmIcon: "send",
      body: (
        <div style={{ display: "grid", gap: 6 }}>
          <p><b>{title}</b></p>
          {body ? <p style={{ color: "var(--text-2)" }}>{body}</p> : null}
          <p>
            Audience: <b>{AUDIENCE_LABELS[aud]}</b>
            {countFor[aud] !== undefined ? ` · ~${countFor[aud]} device(s)` : ""}
            {aud === "RIDER" && riderId ? ` · ${riderId}` : ""}
          </p>
          <p style={{ color: "var(--text-3)", fontSize: 12 }}>
            The OS delivers it even if the app is closed, as long as the device allows notifications.
          </p>
        </div>
      ),
    });
    if (!ok) return false;
    try {
      await send.mutateAsync({
        title: title.trim(),
        body: body.trim() || undefined,
        audience: aud,
        riderId: aud === "RIDER" ? riderId.trim() : undefined,
        dedupeKey,
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Modal
      size="xl"
      title="New broadcast"
      subtitle="A one-off message to riders. Use the automated templates for routine alerts."
      icon="send"
      actions={[
        { label: "Cancel", kind: "ghost" },
        { label: "Send notification", kind: "primary", icon: "send", busy: send.isPending ? "Sending…" : undefined, onClick: submit },
      ]}
    >
      <div className="grid-2">
        <div className="stack">
          <div className="field">
            <label htmlFor="bc-title">Title · max 140</label>
            <input
              id="bc-title"
              className="input"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Scooter service on Sunday"
              autoFocus
            />
            <div className="field__hint">{title.length}/140</div>
          </div>
          <div className="field">
            <label htmlFor="bc-body">Message · max 280</label>
            <textarea
              id="bc-body"
              className="textarea"
              rows={4}
              maxLength={280}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Please return your scooter before 10 AM for scheduled maintenance."
            />
            <div className="field__hint">{body.length}/280</div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="bc-audience">Audience</label>
              <select id="bc-audience" className="select" value={aud} onChange={(e) => setAud(e.target.value as BroadcastAudience)}>
                {(Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                    {countFor[a] !== undefined ? ` (${countFor[a]})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {aud === "RIDER" ? (
              <div className="field">
                <label htmlFor="bc-rider">Rider id</label>
                <input id="bc-rider" className="input" value={riderId} onChange={(e) => setRiderId(e.target.value)} placeholder="Mongo rider id" />
              </div>
            ) : null}
          </div>

          {err ? <FieldError>{err}</FieldError> : null}
        </div>

        <div className="stack">
          <div className="field__label">Preview</div>
          <PhonePreview title={title} body={body} />
          <div className="dsec" style={{ display: "grid", gap: 6 }}>
            <h3 style={{ marginBottom: 2 }}>Ready to send?</h3>
            <div className="kv">
              <dt>Audience</dt>
              <dd>{AUDIENCE_LABELS[aud]}</dd>
              <dt>Reachable devices</dt>
              <dd>{countFor[aud] !== undefined ? countFor[aud] : "…"}</dd>
              <dt>Delivery</dt>
              <dd>Push + in-app feed</dd>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- automated rows */
function NotificationRow({ tpl, onEdit }: { tpl: NotificationTemplate; onEdit: () => void }) {
  const save = useSaveNotificationTemplate();
  const meta = CATEGORY_META[tpl.category];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <span className={meta.tone} style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", flex: "none" }}>
        <Icon name={meta.icon} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 13.5 }}>{tpl.label}</b>
          {tpl.isCustom ? <Badge tone="blue">Customised</Badge> : null}
          {tpl.locked ? <Badge tone="red" icon="lock">Always on</Badge> : null}
          {!tpl.enabled ? <Badge tone="grey">Off</Badge> : null}
        </div>
        <div className="cell-sub" style={{ marginTop: 2 }}>{tpl.description}</div>
        <code style={{ fontSize: 11, color: "var(--text-3)" }}>{tpl.kind}</code>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
        <label className="check" htmlFor={`row-${tpl.kind}`} style={{ margin: 0 }} title={tpl.locked ? "Safety alerts cannot be switched off" : undefined}>
          <input
            id={`row-${tpl.kind}`}
            type="checkbox"
            checked={tpl.locked ? true : tpl.enabled}
            disabled={tpl.locked || save.isPending}
            onChange={(e) => save.mutate({ kind: tpl.kind, input: { enabled: e.target.checked } })}
          />
        </label>
        <Button size="sm" variant="subtle" onClick={onEdit}>
          <Icon name="pencil" size={14} />
          Edit
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- activity rows */
const ACTIVITY_TONE: Record<string, string> = {
  TAMPER: "tone-red",
  ACCOUNT_BLOCKED: "tone-red",
  APPLICATION_REJECTED: "tone-red",
  PAYMENT_FAILED: "tone-red",
  VEHICLE_DISARMED: "tone-red",
  GEOFENCE_WARNING: "tone-amber",
  RENTAL_EXPIRING: "tone-amber",
  RENTAL_EXPIRED: "tone-amber",
  PAYMENT_RECEIVED: "tone-green",
  VEHICLE_REACTIVATED: "tone-green",
  APPLICATION_APPROVED: "tone-green",
  VEHICLE_ASSIGNED: "tone-green",
  ANNOUNCEMENT: "tone-blue",
  VEHICLE_OFFLINE: "tone-grey",
};

function ActivityRow({ a }: { a: AlertItem }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
      <span className={ACTIVITY_TONE[a.kind] ?? "tone-grey"} style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flex: "none" }}>
        <Icon name="bell" size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <b style={{ fontSize: 13 }}>{a.title}</b>
          <span className="cell-sub">{a.kind}</span>
        </div>
        {a.body ? <div className="cell-sub" style={{ marginTop: 2 }}>{a.body}</div> : null}
        <div className="cell-sub" style={{ marginTop: 4 }}>
          {a.riderId ? `rider ${a.riderId}` : "admins"}
          {a.vehicleId ? ` · vehicle ${a.vehicleId}` : ""}
          {" · "}
          {fmt(a.createdAt)}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export function NotificationsPage() {
  const ui = useUI();
  const templates = useNotificationTemplates();
  const audience = useNotificationAudience();
  const broadcasts = useBroadcasts(30);
  const alerts = useAlerts(50);
  const [tab, setTab] = useState<Tab>("automated");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NotificationTemplate["category"] | "all">("all");

  const rows = useMemo(() => templates.data ?? [], [templates.data]);
  const customised = rows.filter((r) => r.isCustom).length;
  const disabled = rows.filter((r) => !r.enabled).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (category === "all" || r.category === category) &&
        (!q || `${r.label} ${r.description} ${r.kind}`.toLowerCase().includes(q)),
    );
  }, [rows, query, category]);

  const openEditor = (tpl: NotificationTemplate) => void ui.open(<TemplateEditor tpl={tpl} />);
  const openComposer = () => void ui.open(<BroadcastComposer counts={audience.data} />);

  if (templates.isError) {
    return (
      <div className="content" style={{ maxWidth: 560, margin: "12vh auto" }}>
        <section className="card">
          <div className="card__body" style={{ display: "grid", gap: 8 }}>
            <b>Could not load notification settings</b>
            <p className="cell-sub">Check that the backend is running and you are signed in as an admin.</p>
            <Button onClick={() => templates.refetch()}>
              <Icon name="refresh" size={16} />
              Retry
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>Manage every automated push, and send custom messages to riders.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="subtle" onClick={() => setTab("activity")}>
            <Icon name="history" size={16} />
            Activity
          </Button>
          <Button variant="primary" onClick={openComposer}>
            <Icon name="send" size={16} />
            New broadcast
          </Button>
        </div>
      </div>

      <div className="stats">
        {[
          { label: "Rider devices", value: audience.data?.allRiders, icon: "smartphone", tone: "tone-green", sub: "push tokens registered" },
          { label: "Active riders", value: audience.data?.activeRiders, icon: "userCheck", tone: "tone-blue", sub: "audience available" },
          { label: "In grace", value: audience.data?.graceRiders, icon: "hourglass", tone: "tone-amber", sub: "grace-period audience" },
          { label: "Admin devices", value: audience.data?.admins, icon: "shield", tone: "tone-violet", sub: "admin push clients" },
          { label: "Customised", value: templates.isLoading ? undefined : customised, icon: "pencil", tone: "tone-blue", sub: "edited templates" },
          { label: "Turned off", value: templates.isLoading ? undefined : disabled, icon: "bell", tone: "tone-grey", sub: "muted kinds" },
        ].map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__top">
              <span className="stat__label">{s.label}</span>
              <span className={`stat__icon ${s.tone}`}>
                <Icon name={s.icon} size={15} />
              </span>
            </div>
            <div className="stat__value">{s.value ?? "—"}</div>
            <div className="stat__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="seg" role="tablist" aria-label="Notification view" style={{ marginBottom: 16 }}>
        <button type="button" role="tab" aria-selected={tab === "automated"} onClick={() => setTab("automated")}>
          <Icon name="bell" size={14} />
          Automated <span className="count">{templates.isLoading ? "" : rows.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "broadcasts"} onClick={() => setTab("broadcasts")}>
          <Icon name="send" size={14} />
          Broadcasts <span className="count">{broadcasts.data?.length ?? ""}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")}>
          <Icon name="history" size={14} />
          Activity <span className="count">{alerts.data?.length ?? ""}</span>
        </button>
      </div>

      {tab === "automated" ? (
        <section className="card">
          <div className="toolbar">
            <div className="search" style={{ maxWidth: 280 }}>
              <Icon name="search" size={16} />
              <input
                type="search"
                placeholder="Search notifications…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search notifications"
              />
            </div>
            <div className="chip-filter" role="group" aria-label="Filter by category">
              <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
                All <span className="count">{rows.length}</span>
              </button>
              {CATEGORY_ORDER.map((c) => {
                const n = rows.filter((r) => r.category === c).length;
                return (
                  <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
                    {CATEGORY_LABELS[c]} <span className="count">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="toolbar__end">
              <Button size="sm" variant="subtle" onClick={() => templates.refetch()} disabled={templates.isFetching}>
                <Icon name="refresh" size={14} />
                Refresh
              </Button>
            </div>
          </div>

          {templates.isLoading ? (
            <div className="card__body"><p className="cell-sub">Loading templates…</p></div>
          ) : !filtered.length ? (
            <div className="card__body">
              <p className="cell-sub">No notifications match this search.</p>
              <Button size="sm" variant="subtle" onClick={() => { setQuery(""); setCategory("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            CATEGORY_ORDER.map((c) => {
              const group = filtered.filter((r) => r.category === c);
              if (!group.length) return null;
              return (
                <div key={c}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
                    <span className="field__label">{CATEGORY_LABELS[c]}</span>
                    <span className="cell-sub">{group.length} kind{group.length === 1 ? "" : "s"}</span>
                  </div>
                  {group.map((t) => (
                    <NotificationRow key={t.kind} tpl={t} onEdit={() => openEditor(t)} />
                  ))}
                </div>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "broadcasts" ? (
        <section className="card">
          <div className="card__head">
            <h2>
              <Icon name="send" size={16} />
              Broadcast history
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="subtle" onClick={() => broadcasts.refetch()} disabled={broadcasts.isFetching}>
                <Icon name="refresh" size={14} />
                Refresh
              </Button>
              <Button size="sm" variant="primary" onClick={openComposer}>
                <Icon name="send" size={14} />
                New broadcast
              </Button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Sent</th>
                  <th>Message</th>
                  <th>Audience</th>
                  <th>Targeted</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.isLoading ? (
                  <tr><td colSpan={7} className="cell-sub">Loading…</td></tr>
                ) : !broadcasts.data?.length ? (
                  <tr>
                    <td colSpan={7}>
                      <div style={{ display: "grid", gap: 8, padding: "18px 4px", justifyItems: "start" }}>
                        <b>No broadcasts yet</b>
                        <span className="cell-sub">Send a one-off message to riders — it also lands in their in-app feed.</span>
                        <Button size="sm" variant="primary" onClick={openComposer}>
                          <Icon name="send" size={14} />
                          New broadcast
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  broadcasts.data.map((b: BroadcastRecord) => (
                    <tr key={b.id}>
                      <td data-label="Sent" className="cell-sub">{fmt(b.createdAt)}</td>
                      <td data-label="Message">
                        <span className="cell-main">{b.title}</span>
                        {b.body ? <span className="cell-sub">{b.body}</span> : null}
                      </td>
                      <td data-label="Audience">
                        {AUDIENCE_LABELS[b.audience] ?? b.audience}
                        {b.riderId ? <span className="cell-sub">{b.riderId}</span> : null}
                      </td>
                      <td data-label="Targeted" className="num">{b.targeted}</td>
                      <td data-label="Sent" className="num" style={{ color: "var(--primary)", fontWeight: 600 }}>{b.sent}</td>
                      <td data-label="Failed" className="num" style={{ color: b.failed ? "var(--error)" : undefined }}>{b.failed}</td>
                      <td data-label="By" className="cell-sub">{b.createdBy ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "activity" ? (
        <section className="card">
          <div className="card__head">
            <h2>
              <Icon name="history" size={16} />
              Recent activity
            </h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="cell-sub">Read-only feed of what was sent</span>
              <Button size="sm" variant="subtle" onClick={() => alerts.refetch()} disabled={alerts.isFetching}>
                <Icon name="refresh" size={14} />
                Refresh
              </Button>
            </div>
          </div>
          {alerts.isLoading ? (
            <div className="card__body"><p className="cell-sub">Loading activity…</p></div>
          ) : !alerts.data?.length ? (
            <div className="card__body"><p className="cell-sub">No alerts have been generated yet.</p></div>
          ) : (
            <div>
              {alerts.data.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="info" size={16} />
          <p className="cell-sub" style={{ margin: 0 }}>
            Remote notifications are displayed by the operating system while the rider app is foregrounded,
            backgrounded, or fully closed. Delivery depends on the device allowing notifications. Tamper alerts
            are always on.
          </p>
        </div>
      </section>
    </>
  );
}
