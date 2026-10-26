import { apiGet, apiPut } from '@/lib/api-client';

export interface SupportConfig {
  callNumber: string | null;
  whatsappNumber: string | null;
  weeklyRentPaise: number;
  plans: Record<string, number>;
  depositPaise: number;
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

export interface PricingInput {
  weeklyPaise?: number;
  fortnightlyPaise?: number;
  fourWeeklyPaise?: number;
  depositPaise?: number;
}

export async function setPricing(input: PricingInput): Promise<SupportConfig> {
  return apiPut<SupportConfig>('/config/pricing', input);
}

export interface OpsConfig {
  graceHours: number;
  expiryWarningDays: number;
  offlineThresholdMin: number;
  simWatchDays: number;
  uploadMaxMb: number;
  signupMinAge: number;
  signupsPaused: boolean;
  maintenanceMessage: string | null;
}

export type OpsInput = Partial<OpsConfig>;

export async function getOps(): Promise<OpsConfig> {
  return apiGet<OpsConfig>('/config/ops');
}

export async function setOps(input: OpsInput): Promise<OpsConfig> {
  return apiPut<OpsConfig>('/config/ops', input);
}

export interface UiTab {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
}

export interface UiQuickAction {
  icon: string;
  label: string;
  route: string;
  enabled: boolean;
}

export interface UiAccountSection {
  id: string;
  title: string;
  enabled: boolean;
}

export interface UiKycDoc {
  kind: string;
  title: string;
  hint: string;
  required: boolean;
  enabled: boolean;
}

export interface UiPlan {
  id: string;
  days: number;
  label: string;
  ribbon?: string | null;
  enabled: boolean;
}

export interface UiHelpSection {
  icon: string;
  title: string;
  body: string;
}

export interface UiContact {
  showCall: boolean;
  showWhatsApp: boolean;
}

export interface UiLanguage {
  code: string;
  label: string;
  enabled: boolean;
}

export interface UiConfig {
  tabs: UiTab[];
  quickActions: UiQuickAction[];
  accountSections: UiAccountSection[];
  kycDocs: UiKycDoc[];
  plans: UiPlan[];
  helpSections: UiHelpSection[];
  contact: UiContact;
  languages: UiLanguage[];
}

export type UiSectionName =
  | 'tabs'
  | 'quickActions'
  | 'accountSections'
  | 'kycDocs'
  | 'plans'
  | 'helpSections'
  | 'contact'
  | 'languages';

export async function getUiConfig(): Promise<UiConfig> {
  return apiGet<UiConfig>('/config/ui');
}

export async function setUiSection(section: UiSectionName, value: unknown): Promise<UiConfig> {
  return apiPut<UiConfig>(`/config/ui/${section}`, { value });
}
