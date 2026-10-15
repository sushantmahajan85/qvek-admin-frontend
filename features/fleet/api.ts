import { z } from 'zod';
import { apiGet, apiPost } from '@/lib/api-client';
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
  lat: number | null;
  lng: number | null;
  lastPingAt: string | null;
  assignment: { riderId: string; vehicleId: string; startedAt: string } | null;
  rider: { id: string; name: string; phone: string; status: RiderStatus } | null;
  recovery: FleetRecovery | null;
}

export interface Vehicle {
  id: string;
  vehicleNo: string;
  type: string;
  iopId: string;
  status: VehicleStatus;
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
