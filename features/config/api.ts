import { apiGet, apiPost } from '@/lib/api-client';

export interface SupportConfig {
  callNumber: string | null;
  whatsappNumber: string | null;
  weeklyRentPaise: number;
  plans: Record<string, number>;
  depositPaise?: number | null;
}

export async function getSupport(): Promise<SupportConfig> {
  return apiGet<SupportConfig>('/config/support');
}

export async function setSupport(callNumber: string): Promise<SupportConfig> {
  return apiPost<SupportConfig>('/config/support', { callNumber });
}

export interface PricingInput {
  weeklyPaise?: number;
  fortnightlyPaise?: number;
  fourWeeklyPaise?: number;
  depositPaise?: number;
}

export async function setPricing(input: PricingInput): Promise<SupportConfig> {
  return apiPost<SupportConfig>('/config/pricing', input, undefined, 'PUT');
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export interface ZoneConfig {
  shopLat: number | null;
  shopLng: number | null;
  warningKm: number;
  disarmKm: number;
  warehouseLat: number | null;
  warehouseLng: number | null;
  warehouseRadiusKm: number | null;
}

export async function getZones(): Promise<ZoneConfig> {
  return apiGet<ZoneConfig>('/config/zones');
}

export async function setZones(input: Partial<ZoneConfig>): Promise<ZoneConfig> {
  return apiPost<ZoneConfig>('/config/zones', input, undefined, 'PUT');
}
