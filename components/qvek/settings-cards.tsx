"use client";

/* Settings cards extracted from pages/ops.tsx: pricing, support contact,
 * and service zones. Each card owns its own form state. */

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSetPricing, useSetSupport, useSetZones, useZones } from "@/features/config/hooks";
import { useSupport } from "@/features/config/hooks";
import { store } from "@/lib/qvek/store";
import { FieldError } from "./bits";
import { Icon } from "./icon";

export function PricingCard() {
  const support = useSupport();
  const save = useSetPricing();
  const server = support.data;
  const [weekly, setWeekly] = useState("");
  const [fortnightly, setFortnightly] = useState("");
  const [fourWeekly, setFourWeekly] = useState("");
  const [deposit, setDeposit] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!server) return;
    setWeekly(String(Math.round(server.weeklyRentPaise / 100)));
    setFortnightly(String(Math.round((server.plans["2-WEEKLY"] ?? 0) / 100)));
    setFourWeekly(String(Math.round((server.plans["4-WEEKLY"] ?? 0) / 100)));
    setDeposit(String(Math.round((server.depositPaise ?? 300000) / 100)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server]);

  const submit = () => {
    const toPaise = (s: string) => (s.trim() === "" ? undefined : Math.round(Number(s) * 100));
    const w = toPaise(weekly);
    const f = toPaise(fortnightly);
    const fw = toPaise(fourWeekly);
    const d = toPaise(deposit);
    for (const [label, v] of [["Weekly", w], ["Fortnightly", f], ["Four-weekly", fw], ["Deposit", d]] as const) {
      if (v !== undefined && (!Number.isInteger(v) || v < 0)) {
        setErr(`${label} must be a non-negative rupee amount.`);
        return;
      }
    }
    if (w === undefined && f === undefined && fw === undefined && d === undefined) {
      setErr("Enter at least one price to update.");
      return;
    }
    setErr(null);
    save.mutate({ ...(w !== undefined ? { weeklyPaise: w } : {}), ...(f !== undefined ? { fortnightlyPaise: f } : {}), ...(fw !== undefined ? { fourWeeklyPaise: fw } : {}), ...(d !== undefined ? { depositPaise: d } : {}) });
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
            <label htmlFor="pl-weekly">Weekly (7 days)</label>
            <div className="input-prefix">
              <span>₹</span>
              <input id="pl-weekly" type="number" min={0} placeholder={c.plans[0] ? String(c.plans[0].price) : ""} value={weekly} onChange={(e) => setWeekly(e.target.value)} disabled={support.isLoading} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pl-fortnightly">Fortnightly (14 days)</label>
            <div className="input-prefix">
              <span>₹</span>
              <input id="pl-fortnightly" type="number" min={0} value={fortnightly} onChange={(e) => setFortnightly(e.target.value)} disabled={support.isLoading} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pl-fourweekly">Four-weekly (28 days)</label>
            <div className="input-prefix">
              <span>₹</span>
              <input id="pl-fourweekly" type="number" min={0} value={fourWeekly} onChange={(e) => setFourWeekly(e.target.value)} disabled={support.isLoading} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pl-deposit">Security deposit</label>
            <div className="input-prefix">
              <span>₹</span>
              <input id="pl-deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} disabled={support.isLoading} />
            </div>
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          All plans run Tuesday to Tuesday. Saved via PUT /config/pricing; empty fields are left unchanged.
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
