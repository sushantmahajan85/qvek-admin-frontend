import type { ErrorCode } from './constants';

// Backend `code` → admin-facing toast text. Never branch on HTTP status alone.
// Unknown codes fall back to a generic message (still showing the code for triage).
const MAP: Partial<Record<ErrorCode, string>> = {
  APPROVAL_REQUIRES_PAID_TOKEN: 'Collect the Rs.3,000 deposit + first week rent offline first.',
  VEHICLE_ALREADY_ASSIGNED: 'This rider already holds a vehicle.',
  VEHICLE_TAKEN: 'This vehicle is already assigned to someone else.',
  RIDER_NOT_ACTIVE: 'Only Active riders can hold a vehicle.',
  RIDER_BLACKLISTED: 'Blacklisted — needs a director override to proceed.',
  RIDER_EXISTS: 'This number is already registered.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  ACCOUNT_LOCKED: 'Locked after too many attempts — try again in 15 minutes.',
  UNAUTHENTICATED: 'Session expired — please log in again.',
  FORBIDDEN: 'You do not have permission for that action.',
  THROTTLED: 'Too many attempts — wait a minute and retry.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many OTP tries — request a fresh code.',
  INVALID_MFA: 'Wrong authenticator code — try again.',
  INTERNAL_ERROR: 'Something went wrong. Note the code and retry.',
};

export function errorText(code: string | undefined, fallback = 'Request failed'): string {
  if (!code) return fallback;
  const hit = (MAP as Record<string, string>)[code];
  return hit ? `${hit} (${code})` : `${fallback} (${code})`;
}
