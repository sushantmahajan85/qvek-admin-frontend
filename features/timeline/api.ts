import { apiGet } from '@/lib/api-client';
import type { TimelineFilter } from '@/lib/constants';

export interface TimelineEntry {
  paymentId?: string | null;
  ts: string;
  kind: string;
  amountPaise: number;
  plan?: string | null;
  period?: { from: string; to: string } | null;
  status: string;
  beforeValidity?: string | null;
  afterValidity?: string | null;
  note: string | null;
}

export async function getTimeline(riderId: string, filter: TimelineFilter = 'all'): Promise<TimelineEntry[]> {
  return apiGet<TimelineEntry[]>(`/admin/riders/${riderId}/timeline?filter=${filter}`);
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
