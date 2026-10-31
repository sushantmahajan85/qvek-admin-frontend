import { z } from 'zod';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { RiderStatus, VehicleStatus } from '@/lib/constants';

export interface FleetRecovery {
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  at: string | null;
}

export interface ComponentHistoryEntry {
  component: 'chassisNo' | 'motorNo' | 'controllerNo' | string;
  oldNo?: string | null;
  newNo?: string | null;
  at: string;
}

export interface FleetRow {
  id: string;
  vehicleNo: string;
  type: string;
  iopId: string;
  status: VehicleStatus;
  chassisNo?: string | null;
  motorNo?: string | null;
  controllerNo?: string | null;
  componentHistory?: ComponentHistoryEntry[] | null;
  createdAt?: string;
  lat: number | null;
  lng: number | null;
  lastPingAt: string | null;
  idle?: boolean;
  assignment: { riderId: string; vehicleId: string; startedAt: string } | null;
  rider: {
    id: string;
    name: string;
    phone: string;
    customerId?: string | null;
    status: RiderStatus;
    planValidity?: string | null;
  } | null;
  recovery: FleetRecovery | null;
}

export interface Vehicle {
  id: string;
  vehicleNo: string;
  type: string;
  iopId: string;
  status: VehicleStatus;
  chassisNo?: string | null;
  motorNo?: string | null;
  controllerNo?: string | null;
}

export const vehicleSchema = z.object({
  vehicleNo: z.string().min(2).max(32),
  iopId: z.string().min(1).max(64),
  type: z.string().min(1).max(32).optional(),
  chassisNo: z.string().min(2).max(64).optional(),
  motorNo: z.string().min(1).max(64).optional(),
  controllerNo: z.string().min(1).max(64).optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const assignSchema = z.object({
  riderId: z.string().min(1),
  vehicleId: z.string().min(1),
});
export type AssignInput = z.infer<typeof assignSchema>;

export async function getFleet(): Promise<FleetRow[]> {
  return apiGet<FleetRow[]>('/admin/fleet');
}

export async function listVehicles(): Promise<Vehicle[]> {
  return apiGet<Vehicle[]>('/admin/vehicles');
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return apiPost<Vehicle>('/admin/vehicles', input);
}

export interface BulkVehicleRowResult {
  index: number;
  vehicleNo: string;
  iopId: string;
  status: 'created' | 'restored' | 'skipped';
  code?: string;
  message?: string;
}

export interface BulkVehiclesResult {
  total: number;
  created: number;
  restored: number;
  skipped: number;
  results: BulkVehicleRowResult[];
}

/** Spreadsheet import: rows are parsed/validated in the browser, then posted. */
export async function bulkCreateVehicles(rows: VehicleInput[]): Promise<BulkVehiclesResult> {
  return apiPost<BulkVehiclesResult>('/admin/vehicles/bulk', { rows });
}

/** Soft delete. Refused while the vehicle has an active assignment. */
export async function removeVehicle(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiDelete<{ id: string; deleted: boolean }>(`/admin/vehicles/${id}`);
}

export async function assignVehicle(input: AssignInput) {
  return apiPost('/admin/assignments', input);
}

export interface VehicleRecord {
  chassisNo?: string | null;
  motorNo?: string | null;
  controllerNo?: string | null;
}

export async function updateRecord(id: string, input: VehicleRecord) {
  return apiPatch(`/admin/vehicles/${id}/record`, input);
}

export interface ReplaceInput {
  riderId: string;
  newVehicleId: string;
  reason: string;
  odometerOldKm?: number;
  odometerNewKm?: number;
}

export async function replaceVehicle(input: ReplaceInput) {
  return apiPost('/admin/replacements', input);
}

export interface ExpenseInput {
  riderId?: string;
  vehicleId?: string;
  kind: 'DEPOSIT_PENDING' | 'REPAIR' | 'SERVICING';
  amountPaise: number;
  note?: string;
  /** Who bears the cost. RIDER_DEPOSIT deducts from the held deposit. */
  paidBy?: 'COMPANY' | 'RIDER' | 'RIDER_DEPOSIT';
}

export async function logExpense(input: ExpenseInput) {
  return apiPost('/admin/expenses', input);
}

export interface ReplacementRow {
  id: string;
  riderId: string;
  oldVehicleId: string;
  newVehicleId: string;
  reason: string;
  odometerOldKm?: number | null;
  odometerNewKm?: number | null;
  createdAt: string;
}

export async function listReplacements(): Promise<ReplacementRow[]> {
  return apiGet<ReplacementRow[]>('/admin/replacements');
}

export interface ExpenseRow {
  id: string;
  riderId?: string | null;
  vehicleId?: string | null;
  kind: ExpenseInput['kind'];
  amountPaise: number;
  note?: string | null;
  paidBy?: 'COMPANY' | 'RIDER' | 'RIDER_DEPOSIT';
  createdAt: string;
}

export async function listExpenses(): Promise<ExpenseRow[]> {
  return apiGet<ExpenseRow[]>('/admin/expenses');
}

// ---- Phase D: GPS fleet ops (backend: IotService) ----

export interface FleetHealth {
  byStatus: Record<string, number>;
  vendor: { staticNum: number; moveNum: number; offlineNum: number; unusedNum: number } | null;
  simExpiring: { id: string; vehicleNo: string; simEndTime: string | null; status: string }[];
  stale: { id: string; vehicleNo: string; lastPingAt: string | null; status: string }[];
}

export async function getFleetHealth(): Promise<FleetHealth> {
  return apiGet<FleetHealth>('/admin/fleet/health');
}

export interface LiveFix {
  lat: number;
  lng: number;
  at: string;
  online: boolean;
}

export interface VehicleLive {
  vehicle: { id: string; vehicleNo: string; status: string; riderId: string | null };
  fix: LiveFix | null;
}

export async function getVehicleLive(id: string): Promise<VehicleLive> {
  return apiGet<VehicleLive>(`/admin/vehicles/${id}/live`);
}

export interface TrackPoint {
  lng: string;
  lat: string;
  speed?: number;
  gpsTime: number;
}

export interface StayPoint {
  lng?: string;
  lat?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface VehicleTrack {
  vehicleNo: string;
  from: string;
  to: string;
  points: TrackPoint[];
  stays: StayPoint[];
}

export async function getVehicleTrack(id: string, from: string, to: string): Promise<VehicleTrack> {
  return apiGet<VehicleTrack>(`/admin/vehicles/${id}/track?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export interface VehicleOdometer {
  vehicleNo: string;
  runTime: number;
  miles: number;
}

export async function getVehicleOdometer(id: string, from: string, to: string): Promise<VehicleOdometer> {
  return apiGet<VehicleOdometer>(`/admin/vehicles/${id}/odometer?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export async function renewVehicleSim(id: string): Promise<{ id: string; renewed: boolean }> {
  return apiPost<{ id: string; renewed: boolean }>(`/admin/vehicles/${id}/sim-renew`);
}

export interface Reconcile {
  unknown: { imei: string; deviceName?: string }[];
  missing: { id: string; vehicleNo: string; iopId: string }[];
  counts: { vendor: number; local: number };
}

export async function getReconcile(): Promise<Reconcile> {
  return apiGet<Reconcile>('/admin/fleet/reconcile');
}

export interface MapVehicle {
  id: string;
  vehicleNo: string;
  status: string;
  lat: number | null;
  lng: number | null;
  lastPingAt: string | null;
  zone: 'operational' | 'warning' | 'disarm' | null;
  color: string;
}

export interface AdminMap {
  shop: { lat: number; lng: number } | null;
  zones: { operationalKm: number; disarmKm: number };
  vehicles: MapVehicle[];
}

export async function getAdminMap(): Promise<AdminMap> {
  return apiGet<AdminMap>('/admin/map');
}

// ---- Manual vehicle control (backend IoT relay; throttled 10/min) ----

export interface ControlResult {
  id: string;
  status: string;
  before: string;
  commandId: string;
}

export async function disarmVehicle(id: string, reason: string): Promise<ControlResult> {
  return apiPost<ControlResult>(`/admin/vehicles/${id}/disarm`, { reason });
}

export async function reactivateVehicle(id: string, reason: string): Promise<ControlResult> {
  return apiPost<ControlResult>(`/admin/vehicles/${id}/reactivate`, { reason });
}

export async function pollFleetNow(): Promise<{ polled: number; updated: number }> {
  return apiPost<{ polled: number; updated: number }>('/admin/fleet/poll');
}

export interface AuditLogRow {
  id: string;
  entity: string;
  entityId: string;
  actorId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  createdAt: string;
}

export async function listAuditLogs(entity?: string, limit = 50): Promise<AuditLogRow[]> {
  const q = new URLSearchParams();
  if (entity) q.set('entity', entity);
  q.set('limit', String(limit));
  return apiGet<AuditLogRow[]>(`/admin/audit-logs?${q.toString()}`);
}
