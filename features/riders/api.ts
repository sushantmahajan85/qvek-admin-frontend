import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { RiderStatus } from '@/lib/constants';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  customerId?: string | null;
  age?: number | null;
  platform?: string | null;
  status: RiderStatus;
  paidToken: boolean;
  createdAt: string;
  /** Account-deletion request (Play policy); purgedAt set once anonymised. */
  deletionRequestedAt?: string | null;
  purgedAt?: string | null;
}

export interface RiderDetail extends Rider {
  assignments?: Array<{
    id: string;
    vehicleId: string;
    startedAt: string;
    endedAt: string | null;
  }>;
}

export const riderKeys = {
  all: ['riders'] as const,
  list: (q: string) => ['riders', q] as const,
  one: (id: string) => ['rider', id] as const,
};

export async function listRiders(q: string): Promise<Rider[]> {
  return apiGet<Rider[]>(`/admin/riders?q=${encodeURIComponent(q)}`);
}

export async function getRider(id: string): Promise<RiderDetail> {
  return apiGet<RiderDetail>(`/admin/riders/${id}`);
}

export async function approveRider(id: string, paidToken: boolean): Promise<Rider> {
  return apiPost<Rider>(`/admin/riders/${id}/approve`, { paidToken });
}

export interface CreateRiderInput {
  name: string;
  phone: string;
  age?: number;
  platform?: string;
}

export async function createRider(input: CreateRiderInput): Promise<Rider> {
  return apiPost<Rider>('/admin/riders', input);
}

export async function rejectRider(id: string, reason: string): Promise<Rider> {
  return apiPost<Rider>(`/admin/riders/${id}/reject`, { reason });
}

export interface UpdateRiderInput {
  name?: string;
  phone?: string;
  age?: number;
  platform?: string;
}

export async function updateRider(id: string, input: UpdateRiderInput): Promise<Rider> {
  return apiPatch<Rider>(`/admin/riders/${id}`, input);
}

export async function transitionRider(id: string, status: RiderStatus, reason: string): Promise<Rider> {
  return apiPost<Rider>(`/admin/riders/${id}/status`, { status, reason });
}

export interface PurgeResult {
  ok: boolean;
  id?: string;
  purgedAt?: string;
  documentsDeleted?: number;
  alreadyPurged?: boolean;
}

export async function purgeRider(id: string): Promise<PurgeResult> {
  return apiPost<PurgeResult>(`/admin/riders/${id}/purge`);
}

export async function cancelRiderDeletion(id: string): Promise<Rider> {
  return apiPost<Rider>(`/admin/riders/${id}/deletion-cancel`);
}

export interface ReturnResult {
  ok: boolean;
  assignmentEnded: boolean;
  vehicleId: string | null;
  vehicleStatus: string | null;
  status: string;
}

export async function returnRiderVehicle(
  id: string,
  input: { reason?: string; vehicleStatus?: 'INACTIVE' | 'REPAIR' },
): Promise<ReturnResult> {
  return apiPost<ReturnResult>(`/admin/riders/${id}/return`, input);
}

export interface RefundResult {
  ok: boolean;
  paymentId: string;
  amountPaise: number;
}

export async function refundRiderDeposit(id: string, reason?: string): Promise<RefundResult> {
  return apiPost<RefundResult>(`/admin/riders/${id}/deposit/refund`, reason ? { reason } : {});
}
