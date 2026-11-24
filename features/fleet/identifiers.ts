export const VEHICLE_IDENTIFIER_RE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export const VEHICLE_NO_ERROR = 'Please enter valid Vehicle No.';
export const MOTOR_NO_ERROR = 'Please enter valid Motor No.';
export const CHASSIS_NO_ERROR = 'Please enter valid Chassis No.';
export const IOP_ID_ERROR = 'Please enter valid IOP ID';

/** @deprecated Use field-specific constants above. */
export const VEHICLE_IDENTIFIER_ERROR = CHASSIS_NO_ERROR;

export const VEHICLE_NO_MAX = 32;
export const IOP_ID_MAX = 64;
export const COMPONENT_ID_MAX = 64;

export function isVehicleIdentifier(value: string, minLen = 2, maxLen = COMPONENT_ID_MAX): boolean {
  const v = value.trim();
  if (v.length < minLen || v.length > maxLen) return false;
  if (!/[A-Za-z0-9]/.test(v)) return false;
  const core = v.replace(/-/g, '');
  return (
    VEHICLE_IDENTIFIER_RE.test(v) &&
    /[A-Za-z]/.test(core) &&
    /\d/.test(core)
  );
}

export function isIopId(value: string): boolean {
  const v = value.trim();
  if (v.length < 1 || v.length > IOP_ID_MAX) return false;
  if (/^\d{6,20}$/.test(v)) return true;
  return VEHICLE_IDENTIFIER_RE.test(v) && /[A-Za-z]/.test(v) && /\d/.test(v);
}

export function sanitizeVehicleIdentifierInput(raw: string, max = COMPONENT_ID_MAX): string {
  return raw.replace(/[^A-Za-z0-9-]/g, '').slice(0, max);
}

export function sanitizeIopIdInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9-]/g, '').slice(0, IOP_ID_MAX);
}

export function vehicleIdentifierError(
  value: string,
  minLen = 2,
  emptyOk = false,
  maxLen = COMPONENT_ID_MAX,
  message = CHASSIS_NO_ERROR,
): string | null {
  const v = value.trim();
  if (!v) return emptyOk ? null : message;
  if (v.length > maxLen) return message;
  if (!isVehicleIdentifier(v, minLen, maxLen)) return message;
  return null;
}

export function iopIdError(value: string): string | null {
  const v = value.trim();
  if (!v) return IOP_ID_ERROR;
  if (!isIopId(v)) return IOP_ID_ERROR;
  return null;
}