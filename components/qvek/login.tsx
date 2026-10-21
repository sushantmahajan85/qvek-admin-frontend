"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { loginSchema } from "@/features/auth/api";
import { useAdminLogin } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";
import { errorText } from "@/lib/error-map";
import { FieldError } from "./bits";
import { Icon } from "./icon";

const PTS: [number, number][] = [[18, 22], [26, 64], [70, 30], [62, 74], [84, 52], [40, 46], [12, 80], [90, 18], [48, 86]];

function LoginArt() {
  return (
    <svg className="bg" aria-hidden="true">
      <defs>
        <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#14233A" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
      <circle cx="55%" cy="52%" r="150" fill="none" stroke="#20C76B" strokeOpacity=".35" strokeDasharray="6 6" />
      <circle cx="55%" cy="52%" r="250" fill="none" stroke="#F5B942" strokeOpacity=".25" strokeDasharray="6 6" />
      {PTS.map((p, i) => {
        const col = i % 4 ? "#20C76B" : "#F5B942";
        return (
          <Fragment key={i}>
            <circle cx={p[0] + "%"} cy={p[1] + "%"} r={i % 3 ? 3 : 4} fill={col} opacity=".75" />
            <circle cx={p[0] + "%"} cy={p[1] + "%"} r="12" fill="none" stroke={col} strokeOpacity=".25" />
          </Fragment>
        );
      })}
    </svg>
  );
}

function MobileBrand() {
  return (
    <div className="login__mobile-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/qvek-mark-white.png" alt="Qvek logo" />
      <b>QVEK</b>
    </div>
  );
}

const errMsg = (e: unknown) => errorText(e instanceof ApiError ? e.code : undefined);

/** Admin sign-in: username + password, then the 6-digit authenticator code when 2FA is enabled. */
export function LoginPage() {
  const { login, mfa, mfaRequired, backToCredentials } = useAdminLogin();

  /* --- credentials step --- */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fieldErrs, setFieldErrs] = useState<{ username?: string; password?: string }>({});
  const [shake, setShake] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mfaRequired) setTimeout(() => idRef.current?.focus(), 30);
  }, [mfaRequired]);

  // Shake the form when the server rejects the credentials.
  useEffect(() => {
    if (!login.isError) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 450);
    return () => clearTimeout(t);
  }, [login.isError, login.submittedAt]);

  const submitCreds = () => {
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const e: { username?: string; password?: string } = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as "username" | "password";
        if (!e[k]) e[k] = i.message;
      });
      setFieldErrs(e);
      return;
    }
    setFieldErrs({});
    login.mutate(parsed.data);
  };
  const credErr = fieldErrs.username || fieldErrs.password || (login.isError ? errMsg(login.error) : "");

  /* --- 2FA step --- */
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpShake, setOtpShake] = useState(false);
  const ins = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (mfaRequired) setTimeout(() => ins.current[0]?.focus(), 30);
  }, [mfaRequired]);

  useEffect(() => {
    if (!mfa.isError) return;
    setOtpShake(true);
    setDigits(["", "", "", "", "", ""]);
    ins.current[0]?.focus();
    const t = setTimeout(() => setOtpShake(false), 450);
    return () => clearTimeout(t);
  }, [mfa.isError, mfa.submittedAt]);

  const verify = (list: string[]) => {
    const code = list.join("");
    if (/^\d{6}$/.test(code) && !mfa.isPending) mfa.mutate(code);
  };

  const onDigit = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[i] = v;
    setDigits(next);
    if (v && ins.current[i + 1]) ins.current[i + 1]?.focus();
    if (mfa.isError) mfa.reset();
    if (next.every((x) => x)) verify(next);
  };

  return (
    <div className="login">
      <section className="login__art">
        <LoginArt />
        <div className="login__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/qvek-mark-white.png" alt="Qvek logo" />
          <b>QVEK</b>
        </div>
        <div className="login__pitch">
          <h2>Fleet, riders and rentals — in one control room.</h2>
          <p>Approve riders, assign scooters, watch geofences and keep every recharge on the Tuesday cycle.</p>
          <div className="login__kpis">
            <div>
              <Icon name="map" size={16} />3-zone geofence
            </div>
            <div>
              <Icon name="lock" size={16} />Remote immobilization
            </div>
            <div>
              <Icon name="receipt" size={16} />Shared financial history
            </div>
          </div>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 12 }}>Qvek admin · authorised staff only</p>
      </section>
      <section className="login__panel">
        <div className="login__box" id="login-box">
          <MobileBrand />
          {!mfaRequired ? (
            <>
              <div className="steps-dots" aria-hidden="true">
                <span className="on" />
                <span />
              </div>
              <h1>Admin sign in</h1>
              <p>Single admin access for Phase 1.</p>
              <form
                className={"login__form" + (shake ? " shake" : "")}
                id="login-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCreds();
                }}
              >
                <div className={"field" + (fieldErrs.username || login.isError ? " has-error" : "")} id="f-id">
                  <label htmlFor="lg-id">Username</label>
                  <input ref={idRef} className="input" id="lg-id" autoComplete="username" placeholder="Username" style={{ height: 46 }} value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className={"field" + (fieldErrs.password || login.isError ? " has-error" : "")} id="f-pw">
                  <label htmlFor="lg-pw">Password</label>
                  <div className="input-wrap">
                    <input className="input" id="lg-pw" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" style={{ height: 46 }} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="input-wrap__btn" aria-label={showPw ? "Hide password" : "Show password"} style={{ top: 7 }} onClick={() => setShowPw((x) => !x)}>
                      <Icon name={showPw ? "eyeOff" : "eye"} size={17} />
                    </button>
                  </div>
                </div>
                {credErr ? <FieldError>{credErr}</FieldError> : null}
                <Button variant="primary" size="lg" block type="submit" id="lg-btn" disabled={login.isPending}>
                  {login.isPending ? (
                    <>
                      <span className="spinner" /> Signing in…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="steps-dots" aria-hidden="true">
                <span className="on" />
                <span className="on" />
              </div>
              <h1>Two-factor verification</h1>
              <p>Enter the 6-digit code from your authenticator app.</p>
              <form
                className="login__form"
                id="otp-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  verify(digits);
                }}
              >
                <div className={"otp6" + (mfa.isError ? " error" : "") + (otpShake ? " shake" : "")} id="otp6" role="group" aria-label="6-digit code">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        ins.current[i] = el;
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={"Digit " + (i + 1)}
                      autoComplete="one-time-code"
                      value={d}
                      onChange={(e) => onDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !d && ins.current[i - 1]) {
                          ins.current[i - 1]?.focus();
                          setDigits((x) => x.map((v, j) => (j === i - 1 ? "" : v)));
                        }
                        if (e.key === "ArrowLeft" && ins.current[i - 1]) ins.current[i - 1]?.focus();
                        if (e.key === "ArrowRight" && ins.current[i + 1]) ins.current[i + 1]?.focus();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
                        const next = ["", "", "", "", "", ""].map((_, j) => t[j] || "");
                        setDigits(next);
                        if (t.length === 6) verify(next);
                        else ins.current[t.length]?.focus();
                      }}
                    />
                  ))}
                </div>
                {mfa.isError ? <FieldError>{errMsg(mfa.error)}</FieldError> : null}
                <Button variant="primary" size="lg" block type="submit" id="otp-btn" disabled={mfa.isPending || digits.join("").length !== 6}>
                  {mfa.isPending ? (
                    <>
                      <span className="spinner" /> Verifying…
                    </>
                  ) : (
                    "Verify & sign in"
                  )}
                </Button>
                <Button variant="subtle" block onClick={backToCredentials}>
                  <Icon name="arrowLeft" size={16} />
                  Back
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
