"use client";

import * as React from "react";
import PhoneInput, { type Country, type Value } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/utils";

import { AdminPhoneCountrySelect } from "./phone-country-select";

const PhoneInputField = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function PhoneInputField({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn("input phone-field__input", className)} />;
  },
);

export type AdminPhoneInputProps = {
  id?: string;
  value: Value | undefined;
  onChange: (value: Value) => void;
  onCountryChange?: (country: Country | undefined) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  /** Limit selectable countries (e.g. `["IN"]` for rider onboarding). */
  countries?: Country[];
  defaultCountry?: Country;
};

export function AdminPhoneInput({
  id,
  value,
  onChange,
  onCountryChange,
  disabled,
  hasError,
  placeholder,
  countries,
  defaultCountry = "IN",
}: AdminPhoneInputProps) {
  return (
    <PhoneInput
      id={id}
      international
      defaultCountry={defaultCountry}
      countries={countries}
      countryCallingCodeEditable={false}
      flags={flags}
      value={value}
      onChange={onChange}
      onCountryChange={onCountryChange}
      disabled={disabled}
      placeholder={placeholder}
      inputComponent={PhoneInputField}
      countrySelectComponent={AdminPhoneCountrySelect}
      className={cn("phone-field", hasError && "phone-field--error")}
    />
  );
}