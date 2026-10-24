import { apiGet, apiPut } from '@/lib/api-client';

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
  return apiPut<SupportConfig>('/config/support', { callNumber });
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export interface ZonesConfig {
  shopLat: number | null;
  shopLng: number | null;
  warningKm: number;
  disarmKm: number;
  warehouseLat: number | null;
  warehouseLng: number | null;
  warehouseRadiusKm: number | null;
}

export async function getZones(): Promise<ZonesConfig> {
  return apiGet<ZonesConfig>('/config/zones');
}

export interface ZonesInput {
  shopLat?: number | null;
  shopLng?: number | null;
  warningKm?: number;
  disarmKm?: number;
}

export async function setZones(input: ZonesInput): Promise<ZonesConfig> {
  return apiPut<ZonesConfig>('/config/zones', input);
}
