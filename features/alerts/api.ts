import { apiGet } from '@/lib/api-client';

export interface AlertItem {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  riderId?: string | null;
  vehicleId?: string | null;
  createdAt: string;
}

export async function getAlerts(limit = 50): Promise<AlertItem[]> {
  return apiGet<AlertItem[]>(`/admin/alerts?limit=${limit}`);
}
