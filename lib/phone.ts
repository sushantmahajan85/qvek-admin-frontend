import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

export const SUPPORT_PHONE_ERROR = 'Please enter a valid 10-digit mobile number';

export const SUPPORT_PHONE_COUNTRY_ERROR =
  'Please enter a valid phone number for the selected country.';

/** Indian mobile in E.164 (+91 + 10 digits starting 6–9). Mirrors backend rider `normalizePhone`. */
const E164_IN = /^\+91[6-9]\d{9}$/;

export function toIndianMobileE164(input: string): string | null {
  const p = input.trim().replace(/[\s-]/g, '');
  if (E164_IN.test(p)) return p;
  const digits = p.replace(/\D/g, '');
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

/** Live validation while typing (support contact field). */
export function supportPhoneLiveError(
  value: string | undefined,
  country: CountryCode = 'IN',
): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return null;
  if (isValidPhoneNumber(value)) return null;

  const parsed = parsePhoneNumberFromString(value, country);
  const activeCountry = parsed?.country ?? country;
  const nationalLen = parsed?.nationalNumber.length ?? digits.length;
  const minNational = activeCountry === 'IN' ? 8 : 5;

  const clearlyInvalid =
    nationalLen >= minNational ||
    !isPossiblePhoneNumber(value) ||
    (activeCountry === 'IN' && digits.length >= 12);

  if (!clearlyInvalid) return null;
  return activeCountry === 'IN' ? SUPPORT_PHONE_ERROR : SUPPORT_PHONE_COUNTRY_ERROR;
}

/** Rider onboarding: valid Indian mobile only (+91). */
export function riderIndianPhoneError(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = toSupportPhoneE164(value);
  if (!normalized?.startsWith("+91")) return SUPPORT_PHONE_ERROR;
  return null;
}

export function toSupportPhoneE164(value: string | undefined): string | null {
  if (!value || !isValidPhoneNumber(value)) return null;
  return parsePhoneNumberFromString(value)?.number ?? null;
}

/** @deprecated Use AdminPhoneInput — kept for any legacy imports. */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d+\s-]/g, '');
}