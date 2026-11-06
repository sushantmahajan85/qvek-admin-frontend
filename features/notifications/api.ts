import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';

export interface NotificationVar {
  key: string;
  label: string;
  example: string;
}

export interface NotificationTemplate {
  kind: string;
  label: string;
  category: 'payments' | 'rental' | 'account' | 'fleet' | 'safety' | 'broadcast';
  description: string;
  locked: boolean;
  vars: NotificationVar[];
  enabled: boolean;
  title: string;
  body: string;
  isCustom: boolean;
  updatedAt: string | null;
}

export interface AudienceCounts {
  allRiders: number;
  activeRiders: number;
  graceRiders: number;
  admins: number;
}

export type BroadcastAudience =
  | 'ALL_RIDERS'
  | 'ACTIVE_RIDERS'
  | 'GRACE_RIDERS'
  | 'ADMINS'
  | 'RIDER';

export interface BroadcastRecord {
  id: string;
  title: string;
  body?: string | null;
  audience: BroadcastAudience;
  riderId?: string | null;
  targeted: number;
  sent: number;
  failed: number;
  createdBy?: string | null;
  createdAt: string;
}

export interface SaveTemplateInput {
  enabled?: boolean;
  title?: string;
  body?: string | null;
}

export interface SendBroadcastInput {
  title: string;
  body?: string;
  audience: BroadcastAudience;
  riderId?: string;
  dedupeKey?: string;
}

export async function getTemplates(): Promise<NotificationTemplate[]> {
  return apiGet<NotificationTemplate[]>('/admin/notifications/templates');
}

export async function saveTemplate(kind: string, input: SaveTemplateInput): Promise<NotificationTemplate> {
  return apiPut<NotificationTemplate>(`/admin/notifications/templates/${encodeURIComponent(kind)}`, input);
}

export async function resetTemplate(kind: string): Promise<NotificationTemplate> {
  return apiDelete<NotificationTemplate>(`/admin/notifications/templates/${encodeURIComponent(kind)}`);
}

export async function getAudience(): Promise<AudienceCounts> {
  return apiGet<AudienceCounts>('/admin/notifications/audience');
}

export async function getBroadcasts(limit = 50): Promise<BroadcastRecord[]> {
  return apiGet<BroadcastRecord[]>(`/admin/notifications/broadcasts?limit=${limit}`);
}

export async function sendBroadcast(input: SendBroadcastInput): Promise<BroadcastRecord & { replay?: boolean }> {
  return apiPost<BroadcastRecord & { replay?: boolean }>('/admin/notifications/broadcast', input);
}

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  ALL_RIDERS: 'All riders with a device',
  ACTIVE_RIDERS: 'Active riders',
  GRACE_RIDERS: 'Riders in grace',
  ADMINS: 'Admin devices',
  RIDER: 'One rider',
};

export const CATEGORY_LABELS: Record<NotificationTemplate['category'], string> = {
  payments: 'Payments',
  rental: 'Rental & grace',
  account: 'Account',
  fleet: 'Fleet',
  safety: 'Safety',
  broadcast: 'Broadcast',
};
