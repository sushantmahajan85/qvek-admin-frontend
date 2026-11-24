export const AUDIT_REASON_MIN = 3;
export const AUDIT_REASON_MAX = 280;
export const AUDIT_REASON_ERROR =
  'Enter a valid reason (must include letters; numbers or symbols alone are not allowed).';

export function isAuditReason(value: string): boolean {
  const v = value.trim();
  if (v.length < AUDIT_REASON_MIN || v.length > AUDIT_REASON_MAX) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  if (/^[^A-Za-z0-9\s]+$/.test(v)) return false;
  return true;
}

export function auditReasonError(value: string, minLen = AUDIT_REASON_MIN): string | null {
  const v = value.trim();
  if (v.length < minLen) return `Add a short reason (at least ${minLen} characters).`;
  if (v.length > AUDIT_REASON_MAX) return `Reason must be at most ${AUDIT_REASON_MAX} characters.`;
  if (!isAuditReason(v)) return AUDIT_REASON_ERROR;
  return null;
}