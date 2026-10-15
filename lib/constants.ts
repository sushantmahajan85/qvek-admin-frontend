// Single source for domain constants — mirrors backend 04-constants + 07 CR-01.
// Hand-synced for MVP (one owner per PR touching statuses). Never use raw strings in UI.

export const RIDER_STATUS = [
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'MARKED_FOR_RECOVERY',
  'BLACKLISTED',
  'RETURNED',
  'REPAIR_REQ',
] as const;
export type RiderStatus = (typeof RIDER_STATUS)[number];

export const RIDER_STATUS_LABEL: Record<RiderStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MARKED_FOR_RECOVERY: 'Marked for recovery',
  BLACKLISTED: 'Blacklisted',
  RETURNED: 'Returned',
  REPAIR_REQ: 'Repair req',
};

export const VEHICLE_STATUS = ['ACTIVE', 'WARNING', 'DISARMED', 'OFFLINE'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const TIMELINE_KIND = ['DEPOSIT', 'RENT', 'ADJUSTMENT', 'REFUND', 'SETTLEMENT'] as const;
export type TimelineKind = (typeof TIMELINE_KIND)[number];

export const ERROR_CODES = [
  'APPROVAL_REQUIRES_PAID_TOKEN',
  'VEHICLE_ALREADY_ASSIGNED',
  'VEHICLE_TAKEN',
  'RIDER_NOT_ACTIVE',
  'RIDER_BLACKLISTED',
  'RIDER_EXISTS',
  'PAYMENT_NOT_VERIFIED',
  'RENTAL_EXPIRED',
  'VEHICLE_DISARMED',
  'OTP_EXPIRED',
  'OTP_ATTEMPTS_EXCEEDED',
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
