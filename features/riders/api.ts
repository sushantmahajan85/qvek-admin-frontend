import { apiGet, apiPost } from '@/lib/api-client';
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

export async function transitionRider(id: string, status: RiderStatus, reason: string): Promise<Rider> {
  return apiPost<Rider>(`/admin/riders/${id}/status`, { status, reason });
}
