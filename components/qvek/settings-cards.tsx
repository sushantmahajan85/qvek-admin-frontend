"use client";

/* Settings cards extracted from pages/ops.tsx: pricing, support contact,
 * and service zones. Each card owns its own form state. */

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOps, useSetOps, useSetPricing, useSetSupport, useSetZones, useZones } from "@/features/config/hooks";
import { useSupport } from "@/features/config/hooks";
import { store } from "@/lib/qvek/store";
import { FieldError } from "./bits";
import { Icon } from "./icon";

export function PricingCard() {
  const support = useSupport();
  const save = useSetPricing();
  const server = support.data;
  const [daily, setDaily] = useState("");
  const [deposit, setDeposit] = useState("");
  const [touched, setTouched] = useState({ daily: false, deposit: false });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!server) return;
    setDaily(String(Math.round((server.dailyRentPaise ?? server.weeklyRentPaise / 7) / 100)));
    setDeposit(String(Math.round((server.depositPaise ?? 300000) / 100)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server]);

  const dailyRupees = Number(daily);
  const derived = Number.isFinite(dailyRupees) && dailyRupees >= 0
    ? { week: dailyRupees * 7, fortnight: dailyRupees * 14, fourWeek: dailyRupees * 28 }
    : null;

  const submit = () => {
    const toPaise = (s: string) => (s.trim() === "" ? undefined : Math.round(Number(s) * 100));
    const d = toPaise(daily);
    const dep = toPaise(deposit);
    for (const [label, v] of [["Daily price", d], ["Deposit", dep]] as const) {
      if (v !== undefined && (!Number.isInteger(v) || v < 0)) {
        setErr(`${label} must be a non-negative rupee amount.`);
        return;
      }
    }
    if (touched.daily && (d === undefined || d < 100)) {
      setErr("Daily price must be at least ₹1.");
      return;
    }
    if (!touched.daily && !touched.deposit) {
      setErr("Change a price to update.");
      return;
    }
    setErr(null);
    // Only send what the admin edited, so a deposit-only save never rewrites
    // plan prices (legacy rows may not be exact daily multiples).
    save.mutate({
      ...(touched.daily && d !== undefined ? { dailyPaise: d } : {}),
      ...(touched.deposit && dep !== undefined ? { depositPaise: dep } : {}),
    });
  };

  const c = store.state.config;
  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="zap" size={16} />
          Rental plans &amp; pricing
        </h2>
        {support.isError ? <Badge tone="amber">Unavailable</Badge> : <Badge tone="blue">Live from server</Badge>}
      </div>
      <form className="card__body" id="price-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pl-daily">Daily price (per day)</label>
            <div className="input-prefix">
              <span>₹</span>
              <input
                id="pl-daily"
                type="number"
                min={0}
                step={1}
                placeholder={c.plans[0] ? String(Math.round(c.plans[0].price / 7)) : ""}
                value={daily}
                onChange={(e) => {
                  setDaily(e.target.value);
                  setTouched((t) => ({ ...t, daily: true }));
                }}
                disabled={support.isLoading}
              />
            </div>
            <div className="field__hint">Charged per day; weekly and longer plans are derived from it.</div>
          </div>
          <div className="field">
            <label htmlFor="pl-deposit">Security deposit</label>
            <div className="input-prefix">
              <span>₹</span>
              <input
                id="pl-deposit"
                type="number"
                min={0}
                step={1}
                value={deposit}
                onChange={(e) => {
                  setDeposit(e.target.value);
                  setTouched((t) => ({ ...t, deposit: true }));
                }}
                disabled={support.isLoading}
              />
            </div>
            <div className="field__hint">Collected offline with the first week&rsquo;s rent.</div>
          </div>
        </div>

        {derived ? (
          <div style={{ marginTop: 12 }}>
            <dl className="kv">
              <dt>Weekly plan (7 days)</dt>
              <dd>₹{derived.week.toLocaleString("en-IN")}</dd>
              <dt>Fortnightly (14 days)</dt>
              <dd>₹{derived.fortnight.toLocaleString("en-IN")}</dd>
              <dt>Four-weekly (28 days)</dt>
              <dd>₹{derived.fourWeek.toLocaleString("en-IN")}</dd>
            </dl>
          </div>
        ) : null}

        <p className="field__hint" style={{ marginTop: 12 }}>
          All plans run Tuesday to Tuesday. The daily rate is saved via PUT /config/pricing and the weekly,
          fortnightly and four-weekly prices are updated from it automatically. Empty fields are left unchanged.
        </p>
        {err ? <FieldError>{err}</FieldError> : null}
        {support.isError ? <FieldError>Could not load server pricing.</FieldError> : null}
      </form>
      <div className="card__foot">
        <Button variant="primary" disabled={save.isPending || support.isLoading} onClick={submit}>
          <Icon name="check" size={16} />
          {save.isPending ? "Saving…" : "Save pricing"}
        </Button>
      </div>
    </section>
  );
}

export function SupportCard() {
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

export function ZonesCard() {
  const zones = useZones();
  const save = useSetZones();
  const z = zones.data;
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [warn, setWarn] = useState("15");
  const [disarm, setDisarm] = useState("25");
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!z || hydrated) return;
    setLat(z.shopLat != null ? String(z.shopLat) : "");
    setLng(z.shopLng != null ? String(z.shopLng) : "");
    setWarn(String(z.warningKm));
    setDisarm(String(z.disarmKm));
    setHydrated(true);
  }, [z, hydrated]);

  const submit = () => {
    const shopLat = lat.trim() === "" ? null : Number(lat);
    const shopLng = lng.trim() === "" ? null : Number(lng);
    const warningKm = Number(warn);
    const disarmKm = Number(disarm);
    if ((lat.trim() !== "" && !Number.isFinite(shopLat)) || (lng.trim() !== "" && !Number.isFinite(shopLng))) {
      setErr("Hub coordinates must be numbers (e.g. 12.9716, 77.5946), or blank to unset.");
      return;
    }
    if (!Number.isFinite(warningKm) || warningKm < 1 || !Number.isFinite(disarmKm) || disarmKm < 1) {
      setErr("Distances must be at least 1 km.");
      return;
    }
    if (disarmKm <= warningKm) {
      setErr("Disarm distance must be larger than the warning distance.");
      return;
    }
    setErr(null);
    save.mutate({ shopLat, shopLng, warningKm, disarmKm });
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="pin" size={16} />
          Service zones &amp; hub
        </h2>
        {zones.isError ? <Badge tone="amber">Unavailable</Badge> : null}
      </div>
      <form className="card__body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="zone-lat">Hub latitude</label>
            <input className="input" id="zone-lat" inputMode="decimal" placeholder="12.9716" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="zone-lng">Hub longitude</label>
            <input className="input" id="zone-lng" inputMode="decimal" placeholder="77.5946" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="zone-warn">Warning distance (km)</label>
            <input className="input" id="zone-warn" inputMode="decimal" value={warn} onChange={(e) => setWarn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="zone-disarm">Disarm distance (km)</label>
            <input className="input" id="zone-disarm" inputMode="decimal" value={disarm} onChange={(e) => setDisarm(e.target.value)} />
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>
          Warning alerts past the first circle; scooters stop past the second. Device fences redraw within ~15 min. Leave hub blank to disable distance checks.
        </p>
        {err ? <FieldError>{err}</FieldError> : null}
      </form>
      <div className="card__foot">
        <Button variant="primary" disabled={save.isPending || zones.isLoading} onClick={submit}>
          <Icon name="check" size={16} />
          {save.isPending ? "Saving…" : "Save zones"}
        </Button>
      </div>
    </section>
  );
}

export function OpsTimingsCard() {
  const ops = useOps();
  const save = useSetOps();
  const d = ops.data;
  const [grace, setGrace] = useState("");
  const [warnDays, setWarnDays] = useState("");
  const [offlineMin, setOfflineMin] = useState("");
  const [simWatch, setSimWatch] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!d || hydrated) return;
    setGrace(String(d.graceHours));
    setWarnDays(String(d.expiryWarningDays));
    setOfflineMin(String(d.offlineThresholdMin));
    setSimWatch(String(d.simWatchDays));
    setHydrated(true);
  }, [d, hydrated]);

  const submit = () => {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const g = num(grace);
    const w = num(warnDays);
    const o = num(offlineMin);
    const sw = num(simWatch);
    if ([g, w, o, sw].some((v) => v !== undefined && (!Number.isInteger(v) || (v as number) < 0))) {
      setErr("Timings must be whole numbers, zero or more.");
      return;
    }
    if (g !== undefined && (g < 1 || g > 168)) {
      setErr("Grace window must be 1–168 hours.");
      return;
    }
    if (o !== undefined && (o < 1 || o > 120)) {
      setErr("Offline threshold must be 1–120 minutes.");
      return;
    }
    setErr(null);
    save.mutate({
      ...(g !== undefined ? { graceHours: g } : {}),
      ...(w !== undefined ? { expiryWarningDays: w } : {}),
      ...(o !== undefined ? { offlineThresholdMin: o } : {}),
      ...(sw !== undefined ? { simWatchDays: sw } : {}),
    });
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="clock" size={16} />
          Operations timings
        </h2>
        {ops.isError ? <Badge tone="amber">Unavailable</Badge> : null}
      </div>
      <form className="card__body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ops-grace">Grace window (hours)</label>
            <input className="input" id="ops-grace" type="number" min={1} max={168} value={grace} onChange={(e) => setGrace(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field">
            <label htmlFor="ops-warn">Expiry warning (days)</label>
            <input className="input" id="ops-warn" type="number" min={0} max={14} value={warnDays} onChange={(e) => setWarnDays(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field">
            <label htmlFor="ops-offline">Offline threshold (minutes)</label>
            <input className="input" id="ops-offline" type="number" min={1} max={120} value={offlineMin} onChange={(e) => setOfflineMin(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field">
            <label htmlFor="ops-sim">SIM watchlist (days)</label>
            <input className="input" id="ops-sim" type="number" min={1} max={90} value={simWatch} onChange={(e) => setSimWatch(e.target.value)} disabled={ops.isLoading} />
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>
          Grace locks the scooter at expiry and auto-blacklists after the window. Empty fields are left unchanged.
        </p>
        {err ? <FieldError>{err}</FieldError> : null}
      </form>
      <div className="card__foot">
        <Button variant="primary" disabled={save.isPending || ops.isLoading} onClick={submit}>
          <Icon name="check" size={16} />
          {save.isPending ? "Saving…" : "Save timings"}
        </Button>
      </div>
    </section>
  );
}

export function OpsAccessCard() {
  const ops = useOps();
  const save = useSetOps();
  const d = ops.data;
  const [minAge, setMinAge] = useState("");
  const [maxMb, setMaxMb] = useState("");
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!d || hydrated) return;
    setMinAge(String(d.signupMinAge));
    setMaxMb(String(d.uploadMaxMb));
    setPaused(d.signupsPaused);
    setMessage(d.maintenanceMessage ?? "");
    setHydrated(true);
  }, [d, hydrated]);

  const submit = () => {
    const age = minAge.trim() === "" ? undefined : Number(minAge);
    const mb = maxMb.trim() === "" ? undefined : Number(maxMb);
    if (age !== undefined && (!Number.isInteger(age) || age < 16 || age > 100)) {
      setErr("Minimum age must be 16–100.");
      return;
    }
    if (mb !== undefined && (!Number.isInteger(mb) || mb < 1 || mb > 50)) {
      setErr("Upload limit must be 1–50 MB.");
      return;
    }
    if (message.trim().length > 280) {
      setErr("Maintenance message must be 280 characters or less.");
      return;
    }
    setErr(null);
    save.mutate({
      ...(age !== undefined ? { signupMinAge: age } : {}),
      ...(mb !== undefined ? { uploadMaxMb: mb } : {}),
      signupsPaused: paused,
      maintenanceMessage: message.trim() === "" ? null : message.trim(),
    });
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Icon name="shield" size={16} />
          Signup, uploads &amp; notices
        </h2>
        {d?.signupsPaused ? <Badge tone="amber">Signups paused</Badge> : null}
      </div>
      <form className="card__body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ops-age">Signup minimum age</label>
            <input className="input" id="ops-age" type="number" min={16} max={100} value={minAge} onChange={(e) => setMinAge(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field">
            <label htmlFor="ops-mb">KYC upload limit (MB)</label>
            <input className="input" id="ops-mb" type="number" min={1} max={50} value={maxMb} onChange={(e) => setMaxMb(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field span-2">
            <label htmlFor="ops-msg">Maintenance message (empty = no banner)</label>
            <input className="input" id="ops-msg" maxLength={280} placeholder="e.g. Down Sunday 2–4 AM" value={message} onChange={(e) => setMessage(e.target.value)} disabled={ops.isLoading} />
          </div>
          <div className="field span-2">
            <label className="check">
              <input type="checkbox" id="ops-paused" checked={paused} onChange={(e) => setPaused(e.target.checked)} disabled={ops.isLoading} /> Pause new rider signups
            </label>
            <div className="field__hint">Admin-added riders still work while paused.</div>
          </div>
        </div>
        {err ? <FieldError>{err}</FieldError> : null}
      </form>
      <div className="card__foot">
        <Button variant="primary" disabled={save.isPending || ops.isLoading} onClick={submit}>
          <Icon name="check" size={16} />
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </section>
  );
}
