import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { toIndianMobileE164 } from './phone';

const E164_IN = /^\+91[6-9]\d{9}$/;

/** OTP shell riders are created with name === phone until signup finishes. */
export function isRiderShellName(name: string | null | undefined, phone: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  const p = (phone ?? '').trim();
  if (!n) return true;
  if (p && n === p) return true;
  const compact = n.replace(/[\s-]/g, '');
  return E164_IN.test(compact);
}

export function riderDisplayName(r: {
  name: string;
  phone: string;
  kycInfo?: { fullName?: string | null } | null;
}): string {
  const kycName = r.kycInfo?.fullName?.trim();
  if (kycName && !isRiderShellName(kycName, r.phone)) return kycName;
  if (!isRiderShellName(r.name, r.phone)) return r.name.trim();
  return 'Pending signup';
}

export function formatRiderPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return '—';
  const parsed =
    parsePhoneNumberFromString(phone) ??
    (toIndianMobileE164(phone) ? parsePhoneNumberFromString(toIndianMobileE164(phone)!) : undefined);
  if (parsed) return parsed.formatInternational();
  return phone;
}

export function riderCustomerIdLabel(customerId: string | null | undefined): string {
  return customerId?.trim() ? customerId : '—';
}