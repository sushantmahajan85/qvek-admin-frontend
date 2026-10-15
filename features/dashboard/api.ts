import { apiGet } from '@/lib/api-client';

export interface DashboardData {
  fleet: Record<string, number>;
  pendingRiders: number;
  markedForRecovery: number;
  expiringRentals: number;
  now: string;
}

export async function getDashboard(): Promise<DashboardData> {
  return apiGet<DashboardData>('/admin/dashboard');
}
