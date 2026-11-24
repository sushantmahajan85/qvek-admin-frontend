"use client";

import * as React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";

import { cn } from "@/lib/utils";

export type PhoneCountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type IconProps = { country?: string; label?: string; aspectRatio?: number };
type IconComponent = React.ElementType<IconProps>;

export type AdminPhoneCountrySelectProps = {
  value?: string;
  onChange: (country: string | undefined) => void;
  options: PhoneCountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent: IconComponent;
  onFocus?: () => void;
  onBlur?: () => void;
};

function CountryFlag({ Icon, country, label }: { Icon: IconComponent; country?: string; label: string }) {
  if (!country) {
    return <span className="phone-country__globe" aria-hidden />;
  }
  return <Icon country={country} label={label} />;
}

export function AdminPhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: Icon,
  onFocus,
  onBlur,
}: AdminPhoneCountrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const choices = useMemo(
    () => options.filter((o): o is PhoneCountryOption & { value: string } => !o.divider && !!o.value),
    [options],
  );
  const selected = choices.find((o) => o.value === value) ?? choices.find((o) => o.value === "IN");
  const single = choices.length <= 1;
  const locked = disabled || readOnly || single;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return choices;
    return choices.filter((o) => {
      const code = o.value ? `+${getCountryCallingCode(o.value as CountryCode)}` : "";
      return o.label.toLowerCase().includes(term) || o.value?.toLowerCase().includes(term) || code.includes(term);
    });
  }, [choices, q]);

  const callingCode =
    value && value !== "ZZ" ? `+${getCountryCallingCode(value as CountryCode)}` : selected?.value ? `+${getCountryCallingCode(selected.value as CountryCode)}` : "+";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: string) => {
    onChange(code === "ZZ" ? undefined : code);
    setOpen(false);
    setQ("");
    onBlur?.();
  };

  const toggle = () => {
    if (locked) return;
    setOpen((v) => {
      const next = !v;
      if (next) onFocus?.();
      else onBlur?.();
      return next;
    });
  };

  return (
    <div ref={rootRef} className={cn("phone-country", open && "phone-country--open")}>
      <button
        type="button"
        className="phone-country__trigger"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span className="phone-country__flag">
          <CountryFlag Icon={Icon} country={value || selected?.value} label={selected?.label ?? "Country"} />
        </span>
        <span className="phone-country__code">{callingCode}</span>
        {!locked ? <span className="phone-country__chevron" aria-hidden /> : null}
      </button>

      {open ? (
        <div className="phone-country__panel" role="listbox" id={listId} aria-label="Phone number country">
          <CountrySearch q={q} setQ={setQ} />
          <ul className="phone-country__list">
            {filtered.length ? (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    className={cn("phone-country__option", o.value === value && "phone-country__option--active")}
                    onClick={() => pick(o.value)}
                  >
                    <span className="phone-country__option-flag">
                      <CountryFlag Icon={Icon} country={o.value} label={o.label} />
                    </span>
                    <span className="phone-country__option-label">{o.label}</span>
                    <span className="phone-country__option-code">+{getCountryCallingCode(o.value as CountryCode)}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="phone-country__empty">No countries match your search.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CountrySearch({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="phone-country__search">
      <input
        ref={ref}
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search country or code"
        autoComplete="off"
      />
    </div>
  );
}