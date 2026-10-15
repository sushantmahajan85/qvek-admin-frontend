import { apiGet, apiPost } from '@/lib/api-client';

export interface SupportConfig {
  callNumber: string | null;
  whatsappNumber: string | null;
  weeklyRentPaise: number;
  plans: Record<string, number>;
}

export async function getSupport(): Promise<SupportConfig> {
  return apiGet<SupportConfig>('/config/support');
}

export async function setSupport(callNumber: string): Promise<SupportConfig> {
  return apiPost<SupportConfig>('/config/support', { callNumber });
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
