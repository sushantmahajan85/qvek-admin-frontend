"use client";

/* Notifications — edit/toggle the platform's automated pushes and send a
 * custom broadcast. Backed by /admin/notifications (real API). */

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  type BroadcastAudience,
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
import { useUI } from "../ui-context";

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

function TemplateRow({ tpl }: { tpl: NotificationTemplate }) {
  const save = useSaveNotificationTemplate();
  const reset = useResetNotificationTemplate();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(tpl.enabled);
  const [title, setTitle] = useState(tpl.title);
  const [body, setBody] = useState(tpl.body);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(tpl.enabled);
    setTitle(tpl.title);
    setBody(tpl.body);
  }, [tpl.enabled, tpl.title, tpl.body, tpl.isCustom, tpl.updatedAt]);

  const dirty =
    enabled !== tpl.enabled || title !== tpl.title || body !== tpl.body;

  const submit = () => {
    if (!title.trim()) {
      setErr("Title cannot be empty.");
      return;
    }
    setErr(null);
    save.mutate(
      {
        kind: tpl.kind,
        input: { enabled: tpl.locked ? true : enabled, title, body },
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="card__head" style={{ gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2>
            <Icon name="bell" size={16} />
            {tpl.label}
          </h2>
          <p style={{ marginTop: 4 }}>
            {tpl.description} · <code>{tpl.kind}</code>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {tpl.locked ? <Badge tone="red" icon="lock">Safety — always on</Badge> : null}
          {tpl.isCustom ? <Badge tone="blue">Customised</Badge> : <Badge tone="grey">Default</Badge>}
          <label className="check" htmlFor={`en-${tpl.kind}`} style={{ margin: 0 }}>
            <input
              id={`en-${tpl.kind}`}
              type="checkbox"
              checked={tpl.locked ? true : enabled}
              disabled={tpl.locked || save.isPending}
              onChange={(e) => setEnabled(e.target.checked)}
            />{" "}
            {tpl.locked ? "On" : enabled ? "On" : "Off"}
          </label>
          {dirty && !open ? (
            <Button size="sm" variant="primary" onClick={submit} disabled={save.isPending}>
              <Icon name="check" size={14} />
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          ) : null}
          <Button size="sm" variant="subtle" onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
            {open ? "Close" : "Edit text"}
          </Button>
        </div>
      </div>
      {open ? (
        <>
          <div className="card__body" style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label htmlFor={`title-${tpl.kind}`}>Title · max 140</label>
              <input
                id={`title-${tpl.kind}`}
                className="input"
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={save.isPending}
              />
            </div>
            <div className="field">
              <label htmlFor={`body-${tpl.kind}`}>Body · max 280</label>
              <textarea
                id={`body-${tpl.kind}`}
                className="textarea"
                rows={2}
                maxLength={280}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={save.isPending}
              />
            </div>
            {tpl.vars.length ? (
              <div className="field">
                <label>Variables — type them in the title or body</label>
                <div className="badge-row">
                  {tpl.vars.map((v) => (
                    <Badge key={v.key} tone="outline" title={`${v.label} · e.g. ${v.example}`}>
                      {`{${v.key}}`} · {v.label}
                    </Badge>
                  ))}
                </div>
                <div className="field__hint">
                  Unknown or missing variables render as an empty string. Saving an empty field restores the default.
                </div>
              </div>
            ) : null}
            {err ? <FieldError>{err}</FieldError> : null}
          </div>
          <div className="card__foot">
            {tpl.isCustom ? (
              <Button
                variant="danger-ghost"
                disabled={reset.isPending || save.isPending}
                onClick={() => reset.mutate(tpl.kind)}
              >
                <Icon name="undo" size={16} />
                Reset to default
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={!dirty || save.isPending}
              onClick={submit}
            >
              <Icon name="check" size={16} />
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BroadcastCard() {
  const ui = useUI();
  const audience = useNotificationAudience();
  const send = useSendBroadcast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState<BroadcastAudience>("ALL_RIDERS");
  const [riderId, setRiderId] = useState("");
  const [dedupeKey, setDedupeKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `b-${Date.now()}`,
  );
  const [err, setErr] = useState<string | null>(null);

  const counts = audience.data;
  const countFor: Record<BroadcastAudience, number | undefined> = {
    ALL_RIDERS: counts?.allRiders,
    ACTIVE_RIDERS: counts?.activeRiders,
    GRACE_RIDERS: counts?.graceRiders,
    ADMINS: counts?.admins,
    RIDER: 1,
  };

  const submit = async () => {
    if (!title.trim()) {
      setErr("Add a title.");
      return;
    }
    if (aud === "RIDER" && !riderId.trim()) {
      setErr("Enter the rider id for a single-rider message.");
      return;
    }
    setErr(null);
    const ok = await ui.confirm({
      title: "Send this notification?",
      body: (
        <div style={{ display: "grid", gap: 6 }}>
          <p>
            <b>{title}</b>
          </p>
          {body ? <p style={{ color: "var(--text-2)" }}>{body}</p> : null}
          <p>
            Audience: <b>{AUDIENCE_LABELS[aud]}</b>
            {countFor[aud] !== undefined ? ` · ~${countFor[aud]} device(s)` : ""}
          </p>
          <p style={{ color: "var(--text-3)", fontSize: 12 }}>
            Delivered by the OS even when the app is closed, as long as the device has notifications allowed.
          </p>
        </div>
      ),
      confirmLabel: "Send now",
      confirmIcon: "bell",
      kind: "primary",
    });
    if (!ok) return;
    send.mutate(
      {
        title: title.trim(),
        body: body.trim() || undefined,
        audience: aud,
        riderId: aud === "RIDER" ? riderId.trim() : undefined,
        dedupeKey,
      },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setRiderId("");
          setDedupeKey(
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `b-${Date.now()}`,
          );
        },
      },
    );
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="send" size={16} />
          Send a custom notification
        </h2>
        <Badge tone="blue">Broadcast</Badge>
      </div>
      <div className="card__body" style={{ display: "grid", gap: 12 }}>
        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="bc-title">Title · max 140</label>
            <input
              id="bc-title"
              className="input"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Scooter service on Sunday"
            />
            <div className="field__hint">{title.length}/140</div>
          </div>
          <div className="field span-2">
            <label htmlFor="bc-body">Message · max 280</label>
            <textarea
              id="bc-body"
              className="textarea"
              rows={3}
              maxLength={280}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Please return your scooter before 10 AM for scheduled maintenance."
            />
            <div className="field__hint">{body.length}/280</div>
          </div>
          <div className="field">
            <label htmlFor="bc-audience">Audience</label>
            <select
              id="bc-audience"
              className="select"
              value={aud}
              onChange={(e) => setAud(e.target.value as BroadcastAudience)}
            >
              {(Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                  {countFor[a] !== undefined ? ` (${countFor[a]})` : ""}
                </option>
              ))}
            </select>
            <div className="field__hint">
              Only riders who registered a push token are reachable (currently {counts?.allRiders ?? "…"}).
            </div>
          </div>
          {aud === "RIDER" ? (
            <div className="field">
              <label htmlFor="bc-rider">Rider id</label>
              <input
                id="bc-rider"
                className="input"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                placeholder="Mongo rider id"
              />
            </div>
          ) : null}
        </div>

        <div>
          <div className="field__label" style={{ marginBottom: 6 }}>Preview</div>
          <div className="card" style={{ padding: 12, background: "var(--surface-2)", maxWidth: 420 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="avatar" style={{ background: "var(--primary-muted)", color: "var(--primary)" }}>
                <Icon name="bell" size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <b>{title.trim() || "Notification title"}</b>
                <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 2 }}>
                  {body.trim() || "Your message appears here. The rider receives it even when the app is closed."}
                </div>
                <div className="cell-sub" style={{ marginTop: 4 }}>Qvek · now</div>
              </div>
            </div>
          </div>
        </div>

        {err ? <FieldError>{err}</FieldError> : null}
      </div>
      <div className="card__foot">
        <Button variant="primary" onClick={submit} disabled={send.isPending}>
          <Icon name="send" size={16} />
          {send.isPending ? "Sending…" : "Send notification"}
        </Button>
      </div>
    </section>
  );
}

export function NotificationsPage() {
  const templates = useNotificationTemplates();
  const broadcasts = useBroadcasts(20);

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
          <p>Turn automated pushes on/off, edit their text, and send custom messages.</p>
        </div>
      </div>

      <div className="stack">
        <BroadcastCard />

        <section>
          <div className="page-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 16 }}>Automated notifications</h2>
              <p>Safety alerts (SOS, crash, tamper) are locked on. Other kinds can be switched off or reworded.</p>
            </div>
          </div>
          {templates.isLoading ? (
            <section className="card"><div className="card__body"><p className="cell-sub">Loading templates…</p></div></section>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const rows = (templates.data ?? []).filter((t) => t.category === category);
              if (!rows.length) return null;
              return (
                <div key={category} style={{ marginBottom: 18 }}>
                  <div className="field__label" style={{ marginBottom: 8 }}>{CATEGORY_LABELS[category]}</div>
                  {rows.map((t) => (
                    <TemplateRow key={`${t.kind}:${t.updatedAt ?? "default"}`} tpl={t} />
                  ))}
                </div>
              );
            })
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2>
              <Icon name="history" size={16} />
              Recent broadcasts
            </h2>
            <Button size="sm" variant="subtle" onClick={() => broadcasts.refetch()} disabled={broadcasts.isFetching}>
              <Icon name="refresh" size={14} />
              Refresh
            </Button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sent</th>
                  <th>Title</th>
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
                  <tr><td colSpan={7} className="cell-sub">No broadcasts yet.</td></tr>
                ) : (
                  broadcasts.data.map((b) => (
                    <tr key={b.id}>
                      <td>{fmt(b.createdAt)}</td>
                      <td>
                        <span className="cell-main">{b.title}</span>
                        {b.body ? <span className="cell-sub">{b.body}</span> : null}
                      </td>
                      <td>{AUDIENCE_LABELS[b.audience] ?? b.audience}{b.riderId ? ` · ${b.riderId}` : ""}</td>
                      <td>{b.targeted}</td>
                      <td>{b.sent}</td>
                      <td style={{ color: b.failed ? "var(--error)" : undefined }}>{b.failed}</td>
                      <td className="cell-sub">{b.createdBy ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card__body" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="info" size={16} />
            <p className="cell-sub" style={{ margin: 0 }}>
              These are real remote notifications. The operating system displays them when the rider app is in the
              background or fully closed; delivery depends on the rider allowing notifications on their device.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
