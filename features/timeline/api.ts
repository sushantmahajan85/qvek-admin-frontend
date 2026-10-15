import { apiGet } from '@/lib/api-client';
import type { TimelineKind } from '@/lib/constants';

export interface TimelineEntry {
  ts: string;
  kind: TimelineKind;
  amountPaise: number;
  status: string;
  beforeValidity: string | null;
  afterValidity: string | null;
  note: string | null;
}

export async function getTimeline(riderId: string): Promise<TimelineEntry[]> {
  return apiGet<TimelineEntry[]>(`/admin/riders/${riderId}/timeline`);
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
