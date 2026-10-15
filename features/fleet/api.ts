import { z } from 'zod';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { RiderStatus, VehicleStatus } from '@/lib/constants';

export interface FleetRecovery {
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  at: string | null;
}

export interface FleetRow {
  id: string;
  vehicleNo: string;
  type: string;
  iopId: string;
  status: VehicleStatus;
  chassisNo?: string | null;
  motorNo?: string | null;
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
}

export const vehicleSchema = z.object({
  vehicleNo: z.string().min(2).max(32),
  iopId: z.string().min(1).max(64),
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
}

export async function logExpense(input: ExpenseInput) {
  return apiPost('/admin/expenses', input);
}
