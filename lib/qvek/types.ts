/* Domain types for the Qvek admin prototype (mirrors the shape persisted by the original prototype). */

export type Mode = "auto" | "manual";

export type AssetStatus =
  | "Inactive"
  | "Active"
  | "Marked_for_recovery"
  | "Blacklisted"
  | "Returned"
  | "Repair_req";

export type Zone = "operational" | "warning" | "disarm";

export interface Pos {
  x: number;
  y: number;
}

export type KycKey = "aadhaar" | "pan" | "dl";
export type KycStatus = "submitted" | "verified" | "missing";

export interface KycDoc {
  status: KycStatus;
  file?: string;
  size?: number;
  sample?: boolean;
  at?: number;
  by?: string;
}

export type Kyc = Record<KycKey, KycDoc>;

export interface Deposit {
  status: "pending" | "received" | "refunded";
  amount: number;
  /** Rupees consumed by deposit-paid expenses. */
  used?: number;
  mode: "online" | "offline" | null;
  at: number | null;
}

export interface RiderPlan {
  planId: string;
  name: string;
  start: number;
  end: number;
}

export interface Grace {
  start: number;
  end: number;
  lapsed?: boolean;
}

export interface Application {
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  reviewedAt?: number;
  note?: string;
}

export interface RiderFlags {
  expiring?: boolean;
  expiredHandled?: boolean;
  graceEnding?: boolean;
  returned?: boolean;
}

export interface RiderEdit {
  at: number;
  by: string;
  what: string;
}

export interface Rider {
  id: string;
  customerId: string | null;
  name: string;
  phone: string;
  age: number;
  language: string;
  source: string;
  platform: string;
  createdAt: number;
  application: Application;
  kyc: Kyc;
  deposit: Deposit;
  status: AssetStatus | null;
  vehicleId: string | null;
  plan: RiderPlan | null;
  grace: Grace | null;
  firstCycleDone: boolean;
  flags: RiderFlags;
  statusNote: string;
  edits?: RiderEdit[];
  /** Deposit + first-week rent collected offline (backend paidToken). */
  paidToken: boolean;
  /** Account-deletion request timestamp (ms) — null when none. */
  deletionRequestedAt?: number | null;
  /** True once personal data has been anonymised. */
  purged?: boolean;
  /** True once the rider's KYC record has been fetched (pending riders are fetched eagerly). */
  kycLoaded: boolean;
  /** Masked KYC details + signed document links from the API (when loaded and present). */
  kycInfo?: {
    fullName: string | null;
    aadhaar: string | null;
    pan: string | null;
    dlNo: string | null;
    verified: boolean;
    docs: { key: string; kind: string; name: string | null; url: string }[];
  } | null;
}

export type HistoryType =
  | "created"
  | "component"
  | "assignment"
  | "replacement"
  | "status"
  | "control"
  | "expense";

export interface HistoryItem {
  id: string;
  at: number;
  type: HistoryType;
  title: string;
  detail?: string;
  field?: string;
  old?: string;
  new?: string;
}

export type ImmobilizeReason = "plan_expiry" | "disarm_zone" | "manual";

export interface VehicleFlags {
  warnNotified?: boolean;
  disarmHandled?: boolean;
}

export interface Vehicle {
  id: string;
  regNo: string;
  chassisNo: string;
  motorNo: string;
  controllerNo: string;
  model: string;
  riderId: string | null;
  status: AssetStatus;
  immobilized: boolean;
  immobilizedReason: ImmobilizeReason | null;
  online: boolean;
  lastGps: number;
  lastMoved: number;
  pos: Pos;
  /** Raw GPS position (when the device has reported one). */
  lat: number | null;
  lng: number | null;
  /** False when the device has never reported a position. */
  hasGps: boolean;
  /** Last odometer reading recorded in a replacement, if any. */
  odometer: number | null;
  /** Server-computed 72 h idle flag. */
  idle: boolean;
  /** Google Maps link to the last known position (recovery). */
  mapsUrl: string | null;
  iopId: string;
  history: HistoryItem[];
  flags: VehicleFlags;
}

export type FinType =
  | "deposit"
  | "recharge"
  | "first_cycle"
  | "service"
  | "repair"
  | "servicing"
  | "refund"
  | "deposit_deduction";
export type FinStatus = "success" | "pending" | "failed";

export interface FinanceEntry {
  id: string;
  paymentId?: string | null;
  ref: string;
  riderId: string;
  vehicleId: string | null;
  at: number;
  type: FinType;
  title: string;
  amount: number;
  status: FinStatus;
  method: string;
  source: string;
  planName: string;
  periodStart: number | null;
  periodEnd: number | null;
  note: string;
  planId?: string;
  confirmedAt?: number;
}

export type ExpenseType = "pending_deposit" | "repair" | "servicing";

/** Who bears the cost. `deposit` deducts from the rider's held security deposit. */
export type ExpensePaidBy = "company" | "rider" | "deposit";

export interface Expense {
  id: string;
  type: ExpenseType;
  amount: number;
  date: string;
  riderId: string | null;
  vehicleId: string | null;
  notes: string;
  paidBy: ExpensePaidBy;
  at: number;
  financeId?: string;
}

export interface Notification {
  id: string;
  riderId: string;
  type: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  target: string;
}

export type LogAction =
  | "immobilize"
  | "reactivate"
  | "mark_recovery"
  | "assign"
  | "replace"
  | "status"
  | "component"
  | "recovery";

export interface LogEntry {
  id: string;
  at: number;
  vehicleId: string | null;
  riderId: string | null;
  action: LogAction;
  mode: Mode;
  reason: string;
  by: string;
  result: string;
}

export interface Replacement {
  id: string;
  riderId: string;
  oldVehicleId: string;
  newVehicleId: string;
  reason: string;
  date: string;
  oldOdo: number;
  newOdo: number;
  at: number;
}

export type RecoveryStep = "shared" | "agentCalled" | "unlocked" | "returned";

export interface Recovery {
  id: string;
  vehicleId: string;
  riderId: string | null;
  markedAt: number;
  mode: Mode;
  reason: string;
  steps: Record<RecoveryStep, number | null>;
  closedAt: number | null;
}

export interface Alert {
  id: string;
  at: number;
  level: "info" | "warning" | "critical";
  title: string;
  body: string;
  ref: { type: "vehicle" | "rider"; id: string };
  read: boolean;
}

export interface Plan {
  id: string;
  name: string;
  weeks: number;
  price: number;
}

export interface Config {
  dailyRate: number;
  deposit: number;
  plans: Plan[];
  cycleDay: number;
  cycleHour: number;
  graceHours: number;
  zones: { operational: number; warning: number };
  warehouseRadius: number;
  idleHours: number;
  support: { call: string; whatsapp: string; hours: string };
  /** Enabled KYC documents (server-driven App content; fallback aadhaar+pan+dl). */
  kycDocs: { kind: string; title: string; required: boolean }[];
  hubName: string;
  admin: { id: string; password: string; otp: string; name: string };
  riderOtp: string;
}

export interface State {
  version: 1;
  clock: { base: number; setAt: number };
  config: Config;
  /** Configured hub (backend shop). Null = unset: distances/zones unknown. */
  hub: { lat: number; lng: number } | null;
  riders: Rider[];
  vehicles: Vehicle[];
  finance: FinanceEntry[];
  expenses: Expense[];
  notifications: Notification[];
  logs: LogEntry[];
  replacements: Replacement[];
  recoveries: Recovery[];
  alerts: Alert[];
  seq: { customer: number; ref: number };
}
