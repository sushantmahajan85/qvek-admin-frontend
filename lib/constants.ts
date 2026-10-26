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

export const VEHICLE_STATUS = ['ACTIVE', 'IMMOBILIZED', 'GRACE', 'REPAIR', 'OFFLINE'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[number];

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  ACTIVE: 'Active',
  IMMOBILIZED: 'Immobilized',
  GRACE: 'Grace period',
  REPAIR: 'Repair required',
  OFFLINE: 'Offline',
};

export const PLANS = ['WEEKLY', '2-WEEKLY', 'MONTHLY'] as const;
export type PlanId = (typeof PLANS)[number];

export const PLAN_LABEL: Record<PlanId, string> = {
  WEEKLY: 'Weekly',
  '2-WEEKLY': '2-Weekly',
  MONTHLY: 'Monthly',
};

export const TIMELINE_FILTERS = ['all', 'recharge', 'service'] as const;
export type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

export const TIMELINE_FILTER_LABEL: Record<TimelineFilter, string> = {
  all: 'All',
  recharge: 'Recharge Payments',
  service: 'Service Logs',
};

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
  'FIRST_RECHARGE_REQUIRED',
  'NO_ACTIVE_ASSIGNMENT',
  'VEHICLE_EXISTS',
  'VEHICLE_NOT_FOUND',
  'RIDER_NOT_FOUND',
  'EXPENSE_TARGET_REQUIRED',
  'KYC_NOT_FOUND',
  'INVALID_FILE',
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'IOP_UNREACHABLE',
  'NO_TRACKER',
  'INVALID_ZONES',
  'INVALID_PRICING',
  'BAD_RANGE',
  'RANGE_TOO_WIDE',
  'NO_CHANGES',
  'INVALID_PHONE',
  'PAYMENT_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
